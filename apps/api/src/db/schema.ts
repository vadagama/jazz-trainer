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
  metronomeMode: text('metronome_mode').notNull().default('both'),
  metronomeStrongEnabled: integer('metronome_strong_enabled', { mode: 'boolean' })
    .notNull()
    .default(true),
  metronomeStrongVolume: real('metronome_strong_volume').notNull().default(0.8),
  metronomeStrong2Enabled: integer('metronome_strong2_enabled', { mode: 'boolean' })
    .notNull()
    .default(true),
  metronomeStrong2Volume: real('metronome_strong2_volume').notNull().default(0.8),
  metronomeWeakEnabled: integer('metronome_weak_enabled', { mode: 'boolean' })
    .notNull()
    .default(true),
  metronomeWeakVolume: real('metronome_weak_volume').notNull().default(0.8),
  bassEnabled: integer('bass_enabled', { mode: 'boolean' }).notNull().default(true),
  bassVolume: real('bass_volume').notNull().default(0.7),
  bassComplexity: integer('bass_complexity').notNull().default(1),
  /** Вариант баса: upright | electric. Null = брать по стилю (upright для swing/bossa/ballad, electric для funk/latin). */
  bassVariant: text('bass_variant'),
  /** Ручка «сколько гармонической краски»: clean|moderate|altered|max (зеркало piano). */
  bassTension: text('bass_tension').default('clean'),
  /** JSON: { phrasing, timingJitterMs, velocityVariation, humanizeTiming } (зеркало pianoHumanize). */
  bassHumanize: text('bass_humanize'),
  /** Использовать ли приглушённые (ghost/mute) ноты в груве. */
  bassUseMutedNotes: integer('bass_use_muted_notes', { mode: 'boolean' }).notNull().default(true),
  rhodesEnabled: integer('rhodes_enabled', { mode: 'boolean' }).notNull().default(false),
  rhodesVolume: real('rhodes_volume').notNull().default(0.6),
  rhodesMode: text('rhodes_mode').notNull().default('halfNotes'),
  rhodesVoicingDensity: text('rhodes_voicing_density').notNull().default('rootless3'),
  rhodesLayerMode: text('rhodes_layer_mode').notNull().default('none'),
  rhodesLayerVolume: real('rhodes_layer_volume').notNull().default(0.5),
  pianoEnabled: integer('piano_enabled', { mode: 'boolean' }).notNull().default(false),
  pianoVolume: real('piano_volume').notNull().default(0.7),
  // pianoProfile: deprecated – компенсируется organism-based PianoPatternEngine
  pianoProfile: text('piano_profile').notNull().default('swing-sparse'),
  pianoVoicingDensity: text('piano_voicing_density').notNull().default('rootless3'),
  pianoSampleLibrary: text('piano_sample_library').notNull().default('salamander'),
  /** Единственная ручка «сколько гармонической краски»: clean|moderate|altered|max. */
  pianoTension: text('piano_tension').default('clean'),
  pianoHumanize: text('piano_humanize'),
  drumsEnabled: integer('drums_enabled', { mode: 'boolean' }).notNull().default(true),
  drumsVolume: real('drums_volume').notNull().default(0.7),
  drumKit: text('drum_kit').notNull().default('jazz-drum-kit'),
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

export const harmonyCompositions = sqliteTable(
  'harmony_compositions',
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
    /** JSON-serialised CompositionContent */
    content: text('content').notNull(),
    /** for copied compositions: id of the source composition */
    sourceCompositionId: text('source_composition_id'),
    likeCount: integer('like_count').notNull().default(0),
    // ── Catalog metadata (§2.2 CATALOG-VISION.md) ───────────────────────────
    description: text('description'),
    difficulty: text('difficulty').notNull().default('intermediate'),
    tags: text('tags').notNull().default('[]'),
    author: text('author').notNull().default(''),
    recommendedStyle: text('recommended_style'),
    recommendedTempo: integer('recommended_tempo'),
    catalogPublishedAt: integer('catalog_published_at')
      .notNull()
      .default(sql`(unixepoch())`),
    copyCount: integer('copy_count').notNull().default(0),
    featured: integer('featured', { mode: 'boolean' }).notNull().default(false),
    featuredOrder: integer('featured_order'),
    moderationStatus: text('moderation_status').notNull().default('approved'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    index('compositions_user_id_idx').on(t.userId),
    index('compositions_visibility_idx').on(t.visibility),
    index('compositions_updated_at_idx').on(t.updatedAt),
    index('idx_compositions_author').on(t.author),
    index('idx_compositions_difficulty').on(t.difficulty),
    index('idx_compositions_recommended_style').on(t.recommendedStyle),
    index('idx_compositions_featured').on(t.featured),
    index('idx_compositions_moderation_status').on(t.moderationStatus),
    index('idx_compositions_catalog_published_at').on(t.catalogPublishedAt),
  ],
);

export const compositionLikes = sqliteTable(
  'composition_likes',
  {
    compositionId: text('composition_id')
      .notNull()
      .references(() => harmonyCompositions.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.compositionId, t.userId] }),
    index('composition_likes_user_id_idx').on(t.userId),
  ],
);

// ── Catalog tags (controlled vocabulary, §2.3 / §5.4) ─────────────────────

export const catalogTags = sqliteTable(
  'catalog_tags',
  {
    id: text('id').primaryKey(),
    value: text('value').notNull().unique(),
    category: text('category').notNull(),
    description: text('description'),
    hidden: integer('hidden', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index('idx_catalog_tags_category').on(t.category)],
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

/** Many-to-many user↔role junction (users can have multiple roles). */
export const userRoles = sqliteTable(
  'user_roles',
  {
    userId: text('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    roleId: text('role_id')
      .references(() => roles.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (t) => ({ pk: primaryKey(t.userId, t.roleId) }),
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
export type HarmonyCompositionRecord = typeof harmonyCompositions.$inferSelect;
export type NewHarmonyComposition = typeof harmonyCompositions.$inferInsert;
export type CompositionLikeRecord = typeof compositionLikes.$inferSelect;
export type CatalogTagRecord = typeof catalogTags.$inferSelect;
export type NewCatalogTag = typeof catalogTags.$inferInsert;
export type RoleRecord = typeof roles.$inferSelect;
export type PermissionRecord = typeof permissions.$inferSelect;
export type AuditLogRecord = typeof auditLog.$inferSelect;
export type LectureLikeRecord = typeof lectureLikes.$inferSelect;
export type FeatureFlagRecord = typeof featureFlags.$inferSelect;
