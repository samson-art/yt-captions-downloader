import type { FastifyReply, FastifyRequest } from 'fastify';
import { timingSafeEqual } from 'node:crypto';

/**
 * Extracts the first value from header (handles string | string[] | undefined).
 */
export function getHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Ensures request is authenticated when authToken is configured.
 * Uses timing-safe comparison for token validation.
 * @returns true if authenticated (or auth disabled), false if reply was sent with 401
 */
export function ensureAuth(
  request: FastifyRequest,
  reply: FastifyReply,
  authToken: string | undefined
): boolean {
  if (!authToken) {
    return true;
  }

  const UNAUTHORIZED_MESSAGE =
    'This server requires authToken. Set it in your MCP client config (e.g. Smithery). Your server administrator provides the token when MCP_AUTH_TOKEN is configured.';

  const header = getHeaderValue(request.headers.authorization);
  if (!header) {
    reply.code(401).send({ error: 'Unauthorized', message: UNAUTHORIZED_MESSAGE });
    return false;
  }

  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    reply.code(401).send({ error: 'Unauthorized', message: UNAUTHORIZED_MESSAGE });
    return false;
  }

  if (token.length !== authToken.length) {
    reply.code(401).send({ error: 'Unauthorized', message: UNAUTHORIZED_MESSAGE });
    return false;
  }

  const tokenBuf = Buffer.from(token, 'utf8');
  const expectedBuf = Buffer.from(authToken, 'utf8');
  if (!timingSafeEqual(tokenBuf, expectedBuf)) {
    reply.code(401).send({ error: 'Unauthorized', message: UNAUTHORIZED_MESSAGE });
    return false;
  }

  return true;
}
