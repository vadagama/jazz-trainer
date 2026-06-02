import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { loadConfig, type ApiConfig } from './config.js';
import { createDb, type DrizzleDb } from './db/index.js';
import { authPlugin } from './plugins/auth.plugin.js';
import { authRoutes, type AuthRoutesOptions } from './routes/auth.routes.js';

export interface BuildServerOptions {
  /** Override loaded config (merged with defaults; useful in tests). */
  config?: Partial<ApiConfig>;
  /** Inject a pre-created DB (e.g. in-memory for tests). */
  db?: DrizzleDb;
  /** Override Google token exchange (tests). */
  exchangeGoogleCode?: AuthRoutesOptions['exchangeGoogleCode'];
}

const CONFIG_DEFAULTS: ApiConfig = {
  port: 3000,
  webOrigin: 'http://localhost:5173',
  authDevMode: false,
  databaseUrl: './data/jazz-trainer.sqlite',
  sessionSecret: 'dev-insecure-change-me',
  sessionTtlMs: 30 * 24 * 60 * 60 * 1000,
  googleClientId: null,
  googleClientSecret: null,
  googleCallbackUrl: 'http://localhost:3000/api/auth/google/callback',
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

  // Routes
  app.get('/api/health', async () => ({ status: 'ok' }));
  await app.register(authRoutes, { db, config, exchangeGoogleCode: opts.exchangeGoogleCode });

  return app;
}
