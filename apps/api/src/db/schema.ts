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
 * Database schema for Amazilia.
 * See docs/03-data-model.md for entity descriptions and access rules.
 */

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    name: text('name').notNull(),
    avatarUrl: text('avatar_url'),
    provider: text('provider', {
      enum: ['google', 'dev', 'system', 'github', 'magic_link'],
    }).notNull(),
    providerId: text('provider_id').notNull(),
    role: text('role').notNull().default('user'),
    status: text('status', { enum: ['active', 'disabled'] })
      .notNull()
      .default('active'),
    emailVerified: integer('email_verified').notNull().default(0),
    deletedAt: integer('deleted_at'),
    providers: text('providers').notNull().default('[]'),
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
  theme: text('theme').notNull().default('dark'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

/**
 * Singleton table of factory default settings (id is always 1).
 *
 * The "global" starting point inherited by new users on account creation
 * (`ensureUserSettings`) and by guest users (`useEffectiveSettings`). Mirrors
 * {@link userSettings} minus the personal fields (`userId`, `practiceCards`,
 * `midiDeviceId`, `midiChannel`). Per-style instrument values are NOT stored
 * here — they resolve at runtime via `applyStyleDefaults` from `StyleProfile`,
 * just like `user_settings`. Admin overrides go into `perStyleOverrides`.
 */
export const defaultSettings = sqliteTable('default_settings', {
  id: integer('id').primaryKey(),
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
  bassVariant: text('bass_variant'),
  bassTension: text('bass_tension').default('clean'),
  bassHumanize: text('bass_humanize'),
  bassUseMutedNotes: integer('bass_use_muted_notes', { mode: 'boolean' }).notNull().default(true),
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
  pianoTension: text('piano_tension').default('clean'),
  pianoHumanize: text('piano_humanize'),
  drumsEnabled: integer('drums_enabled', { mode: 'boolean' }).notNull().default(true),
  drumsVolume: real('drums_volume').notNull().default(0.7),
  drumKit: text('drum_kit').notNull().default('jazz-drum-kit'),
  style: text('style').notNull().default('swing'),
  perStyleOverrides: text('per_style_overrides'),
  swingRatio: real('swing_ratio').notNull().default(0.5),
  audioFormat: text('audio_format').notNull().default('aac'),
  soloToneId: text('solo_tone_id').default('rhodes-jrhodes3c'),
  soloVolume: real('solo_volume'),
  duckingEnabled: integer('ducking_enabled', { mode: 'boolean' }),
  theme: text('theme').notNull().default('dark'),
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
    deviceName: text('device_name'),
    ip: text('ip'),
    fingerprint: text('fingerprint'),
    lastUsedAt: integer('last_used_at'),
    /** 0 = pending TOTP verification, 1 = fully authenticated. Default 1 for backward compat. */
    totpVerified: integer('totp_verified').notNull().default(1),
    /** Timestamp of last TOTP verification (for step-up re-auth window). */
    totpVerifiedAt: integer('totp_verified_at'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    index('sessions_user_id_idx').on(t.userId),
    index('sessions_expires_at_idx').on(t.expiresAt),
  ],
);

// ── Magic Link ────────────────────────────────────────────────────────────

export const magicLinks = sqliteTable(
  'magic_links',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    tokenHash: text('token_hash').notNull(),
    used: integer('used', { mode: 'boolean' }).notNull().default(false),
    expiresAt: integer('expires_at').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    index('magic_links_email_idx').on(t.email),
    index('magic_links_token_hash_idx').on(t.tokenHash),
  ],
);

// ── Subscription Tiers ───────────────────────────────────────────────────

export const subscriptionTiers = sqliteTable('subscription_tiers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  stripePriceId: text('stripe_price_id'),
  roleName: text('role_name').notNull(),
  permissions: text('permissions').notNull().default('[]'),
  monthlyPriceCents: integer('monthly_price_cents'),
  features: text('features').notNull().default('[]'),
  createdAt: integer('created_at').notNull(),
});

// ── Subscriptions ────────────────────────────────────────────────────────

export const subscriptions = sqliteTable(
  'subscriptions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    stripeSubscriptionId: text('stripe_subscription_id'),
    stripeCustomerId: text('stripe_customer_id'),
    tierId: text('tier_id')
      .notNull()
      .references(() => subscriptionTiers.id),
    status: text('status', {
      enum: ['active', 'past_due', 'canceled', 'expired', 'trialing'],
    }).notNull(),
    currentPeriodStart: integer('current_period_start'),
    currentPeriodEnd: integer('current_period_end'),
    gracePeriodEnds: integer('grace_period_ends'),
    canceledAt: integer('canceled_at'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    index('subscriptions_user_id_idx').on(t.userId),
    index('subscriptions_stripe_sub_id_idx').on(t.stripeSubscriptionId),
  ],
);

// ── Payment History ──────────────────────────────────────────────────────

export const paymentHistory = sqliteTable(
  'payment_history',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    stripeEventId: text('stripe_event_id').notNull(),
    eventType: text('event_type').notNull(),
    amountCents: integer('amount_cents'),
    currency: text('currency'),
    status: text('status'),
    metadata: text('metadata').notNull().default('{}'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('payment_history_user_id_idx').on(t.userId)],
);

// ── Subscription Requests (manual billing, landing form) ─────────────────

export const subscriptionRequests = sqliteTable(
  'subscription_requests',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    name: text('name'),
    desiredTier: text('desired_tier').notNull(),
    message: text('message'),
    status: text('status', {
      enum: ['pending', 'approved', 'rejected', 'needs_info'],
    })
      .notNull()
      .default('pending'),
    userId: text('user_id'),
    processedBy: text('processed_by'),
    processedComment: text('processed_comment'),
    processedAt: integer('processed_at'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    index('sub_req_status_idx').on(t.status),
    index('sub_req_email_idx').on(t.email),
  ],
);

// ── Subscription History (manual billing audit) ──────────────────────────

export const subscriptionHistory = sqliteTable(
  'subscription_history',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    eventType: text('event_type').notNull(),
    actorId: text('actor_id').notNull(),
    oldTier: text('old_tier'),
    newTier: text('new_tier'),
    metadata: text('metadata').notNull().default('{}'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('sub_hist_user_id_idx').on(t.userId)],
);

// ── Exercise Progress ────────────────────────────────────────────────────

export const exerciseProgress = sqliteTable(
  'exercise_progress',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    exerciseType: text('exercise_type').notNull(),
    subType: text('sub_type'),
    attempts: integer('attempts').notNull().default(0),
    bestScore: real('best_score'),
    lastScore: real('last_score'),
    lastPracticedAt: integer('last_practiced_at'),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.exerciseType, t.subType] }),
    index('exercise_progress_user_idx').on(t.userId),
  ],
);

// ── Exercise Results ─────────────────────────────────────────────────────

export const exerciseResults = sqliteTable(
  'exercise_results',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    exerciseType: text('exercise_type').notNull(),
    subType: text('sub_type'),
    config: text('config').notNull().default('{}'),
    score: real('score'),
    completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
    durationMs: integer('duration_ms'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('exercise_results_user_idx').on(t.userId)],
);

// ── Theory Progress ──────────────────────────────────────────────────────

export const theoryProgress = sqliteTable(
  'theory_progress',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    lectureId: text('lecture_id').notNull(),
    status: text('status', { enum: ['not_started', 'in_progress', 'completed'] })
      .notNull()
      .default('not_started'),
    progressPercent: integer('progress_percent').notNull().default(0),
    completedAt: integer('completed_at'),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.lectureId] }),
    index('theory_progress_user_idx').on(t.userId),
  ],
);

// ── User Stats ───────────────────────────────────────────────────────────

export const userStats = sqliteTable('user_stats', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  currentStreak: integer('current_streak').notNull().default(0),
  longestStreak: integer('longest_streak').notNull().default(0),
  lastPracticeDate: text('last_practice_date'),
  totalPracticeTimeMs: integer('total_practice_time_ms').notNull().default(0),
  totalExercisesCompleted: integer('total_exercises_completed').notNull().default(0),
  totalTheoryCompleted: integer('total_theory_completed').notNull().default(0),
});

// ── Consent Records (GDPR) ────────────────────────────────────────────────

export const consentRecords = sqliteTable(
  'consent_records',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    consentType: text('consent_type').notNull(),
    granted: integer('granted', { mode: 'boolean' }).notNull().default(false),
    ip: text('ip'),
    userAgent: text('user_agent'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('consent_records_user_idx').on(t.userId)],
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
    /**
     * 3-state feature visibility (FEATURES-VISION.md §4): 'active' grants the
     * permission, 'inactive' shows the feature as locked ("coming soon").
     * Absence of a row means no grant ('hidden' for feature codes).
     * Non-feature permissions always use the default 'active'.
     */
    state: text('state', { enum: ['active', 'inactive'] })
      .notNull()
      .default('active'),
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
  // ── Feature flag management (P0+P1, FEATURES-VISION.md §4.2) ─────────────
  description: text('description'),
  category: text('category'), // 'feature' | 'experiment' | 'maintenance' | 'killswitch'
  rolloutPercent: integer('rollout_percent'), // 0–100, null = not used
  expiresAt: integer('expires_at'), // unix timestamp (ms), null = never
  createdBy: text('created_by'), // users.id
  updatedAt: integer('updated_at'), // unix timestamp (ms)
  updatedBy: text('updated_by'), // users.id
});

// ── TOTP secrets (2FA for super_admin) ───────────────────────────────────

export const totpSecrets = sqliteTable('totp_secrets', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  secret: text('secret').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// ── Feature access (public column in admin) ──────────────────────────

export const featureAccess = sqliteTable('feature_access', {
  featureCode: text('feature_code').primaryKey(),
  state: text('state', { enum: ['active', 'inactive'] })
    .notNull()
    .default('active'),
});

// ── Type exports ──────────────────────────────────────────────────────────

export type UserRecord = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserSettingsRecord = typeof userSettings.$inferSelect;
export type DefaultSettingsRecord = typeof defaultSettings.$inferSelect;
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
export type FeatureAccessRecord = typeof featureAccess.$inferSelect;
export type MagicLinkRecord = typeof magicLinks.$inferSelect;
export type NewMagicLink = typeof magicLinks.$inferInsert;
export type SubscriptionTierRecord = typeof subscriptionTiers.$inferSelect;
export type SubscriptionRecord = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type PaymentHistoryRecord = typeof paymentHistory.$inferSelect;
export type ExerciseProgressRecord = typeof exerciseProgress.$inferSelect;
export type ExerciseResultRecord = typeof exerciseResults.$inferSelect;
export type NewExerciseResult = typeof exerciseResults.$inferInsert;
export type TheoryProgressRecord = typeof theoryProgress.$inferSelect;
export type UserStatsRecord = typeof userStats.$inferSelect;
export type ConsentRecordRecord = typeof consentRecords.$inferSelect;
export type NewConsentRecord = typeof consentRecords.$inferInsert;
export type SubscriptionRequestRecord = typeof subscriptionRequests.$inferSelect;
export type NewSubscriptionRequest = typeof subscriptionRequests.$inferInsert;
export type TotpSecretRecord = typeof totpSecrets.$inferSelect;
export type SubscriptionHistoryRecord = typeof subscriptionHistory.$inferSelect;
export type NewSubscriptionHistory = typeof subscriptionHistory.$inferInsert;
