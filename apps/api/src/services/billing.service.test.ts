import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from '../db/testUtils.js';
import { users, subscriptions, subscriptionTiers, subscriptionRequests } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { seedRbac } from '../db/seed.js';
import {
  seedSubscriptionTiers,
  roleNameForTier,
  createSubscriptionRequest,
  isSubscriptionRequestRateLimited,
  listSubscriptionRequests,
  getSubscriptionRequest,
  activateSubscription,
  cancelSubscription,
  setSubscriptionStatus,
  getSubscription,
  getSubscriptionWithTier,
  getUserSubscriptionInfo,
  listSubscriptions,
  getSubscriptionHistory,
  approveSubscriptionRequest,
  rejectSubscriptionRequest,
  requestInfoSubscriptionRequest,
  degradeExpiredSubscriptions,
} from './billing.service.js';
import { RBAC_ROLES } from './rbac.service.js';
import type { DrizzleDb } from '../db/index.js';
import type { FastifyRequest } from 'fastify';

function mockRequest(userId?: string): FastifyRequest {
  return {
    user: userId ? { id: userId, email: 'admin@test.com', name: 'Admin' } : undefined,
    ip: '127.0.0.1',
    headers: { 'user-agent': 'test' },
  } as unknown as FastifyRequest;
}

function createTestUser(db: DrizzleDb, id: string, role: string = RBAC_ROLES.USER) {
  const now = Date.now();
  db.insert(users)
    .values({
      id,
      email: `${id}@test.com`,
      name: 'Test User',
      avatarUrl: null,
      provider: 'magic_link',
      providerId: `ml_${id}`,
      role: role as typeof users.$inferInsert.role,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    })
    .run();
}

function getTierId(db: DrizzleDb, name: string): string {
  return db.select().from(subscriptionTiers).where(eq(subscriptionTiers.name, name)).get()!.id;
}

function ensureBillingTables(db: DrizzleDb) {
  db.run(sql.raw("CREATE TABLE IF NOT EXISTS subscription_tiers (id TEXT PRIMARY KEY, name TEXT NOT NULL, stripe_price_id TEXT, role_name TEXT NOT NULL, permissions TEXT NOT NULL DEFAULT '[]', monthly_price_cents INTEGER, features TEXT NOT NULL DEFAULT '[]', created_at INTEGER NOT NULL)"));
  db.run(sql.raw("CREATE TABLE IF NOT EXISTS subscriptions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, stripe_subscription_id TEXT, stripe_customer_id TEXT, tier_id TEXT NOT NULL REFERENCES subscription_tiers(id), status TEXT NOT NULL, current_period_start INTEGER, current_period_end INTEGER, grace_period_ends INTEGER, canceled_at INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)"));
  db.run(sql.raw("CREATE TABLE IF NOT EXISTS subscription_requests (id TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT, desired_tier TEXT NOT NULL, message TEXT, status TEXT NOT NULL DEFAULT 'pending', user_id TEXT, processed_by TEXT, processed_comment TEXT, processed_at INTEGER, created_at INTEGER NOT NULL)"));
  db.run(sql.raw("CREATE TABLE IF NOT EXISTS subscription_history (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, event_type TEXT NOT NULL, actor_id TEXT NOT NULL, old_tier TEXT, new_tier TEXT, metadata TEXT NOT NULL DEFAULT '{}', created_at INTEGER NOT NULL)"));
}

describe('Billing — roleNameForTier', () => {
  it('maps free to subscriber_free', () => {
    expect(roleNameForTier('free')).toBe(RBAC_ROLES.SUBSCRIBER_FREE);
  });
  it('maps pro to subscriber_pro', () => {
    expect(roleNameForTier('pro')).toBe(RBAC_ROLES.SUBSCRIBER_PRO);
  });
  it('maps premium to subscriber_premium', () => {
    expect(roleNameForTier('premium')).toBe(RBAC_ROLES.SUBSCRIBER_PREMIUM);
  });
  it('maps null to subscriber_free', () => {
    expect(roleNameForTier(null)).toBe(RBAC_ROLES.SUBSCRIBER_FREE);
  });
});

describe('Billing — seedSubscriptionTiers', () => {
  let db: DrizzleDb;
  beforeEach(async () => {
    db = await createTestDb();
    ensureBillingTables(db);
    await seedRbac(db);
  });
  it('seeds all three tiers', async () => {
    await seedSubscriptionTiers(db);
    const tiers = db.select().from(subscriptionTiers).all();
    expect(tiers).toHaveLength(3);
    expect(tiers.map((t) => t.name)).toEqual(expect.arrayContaining(['free', 'pro', 'premium']));
  });
  it('is idempotent', async () => {
    await seedSubscriptionTiers(db);
    await seedSubscriptionTiers(db);
    expect(db.select().from(subscriptionTiers).all()).toHaveLength(3);
  });
});

describe('Billing — subscription requests', () => {
  let db: DrizzleDb;
  beforeEach(async () => {
    db = await createTestDb();
    ensureBillingTables(db);
    await seedRbac(db);
    await seedSubscriptionTiers(db);
  });
  it('creates a pending request', () => {
    createSubscriptionRequest(db, { email: 'u@t.com', name: 'T', desiredTier: 'pro', message: 'Hi' });
    const all = db.select().from(subscriptionRequests).all();
    expect(all).toHaveLength(1);
    expect(all[0]!.email).toBe('u@t.com');
    expect(all[0]!.status).toBe('pending');
  });
  it('rate limit: true for recent request', async () => {
    createSubscriptionRequest(db, { email: 'a@b.com', desiredTier: 'pro' });
    expect(await isSubscriptionRequestRateLimited(db, 'a@b.com')).toBe(true);
  });
  it('rate limit: false for old request', async () => {
    db.insert(subscriptionRequests).values({
      id: crypto.randomUUID(), email: 'a@b.com', name: null,
      desiredTier: 'pro', status: 'pending',
      createdAt: Date.now() - 25 * 60 * 60 * 1000,
    }).run();
    expect(await isSubscriptionRequestRateLimited(db, 'a@b.com')).toBe(false);
  });
  it('lists all by default', async () => {
    createSubscriptionRequest(db, { email: 'a@b.com', desiredTier: 'pro' });
    createSubscriptionRequest(db, { email: 'c@d.com', desiredTier: 'premium' });
    expect(await listSubscriptionRequests(db)).toHaveLength(2);
  });
  it('filters by status', async () => {
    createSubscriptionRequest(db, { email: 'a@b.com', desiredTier: 'pro' });
    db.update(subscriptionRequests).set({ status: 'rejected' }).where(eq(subscriptionRequests.email, 'a@b.com')).run();
    expect(await listSubscriptionRequests(db, 'pending')).toHaveLength(0);
    expect(await listSubscriptionRequests(db, 'rejected')).toHaveLength(1);
  });
  it('getSubscriptionRequest returns by id', async () => {
    createSubscriptionRequest(db, { email: 'a@b.com', desiredTier: 'pro' });
    const all = db.select().from(subscriptionRequests).all();
    const req = await getSubscriptionRequest(db, all[0]!.id);
    expect(req!.email).toBe('a@b.com');
  });
  it('getSubscriptionRequest returns undefined for unknown', async () => {
    expect(await getSubscriptionRequest(db, 'nope')).toBeUndefined();
  });
});

describe('Billing — subscription lifecycle', () => {
  let db: DrizzleDb;
  beforeEach(async () => {
    db = await createTestDb();
    ensureBillingTables(db);
    await seedRbac(db);
    await seedSubscriptionTiers(db);
    createTestUser(db, 'user-1');
    createTestUser(db, 'admin-1', RBAC_ROLES.ADMIN);
  });
  it('activates subscription and assigns role', async () => {
    await activateSubscription(db, mockRequest('admin-1'), 'user-1', 'pro', 12);
    const sub = await getSubscription(db, 'user-1');
    expect(sub).toBeDefined();
    expect(sub!.status).toBe('active');
  });
  it('upgrades existing subscription', async () => {
    await activateSubscription(db, mockRequest('admin-1'), 'user-1', 'free');
    await activateSubscription(db, mockRequest('admin-1'), 'user-1', 'premium');
    const sub = await getSubscription(db, 'user-1');
    const tier = db.select().from(subscriptionTiers).where(eq(subscriptionTiers.id, sub!.tierId)).get();
    expect(tier!.name).toBe('premium');
  });
  it('cancels subscription', async () => {
    await activateSubscription(db, mockRequest('admin-1'), 'user-1', 'pro');
    await cancelSubscription(db, mockRequest('admin-1'), 'user-1');
    const sub = db.select().from(subscriptions).where(eq(subscriptions.userId, 'user-1')).get();
    expect(sub!.status).toBe('canceled');
    expect(sub!.canceledAt).toBeDefined();
  });
  it('cancel throws if no subscription', async () => {
    await expect(cancelSubscription(db, mockRequest('admin-1'), 'user-1')).rejects.toThrow('No active subscription');
  });
  it('setSubscriptionStatus changes to past_due', async () => {
    await activateSubscription(db, mockRequest('admin-1'), 'user-1', 'pro');
    await setSubscriptionStatus(db, mockRequest('admin-1'), 'user-1', 'past_due');
    const sub = db.select().from(subscriptions).where(eq(subscriptions.userId, 'user-1')).get();
    expect(sub!.status).toBe('past_due');
  });
  it('getSubscriptionWithTier returns tier info', async () => {
    await activateSubscription(db, mockRequest('admin-1'), 'user-1', 'pro');
    const r = await getSubscriptionWithTier(db, 'user-1');
    expect(r!.tier.name).toBe('pro');
  });
  it('getUserSubscriptionInfo returns null for non-subscriber', async () => {
    expect(await getUserSubscriptionInfo(db, 'user-1')).toBeNull();
  });
  it('getUserSubscriptionInfo returns info', async () => {
    await activateSubscription(db, mockRequest('admin-1'), 'user-1', 'pro');
    const info = await getUserSubscriptionInfo(db, 'user-1');
    expect(info!.tier).toBe('pro');
    expect(info!.isGracePeriod).toBe(false);
  });
  it('getSubscriptionHistory returns events', async () => {
    await activateSubscription(db, mockRequest('admin-1'), 'user-1', 'pro');
    const h = await getSubscriptionHistory(db, 'user-1');
    expect(h.length).toBeGreaterThanOrEqual(1);
  });
  it('listSubscriptions returns all', async () => {
    await activateSubscription(db, mockRequest('admin-1'), 'user-1', 'pro');
    createTestUser(db, 'user-2');
    await activateSubscription(db, mockRequest('admin-1'), 'user-2', 'premium');
    expect(await listSubscriptions(db)).toHaveLength(2);
  });
  it('listSubscriptions filters by status', async () => {
    await activateSubscription(db, mockRequest('admin-1'), 'user-1', 'pro');
    await cancelSubscription(db, mockRequest('admin-1'), 'user-1');
    expect(await listSubscriptions(db, { status: 'active' })).toHaveLength(0);
    expect(await listSubscriptions(db, { status: 'canceled' })).toHaveLength(1);
  });
});

describe('Billing — subscription request approval', () => {
  let db: DrizzleDb;
  beforeEach(async () => {
    db = await createTestDb();
    ensureBillingTables(db);
    await seedRbac(db);
    await seedSubscriptionTiers(db);
    createTestUser(db, 'admin-1', RBAC_ROLES.ADMIN);
    createTestUser(db, 'user-1');
  });
  it('approves request and activates subscription', async () => {
    createSubscriptionRequest(db, { email: 'new@t.com', desiredTier: 'pro' });
    const req = db.select().from(subscriptionRequests).all()[0]!;
    await approveSubscriptionRequest(db, mockRequest('admin-1'), req.id, 'user-1', 'pro');
    expect((await getSubscriptionRequest(db, req.id))!.status).toBe('approved');
    expect((await getSubscription(db, 'user-1'))!.status).toBe('active');
  });
  it('rejects request with reason', async () => {
    createSubscriptionRequest(db, { email: 'x@t.com', desiredTier: 'pro' });
    const req = db.select().from(subscriptionRequests).all()[0]!;
    rejectSubscriptionRequest(db, mockRequest('admin-1'), req.id, 'Nope');
    const u = (await getSubscriptionRequest(db, req.id))!;
    expect(u.status).toBe('rejected');
    expect(u.processedComment).toBe('Nope');
  });
  it('requests info', async () => {
    createSubscriptionRequest(db, { email: 'y@t.com', desiredTier: 'pro' });
    const req = db.select().from(subscriptionRequests).all()[0]!;
    requestInfoSubscriptionRequest(db, mockRequest('admin-1'), req.id, 'More');
    expect((await getSubscriptionRequest(db, req.id))!.status).toBe('needs_info');
  });
});

describe('Billing — degradeExpiredSubscriptions', () => {
  let db: DrizzleDb;
  beforeEach(async () => {
    db = await createTestDb();
    ensureBillingTables(db);
    await seedRbac(db);
    await seedSubscriptionTiers(db);
    createTestUser(db, 'user-1');
  });
  it('keeps future subscription active', async () => {
    const future = Date.now() + 30 * 24 * 60 * 60 * 1000;
    db.insert(subscriptions).values({
      id: crypto.randomUUID(), userId: 'user-1', tierId: getTierId(db, 'pro'),
      status: 'active', currentPeriodStart: Date.now(), currentPeriodEnd: future,
      createdAt: Date.now(), updatedAt: Date.now(),
    }).run();
    expect((await degradeExpiredSubscriptions(db, {} as import('../config.js').ApiConfig)).degraded).toBe(0);
  });
  it('enters grace period when ended', async () => {
    const past = Date.now() - 1000;
    const id = crypto.randomUUID();
    db.insert(subscriptions).values({
      id, userId: 'user-1', tierId: getTierId(db, 'pro'),
      status: 'active', currentPeriodStart: past - 30 * 24 * 60 * 60 * 1000, currentPeriodEnd: past,
      createdAt: Date.now(), updatedAt: Date.now(),
    }).run();
    expect((await degradeExpiredSubscriptions(db, {} as import('../config.js').ApiConfig)).notified).toBe(1);
    expect(db.select().from(subscriptions).where(eq(subscriptions.id, id)).get()!.gracePeriodEnds).toBeDefined();
  });
  it('degrades after grace period', async () => {
    const longPast = Date.now() - 10 * 24 * 60 * 60 * 1000;
    const id = crypto.randomUUID();
    db.insert(subscriptions).values({
      id, userId: 'user-1', tierId: getTierId(db, 'pro'),
      status: 'active', currentPeriodStart: longPast - 30 * 24 * 60 * 60 * 1000, currentPeriodEnd: longPast,
      createdAt: Date.now(), updatedAt: Date.now(),
    }).run();
    expect((await degradeExpiredSubscriptions(db, {} as import('../config.js').ApiConfig)).degraded).toBe(1);
    expect(db.select().from(subscriptions).where(eq(subscriptions.id, id)).get()!.status).toBe('expired');
  });
});
