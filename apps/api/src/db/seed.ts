import { eq } from 'drizzle-orm';
import { users, userSettings } from './schema.js';
import type { DrizzleDb } from './index.js';

const SYSTEM_USER_ID = 'system';

/**
 * Idempotent: create the system user if it doesn't exist.
 * The system user owns the public catalog seed-grids (visibility='public').
 * It cannot log in (provider='system' is rejected by all auth paths).
 * See docs/03-data-model.md §2.1.
 */
export function seedSystemUser(db: DrizzleDb): void {
  const now = Date.now();
  const existing = db.select().from(users).where(eq(users.id, SYSTEM_USER_ID)).get();
  if (!existing) {
    db.insert(users)
      .values({
        id: SYSTEM_USER_ID,
        email: 'system@jazz-trainer.internal',
        name: 'Jazz Trainer',
        avatarUrl: null,
        provider: 'system',
        providerId: 'system',
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }
}

/**
 * Idempotent: create a dev test user + default settings.
 * Only called when AUTH_DEV_MODE=true. Used by e2e tests and local dev.
 */
export function seedDevUser(db: DrizzleDb): void {
  const now = Date.now();
  const email = 'dev@jazz-trainer.local';
  const existing = db.select().from(users).where(eq(users.email, email)).get();
  if (existing) return;

  const id = crypto.randomUUID();
  db.insert(users)
    .values({
      id,
      email,
      name: 'Dev User',
      avatarUrl: null,
      provider: 'dev',
      providerId: email,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  db.insert(userSettings)
    .values({
      userId: id,
      bpm: 120,
      clickStrong: 'click_hi',
      clickWeak: 'click_lo',
      volume: 0.8,
      countIn: 0,
      createdAt: now,
      updatedAt: now,
    })
    .run();
}

// When executed directly: `npm run db:seed`
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  const { createDb } = await import('./index.js');
  const { loadConfig } = await import('../config.js');
  const { runMigrations } = await import('./migrate.js');

  const config = loadConfig();
  const { db } = createDb(config.databaseUrl);
  runMigrations(db);
  seedSystemUser(db);
  if (config.authDevMode) seedDevUser(db);
  console.log('[db] seed complete');
}
