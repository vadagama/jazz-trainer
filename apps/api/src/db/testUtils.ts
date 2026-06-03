import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createDb, type DrizzleDb } from './index.js';
import { seedSystemUser } from './seed.js';

const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url));

/**
 * Create an isolated in-memory SQLite database, run migrations and seed the
 * system user. Suitable for Vitest tests — each call returns a fresh DB.
 */
export function createTestDb(): DrizzleDb {
  const { db } = createDb(':memory:');
  migrate(db, { migrationsFolder });
  seedSystemUser(db);
  return db;
}
