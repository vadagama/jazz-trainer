import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { fileURLToPath } from 'node:url';
import { createDb } from './index.js';
import { loadConfig } from '../config.js';

const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url));

export function runMigrations(db: ReturnType<typeof createDb>['db']): void {
  migrate(db, { migrationsFolder });
}

// When executed directly: `npm run db:migrate`
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  const config = loadConfig();
  const { db } = createDb(config.databaseUrl);
  runMigrations(db);
  console.log('[db] migrations applied');
}
