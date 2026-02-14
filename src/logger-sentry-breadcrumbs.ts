/**
 * Pino logger with Sentry breadcrumbs. Each log call (debug, info, warn, error)
 * adds a breadcrumb to the current Sentry scope. When a 4xx/5xx error is captured,
 * Sentry events include the full trail of log calls leading up to the error.
 *
 * Requires instrument.ts to be loaded first (Sentry.init).
 */
import { Writable } from 'node:stream';
import pino from 'pino';
import * as Sentry from '@sentry/node';

const PINO_TO_SENTRY_LEVEL: Record<number, Sentry.SeverityLevel> = {
  10: 'debug', // trace
  20: 'debug',
  30: 'info',
  40: 'warning',
  50: 'error',
  60: 'fatal',
};

function pinoLevelToSentry(level: number): Sentry.SeverityLevel {
  return PINO_TO_SENTRY_LEVEL[level] ?? 'info';
}

function omitKeys<T extends Record<string, unknown>>(
  obj: T,
  keys: string[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!keys.includes(k)) {
      result[k] = v;
    }
  }
  return result;
}

function createSentryBreadcrumbStream(): Writable {
  return new Writable({
    write(chunk: Buffer | string, _encoding, callback) {
      try {
        const line = chunk.toString();
        const obj = JSON.parse(line) as {
          level?: number;
          msg?: string;
          [key: string]: unknown;
        };
        const level = obj.level ?? 30;
        const message = obj.msg ?? '[no message]';
        const data = omitKeys(obj, ['msg', 'level', 'time']);
        Sentry.addBreadcrumb({
          message,
          level: pinoLevelToSentry(level),
          category: 'pino',
          data: Object.keys(data).length > 0 ? data : undefined,
        });
      } catch {
        // ignore parse errors
      }
      callback();
    },
  });
}

export type LoggerWithSentryBreadcrumbsOptions = pino.LoggerOptions;

/**
 * Creates a Pino logger that adds each log call as a Sentry breadcrumb.
 * Logs are also written to stdout. Compatible with Fastify logger option.
 *
 * @param opts - Optional Pino logger options (e.g. level from LOG_LEVEL)
 * @returns Pino logger instance
 */
export function createLoggerWithSentryBreadcrumbs(
  opts?: LoggerWithSentryBreadcrumbsOptions
): pino.Logger {
  const sentryStream = createSentryBreadcrumbStream();
  const streams: pino.StreamEntry[] = [
    { stream: process.stdout },
    { stream: sentryStream, level: 'trace' as pino.Level },
  ];
  const options: pino.LoggerOptions = {
    ...opts,
    level: opts?.level ?? process.env.LOG_LEVEL ?? 'info',
  };
  return pino(options, pino.multistream(streams));
}
