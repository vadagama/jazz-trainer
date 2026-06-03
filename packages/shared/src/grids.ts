import { z } from 'zod';
import { KEYS, TIME_SIGNATURES, VISIBILITY } from './constants.js';
import { GridContentSchema } from './music.js';

/**
 * DTOs and Zod schemas for the harmony grids layer (F5).
 * Used by apps/api and apps/web.
 * See docs/04-api.md §4.
 */

const TimeSignatureSchema = z.enum(TIME_SIGNATURES);
const KeySchema = z.enum(KEYS);
const VisibilitySchema = z.enum(VISIBILITY);

// ── Grid summary (list views, no content) ─────────────────────────────────

export const HarmonyGridSummaryDTOSchema = z.object({
  id: z.string(),
  name: z.string(),
  timeSignature: TimeSignatureSchema,
  key: KeySchema,
  barsCount: z.number().int().nonnegative(),
  visibility: VisibilitySchema,
  updatedAt: z.number().int(),
});
export type HarmonyGridSummaryDTO = z.infer<typeof HarmonyGridSummaryDTOSchema>;

// ── Full grid (includes content) ──────────────────────────────────────────

export const HarmonyGridDTOSchema = HarmonyGridSummaryDTOSchema.extend({
  content: GridContentSchema,
  sourceGridId: z.string().nullable(),
  createdAt: z.number().int(),
});
export type HarmonyGridDTO = z.infer<typeof HarmonyGridDTOSchema>;

// ── Public catalog variants ───────────────────────────────────────────────

export const PublicGridSummaryDTOSchema = z.object({
  id: z.string(),
  name: z.string(),
  timeSignature: TimeSignatureSchema,
  key: KeySchema,
  barsCount: z.number().int().nonnegative(),
  likeCount: z.number().int().nonnegative(),
  likedByMe: z.boolean(),
  updatedAt: z.number().int(),
});
export type PublicGridSummaryDTO = z.infer<typeof PublicGridSummaryDTOSchema>;

export const PublicGridDTOSchema = PublicGridSummaryDTOSchema.extend({
  content: GridContentSchema,
  owner: z.object({ name: z.string() }),
});
export type PublicGridDTO = z.infer<typeof PublicGridDTOSchema>;

// ── Create / Update ───────────────────────────────────────────────────────

export const CreateGridSchema = z.object({
  name: z.string().min(1).max(200),
  timeSignature: TimeSignatureSchema.optional(),
  key: KeySchema.optional(),
  content: GridContentSchema.optional(),
});
export type CreateGridInput = z.infer<typeof CreateGridSchema>;

export const UpdateGridSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  timeSignature: TimeSignatureSchema.optional(),
  key: KeySchema.optional(),
  visibility: VisibilitySchema.optional(),
  content: GridContentSchema.optional(),
});
export type UpdateGridInput = z.infer<typeof UpdateGridSchema>;

// ── Copy ──────────────────────────────────────────────────────────────────

export const CopyGridSchema = z.object({
  name: z.string().min(1).max(200).optional(),
});
export type CopyGridInput = z.infer<typeof CopyGridSchema>;

// ── Import from DSL ───────────────────────────────────────────────────────

export const ImportGridSchema = z.object({
  name: z.string().min(1).max(200),
  timeSignature: TimeSignatureSchema.optional(),
  key: KeySchema.optional(),
  dsl: z.string().min(1),
});
export type ImportGridInput = z.infer<typeof ImportGridSchema>;

// ── Public catalog query ──────────────────────────────────────────────────

export const PublicGridsQuerySchema = z.object({
  q: z.string().optional(),
  sort: z.enum(['updated', 'likes', 'name']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});
export type PublicGridsQuery = z.infer<typeof PublicGridsQuerySchema>;

// ── Like response ─────────────────────────────────────────────────────────

export const LikeResponseSchema = z.object({
  likeCount: z.number().int().nonnegative(),
  likedByMe: z.boolean(),
});
export type LikeResponse = z.infer<typeof LikeResponseSchema>;
