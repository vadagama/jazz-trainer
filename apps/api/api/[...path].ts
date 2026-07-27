/**
 * Vercel serverless entry point — одна функция обрабатывает все /api/* запросы.
 *
 * Использует Turso (@libsql/client) в production и better-sqlite3 локально.
 * Все запросы к БД — async (через `await`), совместимы с обоими драйверами.
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

  // Vercel production: Turso. Fallback: local SQLite in /tmp.
  const dbUrl = config.databaseUrl.startsWith('libsql://')
    ? config.databaseUrl
    : process.env.VERCEL_ENV
      ? '/tmp/jazz-trainer.sqlite'
      : config.databaseUrl;

  const handle = await createDb(dbUrl, process.env.DATABASE_AUTH_TOKEN);
  await runMigrations(handle.db, handle);

  // Seeds (idempotent).
  await seedMod.seedSystemUser(handle.db);
  await seedMod.seedRbac(handle.db);
  await seedMod.seedSubscriptionTiers(handle.db);
  if (config.authDevMode) await seedMod.seedDevUser(handle.db);

  console.log('[api] serverless handler ready (db:', dbUrl.startsWith('libsql://') ? 'turso' : 'sqlite', ')');

  const app = await buildServer({ config, db: handle.db });
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
