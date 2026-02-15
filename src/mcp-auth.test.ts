import type { FastifyReply, FastifyRequest } from 'fastify';
import { ensureAuth, getHeaderValue } from './mcp-auth.js';

function mockReply(): FastifyReply & { _sent: { code: number; body: unknown } } {
  const sent = { code: 0, body: null as unknown };
  const reply = {
    _sent: sent,
    code: (n: number) => {
      sent.code = n;
      return reply;
    },
    send: (body: unknown) => {
      sent.body = body;
      return reply;
    },
  };
  return reply as unknown as FastifyReply & { _sent: typeof sent };
}

function mockRequest(headers: Record<string, string | string[] | undefined>): FastifyRequest {
  return { headers } as unknown as FastifyRequest;
}

describe('mcp-auth', () => {
  describe('getHeaderValue', () => {
    it('returns value when header is string', () => {
      expect(getHeaderValue('Bearer abc')).toBe('Bearer abc');
    });

    it('returns first element when header is array', () => {
      expect(getHeaderValue(['Bearer abc', 'Bearer xyz'])).toBe('Bearer abc');
    });

    it('returns undefined when header is undefined', () => {
      expect(getHeaderValue(undefined)).toBeUndefined();
    });
  });

  describe('ensureAuth', () => {
    it('returns true when authToken is not set (auth disabled)', () => {
      const request = mockRequest({ authorization: undefined });
      const reply = mockReply();
      expect(ensureAuth(request, reply, undefined)).toBe(true);
      expect(ensureAuth(request, reply, '')).toBe(true);
    });

    it('returns false and sends 401 when Authorization header is missing', () => {
      const request = mockRequest({});
      const reply = mockReply();
      expect(ensureAuth(request, reply, 'secret-token')).toBe(false);
      expect(reply._sent.code).toBe(401);
      const body = reply._sent.body as { error: string; message: string };
      expect(body.error).toBe('Unauthorized');
      expect(body.message).toContain('authToken');
    });

    it('returns false and sends 401 when scheme is not Bearer', () => {
      const request = mockRequest({ authorization: 'Basic dXNlcjpwYXNz' });
      const reply = mockReply();
      expect(ensureAuth(request, reply, 'secret-token')).toBe(false);
      expect(reply._sent.code).toBe(401);
    });

    it('returns false and sends 401 when Bearer token is empty', () => {
      const request = mockRequest({ authorization: 'Bearer ' });
      const reply = mockReply();
      expect(ensureAuth(request, reply, 'secret-token')).toBe(false);
    });

    it('returns false and sends 401 when token length does not match', () => {
      const request = mockRequest({ authorization: 'Bearer wrong-token' });
      const reply = mockReply();
      expect(ensureAuth(request, reply, 'secret-token')).toBe(false);
    });

    it('returns false and sends 401 when token value is wrong', () => {
      const request = mockRequest({ authorization: 'Bearer xxxxxxxxxxx' });
      const reply = mockReply();
      expect(ensureAuth(request, reply, 'secret-token')).toBe(false);
    });

    it('returns true when token is correct', () => {
      const request = mockRequest({ authorization: 'Bearer secret-token' });
      const reply = mockReply();
      expect(ensureAuth(request, reply, 'secret-token')).toBe(true);
    });

    it('accepts Bearer with different casing', () => {
      const request = mockRequest({ authorization: 'bearer secret-token' });
      const reply = mockReply();
      expect(ensureAuth(request, reply, 'secret-token')).toBe(true);
    });
  });
});
