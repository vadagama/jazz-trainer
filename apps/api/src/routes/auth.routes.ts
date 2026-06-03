import type { FastifyInstance } from 'fastify';
import type { DrizzleDb } from '../db/index.js';
import type { ApiConfig } from '../config.js';
import { DevLoginSchema } from '@jazz/shared';
import {
  upsertUser,
  ensureUserSettings,
  createSession,
  deleteSession,
  toUserDTO,
} from '../services/auth.service.js';
import { requireAuth } from '../plugins/auth.plugin.js';

const COOKIE_OPTS = { httpOnly: true, sameSite: 'lax', path: '/' } as const;

function isSqliteUniqueError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'SQLITE_CONSTRAINT_UNIQUE'
  );
}

/**
 * Google OAuth profile returned by the token-exchange step.
 * The `exchangeCode` option lets tests inject a mock instead of calling Google.
 */
export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

export interface AuthRoutesOptions {
  db: DrizzleDb;
  config: ApiConfig;
  /** Override the real Google token exchange for testing. */
  exchangeGoogleCode?: (code: string, config: ApiConfig) => Promise<GoogleProfile>;
}

async function realGoogleExchange(code: string, cfg: ApiConfig): Promise<GoogleProfile> {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: cfg.googleClientId ?? '',
      client_secret: cfg.googleClientSecret ?? '',
      redirect_uri: cfg.googleCallbackUrl,
      grant_type: 'authorization_code',
    }),
  });
  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) throw new Error('No access_token from Google');

  const profileRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  return profileRes.json() as Promise<GoogleProfile>;
}

export async function authRoutes(app: FastifyInstance, opts: AuthRoutesOptions): Promise<void> {
  const { db, config } = opts;
  const exchangeCode = opts.exchangeGoogleCode ?? realGoogleExchange;

  // ── GET /api/auth/me ─────────────────────────────────────────────────────
  // Public: returns { user } or { user: null } — never 401.
  app.get('/api/auth/me', async (request) => ({
    user: request.user ? toUserDTO(request.user) : null,
  }));

  // ── POST /api/auth/logout ────────────────────────────────────────────────
  app.post('/api/auth/logout', async (request, reply) => {
    const sid = request.cookies?.['sid'];
    if (sid) deleteSession(db, sid);
    reply.clearCookie('sid', { path: '/' });
    return {};
  });

  // ── POST /api/auth/dev-login ─────────────────────────────────────────────
  // Only available when AUTH_DEV_MODE=true.
  if (config.authDevMode) {
    app.post('/api/auth/dev-login', async (request, reply) => {
      const parsed = DevLoginSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid body', details: parsed.error.errors },
        });
      }
      const { email, name } = parsed.data;
      let user;
      try {
        user = upsertUser(db, {
          provider: 'dev',
          providerId: email,
          email,
          name: name ?? email.split('@')[0] ?? email,
          avatarUrl: null,
        });
      } catch (err) {
        if (isSqliteUniqueError(err)) {
          return reply.status(409).send({ error: { code: 'CONFLICT', message: 'Email already in use' } });
        }
        throw err;
      }
      ensureUserSettings(db, user.id);
      const sid = createSession(db, user.id, config.sessionTtlMs);
      reply.setCookie('sid', sid, COOKIE_OPTS);
      return { user: toUserDTO(user) };
    });
  }

  // ── GET /api/auth/google ─────────────────────────────────────────────────
  app.get('/api/auth/google', async (request, reply) => {
    if (!config.googleClientId) {
      return reply.status(503).send({
        error: { code: 'INTERNAL', message: 'Google OAuth not configured' },
      });
    }
    const state = crypto.randomUUID();
    reply.setCookie('oauth_state', state, { ...COOKIE_OPTS, maxAge: 300 });
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', config.googleClientId);
    url.searchParams.set('redirect_uri', config.googleCallbackUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', state);
    return reply.redirect(url.toString());
  });

  // ── GET /api/auth/google/callback ────────────────────────────────────────
  app.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
    '/api/auth/google/callback',
    async (request, reply) => {
      const { code, state, error } = request.query;

      if (error || !code) {
        return reply.redirect(`${config.webOrigin}/login?error=oauth_denied`);
      }

      // CSRF check
      const storedState = request.cookies?.['oauth_state'];
      reply.clearCookie('oauth_state', { path: '/' });
      if (!storedState || storedState !== state) {
        return reply.redirect(`${config.webOrigin}/login?error=invalid_state`);
      }

      let profile: GoogleProfile;
      try {
        profile = await exchangeCode(code, config);
      } catch {
        return reply.redirect(`${config.webOrigin}/login?error=oauth_failed`);
      }

      const user = upsertUser(db, {
        provider: 'google',
        providerId: profile.sub,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.picture ?? null,
      });
      ensureUserSettings(db, user.id);
      const sid = createSession(db, user.id, config.sessionTtlMs);
      reply.setCookie('sid', sid, COOKIE_OPTS);
      return reply.redirect(config.webOrigin);
    },
  );

  // ── GET /api/auth/me (demo private endpoint for require-auth testing) ─────
  // A protected route example used in tests to verify the require-auth guard.
  app.get('/api/auth/protected', { preHandler: [requireAuth] }, async (request) => ({
    userId: request.user!.id,
  }));
}
