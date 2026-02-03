import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import { SSEServerTransport, type SSEServerTransportOptions } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer } from './mcp-core.js';

type StreamableSession = {
  server: ReturnType<typeof createMcpServer>;
  transport: StreamableHTTPServerTransport;
};

type SseSession = {
  server: ReturnType<typeof createMcpServer>;
  transport: SSEServerTransport;
};

const app = Fastify({ logger: true });

const streamableSessions = new Map<string, StreamableSession>();
const sseSessions = new Map<string, SseSession>();

const mcpPort = process.env.MCP_PORT ? Number.parseInt(process.env.MCP_PORT, 10) : 4200;
const mcpHost = process.env.MCP_HOST || '0.0.0.0';
const authToken = process.env.MCP_AUTH_TOKEN?.trim();

app.route({
  method: ['GET', 'POST', 'DELETE'],
  url: '/mcp',
  handler: async (request, reply) => {
    if (!ensureAuth(request, reply)) {
      return;
    }

    reply.hijack();
    const sessionId = getHeaderValue(request.headers['mcp-session-id']);

    if (request.method === 'POST') {
      const body = request.body;

      if (sessionId) {
        const session = streamableSessions.get(sessionId);
        if (!session) {
          reply.raw.statusCode = 404;
          reply.raw.end('Unknown session');
          return;
        }

        await session.transport.handleRequest(request.raw, reply.raw, body);
        return;
      }

      if (isInitializeRequest(body)) {
        const server = createMcpServer();
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id) => {
            streamableSessions.set(id, { server, transport });
          },
        });

        transport.onclose = () => {
          const id = transport.sessionId;
          if (id) {
            streamableSessions.delete(id);
          }
        };

        await server.connect(transport);
        await transport.handleRequest(request.raw, reply.raw, body);
        return;
      }

      reply.raw.statusCode = 400;
      reply.raw.end('Bad Request: No valid session ID provided');
      return;
    }

    if (!sessionId) {
      reply.raw.statusCode = 400;
      reply.raw.end('Invalid or missing session ID');
      return;
    }

    const session = streamableSessions.get(sessionId);
    if (!session) {
      reply.raw.statusCode = 404;
      reply.raw.end('Unknown session');
      return;
    }

    await session.transport.handleRequest(request.raw, reply.raw);
  },
});

app.get('/sse', async (request, reply) => {
  if (!ensureAuth(request, reply)) {
    return;
  }

  reply.hijack();
  const server = createMcpServer();
  const sseOptions = getSseOptions();
  const transport = new SSEServerTransport('/message', reply.raw, sseOptions);

  transport.onclose = () => {
    sseSessions.delete(transport.sessionId);
  };
  transport.onerror = (error) => {
    app.log.error({ error }, 'SSE transport error');
  };

  await server.connect(transport);
  sseSessions.set(transport.sessionId, { server, transport });
});

app.post('/message', async (request, reply) => {
  if (!ensureAuth(request, reply)) {
    return;
  }

  const query = request.query as { sessionId?: string };
  const sessionId = query?.sessionId;
  if (!sessionId) {
    reply.code(400).send({ error: 'Missing sessionId' });
    return;
  }

  const session = sseSessions.get(sessionId);
  if (!session) {
    reply.code(404).send({ error: 'Unknown session' });
    return;
  }

  reply.hijack();
  await session.transport.handlePostMessage(request.raw, reply.raw, request.body);
});

async function start() {
  try {
    await app.listen({ port: mcpPort, host: mcpHost });
    app.log.info(`MCP HTTP server listening on ${mcpHost}:${mcpPort}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

function ensureAuth(request: FastifyRequest, reply: FastifyReply): boolean {
  if (!authToken) {
    return true;
  }

  const header = getHeaderValue(request.headers.authorization);
  if (!header) {
    reply.code(401).send({ error: 'Unauthorized' });
    return false;
  }

  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || token !== authToken) {
    reply.code(401).send({ error: 'Unauthorized' });
    return false;
  }

  return true;
}

function getHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isInitializeRequest(body: unknown): body is { method: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return false;
  }

  return (body as { method?: unknown }).method === 'initialize';
}

function parseEnvList(value?: string): string[] | undefined {
  if (!value) {
    return undefined;
  }

  const entries = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  return entries.length ? entries : undefined;
}

function getSseOptions(): SSEServerTransportOptions | undefined {
  const allowedHosts = parseEnvList(process.env.MCP_ALLOWED_HOSTS);
  const allowedOrigins = parseEnvList(process.env.MCP_ALLOWED_ORIGINS);

  if (!allowedHosts && !allowedOrigins) {
    return undefined;
  }

  return {
    ...(allowedHosts ? { allowedHosts } : {}),
    ...(allowedOrigins ? { allowedOrigins } : {}),
  };
}

await start();
