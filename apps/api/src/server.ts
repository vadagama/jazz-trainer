import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { loadConfig, type ApiConfig } from './config.js';

export interface BuildServerOptions {
  config?: ApiConfig;
}

/**
 * Build the Fastify application. Kept free of `listen` so tests can drive it
 * via `app.inject` / supertest without binding a port.
 */
export async function buildServer(opts: BuildServerOptions = {}): Promise<FastifyInstance> {
  const config = opts.config ?? loadConfig();
  const app = Fastify({ logger: false });

  await app.register(cors, {
    origin: config.webOrigin,
    credentials: true,
  });
  await app.register(cookie);

  // Liveness probe — public, no auth (see docs/04-api.md §7).
  app.get('/api/health', async () => ({ status: 'ok' }));

  return app;
}
