import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import supertest, { type Agent } from 'supertest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../src/server.js';
import { createTestDb } from '../src/db/testUtils.js';
import { eq } from 'drizzle-orm';
import { users, sessions } from '../src/db/schema.js';
import type { DrizzleDb } from '../src/db/index.js';
import type { GoogleProfile } from '../src/routes/auth.routes.js';
import { createSession, computeFingerprint } from '../src/services/auth.service.js';

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
    // The system user owns 'system@amazilia.internal'. A dev-login attempt with
    // that email would create a new provider='dev' user, but the UNIQUE email
    // constraint prevents it — so it returns 409 CONFLICT.
    const res = await supertest(app.server)
      .post('/api/auth/dev-login')
      .send({ email: 'system@amazilia.internal' });
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
      exchangeGoogleCode: async () => ({ profile: fakeProfile, idToken: '' }),
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
      exchangeGoogleCode: async () => ({ profile: fakeProfile, idToken: '' }),
    });
    await app.ready();
    const res = await supertest(app.server)
      .get('/api/auth/google/callback?code=code&state=bad')
      .set('Cookie', 'oauth_state=different');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('invalid_state');
    await app.close();
  });

  it('passes PKCE code_verifier to the exchange function', async () => {
    let receivedCodeVerifier = '';
    const app = await buildServer({
      config: { authDevMode: false, webOrigin: 'http://localhost:5173', googleClientId: 'id' },
      db: createTestDb(),
      exchangeGoogleCode: async (_code, codeVerifier) => {
        receivedCodeVerifier = codeVerifier;
        return { profile: fakeProfile, idToken: '' };
      },
    });
    await app.ready();
    const agent = supertest.agent(app.server);

    const state = 'pkce-test-state';
    const verifier = 'test-code-verifier-value';
    await agent
      .get(`/api/auth/google/callback?code=code&state=${state}`)
      .set('Cookie', [`oauth_state=${state}`, `oauth_code_verifier=${verifier}`]);

    expect(receivedCodeVerifier).toBe(verifier);
    await app.close();
  });

  it('verifies nonce in id_token — accepts valid nonce', async () => {
    const nonce = 'test-nonce-value';
    const idToken = makeIdToken({ nonce });

    const app = await buildServer({
      config: { authDevMode: false, webOrigin: 'http://localhost:5173', googleClientId: 'id' },
      db: createTestDb(),
      exchangeGoogleCode: async () => ({ profile: fakeProfile, idToken }),
    });
    await app.ready();
    const agent = supertest.agent(app.server);

    const state = 'nonce-test-state';
    const res = await agent
      .get(`/api/auth/google/callback?code=code&state=${state}`)
      .set('Cookie', [`oauth_state=${state}`, `oauth_nonce=${nonce}`]);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('http://localhost:5173');

    const me = await agent.get('/api/auth/me');
    expect(me.body.user?.email).toBe('carol@gmail.com');
    await app.close();
  });

  it('verifies nonce in id_token — rejects mismatched nonce', async () => {
    const idToken = makeIdToken({ nonce: 'correct-nonce' });

    const app = await buildServer({
      config: { authDevMode: false, webOrigin: 'http://localhost:5173', googleClientId: 'id' },
      db: createTestDb(),
      exchangeGoogleCode: async () => ({ profile: fakeProfile, idToken }),
    });
    await app.ready();
    const agent = supertest.agent(app.server);

    const state = 'bad-nonce-state';
    const res = await agent
      .get(`/api/auth/google/callback?code=code&state=${state}`)
      .set('Cookie', [`oauth_state=${state}`, `oauth_nonce=wrong-nonce`]);

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('invalid_nonce');

    // User should NOT be logged in after nonce mismatch
    const me = await agent.get('/api/auth/me');
    expect(me.body.user).toBeNull();
    await app.close();
  });
});

// ── Helpers ────────────────────────────────────────────────────────────────

/** Create a fake base64url-encoded JWT for testing nonce verification. */
function makeIdToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.fake-sig`;
}

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

// ── Phase 10: Session management, fingerprint, sliding expiration ────────────

describe('session management (T-032)', () => {
  let app: FastifyInstance;
  let db: DrizzleDb;
  let agent: Agent;

  beforeEach(async () => {
    db = createTestDb();
    app = await buildServer({ config: { authDevMode: true, webOrigin: 'http://localhost:5173' }, db });
    await app.ready();
    agent = supertest.agent(app.server);
    await devLogin(agent);
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/auth/sessions returns sessions for the authenticated user', async () => {
    const agent2 = supertest.agent(app.server);
    await devLogin(agent2);

    const res = await agent.get('/api/auth/sessions');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    expect(res.body.some((s: { current: boolean }) => s.current)).toBe(true);
  });

  it('GET /api/auth/sessions returns 401 for anonymous', async () => {
    const anonAgent = supertest.agent(app.server);
    const res = await anonAgent.get('/api/auth/sessions');
    expect(res.status).toBe(401);
  });

  it('DELETE /api/auth/sessions/:id terminates a specific session', async () => {
    const agent2 = supertest.agent(app.server);
    await devLogin(agent2);

    const sessionsRes = await agent.get('/api/auth/sessions');
    const otherSession = (sessionsRes.body as { id: string; current: boolean }[]).find(
      (s) => !s.current,
    );
    expect(otherSession).toBeDefined();

    const delRes = await agent.delete(`/api/auth/sessions/${otherSession!.id}`);
    expect(delRes.status).toBe(200);

    const afterRes = await agent.get('/api/auth/sessions');
    const stillExists = (afterRes.body as { id: string }[]).some(
      (s) => s.id === otherSession!.id,
    );
    expect(stillExists).toBe(false);
  });

  it('DELETE /api/auth/sessions/:id returns 404 for non-owned session', async () => {
    const otherDb = createTestDb();
    const otherApp = await buildServer({
      config: { authDevMode: true, webOrigin: 'http://localhost:5173' },
      db: otherDb,
    });
    await otherApp.ready();
    const otherAgent = supertest.agent(otherApp.server);
    const otherRes = await devLogin(otherAgent, 'bob@example.com', 'Bob');
    const otherUserId = otherRes.body.user.id;
    const otherSid = createSession(otherDb, otherUserId, 86_400_000);
    await otherApp.close();

    const res = await agent.delete(`/api/auth/sessions/${otherSid}`);
    expect(res.status).toBe(404);
  });

  it('DELETE /api/auth/sessions terminates all sessions except current', async () => {
    const agent2 = supertest.agent(app.server);
    await devLogin(agent2);

    const before = await agent.get('/api/auth/sessions');
    expect(before.body.length).toBeGreaterThanOrEqual(2);

    const delRes = await agent.delete('/api/auth/sessions');
    expect(delRes.status).toBe(200);

    const after = await agent.get('/api/auth/sessions');
    expect(after.body.length).toBe(1);
    expect(after.body[0].current).toBe(true);

    const me2 = await agent2.get('/api/auth/me');
    expect(me2.body.user).toBeNull();
  });
});

describe('device fingerprint (T-033)', () => {
  let app: FastifyInstance;
  let db: DrizzleDb;
  let agent: Agent;

  beforeEach(async () => {
    db = createTestDb();
    app = await buildServer({ config: { authDevMode: true, webOrigin: 'http://localhost:5173' }, db });
    await app.ready();
    agent = supertest.agent(app.server);
    await devLogin(agent);
  });

  afterEach(async () => {
    await app.close();
  });

  it('stores fingerprint when creating a session', async () => {
    const dbSessions = db.select().from(sessions).all();
    // In test environment (supertest → 127.0.0.1), fingerprint should be set
    const withFp = dbSessions.filter((s) => s.fingerprint !== null);
    expect(withFp.length).toBeGreaterThan(0);
  });

  it('stores IP when creating a session', async () => {
    const dbSessions = db.select().from(sessions).all();
    const session = dbSessions[0];
    expect(session).toBeDefined();
    // IP should be set (supertest connects via 127.0.0.1)
    expect(session!.ip).toBeTruthy();
  });

  it('rejects request when fingerprint differs from the stored one', async () => {
    const sessionRes = await agent.get('/api/auth/sessions');
    const currentSid = (sessionRes.body as { id: string; current: boolean }[]).find(
      (s) => s.current,
    )?.id;
    expect(currentSid).toBeDefined();

    db.update(sessions)
      .set({ fingerprint: 'different-fingerprint-hash' })
      .where(eq(sessions.id, currentSid!))
      .run();

    const me = await agent.get('/api/auth/me');
    expect(me.body.user).toBeNull();
  });

  it('computeFingerprint is deterministic for same inputs', () => {
    const fp1 = computeFingerprint('192.168.1.100', 'Chrome/120');
    const fp2 = computeFingerprint('192.168.1.100', 'Chrome/120');
    expect(fp1).toBe(fp2);
  });

  it('computeFingerprint uses /24 IP prefix (ignores last octet)', () => {
    const fp1 = computeFingerprint('192.168.1.100', 'Chrome/120');
    const fp2 = computeFingerprint('192.168.1.200', 'Chrome/120');
    expect(fp1).toBe(fp2);
  });

  it('computeFingerprint changes with different user-agent', () => {
    const fp1 = computeFingerprint('192.168.1.100', 'Chrome/120');
    const fp2 = computeFingerprint('192.168.1.100', 'Firefox/121');
    expect(fp1).not.toBe(fp2);
  });
});

describe('sliding expiration (T-034)', () => {
  it('extends session on each authenticated request', async () => {
    const db = createTestDb();
    const app = await buildServer({ config: { authDevMode: true, webOrigin: 'http://localhost:5173' }, db });
    await app.ready();
    const agent = supertest.agent(app.server);
    await devLogin(agent);

    const sessionBefore = db.select().from(sessions).all()[0]!;
    const expiresBefore = sessionBefore.expiresAt;

    db.update(sessions)
      .set({ expiresAt: Date.now() + 5_000 })
      .where(eq(sessions.id, sessionBefore.id))
      .run();

    await agent.get('/api/auth/me');

    const sessionAfter = db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionBefore.id))
      .get()!;
    expect(sessionAfter.expiresAt).toBeGreaterThan(expiresBefore);

    await app.close();
  });

  it('deletes session when absolute TTL is exceeded', async () => {
    const db = createTestDb();
    const app = await buildServer({
      config: { authDevMode: true, webOrigin: 'http://localhost:5173' },
      db,
    });
    await app.ready();
    const agent = supertest.agent(app.server);
    await devLogin(agent);

    const dbSessions = db.select().from(sessions).all();
    const session = dbSessions[0]!;

    const farPast = Date.now() - 8 * 24 * 60 * 60 * 1000;
    db.update(sessions)
      .set({ createdAt: farPast })
      .where(eq(sessions.id, session.id))
      .run();

    const me = await agent.get('/api/auth/me');
    expect(me.body.user).toBeNull();

    const deleted = db.select().from(sessions).where(eq(sessions.id, session.id)).get();
    expect(deleted).toBeUndefined();

    await app.close();
  });

  it('bumps lastUsedAt on each request', async () => {
    const db = createTestDb();
    const app = await buildServer({ config: { authDevMode: true, webOrigin: 'http://localhost:5173' }, db });
    await app.ready();
    const agent = supertest.agent(app.server);
    await devLogin(agent);

    const sessionBefore = db.select().from(sessions).all()[0]!;
    const lastUsedBefore = sessionBefore.lastUsedAt;

    await new Promise((r) => setTimeout(r, 10));
    await agent.get('/api/auth/me');

    const sessionAfter = db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionBefore.id))
      .get()!;
    expect(sessionAfter.lastUsedAt).toBeGreaterThan(lastUsedBefore ?? 0);

    await app.close();
  });
});
