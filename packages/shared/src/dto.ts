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
