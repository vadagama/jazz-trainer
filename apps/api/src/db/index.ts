import Database, { type Database as SQLiteDatabase } from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';

export type DrizzleDb = BetterSQLite3Database<typeof schema>;

/**
 * Open (or create) a SQLite database and return a Drizzle instance.
 * Pass `:memory:` as `url` for an isolated in-memory test database.
 */
export function createDb(url: string): { db: DrizzleDb; sqlite: SQLiteDatabase } {
  const sqlite = new Database(url);
  if (url !== ':memory:') sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  return { db, sqlite };
}
