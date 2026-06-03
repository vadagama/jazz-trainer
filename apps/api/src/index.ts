import { buildServer } from './server.js';
import { loadConfig } from './config.js';
import { createDb } from './db/index.js';
import { runMigrations } from './db/migrate.js';
import { seedSystemUser, seedDevUser, seedDemoGrids } from './db/seed.js';
import fs from 'node:fs';
import path from 'node:path';

async function main(): Promise<void> {
  const config = loadConfig();

  // Ensure the data directory exists before opening the SQLite file.
  if (config.databaseUrl !== ':memory:') {
    fs.mkdirSync(path.dirname(path.resolve(config.databaseUrl)), { recursive: true });
  }

  const { db } = createDb(config.databaseUrl);
  runMigrations(db);
  seedSystemUser(db);
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
}

void main();
