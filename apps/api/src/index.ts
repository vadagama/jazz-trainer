import { buildServer } from './server.js';
import { loadConfig } from './config.js';
import { createDb } from './db/index.js';
import { runMigrations } from './db/migrate.js';
import { seedSystemUser, seedDevUser, seedDemoCompositions, seedRbac } from './db/seed.js';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

  // Ensure the data directory exists before drizzle-kit or SQLite needs it.
  if (config.databaseUrl !== ':memory:') {
    fs.mkdirSync(path.dirname(path.resolve(config.databaseUrl)), { recursive: true });
  }

  const { db, sqlite } = createDb(config.databaseUrl);
  runMigrations(db);

  // Auto-generate migrations from schema changes AFTER migrations are applied.
  // Drizzle needs the DB to exist and be up-to-date for correct incremental diffs.
  // Skipped in production.
  if (process.env.NODE_ENV !== 'production') {
    const apiDir = path.dirname(fileURLToPath(import.meta.url));
    const projectDir = path.resolve(apiDir, '..');
    try {
      execSync('npx drizzle-kit generate', { cwd: projectDir, stdio: 'ignore', timeout: 15_000 });
    } catch {
      // drizzle-kit may exit non-zero on "nothing to generate" or missing DB; ignore.
    }
  }
  seedSystemUser(db);
  seedRbac(db);
  seedDemoCompositions(db);
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
