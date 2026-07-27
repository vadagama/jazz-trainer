/**
 * Vercel serverless entry point.
 * Статические импорты — esbuild бандлит всё (разрешает workspace-пакеты).
 * Только createDb использует динамический импорт better-sqlite3 (native).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildServer } from '../src/server.js';
import { loadConfig } from '../src/config.js';
import { createDb } from '../src/db/index.js';
import { runMigrations } from '../src/db/migrate.js';
import { seedSystemUser, seedRbac } from '../src/db/seed.js';
import { seedSubscriptionTiers } from '../src/services/billing.service.js';

let handlerPromise: Promise<(req: VercelRequest, res: VercelResponse) => void> | null = null;

async function initHandler() {
  console.log('[api] cold start begin');
  const t0 = Date.now();

  const config = loadConfig();
  console.log('[api] config loaded, db:', config.databaseUrl ? config.databaseUrl.substring(0, 50) + '...' : 'default');

  const handle = await createDb(config.databaseUrl, config.databaseAuthToken ?? undefined);
  console.log('[api] db created, kind:', handle.kind);

  await runMigrations(handle.db, handle);
  console.log('[api] migrations done');

  await seedSystemUser(handle.db);
  await seedRbac(handle.db);
  await seedSubscriptionTiers(handle.db);
  console.log('[api] seeds done');

  const app = await buildServer({ config, db: handle.db });
  await app.ready();
  console.log('[api] ready in', Date.now() - t0, 'ms');

  return (req: VercelRequest, res: VercelResponse) => {
    app.server.emit('request', req, res);
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!handlerPromise) handlerPromise = initHandler();
  try {
    const handle = await handlerPromise;
    handle(req, res);
  } catch (err) {
    console.error('[api] handler error:', (err as Error).message);
    res.status(500).send({ error: { code: 'INIT_FAILED', message: (err as Error).message } });
  }
}
