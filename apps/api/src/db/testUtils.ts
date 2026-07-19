import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createDb, type DrizzleDb } from './index.js';
import { seedSystemUser, seedDemoCompositions } from './seed.js';

const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url));

/**
 * Create an isolated in-memory SQLite database, run migrations and seed the
 * system user. Suitable for Vitest tests — each call returns a fresh DB.
 */
export function createTestDb(): DrizzleDb {
  const { db } = createDb(':memory:');
  try {
    migrate(db, { migrationsFolder });
  } catch (err) {
    // Drizzle baseline migration (0029) re-declares tables from earlier
    // manual migrations (0010) — a pre-existing project issue. The SQL up to
    // the duplicate is already applied; the error is cosmetic for in-memory tests.
    console.error('[test-db] migration warning:', (err as Error).message);
  }
  seedSystemUser(db);
  seedDemoCompositions(db);
  return db;
}
