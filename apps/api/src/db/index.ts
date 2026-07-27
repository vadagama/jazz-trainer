import type { Database as SQLiteDatabase } from 'better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { Client as LibsqlClient } from '@libsql/client';
import * as schema from './schema.js';

/**
 * Public DB type — uses better-sqlite3 types for TypeScript compatibility.
 * At runtime, both better-sqlite3 (local) and libsql/Turso (Vercel) work
 * because the Drizzle query builder API is identical; all queries use `await`.
 */
export type DrizzleDb = BetterSQLite3Database<typeof schema>;

export interface SqliteHandle {
  kind: 'sqlite';
  db: DrizzleDb;
  /** Underlying better-sqlite3 handle (for close/pragma). */
  sqlite: SQLiteDatabase;
}

export interface TursoHandle {
  kind: 'turso';
  db: DrizzleDb;
  /** @libsql/client handle (for close). */
  client: LibsqlClient;
}

export type DbHandle = SqliteHandle | TursoHandle;

/**
 * Universal DB factory.
 *
 * - `libsql://` URL → Turso via @libsql/client (Vercel production)
 * - Everything else → better-sqlite3 (local dev / in-memory tests)
 *
 * Uses dynamic imports so Vercel's esbuild never tries to bundle
 * better-sqlite3 (native module) when building with a libsql:// URL.
 */
export async function createDb(
  url: string,
  authToken?: string,
): Promise<DbHandle> {
  if (url.startsWith('libsql://')) {
    const { createClient } = await import('@libsql/client');
    const { drizzle } = await import('drizzle-orm/libsql');

    const client = createClient({ url, authToken });
    // Cast: LibSQLDatabase API ≈ BetterSQLite3Database API at the query level
    const db = drizzle(client, { schema }) as unknown as DrizzleDb;

    return { kind: 'turso' as const, db, client };
  }

  // Local SQLite via better-sqlite3
  const BetterSqlite3 = (await import('better-sqlite3')).default;
  const { drizzle } = await import('drizzle-orm/better-sqlite3');

  const sqlite = new BetterSqlite3(url);
  if (url !== ':memory:') sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });

  return { kind: 'sqlite' as const, db, sqlite };
}
