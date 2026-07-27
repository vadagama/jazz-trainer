/**
 * Vercel serverless entry point.
 * Ленивая инициализация: первый запрос поднимает БД, последующие — мгновенные.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

let handlerPromise: Promise<(req: VercelRequest, res: VercelResponse) => void> | null = null;

async function initHandler() {
  console.log('[api] cold start begin');
  const t0 = Date.now();

  try {
    const { buildServer } = await import('../src/server.js');
    const { loadConfig } = await import('../src/config.js');
    const { createDb } = await import('../src/db/index.js');
    const { runMigrations } = await import('../src/db/migrate.js');

    const config = loadConfig();
    console.log('[api] config loaded, db url:', config.databaseUrl ? config.databaseUrl.substring(0, 40) + '...' : 'default');

    const handle = await createDb(config.databaseUrl, config.databaseAuthToken ?? undefined);
    console.log('[api] db created, kind:', handle.kind);

    await runMigrations(handle.db, handle);
    console.log('[api] migrations done');

    // Seeds — only if DB is empty (idempotent)
    const seedMod = await import('../src/db/seed.js');
    const billingMod = await import('../src/services/billing.service.js');
    await seedMod.seedSystemUser(handle.db);
    await seedMod.seedRbac(handle.db);
    await billingMod.seedSubscriptionTiers(handle.db);
    console.log('[api] seeds done');

    const app = await buildServer({ config, db: handle.db });
    await app.ready();
    console.log('[api] ready in', Date.now() - t0, 'ms');

    return (req: VercelRequest, res: VercelResponse) => {
      app.server.emit('request', req, res);
    };
  } catch (err) {
    console.error('[api] init failed:', (err as Error).message);
    throw err;
  }
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
