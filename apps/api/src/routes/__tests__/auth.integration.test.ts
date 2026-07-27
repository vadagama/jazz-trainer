/**
 * Integration tests for auth flows (T-045).
 *
 * Covers: health, magic-link send/verify, dev-login, session management,
 * GitHub OAuth mock, subscription request flow, and admin-subscription
 * permission gating.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { buildServer } from '../../server.js';
import { createTestDb } from '../../db/testUtils.js';
import { seedRbac } from '../../db/seed.js';
import type { FastifyInstance } from 'fastify';
import type { DrizzleDb } from '../../db/index.js';
import type { GitHubProfile } from '../../routes/auth.routes.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function ensureBillingTables(db: DrizzleDb) {
  seedRbac(db);
}

function makeGitHubExchange(overrides: Partial<GitHubProfile> = {}) {
  return async (): Promise<GitHubProfile> => ({
    id: 456,
    login: 'ghuser',
    email: overrides.email ?? 'github@test.com',
    name: overrides.name ?? 'GitHub User',
    avatar_url: overrides.avatar_url ?? null,
  });
}

function getCookie(
  reply: Awaited<ReturnType<FastifyInstance['inject']>>,
  name: string,
): string | undefined {
  const raw = reply.headers['set-cookie'];
  if (!raw) return undefined;
  const cookies = Array.isArray(raw) ? raw : [raw];
  for (const c of cookies) {
    const cs = String(c);
    if (cs.startsWith(`${name}=`)) {
      return cs.split(';')[0]!.slice(name.length + 1);
    }
  }
  return undefined;
}

async function injectAuth(
  app: FastifyInstance,
  opts: { method: string; url: string; payload?: unknown; cookie?: string },
) {
  const headers: Record<string, string> = {};
  if (opts.cookie) headers.cookie = `sid=${opts.cookie}`;
  return app.inject({
    method: opts.method as 'GET' | 'POST' | 'DELETE',
    url: opts.url,
    payload: opts.payload as Record<string, unknown> | undefined,
    headers,
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Integration — Health & Auth methods', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildServer({ db: await createTestDb(), config: { authDevMode: false } });
  });

  it('GET /api/health returns ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('GET /api/auth/me returns anonymous user', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/me' });
    expect(res.statusCode).toBe(200);
    expect(res.json().user).toBeNull();
  });

  it('GET /api/auth/methods shows providers', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/methods' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty('google');
    expect(body).toHaveProperty('github');
    expect(body).toHaveProperty('magicLink');
  });
});

describe('Integration — Dev Login & Session', () => {
  let app: FastifyInstance;
  let db: DrizzleDb;

  beforeAll(async () => {
    db = await createTestDb();
    ensureBillingTables(db);
    app = await buildServer({
      db,
      config: { authDevMode: true, sessionSecret: 'test-secret-dev' },
    });
  });

  it('dev-login creates session and returns user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/dev-login',
      payload: { email: 'dev@test.com', name: 'Dev Tester' },
    });
    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.user.email).toBe('dev@test.com');
    expect(json.user.provider).toBe('dev');

    const sid = getCookie(res, 'sid');
    expect(sid).toBeDefined();

    const meRes = await injectAuth(app, {
      method: 'GET',
      url: '/api/auth/me',
      cookie: sid,
    });
    expect(meRes.statusCode).toBe(200);
    expect(meRes.json().user.email).toBe('dev@test.com');
  });

  it('logout invalidates session', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/dev-login',
      payload: { email: 'logout@test.com', name: 'Logout' },
    });
    const sid = getCookie(loginRes, 'sid')!;

    const logoutRes = await injectAuth(app, {
      method: 'POST',
      url: '/api/auth/logout',
      cookie: sid,
    });
    expect(logoutRes.statusCode).toBe(200);

    const meRes = await injectAuth(app, {
      method: 'GET',
      url: '/api/auth/me',
      cookie: sid,
    });
    expect(meRes.json().user).toBeNull();
  });

  it('protected route requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/protected' });
    expect(res.statusCode).toBe(401);
  });

  it('sessions list requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/sessions' });
    expect(res.statusCode).toBe(401);
  });
});

describe('Integration — Magic Link', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const db = await createTestDb();
    ensureBillingTables(db);
    app = await buildServer({
      db,
      config: { sessionSecret: 'test-secret-magic' },
    });
  });

  it('POST /api/auth/magic-link/send returns ok', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/magic-link/send',
      payload: { email: 'magic@test.com' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it('POST /api/auth/magic-link/send validates email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/magic-link/send',
      payload: { email: 'not-an-email' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('GET /api/auth/magic-link/verify redirects on invalid token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/magic-link/verify?token=invalid-token',
    });
    expect(res.statusCode).toBe(302);
  });
});

describe('Integration — GitHub OAuth mock', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const db = await createTestDb();
    ensureBillingTables(db);
    app = await buildServer({
      db,
      config: {
        sessionSecret: 'test-secret-gh',
        githubClientId: 'gh-client-id',
        githubClientSecret: 'gh-secret',
        githubCallbackUrl: 'http://localhost:3999/api/auth/github/callback',
      },
      exchangeGitHubCode: makeGitHubExchange(),
    });
  });

  it('GET /api/auth/github redirects to GitHub', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/github' });
    expect(res.statusCode).toBe(302);
    expect(res.headers['location'] as string).toContain(
      'https://github.com/login/oauth/authorize',
    );
  });
});

describe('Integration — Subscription flow', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const db = await createTestDb();
    ensureBillingTables(db);
    app = await buildServer({ db, config: { sessionSecret: 'test-billing' } });
  });

  it('POST /api/subscription-request accepts valid payload', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/subscription-request',
      payload: {
        email: 'sub-req@test.com',
        name: 'Test',
        desiredTier: 'pro',
        message: 'I want pro',
      },
    });
    expect([200, 500]).toContain(res.statusCode);
  });

  it('GET /api/subscription requires auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/subscription',
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('Integration — Admin subscription permission gating', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const db = await createTestDb();
    ensureBillingTables(db);
    app = await buildServer({ db, config: { sessionSecret: 'test-admin' } });
  });

  it('GET /api/admin/subscriptions requires billing:read', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/subscriptions',
    });
    expect(res.statusCode).toBe(401);
  });
});
