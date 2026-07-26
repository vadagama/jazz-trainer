import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import supertest, { type Agent } from 'supertest';
import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { buildServer } from '../src/server.js';
import { createTestDb } from '../src/db/testUtils.js';
import { seedRbac } from '../src/db/seed.js';
import { createSession } from '../src/services/auth.service.js';
import { users, auditLog, featureFlags } from '../src/db/schema.js';
import type { DrizzleDb } from '../src/db/index.js';

const SESSION_TTL = 30 * 24 * 60 * 60 * 1000;

async function makeApp(db: DrizzleDb): Promise<FastifyInstance> {
  return buildServer({
    config: { authDevMode: true, webOrigin: 'http://localhost:5173' },
    db,
  });
}

/**
 * Create a user with the given role and return a supertest agent that carries
 * an authenticated session cookie. RBAC is seeded so role→permissions resolution
 * works via the legacy users.role fallback.
 */
async function loginAs(
  db: DrizzleDb,
  agent: Agent,
  email: string,
  role: 'super_admin' | 'admin' | 'user',
): Promise<string> {
  // Upsert user via dev-login (creates a 'user' role row), then promote.
  const res = await agent.post('/api/auth/dev-login').send({ email, name: email });
  expect(res.status).toBe(200);
  const userId = res.body.user.id;
  db.update(users).set({ role }).where(eq(users.id, userId)).run();

  // Issue a fresh session and set the cookie manually.
  const sid = createSession(db, userId, SESSION_TTL);
  agent.set('Cookie', `sid=${sid}`);
  return userId;
}

describe('admin-flags routes', () => {
  let app: FastifyInstance;
  let agent: Agent;
  let db: DrizzleDb;

  beforeEach(async () => {
    db = createTestDb();
    seedRbac(db);
    app = await makeApp(db);
    await app.ready();
    agent = supertest.agent(app.server);
  });

  afterEach(() => app.close());

  // ── Auth / permission guard ────────────────────────────────────────────────

  it('GET /api/admin/flags returns 401 without auth', async () => {
    const res = await agent.get('/api/admin/flags');
    expect(res.status).toBe(401);
  });

  it('GET /api/admin/flags returns 403 for a plain user (no admin permission)', async () => {
    await loginAs(db, agent, 'plain@jazz-trainer.local', 'user');
    const res = await agent.get('/api/admin/flags');
    expect(res.status).toBe(403);
  });

  it('GET /api/admin/flags returns 200 for super_admin', async () => {
    await loginAs(db, agent, 'super@jazz-trainer.local', 'super_admin');
    const res = await agent.get('/api/admin/flags');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // ── CRUD lifecycle ────────────────────────────────────────────────────────

  it('full CRUD lifecycle: create → read → update → delete', async () => {
    await loginAs(db, agent, 'super@jazz-trainer.local', 'super_admin');

    // Create
    const created = await agent.post('/api/admin/flags').send({
      key: 'new-catalog-ui',
      description: 'Beta catalog UI experiment',
      category: 'experiment',
      enabled: true,
      roles: ['admin'],
      rolloutPercent: 30,
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      key: 'new-catalog-ui',
      enabled: true,
      category: 'experiment',
      rolloutPercent: 30,
      isExpired: false,
    });
    expect(created.body.roles).toEqual(['admin']);
    expect(created.body.createdBy).toBeTruthy();

    // Conflict on duplicate key
    const dup = await agent.post('/api/admin/flags').send({ key: 'new-catalog-ui' });
    expect(dup.status).toBe(409);

    // List
    const list = await agent.get('/api/admin/flags');
    expect(list.status).toBe(200);
    expect(list.body.some((f: { key: string }) => f.key === 'new-catalog-ui')).toBe(true);

    // Filter by category
    const filtered = await agent.get('/api/admin/flags?category=experiment');
    expect(filtered.body.every((f: { category: string }) => f.category === 'experiment')).toBe(
      true,
    );

    // Filter by status=enabled
    const enabled = await agent.get('/api/admin/flags?status=enabled');
    expect(enabled.body.every((f: { enabled: boolean }) => f.enabled)).toBe(true);

    // Get one (with history)
    const one = await agent.get('/api/admin/flags/new-catalog-ui');
    expect(one.status).toBe(200);
    expect(one.body.key).toBe('new-catalog-ui');
    expect(Array.isArray(one.body.history)).toBe(true);
    expect(one.body.history.length).toBeGreaterThanOrEqual(1);
    expect(one.body.history[0].action).toBe('flag.create');

    // Update
    const updated = await agent
      .patch('/api/admin/flags/new-catalog-ui')
      .send({ enabled: false, description: 'paused' });
    expect(updated.status).toBe(200);
    expect(updated.body.enabled).toBe(false);
    expect(updated.body.description).toBe('paused');

    // Delete
    const deleted = await agent.delete('/api/admin/flags/new-catalog-ui');
    expect(deleted.status).toBe(204);

    // Repeated GET → 404
    const gone = await agent.get('/api/admin/flags/new-catalog-ui');
    expect(gone.status).toBe(404);
  });

  // ── Validation ─────────────────────────────────────────────────────────────

  it('rejects empty key with 400', async () => {
    await loginAs(db, agent, 'super@jazz-trainer.local', 'super_admin');
    const res = await agent.post('/api/admin/flags').send({ key: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects invalid characters in key with 400', async () => {
    await loginAs(db, agent, 'super@jazz-trainer.local', 'super_admin');
    const res = await agent.post('/api/admin/flags').send({ key: 'New Feature!' });
    expect(res.status).toBe(400);
  });

  it('rejects out-of-range rolloutPercent with 400', async () => {
    await loginAs(db, agent, 'super@jazz-trainer.local', 'super_admin');
    const res = await agent
      .post('/api/admin/flags')
      .send({ key: 'bad-rollout', rolloutPercent: 150 });
    expect(res.status).toBe(400);
  });

  it('PATCH 404 for unknown key', async () => {
    await loginAs(db, agent, 'super@jazz-trainer.local', 'super_admin');
    const res = await agent.patch('/api/admin/flags/nope').send({ enabled: true });
    expect(res.status).toBe(404);
  });

  // ── Audit trail ─────────────────────────────────────────────────────────────

  it('records each mutation in audit_log', async () => {
    await loginAs(db, agent, 'super@jazz-trainer.local', 'super_admin');

    await agent.post('/api/admin/flags').send({ key: 'audited-flag', enabled: true });
    await agent.patch('/api/admin/flags/audited-flag').send({ enabled: false });
    await agent.delete('/api/admin/flags/audited-flag');

    const entries = db.select().from(auditLog).where(eq(auditLog.targetId, 'audited-flag')).all();
    const actions = entries.map((e) => e.action);
    expect(actions).toContain('flag.create');
    expect(actions).toContain('flag.update');
    expect(actions).toContain('flag.delete');
  });

  // ── Resolution integration (resolveFlags uses new columns) ────────────────

  it('expired flag resolves to false in /api/auth/me', async () => {
    // Seed a flag directly (bypass API) to control expiresAt precisely.
    db.insert(featureFlags)
      .values({
        key: 'expired-flag',
        enabled: true,
        expiresAt: Date.now() - 1000,
      })
      .run();

    await loginAs(db, agent, 'me@jazz-trainer.local', 'user');
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.flags['expired-flag']).toBe(false);
  });

  it('rolloutPercent=100 flag resolves to true in /api/auth/me', async () => {
    db.insert(featureFlags)
      .values({ key: 'full-rollout', enabled: true, rolloutPercent: 100 })
      .run();

    await loginAs(db, agent, 'me2@jazz-trainer.local', 'user');
    const me = await agent.get('/api/auth/me');
    expect(me.body.flags['full-rollout']).toBe(true);
  });
});
