/**
 * Vercel serverless entry point — одна функция обрабатывает все /api/* запросы.
 *
 * Все импорты — динамические (esbuild не бандлит native-модули).
 * Vercel сначала выполняет installCommand (npm install), затем buildCommand (tsup),
 * и только потом компилирует этот файл — зависимости уже установлены.
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

  // Turso (production) или локальный SQLite
  const dbUrl = config.databaseUrl.startsWith('libsql://')
    ? config.databaseUrl
    : '/tmp/jazz-trainer.sqlite';

  const handle = await createDb(dbUrl, process.env.DATABASE_AUTH_TOKEN);
  await runMigrations(handle.db, handle);

  await seedMod.seedSystemUser(handle.db);
  await seedMod.seedRbac(handle.db);
  await seedMod.seedSubscriptionTiers(handle.db);
  if (config.authDevMode) await seedMod.seedDevUser(handle.db);

  console.log('[api] serverless ready:', dbUrl.startsWith('libsql://') ? 'turso' : 'sqlite');

  const app = await buildServer({ config, db: handle.db });
  await app.ready();

  return (req: VercelRequest, res: VercelResponse) => {
    app.server.emit('request', req, res);
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!handlerPromise) handlerPromise = initHandler();
  const handle = await handlerPromise;
  handle(req, res);
}
