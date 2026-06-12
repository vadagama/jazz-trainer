import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import supertest, { type Agent } from 'supertest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../src/server.js';
import { createTestDb } from '../src/db/testUtils.js';
import { eq } from 'drizzle-orm';
import { users } from '../src/db/schema.js';
import type { DrizzleDb } from '../src/db/index.js';
import type { GoogleProfile } from '../src/routes/auth.routes.js';

async function makeApp(dbOverride?: DrizzleDb): Promise<FastifyInstance> {
  const db = dbOverride ?? createTestDb();
  return buildServer({
    config: { authDevMode: true, webOrigin: 'http://localhost:5173' },
    db,
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function devLogin(agent: Agent, email = 'alice@example.com', name = 'Alice') {
  return agent.post('/api/auth/dev-login').send({ email, name });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('dev-login flow', () => {
  let app: FastifyInstance;
  let agent: Agent;

  beforeEach(async () => {
    app = await makeApp();
    await app.ready();
    agent = supertest.agent(app.server);
  });

  afterEach(async () => {
    await app.close();
  });

  it('creates user + settings and returns UserDTO', async () => {
    const res = await devLogin(agent);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      email: 'alice@example.com',
      name: 'Alice',
      provider: 'dev',
    });
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('is idempotent — logging in twice returns the same user id', async () => {
    const first = await devLogin(agent);
    const second = await devLogin(agent);
    expect(second.body.user.id).toBe(first.body.user.id);
  });

  it('derives name from email when name is omitted', async () => {
    const res = await agent.post('/api/auth/dev-login').send({ email: 'bob@example.com' });
    expect(res.body.user.name).toBe('bob');
  });

  it('/me returns the logged-in user after dev-login', async () => {
    await devLogin(agent);
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user?.email).toBe('alice@example.com');
  });

  it('logout clears session and /me returns null', async () => {
    await devLogin(agent);
    await agent.post('/api/auth/logout');
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user).toBeNull();
  });
});

describe('anonymous access', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await makeApp();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/auth/me returns { user: null } with 200 (not 401)', async () => {
    const res = await supertest(app.server).get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ user: null });
  });

  it('require-auth route returns 401 for anonymous', async () => {
    const res = await supertest(app.server).get('/api/auth/protected');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('require-auth route returns 200 after login', async () => {
    const agent = supertest.agent(app.server);
    await devLogin(agent);
    const res = await agent.get('/api/auth/protected');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('userId');
  });
});

describe('dev-login not available outside AUTH_DEV_MODE', () => {
  it('returns 404 when AUTH_DEV_MODE is off', async () => {
    const app = await buildServer({
      config: { authDevMode: false },
      db: createTestDb(),
    });
    await app.ready();
    const res = await supertest(app.server).post('/api/auth/dev-login').send({ email: 'x@x.com' });
    expect(res.status).toBe(404);
    await app.close();
  });
});

describe('system user', () => {
  it('exists in the DB after seed with provider=system', async () => {
    const db = createTestDb();
    const sys = db.select().from(users).where(eq(users.id, 'system')).get();
    expect(sys).toBeDefined();
    expect(sys!.provider).toBe('system');
  });

  it('dev-login with system user email returns 409 (email already taken)', async () => {
    const app = await makeApp();
    await app.ready();
    // The system user owns 'system@jazz-trainer.internal'. A dev-login attempt with
    // that email would create a new provider='dev' user, but the UNIQUE email
    // constraint prevents it — so it returns 409 CONFLICT.
    const res = await supertest(app.server)
      .post('/api/auth/dev-login')
      .send({ email: 'system@jazz-trainer.internal' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
    await app.close();
  });
});

describe('Google OAuth callback (mocked exchange)', () => {
  const fakeProfile: GoogleProfile = {
    sub: 'google-sub-123',
    email: 'carol@gmail.com',
    name: 'Carol',
    picture: 'https://example.com/pic.jpg',
  };

  it('creates user and session on successful callback', async () => {
    const db = createTestDb();
    const app = await buildServer({
      config: { authDevMode: false, webOrigin: 'http://localhost:5173', googleClientId: 'id' },
      db,
      exchangeGoogleCode: async () => fakeProfile,
    });
    await app.ready();
    const agent = supertest.agent(app.server);

    // Set the oauth_state cookie manually (skipping the redirect step)
    const state = 'test-state';
    const res = await agent
      .get(`/api/auth/google/callback?code=anycode&state=${state}`)
      .set('Cookie', `oauth_state=${state}`);

    // Should redirect to webOrigin
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('http://localhost:5173');
    expect(res.headers['set-cookie']).toBeDefined();

    // /me should now return the Google user
    const me = await agent.get('/api/auth/me');
    expect(me.body.user?.email).toBe('carol@gmail.com');
    expect(me.body.user?.provider).toBe('google');

    await app.close();
  });

  it('redirects with error when state is invalid (CSRF)', async () => {
    const app = await buildServer({
      config: { authDevMode: false, webOrigin: 'http://localhost:5173', googleClientId: 'id' },
      db: createTestDb(),
      exchangeGoogleCode: async () => fakeProfile,
    });
    await app.ready();
    const res = await supertest(app.server)
      .get('/api/auth/google/callback?code=code&state=bad')
      .set('Cookie', 'oauth_state=different');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('invalid_state');
    await app.close();
  });
});

describe('permission helper scaffold (A vs B)', () => {
  it('two users share the same DB but get different UUIDs', async () => {
    const db = createTestDb();
    const app = await buildServer({ config: { authDevMode: true }, db });
    await app.ready();

    const agentA = supertest.agent(app.server);
    const agentB = supertest.agent(app.server);

    const resA = await devLogin(agentA, 'userA@example.com', 'User A');
    const resB = await devLogin(agentB, 'userB@example.com', 'User B');

    expect(resA.body.user.id).not.toBe(resB.body.user.id);

    // Both can access /me independently
    const meA = await agentA.get('/api/auth/me');
    const meB = await agentB.get('/api/auth/me');
    expect(meA.body.user.email).toBe('userA@example.com');
    expect(meB.body.user.email).toBe('userB@example.com');

    await app.close();
  });
});
