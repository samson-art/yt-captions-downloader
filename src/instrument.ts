/**
 * Sentry instrumentation. Must be loaded first via node -r ./dist/instrument.js
 * so that error and performance instrumentation is applied before other modules.
 * When SENTRY_DSN is not set, the SDK does not send events.
 */
import * as Sentry from '@sentry/node';
import { NotFoundError, ValidationError } from './errors.js';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT,
  release: process.env.SENTRY_RELEASE,
  maxBreadcrumbs: 100,
  tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE
    ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE)
    : 0.1,
  sendDefaultPii: process.env.SENTRY_SEND_DEFAULT_PII === 'true',
  beforeSend(event, hint) {
    const ex = hint.originalException;
    if (ex instanceof NotFoundError || ex instanceof ValidationError) {
      return null;
    }
    return event;
  },
});
