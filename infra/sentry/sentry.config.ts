/**
 * Sentry Configuration — IaC Reference
 *
 * This file documents the Sentry SDK configuration used by both
 * `apps/web` and `apps/api`. The actual init code lives alongside
 * each app:
 *   - Frontend:  apps/web/src/lib/sentry.ts
 *   - Backend:   apps/api/src/lib/sentry.ts
 *
 * ## Alert Routing
 *
 * All alerts are routed to **Telegram** via Sentry's built-in
 * Telegram integration. No other channels (email, Slack, Discord)
 * are used.
 *
 * Setup in Sentry Dashboard:
 *   1. Project Settings → Integrations → Telegram
 *   2. Add the bot token and chat ID
 *   3. Configure alert rules:
 *      - New issue → notify Telegram
 *      - Regression → notify Telegram
 *      - High severity spike → notify Telegram
 *
 * ## Environment Variables
 *
 * | Variable           | App  | Description                  |
 * |--------------------|------|------------------------------|
 * | `VITE_SENTRY_DSN`  | web  | Sentry DSN for frontend      |
 * | `SENTRY_DSN`       | api  | Sentry DSN for backend       |
 * | `SENTRY_AUTH_TOKEN`| CI   | Auth token for source maps   |
 *
 ## Projects

 Create two Sentry projects:
   - `amazilia-studio` — frontend errors (id: `4511837235380224`)
   - `amazilia-api`     — backend errors (id: `4511837235314688`)
 */

export const sentryConfig = {
  /** Frontend Sentry DSN (Vite env) */
  frontendDsn: 'VITE_SENTRY_DSN',

  /** Backend Sentry DSN (Node env) */
  backendDsn: 'SENTRY_DSN',

  /** CI token for source map uploads */
  authToken: 'SENTRY_AUTH_TOKEN',

  /** Sampling rates */
  sampling: {
    production: {
      traces: 0.1,
      profiles: 0.1,
      replays: 0.1,
    },
    development: {
      traces: 1.0,
      profiles: 1.0,
      replays: 0.0,
    },
  },
} as const;
