import type { FastifyInstance } from 'fastify';
import type { DrizzleDb } from '../db/index.js';
import { SubscriptionRequestSchema } from '@jazz/shared';
import {
  createSubscriptionRequest,
  isSubscriptionRequestRateLimited,
} from '../services/billing.service.js';

export interface SubscriptionRequestRoutesOptions {
  db: DrizzleDb;
}

export async function subscriptionRequestRoutes(
  fastify: FastifyInstance,
  opts: SubscriptionRequestRoutesOptions,
): Promise<void> {
  const { db } = opts;

  // ── POST /api/subscription-request (public, no auth) ──────────────────────
  fastify.post(
    '/subscription-request',
    { config: { rateLimit: { max: 1, timeWindow: 24 * 60 * 60 * 1000 } } },
    async (request, reply) => {
      const parsed = SubscriptionRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: parsed.error.issues,
          },
        });
      }

      const { email, name, desiredTier, message } = parsed.data;

      // Rate-limit by email: 1 request per 24 hours
      if (isSubscriptionRequestRateLimited(db, email)) {
        return reply.status(429).send({
          error: {
            code: 'RATE_LIMITED',
            message: 'Вы уже отправили заявку. Пожалуйста, подождите 24 часа.',
          },
        });
      }

      try {
        createSubscriptionRequest(db, { email, name, desiredTier, message });
        return reply.send({ message: 'Заявка принята. Мы свяжемся с вами в течение 24 часов.' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Internal error';
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: msg },
        });
      }
    },
  );
}
