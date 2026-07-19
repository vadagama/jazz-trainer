import { z } from 'zod';
import {
  KEYS,
  VISIBILITY,
  STYLES,
  CATALOG_DIFFICULTIES,
  CATALOG_MODERATION_STATUS,
  CATALOG_TAG_CATEGORIES,
} from './constants.js';
import { CompositionContentSchema, TimeSignatureSchema } from './music.js';

/**
 * DTOs and Zod schemas for the harmony compositions layer.
 * Renamed from "grids" (§12 CATALOG-VISION.md).
 * Used by apps/api and apps/web.
 */
const KeySchema = z.enum(KEYS);
const VisibilitySchema = z.enum(VISIBILITY);
const StyleSchema = z.enum(STYLES);
const DifficultySchema = z.enum(CATALOG_DIFFICULTIES);
const ModerationStatusSchema = z.enum(CATALOG_MODERATION_STATUS);

// ── Composition summary (list views, no content) ──────────────────────────

export const HarmonyCompositionSummaryDTOSchema = z.object({
  id: z.string(),
  name: z.string(),
  timeSignature: TimeSignatureSchema,
  key: KeySchema,
  barsCount: z.number().int().nonnegative(),
  visibility: VisibilitySchema,
  updatedAt: z.number().int(),
  recommendedStyle: StyleSchema.nullable(),
  recommendedTempo: z.number().int().min(20).max(400).nullable(),
});
export type HarmonyCompositionSummaryDTO = z.infer<
  typeof HarmonyCompositionSummaryDTOSchema
>;

// ── Full composition (includes content) ───────────────────────────────────

export const HarmonyCompositionDTOSchema = HarmonyCompositionSummaryDTOSchema.extend({
  content: CompositionContentSchema,
  sourceCompositionId: z.string().nullable(),
  createdAt: z.number().int(),
  moderationStatus: ModerationStatusSchema.optional(),
});
export type HarmonyCompositionDTO = z.infer<typeof HarmonyCompositionDTOSchema>;

// ── Public catalog variants ───────────────────────────────────────────────

export const PublicCompositionSummaryDTOSchema = z.object({
  id: z.string(),
  name: z.string(),
  timeSignature: TimeSignatureSchema,
  key: KeySchema,
  barsCount: z.number().int().nonnegative(),
  likeCount: z.number().int().nonnegative(),
  likedByMe: z.boolean(),
  updatedAt: z.number().int(),
});
export type PublicCompositionSummaryDTO = z.infer<
  typeof PublicCompositionSummaryDTOSchema
>;

export const PublicCompositionDTOSchema = PublicCompositionSummaryDTOSchema.extend({
  content: CompositionContentSchema,
  owner: z.object({ name: z.string() }),
  recommendedStyle: StyleSchema.nullable().optional(),
  recommendedTempo: z.number().int().min(20).max(400).nullable().optional(),
});
export type PublicCompositionDTO = z.infer<typeof PublicCompositionDTOSchema>;

// ── Catalog entry: composition with full catalog metadata (§2.2) ──────────

export const CatalogEntrySchema = PublicCompositionSummaryDTOSchema.extend({
  description: z.string().nullable(),
  difficulty: DifficultySchema,
  tags: z.array(z.string()),
  author: z.string(),
  recommendedStyle: StyleSchema.nullable(),
  recommendedTempo: z.number().int().min(20).max(400).nullable(),
  catalogPublishedAt: z.number().int(),
  copyCount: z.number().int().nonnegative(),
  featured: z.boolean(),
  featuredOrder: z.number().int().nullable(),
  moderationStatus: ModerationStatusSchema,
  publisherId: z.string(),
  publisherName: z.string(),
  visibility: VisibilitySchema,
  /** present only on the detail endpoint GET /api/catalog/:id */
  content: CompositionContentSchema.optional(),
});
export type CatalogEntry = z.infer<typeof CatalogEntrySchema>;

// ── Create / Update own composition ────────────────────────────────────────

export const CreateCompositionSchema = z.object({
  name: z.string().min(1).max(200),
  timeSignature: TimeSignatureSchema.optional(),
  key: KeySchema.optional(),
  content: CompositionContentSchema.optional(),
});
export type CreateCompositionInput = z.infer<typeof CreateCompositionSchema>;

export const UpdateCompositionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  timeSignature: TimeSignatureSchema.optional(),
  key: KeySchema.optional(),
  visibility: VisibilitySchema.optional(),
  content: CompositionContentSchema.optional(),
  recommendedStyle: StyleSchema.nullable().optional(),
  recommendedTempo: z.number().int().min(20).max(400).nullable().optional(),
});
export type UpdateCompositionInput = z.infer<typeof UpdateCompositionSchema>;

// ── Copy ──────────────────────────────────────────────────────────────────

export const CopyCompositionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
});
export type CopyCompositionInput = z.infer<typeof CopyCompositionSchema>;

// ── Import from DSL ───────────────────────────────────────────────────────

export const ImportCompositionSchema = z.object({
  name: z.string().min(1).max(200),
  timeSignature: TimeSignatureSchema.optional(),
  key: KeySchema.optional(),
  dsl: z.string().min(1),
});
export type ImportCompositionInput = z.infer<typeof ImportCompositionSchema>;

// ── Public catalog query (legacy, single search box) ──────────────────────

export const PublicCompositionsQuerySchema = z.object({
  q: z.string().optional(),
  sort: z.enum(['updated', 'likes', 'name']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});
export type PublicCompositionsQuery = z.infer<typeof PublicCompositionsQuerySchema>;

// ── Like response ─────────────────────────────────────────────────────────

export const LikeResponseSchema = z.object({
  likeCount: z.number().int().nonnegative(),
  likedByMe: z.boolean(),
});
export type LikeResponse = z.infer<typeof LikeResponseSchema>;

// ── Catalog query: rich filtering, sorting, pagination (§6.4) ─────────────

/** Comma-separated multi-values are split into arrays by the service layer. */
export const CatalogSortSchema = z.enum([
  'popular',
  'newest',
  'updated',
  'name_asc',
  'copies',
]);
export type CatalogSort = z.infer<typeof CatalogSortSchema>;

export const CatalogQuerySchema = z.object({
  style: z.string().optional(),
  timeSignature: z.string().optional(),
  difficulty: z.string().optional(),
  key: z.string().optional(),
  tags: z.string().optional(),
  author: z.string().optional(),
  publisherId: z.string().optional(),
  tempoMin: z.coerce.number().int().min(20).max(400).optional(),
  tempoMax: z.coerce.number().int().min(20).max(400).optional(),
  barsMin: z.coerce.number().int().min(0).optional(),
  barsMax: z.coerce.number().int().min(0).optional(),
  q: z.string().optional(),
  sort: CatalogSortSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});
export type CatalogQuery = z.infer<typeof CatalogQuerySchema>;

/** Parsed/normalized catalog query after multi-value split. */
export interface CatalogQueryParsed extends Omit<CatalogQuery, 'style' | 'timeSignature' | 'difficulty' | 'key' | 'tags'> {
  style: string[];
  timeSignature: string[];
  difficulty: string[];
  key: string[];
  tags: string[];
}

// ── Catalog publish / update (editor-facing, §6.2) ────────────────────────

export const CreateCatalogEntrySchema = z.object({
  name: z.string().min(1).max(200),
  author: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  difficulty: DifficultySchema,
  tags: z.array(z.string()).default([]),
  recommendedStyle: StyleSchema,
  recommendedTempo: z.number().int().min(20).max(400),
  timeSignature: TimeSignatureSchema,
  key: KeySchema,
  content: CompositionContentSchema,
  /** optional: publish from an existing own composition id */
  sourceCompositionId: z.string().optional(),
});
export type CreateCatalogEntryInput = z.infer<typeof CreateCatalogEntrySchema>;

export const UpdateCatalogEntrySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  author: z.string().min(1).max(200).optional(),
  description: z.string().max(500).nullable().optional(),
  difficulty: DifficultySchema.optional(),
  tags: z.array(z.string()).optional(),
  recommendedStyle: StyleSchema.optional(),
  recommendedTempo: z.number().int().min(20).max(400).optional(),
  timeSignature: TimeSignatureSchema.optional(),
  key: KeySchema.optional(),
  content: CompositionContentSchema.optional(),
});
export type UpdateCatalogEntryInput = z.infer<typeof UpdateCatalogEntrySchema>;

// ── Catalog admin: batch operations (§5.5) ────────────────────────────────

export const BatchActionSchema = z.object({
  ids: z.array(z.string()).min(1),
  action: z.enum(['publish', 'unpublish', 'addToCatalog', 'delete', 'addTag', 'removeTag']),
  tag: z.string().optional(),
});
export type BatchActionInput = z.infer<typeof BatchActionSchema>;

// ── Catalog tags management (§5.4) ────────────────────────────────────────

export const CatalogTagCategorySchema = z.enum(CATALOG_TAG_CATEGORIES);

export const CatalogTagSchema = z.object({
  id: z.string(),
  value: z.string().min(1),
  category: CatalogTagCategorySchema,
  description: z.string().nullable(),
  hidden: z.boolean(),
  usageCount: z.number().int().nonnegative(),
});
export type CatalogTag = z.infer<typeof CatalogTagSchema>;

export const CreateCatalogTagSchema = z.object({
  value: z.string().min(1).max(60),
  category: CatalogTagCategorySchema,
  description: z.string().max(300).optional(),
});
export type CreateCatalogTagInput = z.infer<typeof CreateCatalogTagSchema>;

export const UpdateCatalogTagSchema = z.object({
  value: z.string().min(1).max(60).optional(),
  category: CatalogTagCategorySchema.optional(),
  description: z.string().max(300).nullable().optional(),
  hidden: z.boolean().optional(),
});
export type UpdateCatalogTagInput = z.infer<typeof UpdateCatalogTagSchema>;

export const MergeCatalogTagsSchema = z.object({
  sourceIds: z.array(z.string()).min(1),
  targetId: z.string(),
});
export type MergeCatalogTagsInput = z.infer<typeof MergeCatalogTagsSchema>;

// ── Catalog stats (§5.6) ──────────────────────────────────────────────────

export const CatalogStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  approved: z.number().int().nonnegative(),
  rejected: z.number().int().nonnegative(),
  featured: z.number().int().nonnegative(),
  byStyle: z.record(z.string(), z.number().int().nonnegative()),
  byDifficulty: z.record(z.string(), z.number().int().nonnegative()),
  topByLikes: z.array(
    z.object({ id: z.string(), name: z.string(), author: z.string(), likeCount: z.number().int() }),
  ),
  topByCopies: z.array(
    z.object({ id: z.string(), name: z.string(), author: z.string(), copyCount: z.number().int() }),
  ),
});
export type CatalogStats = z.infer<typeof CatalogStatsSchema>;
