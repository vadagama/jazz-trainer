/**
 * Vercel serverless entry point — одна функция обрабатывает все /api/* запросы.
 *
 * Vercel Node.js runtime поддерживает нативные модули (better-sqlite3):
 * они компилируются при npm install и не бандлятся esbuild.
 *
 * Переключение на Turso — см. DEPLOYMENT.md §5.1.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

let handlerPromise: Promise<(req: VercelRequest, res: VercelResponse) => void> | null = null;

async function initHandler() {
  const { buildServer } = await import('../src/server.js');
  const { loadConfig } = await import('../src/config.js');
  const { createDb } = await import('../src/db/index.js');
  const { runMigrations } = await import('../src/db/migrate.js');
  const seedMod = await import('../src/db/seed.js');

  const config = loadConfig();

  // On Vercel, use /tmp for the DB file (writable, persists across warm starts).
  const dbPath =
    process.env.VERCEL_ENV === 'production' && !config.databaseUrl.startsWith('/')
      ? '/tmp/jazz-trainer.sqlite'
      : config.databaseUrl;

  const { db } = createDb(dbPath);
  runMigrations(db);

  // Seeds: system user, RBAC, subscription tiers (production-safe).
  seedMod.seedSystemUser(db);
  seedMod.seedRbac(db);
  seedMod.seedSubscriptionTiers(db);
  if (config.authDevMode) seedMod.seedDevUser(db);

  console.log('[api] serverless handler ready (db:', dbPath, ')');

  const app = await buildServer({ config, db });
  await app.ready();

  return (req: VercelRequest, res: VercelResponse) => {
    app.server.emit('request', req, res);
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!handlerPromise) {
    handlerPromise = initHandler();
  }
  const handle = await handlerPromise;
  handle(req, res);
}
