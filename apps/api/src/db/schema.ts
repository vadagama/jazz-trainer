import { sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

/**
 * Database schema for Jazz Trainer.
 * See docs/03-data-model.md for entity descriptions and access rules.
 */

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    name: text('name').notNull(),
    avatarUrl: text('avatar_url'),
    provider: text('provider', { enum: ['google', 'dev', 'system'] }).notNull(),
    providerId: text('provider_id').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [uniqueIndex('users_provider_provider_id').on(t.provider, t.providerId)],
);

export const userSettings = sqliteTable('user_settings', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  bpm: integer('bpm').notNull().default(120),
  clickStrong: text('click_strong').notNull().default('click_hi'),
  clickWeak: text('click_weak').notNull().default('click_lo'),
  volume: real('volume').notNull().default(0.8),
  countIn: integer('count_in').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: integer('expires_at').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    index('sessions_user_id_idx').on(t.userId),
    index('sessions_expires_at_idx').on(t.expiresAt),
  ],
);

export type UserRecord = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserSettingsRecord = typeof userSettings.$inferSelect;
export type SessionRecord = typeof sessions.$inferSelect;
