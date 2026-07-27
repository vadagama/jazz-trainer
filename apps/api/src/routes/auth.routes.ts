import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { DrizzleDb } from '../db/index.js';
import type { ApiConfig } from '../config.js';
import { DevLoginSchema, SendMagicLinkSchema, ALL_FEATURE_CODES } from '@jazz/shared';
import {
  upsertUser,
  ensureUserSettings,
  createSession,
  deleteSession,
  toUserDTO,
  upsertUserByEmail,
  storeMagicLink,
  consumeMagicLink,
  getUserSessions,
  deleteSessionsExcept,
  computeFingerprint,
} from '../services/auth.service.js';
import type { UserRecord } from '../db/schema.js';
import { requireAuth } from '../plugins/auth.plugin.js';
import { resolvePermissions, resolveFlags } from '../services/rbac.service.js';
import {
  resolvePublicFeatureAccess,
  resolveUserFeatureAccess,
} from '../services/featureAccess.service.js';
import { users, userSettings, sessions, auditLog } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { sendMagicLink } from '../services/email.service.js';
import { withAuditSync, AUDIT_ACTIONS, writeAuditLog } from '../services/audit.service.js';
import { isTotpEnabled } from '../services/totp.service.js';

const SESSION_COOKIE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

/** OAuth state cookie uses lax to survive the cross-site redirect from the IdP. */
const OAUTH_STATE_COOKIE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

function isSqliteUniqueError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'SQLITE_CONSTRAINT_UNIQUE'
  );
}

// ── PKCE & nonce helpers ──────────────────────────────────────────────────

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function computeCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64url');
}

/**
 * Decode a JWT payload without verifying the signature.
 * Used only for extracting the `nonce` claim from an `id_token` that was
 * received directly from the provider's HTTPS token endpoint.
 */
function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8')) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}

// ── Magic Link JWT helpers ──────────────────────────────────────────────────

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;

/** Sign a payload as a HS256 JWT using the session secret. */
function signJwt(payload: Record<string, unknown>, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

/** Verify a HS256 JWT and return its payload, or null if invalid/expired. */
function verifyJwt(token: string, secret: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, bodyB64, sigB64] = parts as [string, string, string];
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`${headerB64}.${bodyB64}`)
      .digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sigB64), Buffer.from(expectedSig))) return null;
    const payload = JSON.parse(Buffer.from(bodyB64, 'base64url').toString('utf8')) as Record<
      string,
      unknown
    >;
    if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Create a magic link token (JWT) and store its hash in the DB. */
function createMagicLinkToken(db: DrizzleDb, email: string, secret: string): string {
  const now = Math.floor(Date.now() / 1000);
  const jti = crypto.randomUUID();
  const payload = {
    email,
    jti,
    iat: now,
    exp: now + MAGIC_LINK_TTL_MS / 1000,
  };
  const token = signJwt(payload, secret);
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  storeMagicLink(db, email, tokenHash, MAGIC_LINK_TTL_MS);
  return token;
}

// ── OAuth profiles ────────────────────────────────────────────────────────

/**
 * Google OAuth profile returned by the token-exchange step.
 */
export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

/** Result of a Google token exchange: user profile + raw id_token for nonce verification. */
export interface GoogleExchangeResult {
  profile: GoogleProfile;
  idToken: string;
}

/**
 * GitHub OAuth profile returned by the token-exchange step.
 */
export interface GitHubProfile {
  id: number;
  login: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
}

// ── Options ───────────────────────────────────────────────────────────────

export interface AuthRoutesOptions {
  db: DrizzleDb;
  config: ApiConfig;
  /** Override the real Google token exchange for testing. */
  exchangeGoogleCode?: (
    code: string,
    codeVerifier: string,
    config: ApiConfig,
  ) => Promise<GoogleExchangeResult>;
  /** Override the real GitHub token exchange for testing. */
  exchangeGitHubCode?: (
    code: string,
    codeVerifier: string,
    config: ApiConfig,
  ) => Promise<GitHubProfile>;
}

// ── Real OAuth exchanges ──────────────────────────────────────────────────

async function realGoogleExchange(
  code: string,
  codeVerifier: string,
  cfg: ApiConfig,
): Promise<GoogleExchangeResult> {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: cfg.googleClientId ?? '',
      client_secret: cfg.googleClientSecret ?? '',
      redirect_uri: cfg.googleCallbackUrl,
      code_verifier: codeVerifier,
      grant_type: 'authorization_code',
    }),
  });
  const tokens = (await tokenRes.json()) as { access_token?: string; id_token?: string };
  if (!tokens.access_token) throw new Error('No access_token from Google');

  const profileRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile = (await profileRes.json()) as GoogleProfile;
  return { profile, idToken: tokens.id_token ?? '' };
}

async function realGitHubExchange(
  code: string,
  codeVerifier: string,
  cfg: ApiConfig,
): Promise<GitHubProfile> {
  // Exchange code for access_token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      code,
      client_id: cfg.githubClientId ?? '',
      client_secret: cfg.githubClientSecret ?? '',
      redirect_uri: cfg.githubCallbackUrl,
      code_verifier: codeVerifier,
    }),
  });
  const tokens = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!tokens.access_token) {
    throw new Error(tokens.error_description ?? tokens.error ?? 'No access_token from GitHub');
  }

  // Fetch user profile
  const [userRes, emailsRes] = await Promise.all([
    fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: 'application/vnd.github+json',
      },
    }),
    fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: 'application/vnd.github+json',
      },
    }),
  ]);

  const ghUser = (await userRes.json()) as {
    id: number;
    login: string;
    name: string | null;
    avatar_url: string | null;
  };
  const emails = (await emailsRes.json()) as {
    email: string;
    primary: boolean;
    verified: boolean;
  }[];

  // Pick the primary verified email, or first verified, or first
  const primaryEmail =
    emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified) ?? emails[0];

  return {
    id: ghUser.id,
    login: ghUser.login,
    email: primaryEmail?.email ?? '',
    name: ghUser.name,
    avatar_url: ghUser.avatar_url,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Extract session metadata (ip, device, fingerprint) from the Fastify request.
 */
function extractSessionMeta(request: import('fastify').FastifyRequest): {
  ip?: string;
  deviceName?: string;
  fingerprint?: string;
} {
  const ip = request.ip;
  const userAgent = request.headers['user-agent'] ?? '';
  const fingerprint = ip ? computeFingerprint(ip, userAgent) : undefined;
  const deviceName = userAgent || undefined;
  return { ip, deviceName, fingerprint };
}

/**
 * Compose the effective permission payload for a user: RBAC permissions with
 * feature codes replaced by the 3-state feature resolution.
 */
async function composeMePayload(db: DrizzleDb, user: UserRecord) {
  const permSet = await resolvePermissions(db, user.id);
  for (const code of ALL_FEATURE_CODES) permSet.delete(code);
  const feature = await resolveUserFeatureAccess(db, user);
  for (const code of feature.active) permSet.add(code);
  const flags = await resolveFlags(db, user.role, user.id);
  const settings = await db
    .select({ theme: userSettings.theme })
    .from(userSettings)
    .where(eq(userSettings.userId, user.id))
    .get();
  return {
    user: toUserDTO(user),
    permissions: [...permSet],
    inactivePermissions: [...feature.inactive],
    flags,
    theme: settings?.theme ?? 'dark',
  };
}

/**
 * Link an OAuth provider to an existing user by email.
 * Updates the user's name/avatar and appends the provider to the providers list.
 */
async function linkProviderByEmail(
  db: DrizzleDb,
  email: string,
  provider: string,
  name: string,
  avatarUrl: string | null,
  requestIp?: string,
  userAgent?: string,
): Promise<UserRecord> {
  const existing = await db.select().from(users).where(eq(users.email, email)).get();
  if (!existing) throw new Error(`User with email ${email} not found`);

  let currentProviders: string[] = [];
  try {
    currentProviders = JSON.parse(existing.providers ?? '[]') as string[];
  } catch {
    /* keep empty */
  }
  const isNewLink = !currentProviders.includes(provider);
  const providerList = isNewLink ? [...currentProviders, provider] : currentProviders;

  const now = Date.now();
  const updated = {
    ...existing,
    name,
    avatarUrl: avatarUrl ?? existing.avatarUrl,
    providers: JSON.stringify(providerList),
    emailVerified: existing.emailVerified ? 1 : (provider !== 'magic_link' ? 1 : 0),
    updatedAt: now,
  };

  await db.update(users)
    .set({
      name: updated.name,
      avatarUrl: updated.avatarUrl,
      providers: updated.providers,
      emailVerified: updated.emailVerified,
      updatedAt: now,
    })
    .where(eq(users.id, existing.id))
    .run();

  if (isNewLink) {
    const auditId = crypto.randomUUID();
    await db.insert(auditLog)
      .values({
        id: auditId,
        actorUserId: existing.id,
        action: 'auth:oauth:linked',
        targetType: 'user',
        targetId: existing.id,
        before: JSON.stringify({ providers: currentProviders }),
        after: JSON.stringify({ providers: providerList, linkedProvider: provider }),
        timestamp: new Date(),
        ip: requestIp ?? null,
        userAgent: userAgent ?? null,
        reason: null,
      })
      .run();
  }

  return updated;
}

/**
 * Complete the OAuth login flow: upsert/link user, ensure settings, create session.
 * For super_admin with TOTP enabled, creates a pending-TOTP session.
 */
async function finishOAuthLogin(
  db: DrizzleDb,
  config: ApiConfig,
  reply: import('fastify').FastifyReply,
  provider: 'google' | 'github',
  providerId: string,
  email: string,
  name: string,
  avatarUrl: string | null,
  request: import('fastify').FastifyRequest,
  meta?: { ip?: string; deviceName?: string; fingerprint?: string },
) {
  let user: UserRecord;
  try {
    user = await upsertUser(db, { provider, providerId, email, name, avatarUrl });
  } catch (err) {
    if (isSqliteUniqueError(err)) {
      // Email already exists (e.g., from another provider). Link providers.
      user = await linkProviderByEmail(
        db,
        email,
        provider,
        name,
        avatarUrl,
        request.ip,
        request.headers['user-agent'],
      );
    } else {
      throw err;
    }
  }
  await ensureUserSettings(db, user.id);

  const needsTotp = user.role === 'super_admin' && (await isTotpEnabled(db, user.id));
  const sid = await createSession(db, user.id, config.sessionTtlMs, {
    ...meta,
    totpVerified: needsTotp ? 0 : 1,
  });
  reply.setCookie('sid', sid, SESSION_COOKIE);

  // Audit super_admin login
  if (user.role === 'super_admin') {
    await writeAuditLog(db, {
      actorUserId: user.id,
      action: 'auth:super_admin:login',
      targetType: 'user',
      targetId: user.id,
      after: { provider, email, totpRequired: needsTotp },
      ip: meta?.ip ?? request.ip ?? null,
      userAgent: meta?.deviceName ?? (request.headers['user-agent'] as string) ?? null,
    });
    const now = new Date().toISOString();
    console.log(`[security] super_admin login: ${email} at ${now} from ${meta?.ip ?? request.ip ?? 'unknown'} (${meta?.deviceName ?? request.headers['user-agent'] ?? 'unknown'})`);
  }
}

// ── Routes ────────────────────────────────────────────────────────────────

export async function authRoutes(app: FastifyInstance, opts: AuthRoutesOptions): Promise<void> {
  const { db, config } = opts;
  const exchangeGoogleCode = opts.exchangeGoogleCode ?? realGoogleExchange;
  const exchangeGitHubCode = opts.exchangeGitHubCode ?? realGitHubExchange;

  // ── GET /api/auth/me ───────────────────────────────────────────────────
  app.get('/api/auth/me', async (request, reply) => {
    const user = request.user;
    if (!user) {
      // Check for pending TOTP session (totpVerified == 0)
      const sid = request.cookies?.['sid'];
      if (sid) {
        const pendingSession = await db
          .select({ userId: sessions.userId, totpVerified: sessions.totpVerified })
          .from(sessions)
          .where(and(eq(sessions.id, sid), eq(sessions.totpVerified, 0)))
          .get();
        if (pendingSession) {
          const pendingUser = await db.select().from(users).where(eq(users.id, pendingSession.userId)).get();
          if (pendingUser) {
            return reply.send({
              user: null,
              totpRequired: true,
              email: pendingUser.email,
              permissions: [],
              inactivePermissions: [],
              flags: {},
              theme: null,
            });
          }
        }
      }
      const pub = await resolvePublicFeatureAccess(db);
      return reply.send({
        user: null,
        permissions: [...pub.active],
        inactivePermissions: [...pub.inactive],
        flags: {},
        theme: null,
      });
    }
    return reply.send(await composeMePayload(db, user));
  });

  // ── GET /api/auth/methods ─────────────────────────────────────────────
  app.get('/api/auth/methods', async () => ({
    google: Boolean(config.googleClientId),
    github: Boolean(config.githubClientId),
    magicLink: true,
    dev: config.authDevMode,
  }));

  // ── POST /api/auth/logout ──────────────────────────────────────────────
  app.post('/api/auth/logout', async (request, reply) => {
    const sid = request.cookies?.['sid'];
    if (sid) await deleteSession(db, sid);
    reply.clearCookie('sid', { path: '/' });
    return {};
  });

  // ── POST /api/auth/dev-login ───────────────────────────────────────────
  if (config.authDevMode) {
    app.post(
      '/api/auth/dev-login',
      { config: { rateLimit: { max: 5, timeWindow: 60_000 } } },
      async (request, reply) => {
        const parsed = DevLoginSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid body',
              details: parsed.error.errors,
            },
          });
        }
        const { email, name } = parsed.data;
        let user;
        try {
          user = await upsertUser(db, {
            provider: 'dev',
            providerId: email,
            email,
            name: name ?? email.split('@')[0] ?? email,
            avatarUrl: null,
          });
        } catch (err) {
          if (isSqliteUniqueError(err)) {
            return reply
              .status(409)
              .send({ error: { code: 'CONFLICT', message: 'Email already in use' } });
          }
          throw err;
        }
        await ensureUserSettings(db, user.id);
        const needsTotp = user.role === 'super_admin' && (await isTotpEnabled(db, user.id));
        const sid = await createSession(db, user.id, config.sessionTtlMs, {
          ...extractSessionMeta(request),
          totpVerified: needsTotp ? 0 : 1,
        });
        reply.setCookie('sid', sid, SESSION_COOKIE);
        if (needsTotp) {
          return { totpRequired: true };
        }
        return await composeMePayload(db, user);
      },
    );
  }

  // ── GET /api/auth/google ───────────────────────────────────────────────
  app.get(
    '/api/auth/google',
    { config: { rateLimit: { max: 10, timeWindow: 60_000 } } },
    async (request, reply) => {
      if (!config.googleClientId) {
        return reply.status(503).send({
          error: { code: 'INTERNAL', message: 'Google OAuth not configured' },
        });
      }

      const state = crypto.randomUUID();
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = computeCodeChallenge(codeVerifier);
      const nonce = generateNonce();

      reply.setCookie('oauth_state', state, { ...OAUTH_STATE_COOKIE, maxAge: 300 });
      reply.setCookie('oauth_code_verifier', codeVerifier, { ...OAUTH_STATE_COOKIE, maxAge: 300 });
      reply.setCookie('oauth_nonce', nonce, { ...OAUTH_STATE_COOKIE, maxAge: 300 });

      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      url.searchParams.set('client_id', config.googleClientId);
      url.searchParams.set('redirect_uri', config.googleCallbackUrl);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('scope', 'openid email profile');
      url.searchParams.set('state', state);
      url.searchParams.set('code_challenge', codeChallenge);
      url.searchParams.set('code_challenge_method', 'S256');
      url.searchParams.set('nonce', nonce);
      if (config.googleHd) {
        url.searchParams.set('hd', config.googleHd);
      }

      return reply.redirect(url.toString());
    },
  );

  // ── GET /api/auth/google/callback ──────────────────────────────────────
  app.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
    '/api/auth/google/callback',
    { config: { rateLimit: { max: 10, timeWindow: 60_000 } } },
    async (request, reply) => {
      const { code, state, error } = request.query;

      if (error || !code) {
        return reply.redirect(`${config.webOrigin}/login?error=oauth_denied`);
      }

      // CSRF check
      const storedState = request.cookies?.['oauth_state'];
      reply.clearCookie('oauth_state', { path: '/' });
      if (!storedState || storedState !== state) {
        reply.clearCookie('oauth_code_verifier', { path: '/' });
        reply.clearCookie('oauth_nonce', { path: '/' });
        return reply.redirect(`${config.webOrigin}/login?error=invalid_state`);
      }

      // PKCE
      const codeVerifier = request.cookies?.['oauth_code_verifier'] ?? '';
      reply.clearCookie('oauth_code_verifier', { path: '/' });

      // Nonce verification
      const expectedNonce = request.cookies?.['oauth_nonce'] ?? '';
      reply.clearCookie('oauth_nonce', { path: '/' });

      let result: GoogleExchangeResult;
      try {
        result = await exchangeGoogleCode(code, codeVerifier, config);
      } catch {
        return reply.redirect(`${config.webOrigin}/login?error=oauth_failed`);
      }

      // Verify nonce in id_token
      if (expectedNonce && result.idToken) {
        const payload = decodeJwtPayload(result.idToken);
        const tokenNonce = payload?.['nonce'];
        if (tokenNonce !== expectedNonce) {
          return reply.redirect(`${config.webOrigin}/login?error=invalid_nonce`);
        }
      }

      await finishOAuthLogin(
        db,
        config,
        reply,
        'google',
        result.profile.sub,
        result.profile.email,
        result.profile.name,
        result.profile.picture ?? null,
        request,
        extractSessionMeta(request),
      );

      return reply.redirect(config.webOrigin);
    },
  );

  // ── GET /api/auth/github ───────────────────────────────────────────────
  app.get(
    '/api/auth/github',
    { config: { rateLimit: { max: 10, timeWindow: 60_000 } } },
    async (request, reply) => {
      if (!config.githubClientId) {
        return reply.status(503).send({
          error: { code: 'INTERNAL', message: 'GitHub OAuth not configured' },
        });
      }

      const state = crypto.randomUUID();
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = computeCodeChallenge(codeVerifier);

      reply.setCookie('oauth_state', state, { ...OAUTH_STATE_COOKIE, maxAge: 300 });
      reply.setCookie('oauth_code_verifier', codeVerifier, { ...OAUTH_STATE_COOKIE, maxAge: 300 });

      const url = new URL('https://github.com/login/oauth/authorize');
      url.searchParams.set('client_id', config.githubClientId);
      url.searchParams.set('redirect_uri', config.githubCallbackUrl);
      url.searchParams.set('scope', 'user:email');
      url.searchParams.set('state', state);
      url.searchParams.set('code_challenge', codeChallenge);
      url.searchParams.set('code_challenge_method', 'S256');

      return reply.redirect(url.toString());
    },
  );

  // ── GET /api/auth/github/callback ──────────────────────────────────────
  app.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
    '/api/auth/github/callback',
    { config: { rateLimit: { max: 10, timeWindow: 60_000 } } },
    async (request, reply) => {
      const { code, state, error } = request.query;

      if (error || !code) {
        return reply.redirect(`${config.webOrigin}/login?error=oauth_denied`);
      }

      // CSRF check
      const storedState = request.cookies?.['oauth_state'];
      reply.clearCookie('oauth_state', { path: '/' });
      if (!storedState || storedState !== state) {
        reply.clearCookie('oauth_code_verifier', { path: '/' });
        return reply.redirect(`${config.webOrigin}/login?error=invalid_state`);
      }

      // PKCE
      const codeVerifier = request.cookies?.['oauth_code_verifier'] ?? '';
      reply.clearCookie('oauth_code_verifier', { path: '/' });

      let profile: GitHubProfile;
      try {
        profile = await exchangeGitHubCode(code, codeVerifier, config);
      } catch {
        return reply.redirect(`${config.webOrigin}/login?error=oauth_failed`);
      }

      if (!profile.email) {
        return reply.redirect(`${config.webOrigin}/login?error=no_email`);
      }

      await finishOAuthLogin(
        db,
        config,
        reply,
        'github',
        profile.id.toString(),
        profile.email,
        profile.name ?? profile.login,
        profile.avatar_url,
        request,
        extractSessionMeta(request),
      );

      return reply.redirect(config.webOrigin);
    },
  );

  // ── POST /api/auth/magic-link/send ────────────────────────────────────
  app.post(
    '/api/auth/magic-link/send',
    { config: { rateLimit: { max: 3, timeWindow: 5 * 60_000 } } },
    async (request, reply) => {
      const parsed = SendMagicLinkSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid email',
            details: parsed.error.errors,
          },
        });
      }

      const { email } = parsed.data;
      const token = createMagicLinkToken(db, email, config.sessionSecret);
      const verifyUrl = `${config.webOrigin}/api/auth/magic-link/verify?token=${encodeURIComponent(token)}`;

      // Audit: magic link sent
      await withAuditSync(db, request, 'auth:magic_link:sent', 'magic_link', email, {}, () => ({}));

      try {
        await sendMagicLink(config, email, verifyUrl);
      } catch (err) {
        console.error('[api] Failed to send magic link email:', err);
      }

      // Always return success to prevent email enumeration
      return reply.send({ ok: true });
    },
  );

  // ── GET /api/auth/magic-link/verify ────────────────────────────────────
  app.get<{ Querystring: { token?: string } }>(
    '/api/auth/magic-link/verify',
    async (request, reply) => {
      const { token } = request.query;

      if (!token) {
        return reply.redirect(`${config.webOrigin}/login?error=missing_token`);
      }

      const payload = verifyJwt(token, config.sessionSecret);
      if (!payload || typeof payload.email !== 'string') {
        return reply.redirect(`${config.webOrigin}/login?error=invalid_token`);
      }

      const email = payload.email;
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const verifiedEmail = await consumeMagicLink(db, tokenHash);
      if (!verifiedEmail || verifiedEmail !== email) {
        return reply.redirect(`${config.webOrigin}/login?error=expired_token`);
      }

      const user = await upsertUserByEmail(db, email, request.ip, request.headers['user-agent']);
      await ensureUserSettings(db, user.id);

      const needsTotp = user.role === 'super_admin' && (await isTotpEnabled(db, user.id));
      const sid = await createSession(db, user.id, config.sessionTtlMs, {
        ...extractSessionMeta(request),
        totpVerified: needsTotp ? 0 : 1,
      });
      reply.setCookie('sid', sid, SESSION_COOKIE);

      await withAuditSync(db, request, 'auth:magic_link:verified', 'magic_link', email, {}, () => ({}));

      if (user.role === 'super_admin') {
        await writeAuditLog(db, {
          actorUserId: user.id,
          action: 'auth:super_admin:login',
          targetType: 'user',
          targetId: user.id,
          after: { provider: 'magic_link', email, totpRequired: needsTotp },
          ip: request.ip ?? null,
          userAgent: (request.headers['user-agent'] as string) ?? null,
        });
        console.log(`[security] super_admin login (magic link): ${email} at ${new Date().toISOString()} from ${request.ip ?? 'unknown'}`);
      }

      if (needsTotp) {
        return reply.redirect(`${config.webOrigin}/login?totp=1`);
      }

      return reply.redirect(config.webOrigin);
    },
  );

  // ── GET /api/auth/sessions ────────────────────────────────────────────
  app.get('/api/auth/sessions', { preHandler: [requireAuth] }, async (request, reply) => {
    const allSessions = await getUserSessions(db, request.user!.id);
    const currentSid = request.cookies?.['sid'] ?? '';
    return reply.send(
      allSessions.map((s) => ({
        id: s.id,
        device: s.deviceName ?? 'Unknown',
        ip: s.ip ?? 'Unknown',
        createdAt: s.createdAt,
        lastUsedAt: s.lastUsedAt ?? s.createdAt,
        current: s.id === currentSid,
      })),
    );
  });

  // ── DELETE /api/auth/sessions/:id ─────────────────────────────────────
  app.delete<{ Params: { id: string } }>(
    '/api/auth/sessions/:id',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const session = await db
        .select()
        .from(sessions)
        .where(and(eq(sessions.id, request.params.id), eq(sessions.userId, request.user!.id)))
        .get();
      if (!session) {
        return reply
          .status(404)
          .send({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
      }

      await withAuditSync(
        db,
        request,
        AUDIT_ACTIONS.AUTH_SESSION_TERMINATED,
        'session',
        request.params.id,
        {
          before: {
            deviceName: session.deviceName,
            ip: session.ip,
            createdAt: session.createdAt,
            lastUsedAt: session.lastUsedAt,
          },
        },
        () => {
          deleteSession(db, request.params.id);
          return {};
        },
      );

      return {};
    },
  );

  // ── DELETE /api/auth/sessions ─────────────────────────────────────────
  app.delete('/api/auth/sessions', { preHandler: [requireAuth] }, async (request, reply) => {
    const currentSid = request.cookies?.['sid'] ?? '';
    if (!currentSid) return reply.send({});

    const terminatedSessions = (await getUserSessions(db, request.user!.id)).filter(
      (s) => s.id !== currentSid,
    );

    await withAuditSync(
      db,
      request,
      AUDIT_ACTIONS.AUTH_SESSIONS_TERMINATED_ALL,
      'session',
      request.user!.id,
      {
        before: {
          terminatedCount: terminatedSessions.length,
          sessionIds: terminatedSessions.map((s) => s.id),
        },
      },
      () => {
        deleteSessionsExcept(db, request.user!.id, currentSid);
        return { terminatedCount: terminatedSessions.length };
      },
    );

    return {};
  });

  // ── GET /api/auth/protected ────────────────────────────────────────────
  app.get('/api/auth/protected', { preHandler: [requireAuth] }, async (request) => ({
    userId: request.user!.id,
  }));
}
