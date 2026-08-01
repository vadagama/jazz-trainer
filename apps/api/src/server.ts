import Fastify, { type FastifyInstance, type FastifyError } from 'fastify';
import cors from '@fastify/cors';
// eslint-disable-next-line import/default -- @fastify/cookie is CJS without ESM default export
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import { loadConfig, type ApiConfig } from './config.js';
import { createDb, type DrizzleDb } from './db/index.js';
import { authPlugin } from './plugins/auth.plugin.js';
import { rbacPlugin } from './plugins/rbac.plugin.js';
import { rateLimitPlugin } from './plugins/rate-limit.plugin.js';
import { adminIpFilterPlugin } from './plugins/admin-ip-filter.plugin.js';
import { authRoutes, type AuthRoutesOptions } from './routes/auth.routes.js';
import { settingsRoutes } from './routes/settings.routes.js';
import { compositionsRoutes } from './routes/compositions.routes.js';
import { catalogRoutes } from './routes/catalog.routes.js';
import { adminCatalogRoutes } from './routes/admin-catalog.routes.js';
import { patternsRoutes } from './routes/patterns.routes.js';
import { adminUsersRoutes } from './routes/admin-users.routes.js';
import { adminRolesRoutes } from './routes/admin-roles.routes.js';
import { adminFlagsRoutes } from './routes/admin-flags.routes.js';
import { adminFeatureAccessRoutes } from './routes/admin-feature-access.routes.js';
import { adminFeatureRoleStateRoutes } from './routes/admin-feature-role-state.routes.js';
import { defaultsRoutes } from './routes/defaults.routes.js';
import { devRoutes } from './routes/dev.routes.js';
import { adminSubscriptionsRoutes } from './routes/admin-subscriptions.routes.js';
import { subscriptionRequestRoutes } from './routes/subscription-request.routes.js';
import { subscriptionRoutes } from './routes/subscription.routes.js';
import { totpRoutes } from './routes/totp.routes.js';

export interface BuildServerOptions {
  /** Override loaded config (merged with defaults; useful in tests). */
  config?: Partial<ApiConfig>;
  /** Inject a pre-created DB (e.g. in-memory for tests). */
  db?: DrizzleDb;
  /** Override Google token exchange (tests). */
  exchangeGoogleCode?: AuthRoutesOptions['exchangeGoogleCode'];
  /** Override GitHub token exchange (tests). */
  exchangeGitHubCode?: AuthRoutesOptions['exchangeGitHubCode'];
}

const CONFIG_DEFAULTS: ApiConfig = {
  port: 3999,
  webOrigin: 'http://localhost:5173',
  authDevMode: false,
  devSecret: null,
  databaseUrl: './data/jazz-trainer.sqlite',
  databaseAuthToken: null,
  sessionSecret: 'dev-insecure-change-me',
  sessionTtlMs: 24 * 60 * 60 * 1000,
  sessionMaxAbsoluteTtlMs: 7 * 24 * 60 * 60 * 1000,
  googleClientId: null,
  googleClientSecret: null,
  googleCallbackUrl: 'http://localhost:3999/api/auth/google/callback',
  githubClientId: null,
  githubClientSecret: null,
  githubCallbackUrl: 'http://localhost:3999/api/auth/github/callback',
  googleHd: null,
  resendApiKey: null,
  emailFrom: 'noreply@amazilia.app',
  totpIssuer: 'Amazilia',
  superAdminSessionMaxAbsoluteTtlMs: 15 * 60 * 1000,
  adminIpAllowlist: null,
  superAdminEmails: [],
  superAdminGitHubLogins: [],
};

/**
 * Build the Fastify application. Kept free of `listen` so tests can drive it
 * via `app.inject` / supertest without binding a port.
 */
export async function buildServer(opts: BuildServerOptions = {}): Promise<FastifyInstance> {
  const config: ApiConfig = { ...CONFIG_DEFAULTS, ...loadConfig(), ...opts.config };
  // When authDevMode is explicitly enabled (e.g. in tests), dev-login should not
  // require a dev secret unless one is explicitly provided.
  if (opts.config?.authDevMode && opts.config?.devSecret === undefined) {
    config.devSecret = null;
  }
  const db = opts.db ?? (await createDb(config.databaseUrl, config.databaseAuthToken ?? undefined)).db;

  const app = Fastify({
    // Тесты гоняются с NODE_ENV=test и остаются тихими; в dev/prod пишем через pino.
    logger: process.env.NODE_ENV === 'test' ? false : { level: process.env.LOG_LEVEL ?? 'info' },
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    xContentTypeOptions: true,
    xFrameOptions: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });

  await app.register(cors, {
    origin: config.webOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  await app.register(cookie);
  await app.register(rateLimitPlugin);

  // optional-auth: sets request.user on every request
  await app.register(authPlugin, {
    db,
    sessionTtlMs: config.sessionTtlMs,
    maxAbsoluteTtlMs: config.sessionMaxAbsoluteTtlMs,
    superAdminMaxAbsoluteTtlMs: config.superAdminSessionMaxAbsoluteTtlMs,
  });
  // RBAC: permission-check decorator + admin-route guard
  await app.register(rbacPlugin, { db });
  // IP-allowlist for super_admin admin access
  await app.register(adminIpFilterPlugin, { allowlist: config.adminIpAllowlist });

  // Routes
  app.get('/api/health', async () => ({ status: 'ok' }));
  await app.register(authRoutes, {
    db,
    config,
    exchangeGoogleCode: opts.exchangeGoogleCode,
    exchangeGitHubCode: opts.exchangeGitHubCode,
  });
  await app.register(settingsRoutes, { prefix: '/api', db });
  await app.register(compositionsRoutes, { prefix: '/api', db });
  await app.register(catalogRoutes, { prefix: '/api', db });
  await app.register(adminCatalogRoutes, { prefix: '/api', db });
  await app.register(patternsRoutes, { prefix: '/api' });
  await app.register(adminUsersRoutes, { prefix: '/api', db });
  await app.register(adminRolesRoutes, { prefix: '/api', db });
  await app.register(adminFlagsRoutes, { prefix: '/api', db });
  await app.register(adminFeatureAccessRoutes, { prefix: '/api', db });
  await app.register(adminFeatureRoleStateRoutes, { prefix: '/api', db });
  await app.register(defaultsRoutes, { prefix: '/api', db });
  // Manual billing — admin
  await app.register(adminSubscriptionsRoutes, { prefix: '/api', db });
  // Public subscription request from landing
  await app.register(subscriptionRequestRoutes, { prefix: '/api', db });
  // User's own subscription info
  await app.register(subscriptionRoutes, { prefix: '/api', db });
  // TOTP 2FA routes
  await app.register(totpRoutes, { prefix: '/api', db, config });
  if (config.authDevMode) {
    await app.register(devRoutes, { prefix: '/api' });
  }

  // Единый обработчик ошибок: гарантирует контракт `{ error: { code, message } }`
  // на непойманных путях, логирует 5xx и не раскрывает внутренние детали клиенту.
  app.setErrorHandler((error: FastifyError, request, reply) => {
    const status =
      typeof error.statusCode === 'number' && error.statusCode >= 400 ? error.statusCode : 500;
    if (status >= 500) {
      request.log.error({ err: error }, 'unhandled route error');
      return reply.status(status).send({
        error: { code: 'INTERNAL_ERROR', message: 'Internal error' },
      });
    }
    request.log.warn({ err: error }, 'request error');
    return reply.status(status).send({
      error: { code: error.code ?? 'BAD_REQUEST', message: error.message },
    });
  });

  return app;
}
