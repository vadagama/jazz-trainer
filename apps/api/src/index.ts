import { buildServer } from './server.js';
import { loadConfig } from './config.js';
import { createDb } from './db/index.js';
import { runMigrations } from './db/migrate.js';
import { seedSystemUser, seedDevUser, seedDemoGrids, seedRbac } from './db/seed.js';
import fs from 'node:fs';
import path from 'node:path';

// Log unhandled rejections and exceptions so we can diagnose silent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('[api] unhandledRejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (error) => {
  console.error('[api] uncaughtException:', error);
  process.exit(1);
});

async function main(): Promise<void> {
  const config = loadConfig();

  // Ensure the data directory exists before opening the SQLite file.
  if (config.databaseUrl !== ':memory:') {
    fs.mkdirSync(path.dirname(path.resolve(config.databaseUrl)), { recursive: true });
  }

  const { db, sqlite } = createDb(config.databaseUrl);
  runMigrations(db);
  seedSystemUser(db);
  seedRbac(db);
  seedDemoGrids(db);
  if (config.authDevMode) seedDevUser(db);

  const app = await buildServer({ config, db });

  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`[api] listening on http://localhost:${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown: close DB and server on SIGTERM/SIGINT
  const shutdown = async (signal: string) => {
    console.log(`[api] received ${signal}, shutting down...`);
    await app.close();
    sqlite.close();
    process.exit(0);
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

void main();
