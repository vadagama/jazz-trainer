/**
 * Sentry initialization — Frontend (Browser + React)
 *
 * Reads DSN from `VITE_SENTRY_DSN` env var.
 * No-op when DSN is not set (e.g. local dev without Sentry).
 *
 * @see infra/sentry/sentry.config.ts — reference config
 */
import * as Sentry from '@sentry/react';

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    if (import.meta.env.DEV) {
      console.debug('[sentry] VITE_SENTRY_DSN not set – skipping init');
    }
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.VERCEL_ENV ?? import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION ?? undefined,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    tracesSampleRate:
      import.meta.env.PROD && import.meta.env.VERCEL_ENV === 'production' ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      // Don't send events in dev/preview unless explicitly configured
      if (import.meta.env.DEV) return null;
      return event;
    },
  });
}
