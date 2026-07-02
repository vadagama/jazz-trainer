import { sql } from 'drizzle-orm';
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
    role: text('role').notNull().default('user'),
    status: text('status', { enum: ['active', 'disabled'] })
      .notNull()
      .default('active'),
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
  countIn: integer('count_in').notNull().default(1),
  metronomeEnabled: integer('metronome_enabled', { mode: 'boolean' }).notNull().default(true),
  metronomeVolume: real('metronome_volume').notNull().default(0.8),
  bassEnabled: integer('bass_enabled', { mode: 'boolean' }).notNull().default(true),
  bassVolume: real('bass_volume').notNull().default(0.7),
  bassComplexity: integer('bass_complexity').notNull().default(1),
  bassOctaveUp: integer('bass_octave_up', { mode: 'boolean' }).notNull().default(false),
  rhodesEnabled: integer('rhodes_enabled', { mode: 'boolean' }).notNull().default(false),
  rhodesVolume: real('rhodes_volume').notNull().default(0.6),
  rhodesMode: text('rhodes_mode').notNull().default('halfNotes'),
  rhodesVoicingDensity: text('rhodes_voicing_density').notNull().default('rootless3'),
  rhodesLayerMode: text('rhodes_layer_mode').notNull().default('none'),
  rhodesLayerVolume: real('rhodes_layer_volume').notNull().default(0.5),
  pianoEnabled: integer('piano_enabled', { mode: 'boolean' }).notNull().default(false),
  pianoVolume: real('piano_volume').notNull().default(0.7),
  pianoProfile: text('piano_profile').notNull().default('swing-sparse'),
  pianoVoicingDensity: text('piano_voicing_density').notNull().default('rootless3'),
  pianoSampleLibrary: text('piano_sample_library').notNull().default('salamander'),
  pianoRandomizationLevel: text('piano_randomization_level').notNull().default('off'),
  drumsEnabled: integer('drums_enabled', { mode: 'boolean' }).notNull().default(true),
  drumsVolume: real('drums_volume').notNull().default(0.7),
  drumsRideEnabled: integer('drums_ride_enabled', { mode: 'boolean' }).notNull().default(true),
  drumsRideVolume: real('drums_ride_volume').notNull().default(0.7),
  /** @deprecated — use drumsSnareEnabled instead */
  drumsStirEnabled: integer('drums_stir_enabled', { mode: 'boolean' }).notNull().default(true),
  /** @deprecated — use drumsSnareVolume instead */
  drumsStirVolume: real('drums_stir_volume').notNull().default(0.6),
  drumsHihatEnabled: integer('drums_hihat_enabled', { mode: 'boolean' }).notNull().default(true),
  drumsHihatVolume: real('drums_hihat_volume').notNull().default(0.65),
  drumsHihatOpenness: integer('drums_hihat_openness').notNull().default(0),
  drumsBassDrumEnabled: integer('drums_bass_drum_enabled', { mode: 'boolean' })
    .notNull()
    .default(true),
  drumsBassDrumVolume: real('drums_bass_drum_volume').notNull().default(0.7),
  drumsSnareEnabled: integer('drums_snare_enabled', { mode: 'boolean' }).notNull().default(true),
  drumsSnareVolume: real('drums_snare_volume').notNull().default(0.8),
  drumsCrashEnabled: integer('drums_crash_enabled', { mode: 'boolean' }).notNull().default(true),
  drumsCrashVolume: real('drums_crash_volume').notNull().default(0.8),
  drumsCrashFrequency: integer('drums_crash_frequency').notNull().default(4),
  drumsRimEnabled: integer('drums_rim_enabled', { mode: 'boolean' }).notNull().default(false),
  drumsRimVolume: real('drums_rim_volume').notNull().default(0.6),
  drumsHumanizeIntensity: text('drums_humanize_intensity').notNull().default('med'),
  drumsFunkComplexity: text('drums_funk_complexity').notNull().default('medium'),
  drumsFillFrequency: text('drums_fill_frequency').notNull().default('8bars'),
  drumsRandomizationLevel: text('drums_randomization_level').notNull().default('off'),
  drumsFillComplexity: text('drums_fill_complexity').notNull().default('medium'),
  drumsRideVariation: integer('drums_ride_variation', { mode: 'boolean' }).notNull().default(true),
  drumsSnareGhosts: integer('drums_snare_ghosts', { mode: 'boolean' }).notNull().default(true),
  drumsBassDrumVariation: integer('drums_bass_drum_variation', { mode: 'boolean' })
    .notNull()
    .default(true),
  drumKit: text('drum_kit').notNull().default('jazz-kit'),
  drumsTomEnabled: integer('drums_tom_enabled', { mode: 'boolean' }).notNull().default(true),
  drumsTomVolume: real('drums_tom_volume').notNull().default(0.7),
  /** Global playback style — single source of truth for all instruments. */
  style: text('style').notNull().default('swing'),
  /** Per-style user overrides for instrument settings (JSON). See T-004 / ARANGEMENT_PLAN. */
  perStyleOverrides: text('per_style_overrides'),
  swingRatio: real('swing_ratio').notNull().default(0.5),
  audioFormat: text('audio_format').notNull().default('aac'),
  practiceCards: text('practice_cards'),
  midiDeviceId: text('midi_device_id'),
  midiChannel: integer('midi_channel'),
  soloToneId: text('solo_tone_id').default('rhodes-jrhodes3c'),
  soloVolume: real('solo_volume'),
  duckingEnabled: integer('ducking_enabled', { mode: 'boolean' }),
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
    visibility: text('visibility', { enum: ['private', 'public'] })
      .notNull()
      .default('private'),
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

// ── RBAC tables (Phase R) ────────────────────────────────────────────────

export const roles = sqliteTable('roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const permissions = sqliteTable('permissions', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
});

export const rolePermissions = sqliteTable(
  'role_permissions',
  {
    roleId: text('role_id')
      .references(() => roles.id)
      .notNull(),
    permissionCode: text('permission_code')
      .references(() => permissions.code)
      .notNull(),
  },
  (t) => ({ pk: primaryKey(t.roleId, t.permissionCode) }),
);

export const userPermissions = sqliteTable(
  'user_permissions',
  {
    userId: text('user_id')
      .references(() => users.id)
      .notNull(),
    permissionCode: text('permission_code')
      .references(() => permissions.code)
      .notNull(),
    granted: integer('granted', { mode: 'boolean' }).notNull(),
  },
  (t) => ({ pk: primaryKey(t.userId, t.permissionCode) }),
);

// ── Audit log (Phase R) ──────────────────────────────────────────────────

export const auditLog = sqliteTable('audit_log', {
  id: text('id').primaryKey(),
  actorUserId: text('actor_user_id').notNull(),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  before: text('before'),
  after: text('after'),
  timestamp: integer('timestamp', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  ip: text('ip'),
  userAgent: text('user_agent'),
  reason: text('reason'),
});

// ── Lecture likes ────────────────────────────────────────────────────────

export const lectureLikes = sqliteTable(
  'lecture_likes',
  {
    lectureId: text('lecture_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.lectureId, t.userId] }),
    index('lecture_likes_user_id_idx').on(t.userId),
  ],
);

// ── Feature flags (Phase R) ──────────────────────────────────────────────

export const featureFlags = sqliteTable('feature_flags', {
  key: text('key').primaryKey(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
  roles: text('roles'), // JSON array of role names
  userIds: text('user_ids'), // JSON array of user IDs
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ── Type exports ──────────────────────────────────────────────────────────

export type UserRecord = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserSettingsRecord = typeof userSettings.$inferSelect;
export type SessionRecord = typeof sessions.$inferSelect;
export type HarmonyGridRecord = typeof harmonyGrids.$inferSelect;
export type NewHarmonyGrid = typeof harmonyGrids.$inferInsert;
export type GridLikeRecord = typeof gridLikes.$inferSelect;
export type RoleRecord = typeof roles.$inferSelect;
export type PermissionRecord = typeof permissions.$inferSelect;
export type AuditLogRecord = typeof auditLog.$inferSelect;
export type LectureLikeRecord = typeof lectureLikes.$inferSelect;
export type FeatureFlagRecord = typeof featureFlags.$inferSelect;
