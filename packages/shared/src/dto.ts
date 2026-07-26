import { z } from 'zod';
import {
  CLICK_SOUNDS,
  METRONOME_MODES,
  STYLES,
  KEYS,
  TIME_SIGNATURES,
  SYSTEM_ROLES,
} from './constants.js';

/**
 * DTO types and Zod validation schemas for the auth + settings layer (F4).
 * Used by apps/api (validation, responses) and apps/web (forms, state).
 * See docs/04-api.md §2-3.
 */

// ── User ──────────────────────────────────────────────────────────────────

export const UserDTOSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  avatarUrl: z.string().url().nullable(),
  provider: z.enum(['google', 'dev', 'system', 'github', 'magic_link']),
  role: z.string(),
  roles: z.array(z.string()).optional(),
  status: z.enum(['active', 'disabled']),
  createdAt: z.number().int(),
});
export type UserDTO = z.infer<typeof UserDTOSchema>;

// ── Session ────────────────────────────────────────────────────────────────

export const SessionDTOSchema = z.object({
  id: z.string(),
  device: z.string(),
  ip: z.string(),
  createdAt: z.number().int(),
  lastUsedAt: z.number().int(),
  current: z.boolean(),
});
export type SessionDTO = z.infer<typeof SessionDTOSchema>;

// ── User settings ─────────────────────────────────────────────────────────

const ClickSoundSchema = z.enum(CLICK_SOUNDS).nullable();

export const UserSettingsDTOSchema = z.object({
  bpm: z.number().int().min(20).max(400),
  clickStrong: ClickSoundSchema,
  clickStrong2: ClickSoundSchema,
  clickWeak: ClickSoundSchema,
  volume: z.number().min(0).max(1),
  countIn: z.number().int().min(0).max(4),
  metronomeEnabled: z.boolean().optional(),
  metronomeVolume: z.number().min(0).max(1).optional(),
  metronomeMode: z.enum(METRONOME_MODES).default('both').optional(),
  metronomeStrongEnabled: z.boolean().default(true).optional(),
  metronomeStrongVolume: z.number().min(0).max(1).default(0.8).optional(),
  metronomeStrong2Enabled: z.boolean().default(true).optional(),
  metronomeStrong2Volume: z.number().min(0).max(1).default(0.8).optional(),
  metronomeWeakEnabled: z.boolean().default(true).optional(),
  metronomeWeakVolume: z.number().min(0).max(1).default(0.8).optional(),
  bassEnabled: z.boolean().optional(),
  bassVolume: z.number().min(0).max(1).optional(),
  bassComplexity: z.number().int().min(1).max(7).optional(),
  /** Какой вариант баса использовать (overrides the style-driven default). */
  bassVariant: z.enum(['upright', 'electric']).nullable().optional(),
  /** Ручка «сколько гармонической краски» — gates which chord steps the bass engine picks. */
  bassTension: z.enum(['clean', 'moderate', 'altered', 'max']).optional(),
  bassHumanize: z
    .object({
      timingJitterMs: z
        .preprocess(
          (val) => {
            if (typeof val === 'number') {
              if (val === 0) return 'none';
              if (val <= 6) return 'low';
              if (val <= 20) return 'medium';
              return 'high';
            }
            return val;
          },
          z.enum(['none', 'low', 'medium', 'high']),
        )
        .optional(),
      velocityVariation: z.enum(['off', 'light', 'medium', 'strong']).optional(),
      phrasing: z.enum(['flat', 'gentle', 'expressive']).optional(),
      humanizeTiming: z
        .enum(['none', 'slight-rush', 'slight-lag', 'medium-rush', 'medium-lag'])
        .optional(),
    })
    .optional(),
  /** Использовать ли приглушённые (ghost/mute) ноты в груве. */
  bassUseMutedNotes: z.boolean().optional(),
  /** Явный выбор организма баса (null = Авто, первый в списке). */
  bassPattern: z.string().nullable().optional(),
  /** Диапазон баса: narrow (узкий, октава 2) | medium (средний) | wide (широкий). */
  bassRange: z.enum(['narrow', 'medium', 'wide']).optional(),
  rhodesEnabled: z.boolean().optional(),
  rhodesVolume: z.number().min(0).max(1).optional(),
  /** Pattern-engine organism form id (e.g. 'rhodes-swing-form'). */
  rhodesPattern: z.string().optional(),
  /** @deprecated Use rhodesPattern (organism-driven scheduling) instead. */
  rhodesMode: z
    .enum([
      'wholeNotes',
      'halfNotes',
      'quarterNotes',
      'charleston',
      'reverse-charleston',
      'basie-2-4',
      'offbeat-2-4',
      'anticipation-4and',
      'one-twoand-four',
      'oneand-three',
      'twoand-only',
      'four-and-sparse',
      'two-threeand',
    ])
    .optional(),
  /** @deprecated Legacy layer mode — superseded by rhodesPattern. */
  rhodesLayerMode: z
    .enum(['pads', 'subtle-offbeats', 'high-comping', 'ambient-swells', 'stab-accents', 'none'])
    .optional(),
  rhodesLayerVolume: z.number().min(0).max(1).optional(),
  rhodesVoicingDensity: z.enum(['shell2', 'rootless3', 'rootless4', 'quartal']).optional(),
  pianoEnabled: z.boolean().optional(),
  pianoVolume: z.number().min(0).max(1).optional(),
  pianoVoicingDensity: z.enum(['shell2', 'rootless3', 'rootless4', 'quartal']).optional(),
  pianoRandomizationLevel: z.enum(['off', 'subtle', 'moderate', 'high']).optional(),
  pianoSampleLibrary: z.enum(['salamander', 'upright']).optional(),
  pianoPattern: z.string().nullable().optional(),
  /** Единственная ручка «сколько гармонической краски» (заменяет старые upper/passing тумблеры). */
  pianoTension: z.enum(['clean', 'moderate', 'altered', 'max']).optional(),
  pianoHumanize: z
    .object({
      timingJitterMs: z
        .preprocess(
          (val) => {
            if (typeof val === 'number') {
              if (val === 0) return 'none';
              if (val <= 6) return 'low';
              if (val <= 20) return 'medium';
              return 'high';
            }
            return val;
          },
          z.enum(['none', 'low', 'medium', 'high']),
        )
        .optional(),
      velocityVariation: z.enum(['off', 'light', 'medium', 'strong']).optional(),
      chordSpreadMs: z
        .preprocess(
          (val) => {
            if (typeof val === 'number') {
              if (val === 0) return 'none';
              if (val <= 8) return 'low';
              if (val <= 25) return 'medium';
              return 'high';
            }
            return val;
          },
          z.enum(['none', 'low', 'medium', 'high']),
        )
        .optional(),
      phrasing: z.enum(['flat', 'gentle', 'expressive']).optional(),
      humanizeTiming: z
        .enum(['none', 'slight-rush', 'slight-lag', 'medium-rush', 'medium-lag'])
        .optional(),
    })
    .optional(),
  drumKit: z.string().optional(),
  drumsPattern: z.string().nullable().optional(),
  drumsEnabled: z.boolean().optional(),
  drumsVolume: z.number().min(0).max(1).optional(),
  drumsBassDrumEnabled: z.boolean().optional(),
  drumsBassDrumVolume: z.number().min(0).max(1).optional(),
  drumsSnareEnabled: z.boolean().optional(),
  drumsSnareVolume: z.number().min(0).max(1).optional(),
  drumsHihatEnabled: z.boolean().optional(),
  drumsHihatVolume: z.number().min(0).max(1).optional(),
  drumsHihatOpenness: z.number().int().min(0).max(5).optional(),
  drumsRideEnabled: z.boolean().optional(),
  drumsRideVolume: z.number().min(0).max(1).optional(),
  drumsCrashEnabled: z.boolean().optional(),
  drumsCrashVolume: z.number().min(0).max(1).optional(),
  drumsCrashFrequency: z.number().int().min(0).max(32).optional(),
  drumsRimEnabled: z.boolean().optional(),
  drumsRimVolume: z.number().min(0).max(1).optional(),
  drumsTomEnabled: z.boolean().optional(),
  drumsTomVolume: z.number().min(0).max(1).optional(),
  drumsHumanizeIntensity: z.enum(['off', 'low', 'med', 'high']).optional(),
  /** Percussion Kit settings */
  percussionEnabled: z.boolean().optional(),
  percussionVolume: z.number().min(0).max(1).optional(),
  percussionHumanizeIntensity: z.enum(['off', 'low', 'med', 'high']).optional(),
  percussionPattern: z.string().nullable().optional(),
  percussionCongaHighEnabled: z.boolean().optional(),
  percussionCongaHighVolume: z.number().min(0).max(1).optional(),
  percussionCongaLowEnabled: z.boolean().optional(),
  percussionCongaLowVolume: z.number().min(0).max(1).optional(),
  percussionBongoLowEnabled: z.boolean().optional(),
  percussionBongoLowVolume: z.number().min(0).max(1).optional(),
  percussionTumbaEnabled: z.boolean().optional(),
  percussionTumbaVolume: z.number().min(0).max(1).optional(),
  percussionTimbalesEnabled: z.boolean().optional(),
  percussionTimbalesVolume: z.number().min(0).max(1).optional(),
  percussionCowbellEnabled: z.boolean().optional(),
  percussionCowbellVolume: z.number().min(0).max(1).optional(),
  percussionClaveEnabled: z.boolean().optional(),
  percussionClaveVolume: z.number().min(0).max(1).optional(),
  percussionShakerEnabled: z.boolean().optional(),
  percussionShakerVolume: z.number().min(0).max(1).optional(),
  percussionGuiroEnabled: z.boolean().optional(),
  percussionGuiroVolume: z.number().min(0).max(1).optional(),
  percussionCabasaEnabled: z.boolean().optional(),
  percussionCabasaVolume: z.number().min(0).max(1).optional(),
  percussionTriangleEnabled: z.boolean().optional(),
  percussionTriangleVolume: z.number().min(0).max(1).optional(),
  percussionTambourineEnabled: z.boolean().optional(),
  percussionTambourineVolume: z.number().min(0).max(1).optional(),
  percussionVibraslapEnabled: z.boolean().optional(),
  percussionVibraslapVolume: z.number().min(0).max(1).optional(),
  percussionBelltreeEnabled: z.boolean().optional(),
  percussionBelltreeVolume: z.number().min(0).max(1).optional(),
  percussionWhistleEnabled: z.boolean().optional(),
  percussionWhistleVolume: z.number().min(0).max(1).optional(),
  percussionSleighBellsEnabled: z.boolean().optional(),
  percussionSleighBellsVolume: z.number().min(0).max(1).optional(),
  /** Guitar settings */
  guitarEnabled: z.boolean().optional(),
  guitarVolume: z.number().min(0).max(1).optional(),
  /** Global playback style — single source of truth for all instruments. */
  style: z.enum(STYLES).optional(),
  /** Per-style user overrides for instrument settings (JSON). See T-004 / ARANGEMENT_PLAN. */
  perStyleOverrides: z.record(z.enum(STYLES), z.record(z.string(), z.unknown())).optional(),
  /** Active ensemble preset (last applied by user). Cleared on reset. */
  activeEnsemble: z.enum(['duet', 'trio', 'quartet', 'quintet', 'full']).optional(),
  swingRatio: z.number().min(0.5).max(0.75).optional(),
  audioFormat: z.enum(['aac', 'mp3']).optional(),

  // ── MIDI settings (Phase C) ──
  midiDeviceId: z.string().optional(),
  midiChannel: z.number().int().min(0).max(15).optional(),
  soloToneId: z.string().optional(),
  soloVolume: z.number().min(0).max(1).optional(),
  duckingEnabled: z.boolean().optional(),

  /** UI theme preference persisted server-side. */
  theme: z.enum(['dark', 'light']).optional(),

  practiceCards: z
    .object({
      lastExerciseType: z.enum(['chords', 'scales', 'enclosures', 'sequences']).optional(),
      lastEnclosureType: z
        .enum([
          'diatonic-upper',
          'diatonic-lower',
          'chromatic-upper',
          'chromatic-lower',
          'full-diatonic',
          'full-chromatic',
          'diatonic-upper-chromatic-lower',
          'four-note-top-down',
          'four-note-bottom-up',
          'all',
        ])
        .optional(),
      lastEnclosureDegrees: z
        .array(z.enum(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']))
        .optional(),
      lastEnclosureScaleType: z
        .enum([
          'major',
          'natural-minor',
          'harmonic-minor',
          'melodic-minor',
          'dorian',
          'mixolydian',
          'phrygian',
          'lydian',
          'locrian',
        ])
        .optional(),
      lastSequenceType: z
        .enum([
          '1235',
          '1234',
          '1357',
          '1531',
          'pentatonic',
          '5321',
          '8765',
          '1324',
          '1345',
          '1356',
          '1231',
          '3212',
          '3579',
          'all',
        ])
        .optional(),
      lastSequenceStartDegrees: z.array(z.enum(['1', '2', '3', '4', '5', '6', '7'])).optional(),
      lastSequenceScaleType: z
        .enum([
          'major',
          'natural-minor',
          'harmonic-minor',
          'melodic-minor',
          'dorian',
          'mixolydian',
          'phrygian',
          'lydian',
          'locrian',
        ])
        .optional(),
      lastSource: z.enum(['pattern', 'random', 'dsl', 'unified']).optional(),
      lastPatternId: z.string().optional(),
      lastKeys: z.array(z.enum(KEYS)).optional(),
      lastTempo: z.number().int().min(40).max(300).optional(),
      lastRepetitions: z.number().int().min(1).optional(),
      lastInfinite: z.boolean().optional(),
      cardMode: z.enum(['current', 'prev-current', 'prev-current-next']).optional(),
      countInBars: z.number().int().min(0).max(4).optional(),
      backingBass: z.boolean().optional(),
      backingDrums: z.boolean().optional(),
      backingPiano: z.boolean().optional(),
      backingRhodes: z.boolean().optional(),
      metronomeEnabled: z.boolean().optional(),
      metronomeVolume: z.number().min(0).max(1).optional(),
      barsPerChord: z.number().int().min(1).max(16).optional(),
      timeSignature: z.enum(TIME_SIGNATURES).optional(),
      playRandomly: z.boolean().optional(),
    })
    .optional(),
});
export type UserSettingsDTO = z.infer<typeof UserSettingsDTOSchema>;

export const UpdateSettingsSchema = UserSettingsDTOSchema.partial();
export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>;

// ── Default settings (admin "factory defaults" singleton) ──────────────────

/**
 * Factory defaults managed by admins and inherited by new users
 * (`ensureUserSettings`) and guests (`useEffectiveSettings`). A subset of
 * {@link UserSettingsDTOSchema} — personal fields (practice cards, MIDI
 * device/channel) are excluded: they have no meaning as a global default.
 */
export const DefaultSettingsSchema = UserSettingsDTOSchema.omit({
  practiceCards: true,
  midiDeviceId: true,
  midiChannel: true,
});
export type DefaultSettingsDTO = z.infer<typeof DefaultSettingsSchema>;

export const UpdateDefaultSettingsSchema = DefaultSettingsSchema.partial();
export type UpdateDefaultSettingsInput = z.infer<typeof UpdateDefaultSettingsSchema>;

// ── Auth methods ──────────────────────────────────────────────────────────

export interface AuthMethodsDTO {
  google: boolean;
  github: boolean;
  magicLink: boolean;
  dev: boolean;
}

// ── Auth requests ─────────────────────────────────────────────────────────

export const DevLoginSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
});
export type DevLoginInput = z.infer<typeof DevLoginSchema>;

export const SendMagicLinkSchema = z.object({
  email: z.string().email(),
});
export type SendMagicLinkInput = z.infer<typeof SendMagicLinkSchema>;

// ── Auth responses ────────────────────────────────────────────────────────

export const MeResponseSchema = z.object({
  user: UserDTOSchema.nullable(),
  permissions: z.array(z.string()),
  inactivePermissions: z.array(z.string()),
  flags: z.record(z.boolean()),
  theme: z.enum(['dark', 'light']).nullable().optional(),
});
export type MeResponse = z.infer<typeof MeResponseSchema>;

// ── RBAC DTOs ─────────────────────────────────────────────────────────────

export const PermissionDTOSchema = z.object({
  code: z.string(),
});
export type PermissionDTO = z.infer<typeof PermissionDTOSchema>;

export const RoleDTOSchema = z.object({
  id: z.string(),
  name: z.string(),
  permissions: z.array(z.string()),
  inactivePermissions: z.array(z.string()),
  createdAt: z.number(),
});
export type RoleDTO = z.infer<typeof RoleDTOSchema>;

export const CreateRoleSchema = z.object({
  name: z.string().min(1).max(64),
  permissions: z.array(z.string()),
  inactivePermissions: z.array(z.string()).optional(),
});
export type CreateRoleInput = z.infer<typeof CreateRoleSchema>;

export const UpdateRoleSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  permissions: z.array(z.string()).optional(),
  inactivePermissions: z.array(z.string()).optional(),
});
export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>;

export const UpdateUserRolesSchema = z.object({
  roleIds: z.array(z.string()),
});
export type UpdateUserRolesInput = z.infer<typeof UpdateUserRolesSchema>;

// ── Feature flags ─────────────────────────────────────────────────────────

export const FLAG_CATEGORIES = ['feature', 'experiment', 'maintenance', 'killswitch'] as const;
export type FlagCategory = (typeof FLAG_CATEGORIES)[number];

/**
 * Role options for flag targeting in the admin UI.
 * Alias of SYSTEM_ROLES — exporting RBAC_ROLES from the api package would break
 * layer boundaries (shared cannot depend on apps/api).
 */
export const FLAG_TARGET_ROLES = SYSTEM_ROLES;
export type FlagTargetRole = (typeof FLAG_TARGET_ROLES)[number];

export const FeatureFlagDTOSchema = z.object({
  key: z.string(),
  description: z.string().nullable(),
  category: z.enum(FLAG_CATEGORIES).nullable(),
  enabled: z.boolean(),
  roles: z.array(z.string()),
  userIds: z.array(z.string()),
  rolloutPercent: z.number().int().min(0).max(100).nullable(),
  expiresAt: z.number().int().nullable(),
  /** Computed: expiresAt < now */
  isExpired: z.boolean(),
  createdBy: z.string().nullable(),
  updatedAt: z.number().nullable(),
  updatedBy: z.string().nullable(),
  createdAt: z.number(),
});
export type FeatureFlagDTO = z.infer<typeof FeatureFlagDTOSchema>;

export const CreateFlagSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9._-]+$/, 'Only lowercase, digits, dot, dash, underscore'),
  description: z.string().max(500).optional(),
  category: z.enum(FLAG_CATEGORIES).optional(),
  enabled: z.boolean().default(false),
  roles: z.array(z.string()).optional(),
  userIds: z.array(z.string()).optional(),
  rolloutPercent: z.number().int().min(0).max(100).optional(),
  expiresAt: z.number().int().positive().optional(),
});
export type CreateFlagInput = z.infer<typeof CreateFlagSchema>;

export const UpdateFlagSchema = CreateFlagSchema.partial().omit({ key: true });
export type UpdateFlagInput = z.infer<typeof UpdateFlagSchema>;

/** Audit log entry for a flag — returned by GET /api/admin/flags/:key. */
export const FlagHistoryEntryDTOSchema = z.object({
  id: z.string(),
  action: z.string(),
  actorUserId: z.string(),
  before: z.unknown().nullable(),
  after: z.unknown().nullable(),
  timestamp: z.number(),
  reason: z.string().nullable(),
});
export type FlagHistoryEntryDTO = z.infer<typeof FlagHistoryEntryDTOSchema>;

// ── Subscription & Billing DTOs (Phase 8) ─────────────────────────────────

export const AdminSubscriptionUpdateSchema = z.object({
  tier: z.enum(['pro', 'premium']).nullable(),
  months: z.number().int().min(1).max(36).optional(),
  status: z.enum(['active', 'canceled', 'past_due']).optional(),
});
export type AdminSubscriptionUpdateInput = z.infer<typeof AdminSubscriptionUpdateSchema>;

export const SubscriptionRequestSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(128).optional(),
  desiredTier: z.enum(['pro', 'premium']),
  message: z.string().max(2000).optional(),
});
export type SubscriptionRequestInput = z.infer<typeof SubscriptionRequestSchema>;

export const SubscriptionChangeSchema = z.object({
  action: z.enum(['upgrade', 'downgrade', 'cancel']),
  tier: z.enum(['pro', 'premium']).optional(),
  message: z.string().max(2000).optional(),
});
export type SubscriptionChangeInput = z.infer<typeof SubscriptionChangeSchema>;

export const SubscriptionRequestActionSchema = z.object({
  reason: z.string().max(2000).optional(),
});
export type SubscriptionRequestActionInput = z.infer<typeof SubscriptionRequestActionSchema>;

export const SubscriptionDTOSchema = z.object({
  tier: z.enum(['free', 'pro', 'premium']).nullable(),
  status: z.enum(['active', 'past_due', 'canceled', 'expired', 'incomplete']).nullable(),
  currentPeriodEnd: z.number().nullable(),
  gracePeriodEnds: z.number().nullable(),
  isGracePeriod: z.boolean(),
});
export type SubscriptionDTO = z.infer<typeof SubscriptionDTOSchema>;

export const AdminSubscriptionDTOSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userEmail: z.string().nullable(),
  tierName: z.string().nullable(),
  status: z.string(),
  currentPeriodStart: z.number().nullable(),
  currentPeriodEnd: z.number().nullable(),
  gracePeriodEnds: z.number().nullable(),
  canceledAt: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type AdminSubscriptionDTO = z.infer<typeof AdminSubscriptionDTOSchema>;

export const AdminSubscriptionRequestDTOSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  desiredTier: z.string(),
  message: z.string().nullable(),
  status: z.string(),
  userId: z.string().nullable(),
  processedBy: z.string().nullable(),
  processedComment: z.string().nullable(),
  processedAt: z.number().nullable(),
  createdAt: z.number(),
});
export type AdminSubscriptionRequestDTO = z.infer<typeof AdminSubscriptionRequestDTOSchema>;

export const SubscriptionHistoryEntryDTOSchema = z.object({
  id: z.string(),
  eventType: z.string(),
  actorId: z.string(),
  oldTier: z.string().nullable(),
  newTier: z.string().nullable(),
  metadata: z.unknown(),
  createdAt: z.number(),
});
export type SubscriptionHistoryEntryDTO = z.infer<typeof SubscriptionHistoryEntryDTOSchema>;
