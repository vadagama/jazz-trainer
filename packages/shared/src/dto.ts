import { z } from 'zod';
import { CLICK_SOUNDS } from './constants.js';

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
  bassEnabled: z.boolean().optional(),
  bassVolume: z.number().min(0).max(1).optional(),
  bassComplexity: z.number().int().min(1).max(7).optional(),
  bassOctaveUp: z.boolean().optional(),
  rhodesEnabled: z.boolean().optional(),
  rhodesVolume: z.number().min(0).max(1).optional(),
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
  rhodesVoicingDensity: z.enum(['shell2', 'rootless3', 'rootless4']).optional(),
  drumsEnabled: z.boolean().optional(),
  drumsVolume: z.number().min(0).max(1).optional(),
  drumsRideEnabled: z.boolean().optional(),
  drumsRideVolume: z.number().min(0).max(1).optional(),
  /** @deprecated Use drumsSnareEnabled instead */
  drumsStirEnabled: z.boolean().optional(),
  /** @deprecated Use drumsSnareVolume instead */
  drumsStirVolume: z.number().min(0).max(1).optional(),
  drumsHihatEnabled: z.boolean().optional(),
  drumsHihatVolume: z.number().min(0).max(1).optional(),
  drumsHihatOpenness: z.number().int().min(0).max(5).optional(),
  drumsBassDrumEnabled: z.boolean().optional(),
  drumsBassDrumVolume: z.number().min(0).max(1).optional(),
  drumsSnareEnabled: z.boolean().optional(),
  drumsSnareVolume: z.number().min(0).max(1).optional(),
  drumsCrashEnabled: z.boolean().optional(),
  drumsCrashVolume: z.number().min(0).max(1).optional(),
  drumsCrashFrequency: z.number().int().min(0).max(32).optional(),
  drumsRimEnabled: z.boolean().optional(),
  drumsRimVolume: z.number().min(0).max(1).optional(),
  drumsPattern: z.enum(['swing', 'bossa', 'funk']).optional(),
  drumsHumanizeIntensity: z.enum(['off', 'low', 'med', 'high']).optional(),
  drumsFunkComplexity: z.enum(['simple', 'medium', 'complex']).optional(),
  drumsFillFrequency: z.enum(['never', '4bars', '8bars', '16bars']).optional(),
  drumsRandomizationLevel: z.enum(['off', 'subtle', 'moderate', 'high']).optional(),
  drumsFillComplexity: z.enum(['simple', 'medium', 'complex']).optional(),
  drumsRideVariation: z.boolean().optional(),
  drumsSnareGhosts: z.boolean().optional(),
  drumsBassDrumVariation: z.boolean().optional(),
  /** @deprecated Use drumsPattern instead */
  drumsRidePattern: z.enum(['quarters', 'swingRide']).optional(),
  swingRatio: z.number().min(0.5).max(0.75).optional(),
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
