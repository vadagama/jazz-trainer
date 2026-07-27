import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import type { DrizzleDb } from '../db/index.js';
import { subscriptions as subsTable, subscriptionTiers, users } from '../db/schema.js';
import {
  activateSubscription,
  cancelSubscription,
  setSubscriptionStatus,
  listSubscriptions,
  listSubscriptionRequests,
  getSubscriptionRequest,
  approveSubscriptionRequest,
  rejectSubscriptionRequest,
  requestInfoSubscriptionRequest,
  getSubscriptionHistory,
  type SubscriptionTier,
} from '../services/billing.service.js';
import { requirePermission } from '../plugins/rbac.plugin.js';
import { AdminSubscriptionUpdateSchema, SubscriptionRequestActionSchema } from '@jazz/shared';
import { safeJsonParse } from '../lib/json.js';

export interface AdminSubscriptionsRoutesOptions {
  db: DrizzleDb;
}

export async function adminSubscriptionsRoutes(
  fastify: FastifyInstance,
  opts: AdminSubscriptionsRoutesOptions,
): Promise<void> {
  const { db } = opts;

  const billingManage = requirePermission('billing:manage');
  const billingRead = requirePermission('billing:read');

  // ── GET /api/admin/subscriptions ──────────────────────────────────────────
  fastify.get('/admin/subscriptions', { preHandler: [billingRead] }, async (request, reply) => {
    const { status, tier } = request.query as { status?: string; tier?: string };
    const result = await listSubscriptions(db, { status, tier });
    return reply.send(result);
  });

  // ── GET /api/admin/subscriptions/:userId ──────────────────────────────────
  fastify.get<{ Params: { userId: string } }>(
    '/admin/subscriptions/:userId',
    { preHandler: [billingRead] },
    async (request, reply) => {
      const { userId } = request.params;

      const user = await db.select().from(users).where(eq(users.id, userId)).get();
      if (!user) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
      }

      const sub = await db
        .select()
        .from(subsTable)
        .where(eq(subsTable.userId, userId))
        .orderBy(subsTable.createdAt)
        .all();

      const history = (await getSubscriptionHistory(db, userId)).map((h) => ({
        id: h.id,
        eventType: h.eventType,
        actorId: h.actorId,
        oldTier: h.oldTier,
        newTier: h.newTier,
        metadata: safeJsonParse(h.metadata, {} as Record<string, unknown>),
        createdAt: h.createdAt,
      }));

      const subscriptionsList = await Promise.all(sub.map(async (s) => {
        const tier = await db
          .select()
          .from(subscriptionTiers)
          .where(eq(subscriptionTiers.id, s.tierId))
          .get();
        return {
          id: s.id,
          userId: s.userId,
          tierName: tier?.name ?? null,
          status: s.status,
          currentPeriodStart: s.currentPeriodStart,
          currentPeriodEnd: s.currentPeriodEnd,
          gracePeriodEnds: s.gracePeriodEnds,
          canceledAt: s.canceledAt,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        };
      }));

      return reply.send({ subscriptions: subscriptionsList, history });
    },
  );

  // ── PUT /api/admin/subscriptions/:userId ──────────────────────────────────
  fastify.put<{ Params: { userId: string } }>(
    '/admin/subscriptions/:userId',
    { preHandler: [billingManage] },
    async (request, reply) => {
      const { userId } = request.params;

      const user = await db.select().from(users).where(eq(users.id, userId)).get();
      if (!user) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
      }

      const parsed = AdminSubscriptionUpdateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid subscription data',
            details: parsed.error.issues,
          },
        });
      }

      const { tier, months, status } = parsed.data;

      try {
        // Tier change (activate or cancel-with-tier)
        if (tier) {
          if (status === 'canceled') {
            cancelSubscription(db, request, userId);
          } else {
            activateSubscription(db, request, userId, tier as SubscriptionTier, months ?? 12);
          }
          return reply.send({ success: true });
        }

        // Status-only change
        if (status) {
          if (status === 'canceled') {
            cancelSubscription(db, request, userId);
          } else {
            setSubscriptionStatus(db, request, userId, status);
          }
          return reply.send({ success: true });
        }

        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Either tier or status required' },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return reply.status(400).send({
          error: { code: 'OPERATION_FAILED', message },
        });
      }
    },
  );

  // ── GET /api/admin/subscription-requests ───────────────────────────────────
  fastify.get(
    '/admin/subscription-requests',
    { preHandler: [billingRead] },
    async (request, reply) => {
      const { status } = request.query as { status?: string };
      const result = await listSubscriptionRequests(db, status);
      return reply.send(result);
    },
  );

  // ── POST /api/admin/subscription-requests/:id/approve ──────────────────────
  fastify.post<{ Params: { id: string } }>(
    '/admin/subscription-requests/:id/approve',
    { preHandler: [billingManage] },
    async (request, reply) => {
      const { id } = request.params;
      const subReq = await getSubscriptionRequest(db, id);
      if (!subReq) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Subscription request not found' },
        });
      }

      // Find or create user by email
      let user = await db.select().from(users).where(eq(users.email, subReq.email)).get();
      if (!user) {
        // Create a placeholder user — they'll log in via Magic Link
        const now = Date.now();
        const userId = crypto.randomUUID();
        await db.insert(users)
          .values({
            id: userId,
            email: subReq.email,
            name: subReq.name ?? 'User',
            provider: 'magic_link',
            providerId: `ml_${userId}`,
            createdAt: now,
            updatedAt: now,
          })
          .run();
        user = await db.select().from(users).where(eq(users.id, userId)).get()!;
      }

      try {
        approveSubscriptionRequest(
          db,
          request,
          id,
          user.id,
          subReq.desiredTier as SubscriptionTier,
        );
        return reply.send({ success: true, userId: user.id });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return reply.status(400).send({
          error: { code: 'OPERATION_FAILED', message },
        });
      }
    },
  );

  // ── POST /api/admin/subscription-requests/:id/reject ───────────────────────
  fastify.post<{ Params: { id: string } }>(
    '/admin/subscription-requests/:id/reject',
    { preHandler: [billingManage] },
    async (request, reply) => {
      const { id } = request.params;
      const subReq = await getSubscriptionRequest(db, id);
      if (!subReq) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Subscription request not found' },
        });
      }

      const parsed = SubscriptionRequestActionSchema.safeParse(request.body);
      const reason = parsed.success ? parsed.data.reason : undefined;
      try {
        await rejectSubscriptionRequest(db, request, id, reason);
        return reply.send({ success: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return reply.status(400).send({
          error: { code: 'OPERATION_FAILED', message },
        });
      }
    },
  );

  // ── POST /api/admin/subscription-requests/:id/request-info ─────────────────
  fastify.post<{ Params: { id: string } }>(
    '/admin/subscription-requests/:id/request-info',
    { preHandler: [billingManage] },
    async (request, reply) => {
      const { id } = request.params;
      const subReq = await getSubscriptionRequest(db, id);
      if (!subReq) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Subscription request not found' },
        });
      }

      const parsed = SubscriptionRequestActionSchema.safeParse(request.body);
      const reason = parsed.success ? parsed.data.reason : undefined;
      try {
        await requestInfoSubscriptionRequest(db, request, id, reason);
        return reply.send({ success: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return reply.status(400).send({
          error: { code: 'OPERATION_FAILED', message },
        });
      }
    },
  );
}
