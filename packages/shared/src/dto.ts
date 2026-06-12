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
  provider: z.enum(['google', 'dev']),
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
  metronomeVolume: z.number().min(0).max(1).optional(),
  bassEnabled: z.boolean().optional(),
  bassVolume: z.number().min(0).max(1).optional(),
  bassComplexity: z.number().int().min(1).max(7).optional(),
  bassOctaveUp: z.boolean().optional(),
  rhodesEnabled: z.boolean().optional(),
  rhodesVolume: z.number().min(0).max(1).optional(),
  rhodesMode: z.enum([
    'wholeNotes', 'halfNotes', 'quarterNotes',
    'charleston', 'reverse-charleston', 'basie-2-4', 'offbeat-2-4',
    'anticipation-4and', 'one-twoand-four', 'oneand-three',
    'twoand-only', 'four-and-sparse', 'two-threeand',
  ]).optional(),
  rhodesVoicingDensity: z.enum(['shell2', 'rootless3', 'rootless4']).optional(),
  drumsEnabled: z.boolean().optional(),
  drumsVolume: z.number().min(0).max(1).optional(),
  drumsRideEnabled: z.boolean().optional(),
  drumsRideVolume: z.number().min(0).max(1).optional(),
  drumsStirEnabled: z.boolean().optional(),
  drumsStirVolume: z.number().min(0).max(1).optional(),
  drumsHihatEnabled: z.boolean().optional(),
  drumsHihatVolume: z.number().min(0).max(1).optional(),
  drumsRidePattern: z.enum(['quarters', 'swingRide']).optional(),
  swingRatio: z.number().min(0.50).max(0.75).optional(),
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
});
export type MeResponse = z.infer<typeof MeResponseSchema>;
