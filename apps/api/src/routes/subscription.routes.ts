import type { FastifyInstance } from 'fastify';
import type { DrizzleDb } from '../db/index.js';
import { SubscriptionChangeSchema } from '@jazz/shared';
import {
  getUserSubscriptionInfo,
  getSubscriptionHistory,
  createSubscriptionRequest,
} from '../services/billing.service.js';
import { safeJsonParse } from '../lib/json.js';

export interface SubscriptionRoutesOptions {
  db: DrizzleDb;
}

export async function subscriptionRoutes(
  fastify: FastifyInstance,
  opts: SubscriptionRoutesOptions,
): Promise<void> {
  const { db } = opts;

  // ── GET /api/subscription ─────────────────────────────────────────────────
  fastify.get('/subscription', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: { code: 'UNAUTHENTICATED', message: 'Login required' },
      });
    }

    const info = getUserSubscriptionInfo(db, request.user.id);
    if (!info) {
      return reply.send({
        tier: 'free' as const,
        status: null,
        currentPeriodEnd: null,
        gracePeriodEnds: null,
        isGracePeriod: false,
        history: [],
      });
    }

    const history = getSubscriptionHistory(db, request.user.id).map((h) => ({
      id: h.id,
      eventType: h.eventType,
      actorId: h.actorId,
      oldTier: h.oldTier,
      newTier: h.newTier,
      metadata: safeJsonParse(h.metadata, {} as Record<string, unknown>),
      createdAt: h.createdAt,
    }));

    return reply.send({ ...info, history });
  });

  // ── POST /api/subscription/request-change ─────────────────────────────────
  fastify.post('/subscription/request-change', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: { code: 'UNAUTHENTICATED', message: 'Login required' },
      });
    }

    const parsed = SubscriptionChangeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: parsed.error.issues,
        },
      });
    }

    const { action, tier, message } = parsed.data;

    try {
      createSubscriptionRequest(db, {
        email: request.user.email!,
        name: request.user.name ?? undefined,
        desiredTier: tier ?? 'pro',
        message: message ?? `Запрос: ${action}`,
      });

      return reply.send({
        message: 'Запрос на изменение подписки принят. Мы свяжемся с вами в ближайшее время.',
      });
    } catch (err) {
      request.log.error({ err }, 'subscription request failed');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Internal error' },
      });
    }
  });
}
