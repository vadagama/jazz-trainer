/**
 * Sentry initialization — Backend (Fastify + Node)
 *
 * Reads DSN from `SENTRY_DSN` env var.
 * No-op when DSN is not set.
 *
 * @see infra/sentry/sentry.config.ts — reference config
 */
import type { FastifyInstance, FastifyError, FastifyRequest } from 'fastify';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

let initialized = false;

export function initSentry(app: FastifyInstance): void {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    app.log.debug('[sentry] SENTRY_DSN not set – skipping init');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
    release: process.env.APP_VERSION ?? undefined,
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate:
      process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate:
      process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production' ? 0.1 : 1.0,
  });

  initialized = true;
  app.log.info('[sentry] initialized');
}

/**
 * Capture a Fastify error and attach request context.
 * Safe to call even if Sentry is not initialized.
 */
export function captureFastifyError(error: FastifyError, request: FastifyRequest): void {
  if (!initialized) return;

  Sentry.withScope((scope) => {
    scope.setTag('route', request.routeOptions?.url ?? request.url);
    scope.setTag('method', request.method);
    scope.setExtra('statusCode', error.statusCode);
    scope.setExtra('errorCode', error.code);
    if (request.user) {
      scope.setUser({ id: request.user.id });
    }
    Sentry.captureException(error);
  });
}
