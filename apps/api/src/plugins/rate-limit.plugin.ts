import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';

export interface RateLimitPluginOptions {
  /** Override global max (default: 100 requests per window). */
  max?: number;
  /** Override global time window in ms (default: 60_000). */
  timeWindow?: number;
}

/**
 * Rate-limit plugin.
 *
 * Applied globally with per-route overrides via the route config
 * `config.rateLimit` (supported by @fastify/rate-limit).
 *
 * If RATE_LIMIT_MAX / RATE_LIMIT_WINDOW_MS env vars are set they
 * override the defaults.
 */
export const rateLimitPlugin = fp(async function rateLimitPlugin(
  app: FastifyInstance,
  opts: RateLimitPluginOptions = {},
) {
  const max = opts.max ?? Number(process.env.RATE_LIMIT_MAX || 100);
  const timeWindow = opts.timeWindow ?? Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);

  await app.register(rateLimit, {
    max,
    timeWindow,
    keyGenerator: (request) => {
      return request.ip;
    },
  });
});
