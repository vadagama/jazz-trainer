import Database, { type Database as SQLiteDatabase } from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';

export type DrizzleDb = BetterSQLite3Database<typeof schema>;

/**
 * Open (or create) a SQLite database and return a Drizzle instance.
 * Pass `:memory:` as `url` for an isolated in-memory test database.
 *
 * Table creation is owned by drizzle migrations (see ./migrate.ts) — this
 * function deliberately does no DDL.
 */
export function createDb(url: string): { db: DrizzleDb; sqlite: SQLiteDatabase } {
  const sqlite = new Database(url);
  if (url !== ':memory:') sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  return { db, sqlite };
}

/**
 * Turso async DB factory for Vercel serverless.
 * Kept separate from the main codebase to preserve sync better-sqlite3 APIs.
 */
export async function createTursoDb(
  url: string,
  authToken: string,
): Promise<{ db: ReturnType<typeof drizzle>; dispose: () => void }> {
  const { createClient } = await import('@libsql/client');
  const { drizzle: drizzleLibsql } = await import('drizzle-orm/libsql');

  const client = createClient({ url, authToken });
  const db = drizzleLibsql(client, { schema });

  return {
    db: db as unknown as ReturnType<typeof drizzle>,
    dispose: () => client.close(),
  };
}
