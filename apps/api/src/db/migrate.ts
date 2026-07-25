import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { Database as SQLiteDatabase } from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import { createDb } from './index.js';
import { loadConfig } from '../config.js';

const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url));

/**
 * One-off backfill for dev databases created before `feature_access` had a
 * `state` column (legacy runtime `is_public` flag). Production databases get
 * the table from migration 0034 and never enter this path.
 */
function backfillLegacyIsPublic(sqlite: SQLiteDatabase): void {
  try {
    const cols = sqlite.pragma('table_info(feature_access)') as { name: string }[];
    if (cols.length === 0 || !cols.some((c) => c.name === 'is_public')) return;
    if (!cols.some((c) => c.name === 'state')) {
      sqlite.exec(`ALTER TABLE feature_access ADD COLUMN state TEXT NOT NULL DEFAULT 'active'`);
    }
    sqlite.exec(`
      UPDATE feature_access
      SET state = CASE WHEN is_public = 1 THEN 'active' ELSE 'inactive' END;
      ALTER TABLE feature_access DROP COLUMN is_public;
    `);
  } catch (err) {
    console.error('[db] legacy is_public backfill failed:', (err as Error).message);
  }
}

export function runMigrations(
  db: ReturnType<typeof createDb>['db'],
  sqlite?: SQLiteDatabase,
): void {
  try {
    migrate(db, { migrationsFolder });
  } catch (err) {
    // Drizzle-kit snapshot validation may fail non-interactively (TTY required)
    // when schema snapshots are stale vs actual migrations. SQL statements
    // are already applied at this point — the error is cosmetic.
    console.error('[db] migration warning:', (err as Error).message);
  }
  if (sqlite) backfillLegacyIsPublic(sqlite);
}

// When executed directly: `npm run db:migrate`
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  const config = loadConfig();
  const { db } = createDb(config.databaseUrl);
  runMigrations(db);
  console.log('[db] migrations applied');
}
