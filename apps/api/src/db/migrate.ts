import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { createDb, type DbHandle, type DrizzleDb } from './index.js';
import { loadConfig } from '../config.js';

const resolvedMigrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url));
const migrationsFolder =
  process.env.MIGRATIONS_FOLDER ??
  (existsSync(resolvedMigrationsFolder) ? resolvedMigrationsFolder : fileURLToPath(new URL('../drizzle', import.meta.url)));

/**
 * One-off backfill for dev databases created before `feature_access` had a
 * `state` column. Turso databases are created fresh and skip this path.
 */
function backfillLegacyIsPublic(handle: DbHandle): void {
  if (handle.kind !== 'sqlite') return;
  try {
    const cols = handle.sqlite.pragma('table_info(feature_access)') as { name: string }[];
    if (cols.length === 0 || !cols.some((c) => c.name === 'is_public')) return;
    if (!cols.some((c) => c.name === 'state')) {
      handle.sqlite.exec(`ALTER TABLE feature_access ADD COLUMN state TEXT NOT NULL DEFAULT 'active'`);
    }
    handle.sqlite.exec(`
      UPDATE feature_access
      SET state = CASE WHEN is_public = 1 THEN 'active' ELSE 'inactive' END;
      ALTER TABLE feature_access DROP COLUMN is_public;
    `);
  } catch (err) {
    console.error('[db] legacy is_public backfill failed:', (err as Error).message);
  }
}

export async function runMigrations(db: DrizzleDb, handle?: DbHandle): Promise<void> {
  try {
    if (handle?.kind === 'turso') {
      // Turso via libsql migrator
      const { migrate: migrateLibsql } = await import('drizzle-orm/libsql/migrator');
      await migrateLibsql(db as unknown as Parameters<typeof migrateLibsql>[0], { migrationsFolder });
    } else {
      const { migrate: migrateBsql } = await import('drizzle-orm/better-sqlite3/migrator');
      migrateBsql(db, { migrationsFolder });
    }
  } catch (err) {
    console.error('[db] migration warning:', (err as Error).message);
  }
  if (handle) backfillLegacyIsPublic(handle);
}

// CLI: `npm run db:migrate`
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  const config = loadConfig();
  const handle = await createDb(config.databaseUrl);
  await runMigrations(handle.db, handle);
  console.log('[db] migrations applied');
}
