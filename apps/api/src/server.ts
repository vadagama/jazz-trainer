import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { loadConfig, type ApiConfig } from './config.js';
import { createDb, type DrizzleDb } from './db/index.js';
import { authPlugin } from './plugins/auth.plugin.js';
import { rbacPlugin } from './plugins/rbac.plugin.js';
import { authRoutes, type AuthRoutesOptions } from './routes/auth.routes.js';
import { settingsRoutes } from './routes/settings.routes.js';
import { compositionsRoutes } from './routes/compositions.routes.js';
import { catalogRoutes } from './routes/catalog.routes.js';
import { adminCatalogRoutes } from './routes/admin-catalog.routes.js';
import { patternsRoutes } from './routes/patterns.routes.js';
import { adminUsersRoutes } from './routes/admin-users.routes.js';
import { adminRolesRoutes } from './routes/admin-roles.routes.js';
import { devRoutes } from './routes/dev.routes.js';

export interface BuildServerOptions {
  /** Override loaded config (merged with defaults; useful in tests). */
  config?: Partial<ApiConfig>;
  /** Inject a pre-created DB (e.g. in-memory for tests). */
  db?: DrizzleDb;
  /** Override Google token exchange (tests). */
  exchangeGoogleCode?: AuthRoutesOptions['exchangeGoogleCode'];
}

const CONFIG_DEFAULTS: ApiConfig = {
  port: 3999,
  webOrigin: 'http://localhost:5173',
  authDevMode: false,
  databaseUrl: './data/jazz-trainer.sqlite',
  sessionSecret: 'dev-insecure-change-me',
  sessionTtlMs: 30 * 24 * 60 * 60 * 1000,
  googleClientId: null,
  googleClientSecret: null,
  googleCallbackUrl: 'http://localhost:3999/api/auth/google/callback',
};

/**
 * Build the Fastify application. Kept free of `listen` so tests can drive it
 * via `app.inject` / supertest without binding a port.
 */
export async function buildServer(opts: BuildServerOptions = {}): Promise<FastifyInstance> {
  const config: ApiConfig = { ...CONFIG_DEFAULTS, ...loadConfig(), ...opts.config };
  const db = opts.db ?? createDb(config.databaseUrl).db;

  const app = Fastify({ logger: false });

  await app.register(cors, {
    origin: config.webOrigin,
    credentials: true,
  });
  await app.register(cookie);

  // optional-auth: sets request.user on every request
  await app.register(authPlugin, { db });
  // RBAC: permission-check decorator + admin-route guard
  await app.register(rbacPlugin, { db });

  // Routes
  app.get('/api/health', async () => ({ status: 'ok' }));
  await app.register(authRoutes, { db, config, exchangeGoogleCode: opts.exchangeGoogleCode });
  await app.register(settingsRoutes, { prefix: '/api', db });
  await app.register(compositionsRoutes, { prefix: '/api', db });
  await app.register(catalogRoutes, { prefix: '/api', db });
  await app.register(adminCatalogRoutes, { prefix: '/api', db });
  await app.register(patternsRoutes, { prefix: '/api' });
  await app.register(adminUsersRoutes, { prefix: '/api', db });
  await app.register(adminRolesRoutes, { prefix: '/api', db });
  if (config.authDevMode) {
    await app.register(devRoutes, { prefix: '/api' });
  }

  return app;
}
