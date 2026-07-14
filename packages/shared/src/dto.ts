import { z } from 'zod';
import { CLICK_SOUNDS, METRONOME_MODES, STYLES, KEYS, TIME_SIGNATURES } from './constants.js';

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
  provider: z.enum(['google', 'dev', 'system']),
  role: z.string(),
  status: z.enum(['active', 'disabled']),
  createdAt: z.number().int(),
});
export type UserDTO = z.infer<typeof UserDTOSchema>;

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

  practiceCards: z
    .object({
      lastExerciseType: z.enum(['chords', 'scales']).optional(),
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

// ── Auth requests ─────────────────────────────────────────────────────────

export const DevLoginSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
});
export type DevLoginInput = z.infer<typeof DevLoginSchema>;

// ── Auth responses ────────────────────────────────────────────────────────

export const MeResponseSchema = z.object({
  user: UserDTOSchema.nullable(),
  permissions: z.array(z.string()),
  flags: z.record(z.boolean()),
});
export type MeResponse = z.infer<typeof MeResponseSchema>;
