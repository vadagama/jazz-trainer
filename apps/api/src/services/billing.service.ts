import { eq, and, desc } from 'drizzle-orm';
import type { DrizzleDb } from '../db/index.js';
import {
  subscriptions,
  subscriptionTiers,
  subscriptionRequests,
  subscriptionHistory,
  userRoles,
  roles,
  users,
} from '../db/schema.js';
import { RBAC_ROLES } from './rbac.service.js';
import type { FastifyRequest } from 'fastify';
import { withAuditSync, withSystemAudit, AUDIT_ACTIONS } from './audit.service.js';
import type { ApiConfig } from '../config.js';

// ── Tier constants ──────────────────────────────────────────────────────────

export const SUBSCRIPTION_TIERS = ['free', 'pro', 'premium'] as const;
export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

export const TIER_SEED = [
  {
    id: 'tier-free',
    name: 'free',
    roleName: RBAC_ROLES.SUBSCRIBER_FREE,
    permissions: '[]',
    features: JSON.stringify([
      'Доступ к каталогу композиций',
      '1 упражнение в день',
      'Светлая и тёмная темы',
    ]),
    monthlyPriceCents: null,
  },
  {
    id: 'tier-pro',
    name: 'pro',
    roleName: RBAC_ROLES.SUBSCRIBER_PRO,
    permissions: '[]',
    features: JSON.stringify([
      'Все упражнения без ограничений',
      'Тренировка слуха',
      'Полный каталог теории',
      'Создание композиций',
      'MIDI-клавиатура',
    ]),
    monthlyPriceCents: null,
  },
  {
    id: 'tier-premium',
    name: 'premium',
    roleName: RBAC_ROLES.SUBSCRIBER_PREMIUM,
    permissions: '[]',
    features: JSON.stringify([
      'Всё из Pro',
      'Ритмические упражнения',
      'Расширенная статистика',
      'Приоритетная поддержка',
    ]),
    monthlyPriceCents: null,
  },
] as const;

const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const SUBSCRIBER_ROLE_NAMES = [
  RBAC_ROLES.SUBSCRIBER_FREE,
  RBAC_ROLES.SUBSCRIBER_PRO,
  RBAC_ROLES.SUBSCRIBER_PREMIUM,
] as const;

// ── Tier → role mapping ────────────────────────────────────────────────────

export function roleNameForTier(tier: SubscriptionTier | null): (typeof SUBSCRIBER_ROLE_NAMES)[number] {
  switch (tier) {
    case 'free':
      return RBAC_ROLES.SUBSCRIBER_FREE;
    case 'pro':
      return RBAC_ROLES.SUBSCRIBER_PRO;
    case 'premium':
      return RBAC_ROLES.SUBSCRIBER_PREMIUM;
    default:
      return RBAC_ROLES.SUBSCRIBER_FREE;
  }
}

// ── Seed subscription tiers ────────────────────────────────────────────────

export async function seedSubscriptionTiers(db: DrizzleDb): Promise<void> {
  const now = Date.now();
  for (const tier of TIER_SEED) {
    const existing = await db
      .select({ id: subscriptionTiers.id })
      .from(subscriptionTiers)
      .where(eq(subscriptionTiers.id, tier.id))
      .get();
    if (existing) continue;
    db.insert(subscriptionTiers)
      .values({ ...tier, createdAt: now })
      .run();
  }
}

// ── Add/remove subscriber role ─────────────────────────────────────────────

async function getRoleId(db: DrizzleDb, roleName: string): Promise<string | null> {
  return (
    await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, roleName))
      .get()
      ?.id ?? null
  );
}

async function assignSubscriberRole(
  db: DrizzleDb,
  userId: string,
  tier: SubscriptionTier | null,
): Promise<void> {
  // Remove all existing subscriber roles
  const allRoleRows = await db.select({ id: roles.id, name: roles.name }).from(roles).all();
  const subRoleIds = allRoleRows
    .filter((r) => SUBSCRIBER_ROLE_NAMES.some((n) => n === r.name))
    .map((r) => r.id);

  for (const rid of subRoleIds) {
    db.delete(userRoles).where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, rid))).run();
  }

  // Assign the tier-specific role
  const roleName = roleNameForTier(tier);
  const roleId = await getRoleId(db, roleName);
  if (roleId) {
    const exists = await db
      .select()
      .from(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)))
      .get();
    if (!exists) {
      db.insert(userRoles).values({ userId, roleId }).run();
    }
  }
}

// ── Subscription history ───────────────────────────────────────────────────

function recordHistory(
  db: DrizzleDb,
  userId: string,
  eventType: string,
  actorId: string,
  oldTier: string | null,
  newTier: string | null,
  metadata?: Record<string, unknown>,
): void {
  db.insert(subscriptionHistory)
    .values({
      id: crypto.randomUUID(),
      userId,
      eventType,
      actorId,
      oldTier,
      newTier,
      metadata: JSON.stringify(metadata ?? {}),
      createdAt: Date.now(),
    })
    .run();
}

// ── Get active subscription for user ───────────────────────────────────────

export async function getSubscription(db: DrizzleDb, userId: string) {
  return await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, 'active')))
    .get();
}

export async function getSubscriptionWithTier(db: DrizzleDb, userId: string) {
  return await db
    .select({
      sub: subscriptions,
      tier: subscriptionTiers,
    })
    .from(subscriptions)
    .innerJoin(subscriptionTiers, eq(subscriptions.tierId, subscriptionTiers.id))
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, 'active')))
    .get();
}

// ── Activate / update subscription (admin action) ──────────────────────────

export async function activateSubscription(
  db: DrizzleDb,
  request: FastifyRequest,
  userId: string,
  tier: SubscriptionTier,
  months: number = 12,
): Promise<void> {
  const tierRecord = await db
    .select()
    .from(subscriptionTiers)
    .where(eq(subscriptionTiers.name, tier))
    .get();
  if (!tierRecord) throw new Error(`Unknown tier: ${tier}`);

  const now = Date.now();
  const periodEnd = now + months * 30 * 24 * 60 * 60 * 1000;

  const existing = await getSubscription(db, userId);
  const oldTierName = existing
    ? (await db.select().from(subscriptionTiers).where(eq(subscriptionTiers.id, existing.tierId)).get())
        ?.name ?? null
    : null;

  const actorId = request.user?.id ?? 'system';

  withAuditSync(
    db,
    request,
    'billing:subscription:created',
    'subscription',
    userId,
    { before: { tier: oldTierName } },
    () => {
      if (existing) {
        db.update(subscriptions)
          .set({
            tierId: tierRecord.id,
            status: 'active',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            gracePeriodEnds: null,
            canceledAt: null,
            updatedAt: now,
          })
          .where(eq(subscriptions.id, existing.id))
          .run();
      } else {
        db.insert(subscriptions)
          .values({
            id: crypto.randomUUID(),
            userId,
            tierId: tierRecord.id,
            status: 'active',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            createdAt: now,
            updatedAt: now,
          })
          .run();
      }

      assignSubscriberRole(db, userId, tier);
      recordHistory(db, userId, existing ? 'updated' : 'created', actorId, oldTierName, tier, {
        months,
      });

      return { tier, status: 'active', periodEnd };
    },
  );
}

// ── Cancel subscription ────────────────────────────────────────────────────

export async function cancelSubscription(
  db: DrizzleDb,
  request: FastifyRequest,
  userId: string,
  reason?: string,
): Promise<void> {
  const sub = await getSubscription(db, userId);
  if (!sub) throw new Error('No active subscription');

  const oldTierName =
    (await db
      .select()
      .from(subscriptionTiers)
      .where(eq(subscriptionTiers.id, sub.tierId))
      .get())
      ?.name ?? null;

  const actorId = request.user?.id ?? 'system';
  const now = Date.now();

  withAuditSync(
    db,
    request,
    'billing:subscription:canceled',
    'subscription',
    userId,
    { before: { tier: oldTierName } },
    () => {
      db.update(subscriptions)
        .set({
          status: 'canceled',
          canceledAt: now,
          updatedAt: now,
        })
        .where(eq(subscriptions.id, sub.id))
        .run();

      assignSubscriberRole(db, userId, 'free');
      recordHistory(db, userId, 'canceled', actorId, oldTierName, 'free', {
        reason,
      });

      return { tier: 'free', status: 'canceled' };
    },
  );
}

// ── Set subscription status only (no tier change) ─────────────────────────

export async function setSubscriptionStatus(
  db: DrizzleDb,
  request: FastifyRequest,
  userId: string,
  status: 'active' | 'past_due' | 'canceled',
): Promise<void> {
  const sub = await getSubscription(db, userId);
  if (!sub) throw new Error('No active subscription');

  const tierRecord = await db
    .select()
    .from(subscriptionTiers)
    .where(eq(subscriptionTiers.id, sub.tierId))
    .get();
  const tierName = tierRecord?.name ?? null;
  const actorId = request.user?.id ?? 'system';
  const now = Date.now();

  withAuditSync(
    db,
    request,
    `billing:subscription:status_${status}`,
    'subscription',
    userId,
    { before: { status: sub.status } },
    () => {
      db.update(subscriptions)
        .set({ status, updatedAt: now, canceledAt: status === 'canceled' ? now : sub.canceledAt })
        .where(eq(subscriptions.id, sub.id))
        .run();

      recordHistory(db, userId, `status_${status}`, actorId, tierName, tierName);

      return { tier: tierName, status };
    },
  );
}

// ── Degrade expired subscriptions (cron) ───────────────────────────────────

export async function degradeExpiredSubscriptions(
  db: DrizzleDb,
  _config: ApiConfig,
): Promise<{ degraded: number; notified: number }> {
  const now = Date.now();
  let degraded = 0;
  let notified = 0;

  const active = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.status, 'active'))
    .all();

  for (const sub of active) {
    const periodEnd = sub.currentPeriodEnd ?? 0;

    if (now < periodEnd) continue;

    // Period ended — check grace period
    if (sub.gracePeriodEnds == null) {
      // Enter grace period
      const graceEnd = periodEnd + GRACE_PERIOD_MS;
      if (now < graceEnd) {
        // Still in grace — first check, set grace period
        withSystemAudit(
          db,
          AUDIT_ACTIONS.BILLING_GRACE_ENTERED,
          'subscription',
          sub.userId,
          {
            before: { status: 'active', periodEnd: sub.currentPeriodEnd },
            reason: 'system_cron',
          },
          () => {
            db.update(subscriptions)
              .set({ gracePeriodEnds: graceEnd, updatedAt: now })
              .where(eq(subscriptions.id, sub.id))
              .run();
            recordHistory(db, sub.userId, 'grace_entered', 'system', null, null, {
              graceEnds: graceEnd,
            });
            return { status: 'grace', graceEnds: graceEnd };
          },
        );
        notified++;
        continue;
      }
    }

    if (sub.gracePeriodEnds != null && now < sub.gracePeriodEnds) {
      continue; // Still in grace
    }

    // Grace ended or no grace given — degrade to free
    const tierRecord = await db
      .select()
      .from(subscriptionTiers)
      .where(eq(subscriptionTiers.id, sub.tierId))
      .get();
    const oldTierName = tierRecord?.name ?? null;

    db.update(subscriptions)
      .set({
        status: 'expired',
        updatedAt: now,
      })
      .where(eq(subscriptions.id, sub.id))
      .run();

    assignSubscriberRole(db, sub.userId, 'free');

    withSystemAudit(
      db,
      AUDIT_ACTIONS.BILLING_DEGRADED_TO_FREE,
      'subscription',
      sub.userId,
      {
        before: { tier: oldTierName, status: 'active', periodEnd: sub.currentPeriodEnd },
        reason: 'system_cron',
      },
      () => {
        recordHistory(db, sub.userId, 'billing:degraded:to_free', 'system', oldTierName, 'free');
        return { tier: 'free', status: 'expired' };
      },
    );

    degraded++;
  }

  return { degraded, notified };
}

// ── Subscription requests (admin) ──────────────────────────────────────────

function sReqStatusEq(
  s: 'pending' | 'approved' | 'rejected' | 'needs_info',
) {
  return eq(subscriptionRequests.status, s);
}

export async function listSubscriptionRequests(db: DrizzleDb, filterStatus?: string) {
  if (filterStatus) {
    const typed = filterStatus as 'pending' | 'approved' | 'rejected' | 'needs_info';
    return await db
      .select()
      .from(subscriptionRequests)
      .where(sReqStatusEq(typed))
      .orderBy(desc(subscriptionRequests.createdAt))
      .all();
  }
  return await db
    .select()
    .from(subscriptionRequests)
    .orderBy(desc(subscriptionRequests.createdAt))
    .all();
}

export async function getSubscriptionRequest(db: DrizzleDb, id: string) {
  return await db.select().from(subscriptionRequests).where(eq(subscriptionRequests.id, id)).get();
}

export async function approveSubscriptionRequest(
  db: DrizzleDb,
  request: FastifyRequest,
  requestId: string,
  userId: string,
  tier: SubscriptionTier,
): Promise<void> {
  const now = Date.now();
  const actorId = request.user?.id ?? 'system';

  withAuditSync(
    db,
    request,
    'billing:request:approved',
    'subscription_request',
    requestId,
    { before: { status: 'pending' } },
    () => {
      db.update(subscriptionRequests)
        .set({
          status: 'approved',
          userId,
          processedBy: actorId,
          processedAt: now,
        })
        .where(eq(subscriptionRequests.id, requestId))
        .run();

      activateSubscription(db, request, userId, tier);
      return { status: 'approved' };
    },
  );
}

export function rejectSubscriptionRequest(
  db: DrizzleDb,
  request: FastifyRequest,
  requestId: string,
  reason?: string,
): void {
  const now = Date.now();
  const actorId = request.user?.id ?? 'system';

  withAuditSync(
    db,
    request,
    'billing:request:rejected',
    'subscription_request',
    requestId,
    { before: { status: 'pending' } },
    () => {
      db.update(subscriptionRequests)
        .set({
          status: 'rejected',
          processedBy: actorId,
          processedComment: reason ?? null,
          processedAt: now,
        })
        .where(eq(subscriptionRequests.id, requestId))
        .run();

      return { status: 'rejected', reason };
    },
  );
}

export function requestInfoSubscriptionRequest(
  db: DrizzleDb,
  request: FastifyRequest,
  requestId: string,
  reason?: string,
): void {
  const now = Date.now();
  const actorId = request.user?.id ?? 'system';

  withAuditSync(
    db,
    request,
    'billing:request:needs_info',
    'subscription_request',
    requestId,
    { before: { status: 'pending' } },
    () => {
      db.update(subscriptionRequests)
        .set({
          status: 'needs_info',
          processedBy: actorId,
          processedComment: reason ?? null,
          processedAt: now,
        })
        .where(eq(subscriptionRequests.id, requestId))
        .run();

      return { status: 'needs_info', reason };
    },
  );
}

// ── List subscriptions (admin) ─────────────────────────────────────────────

export async function listSubscriptions(
  db: DrizzleDb,
  filters?: { status?: string; tier?: string },
) {
  const rows = await db
    .select()
    .from(subscriptions)
    .innerJoin(subscriptionTiers, eq(subscriptions.tierId, subscriptionTiers.id))
    .orderBy(desc(subscriptions.createdAt))
    .all();

  const filtered = rows.filter((row) => {
    if (filters?.status) {
      const statuses = filters.status.split(',');
      if (!statuses.includes(row.subscriptions.status)) return false;
    }
    if (filters?.tier) {
      if (row.subscription_tiers.name !== filters.tier) return false;
    }
    return true;
  });

  return Promise.all(
    filtered.map(async (row) => {
      const user = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, row.subscriptions.userId))
        .get();
      return {
        id: row.subscriptions.id,
        userId: row.subscriptions.userId,
        userEmail: user?.email ?? null,
        tierName: row.subscription_tiers.name,
        status: row.subscriptions.status,
        currentPeriodStart: row.subscriptions.currentPeriodStart,
        currentPeriodEnd: row.subscriptions.currentPeriodEnd,
        gracePeriodEnds: row.subscriptions.gracePeriodEnds,
        canceledAt: row.subscriptions.canceledAt,
        createdAt: row.subscriptions.createdAt,
        updatedAt: row.subscriptions.updatedAt,
      };
    }),
  );
}

// ── Subscription history ───────────────────────────────────────────────────

export async function getSubscriptionHistory(db: DrizzleDb, userId: string) {
  return await db
    .select()
    .from(subscriptionHistory)
    .where(eq(subscriptionHistory.userId, userId))
    .orderBy(desc(subscriptionHistory.createdAt))
    .all();
}

// ── Check for rate-limited subscription request ───────────────────────────

const SUB_REQUEST_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function isSubscriptionRequestRateLimited(db: DrizzleDb, email: string): Promise<boolean> {
  const latest = await db
    .select({ createdAt: subscriptionRequests.createdAt })
    .from(subscriptionRequests)
    .where(eq(subscriptionRequests.email, email))
    .orderBy(desc(subscriptionRequests.createdAt))
    .limit(1)
    .get();
  if (!latest) return false;
  return Date.now() - latest.createdAt < SUB_REQUEST_COOLDOWN_MS;
}

// ── Public: create subscription request from landing ───────────────────────

export function createSubscriptionRequest(
  db: DrizzleDb,
  data: { email: string; name?: string; desiredTier: string; message?: string },
) {
  return db
    .insert(subscriptionRequests)
    .values({
      id: crypto.randomUUID(),
      email: data.email,
      name: data.name ?? null,
      desiredTier: data.desiredTier,
      message: data.message ?? null,
      status: 'pending',
      createdAt: Date.now(),
    })
    .run();
}

// ── User: get their own subscription info ──────────────────────────────────

export async function getUserSubscriptionInfo(db: DrizzleDb, userId: string) {
  const sub = await getSubscriptionWithTier(db, userId);
  if (!sub) return null;

  const now = Date.now();
  return {
    tier: sub.tier.name as SubscriptionTier,
    status: sub.sub.status,
    currentPeriodEnd: sub.sub.currentPeriodEnd,
    gracePeriodEnds: sub.sub.gracePeriodEnds,
    isGracePeriod: sub.sub.gracePeriodEnds != null && now < sub.sub.gracePeriodEnds,
  };
}
