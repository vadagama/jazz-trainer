import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
  index,
  primaryKey,
} from 'drizzle-orm/sqlite-core';

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
  clickStrong: text('click_strong').default('drum-stick'),
  clickStrong2: text('click_strong_2').default('drum-stick'),
  clickWeak: text('click_weak').default('drum-stick'),
  volume: real('volume').notNull().default(0.8),
  countIn: integer('count_in').notNull().default(0),
  metronomeVolume: real('metronome_volume').notNull().default(0.8),
  bassEnabled: integer('bass_enabled', { mode: 'boolean' }).notNull().default(true),
  bassVolume: real('bass_volume').notNull().default(0.7),
  bassComplexity: integer('bass_complexity').notNull().default(1),
  bassOctaveUp: integer('bass_octave_up', { mode: 'boolean' }).notNull().default(false),
  rhodesEnabled: integer('rhodes_enabled', { mode: 'boolean' }).notNull().default(false),
  rhodesVolume: real('rhodes_volume').notNull().default(0.6),
  rhodesMode: text('rhodes_mode').notNull().default('halfNotes'),
  rhodesVoicingDensity: text('rhodes_voicing_density').notNull().default('rootless3'),
  drumsEnabled: integer('drums_enabled', { mode: 'boolean' }).notNull().default(true),
  drumsVolume: real('drums_volume').notNull().default(0.7),
  drumsRideEnabled: integer('drums_ride_enabled', { mode: 'boolean' }).notNull().default(true),
  drumsRideVolume: real('drums_ride_volume').notNull().default(0.7),
  drumsStirEnabled: integer('drums_stir_enabled', { mode: 'boolean' }).notNull().default(true),
  drumsStirVolume: real('drums_stir_volume').notNull().default(0.6),
  drumsHihatEnabled: integer('drums_hihat_enabled', { mode: 'boolean' }).notNull().default(true),
  drumsHihatVolume: real('drums_hihat_volume').notNull().default(0.55),
  drumsRidePattern: text('drums_ride_pattern').notNull().default('swingRide'),
  swingRatio: real('swing_ratio').notNull().default(0.50),
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

export const harmonyGrids = sqliteTable(
  'harmony_grids',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    timeSignature: text('time_signature').notNull().default('4/4'),
    key: text('key').notNull().default('C'),
    visibility: text('visibility', { enum: ['private', 'public'] }).notNull().default('private'),
    /** JSON-serialised GridContent */
    content: text('content').notNull(),
    /** for copied grids: id of the source grid */
    sourceGridId: text('source_grid_id'),
    likeCount: integer('like_count').notNull().default(0),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    index('grids_user_id_idx').on(t.userId),
    index('grids_visibility_idx').on(t.visibility),
    index('grids_updated_at_idx').on(t.updatedAt),
  ],
);

export const gridLikes = sqliteTable(
  'grid_likes',
  {
    gridId: text('grid_id')
      .notNull()
      .references(() => harmonyGrids.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.gridId, t.userId] }),
    index('grid_likes_user_id_idx').on(t.userId),
  ],
);

export type UserRecord = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserSettingsRecord = typeof userSettings.$inferSelect;
export type SessionRecord = typeof sessions.$inferSelect;
export type HarmonyGridRecord = typeof harmonyGrids.$inferSelect;
export type NewHarmonyGrid = typeof harmonyGrids.$inferInsert;
export type GridLikeRecord = typeof gridLikes.$inferSelect;
