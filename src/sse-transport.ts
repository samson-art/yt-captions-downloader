import {
  SSEServerTransport,
  type SSEServerTransportOptions,
} from '@modelcontextprotocol/sdk/server/sse.js';
import type { ServerResponse } from 'node:http';

/**
 * SSE transport that sends a full endpoint URL in the `endpoint` event.
 * Use when the client may open the SSE connection from another origin (e.g. Smithery auth popup):
 * the default transport sends a relative path, which the client then resolves against its own
 * origin and gets 404 when POSTing messages.
 */
class SseTransportWithFullUrl extends SSEServerTransport {
  private readonly _publicBaseUrl: string;

  constructor(
    endpoint: string,
    res: ServerResponse,
    options: SSEServerTransportOptions | undefined,
    publicBaseUrl: string
  ) {
    super(endpoint, res, options);
    this._publicBaseUrl = publicBaseUrl.replace(/\/$/, '');
  }

  override start(): Promise<void> {
    const res = (this as unknown as { res: ServerResponse }).res;
    const sessionId = this.sessionId;

    if ((this as unknown as { _sseResponse?: ServerResponse })._sseResponse) {
      throw new Error(
        'SSEServerTransport already started! If using Server class, note that connect() calls start() automatically.'
      );
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });

    const fullEndpoint = `${this._publicBaseUrl}/message?sessionId=${encodeURIComponent(sessionId)}`;
    res.write(`event: endpoint\ndata: ${fullEndpoint}\n\n`);

    (this as unknown as { _sseResponse: ServerResponse })._sseResponse = res;
    res.on('close', () => {
      (this as unknown as { _sseResponse: undefined })._sseResponse = undefined;
      this.onclose?.();
    });
    return Promise.resolve();
  }
}

/**
 * Creates an SSE server transport. When publicBaseUrl is set, the transport sends
 * a full URL in the endpoint event so that clients running on another origin
 * (e.g. Smithery.ai auth/scan popup) POST to the correct server.
 */
export function createSseTransport(
  endpoint: string,
  res: ServerResponse,
  options?: SSEServerTransportOptions,
  publicBaseUrl?: string
): SSEServerTransport {
  const base = publicBaseUrl?.trim();
  if (base) {
    return new SseTransportWithFullUrl(endpoint, res, options, base);
  }
  return new SSEServerTransport(endpoint, res, options);
}
