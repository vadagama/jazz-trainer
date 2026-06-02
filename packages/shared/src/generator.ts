import { z } from 'zod';
import { KEYS } from './constants.js';

/**
 * Harmony generator contracts (docs/04-api.md §5, docs/features/03-harmony-generator.md).
 * Used by music-core (generation), api (POST /generate) and web (forms).
 */

export const KeySchema = z.enum(KEYS);

export const GenerateOptionsSchema = z.object({
  /** seed for randomized patterns (deterministic output for the same seed) */
  seed: z.number().int().optional(),
});
export type GenerateOptions = z.infer<typeof GenerateOptionsSchema>;

export const GenerateSchema = z.object({
  patternId: z.string().min(1),
  key: KeySchema,
  lengthBars: z.number().int().positive().max(64).optional(),
  options: GenerateOptionsSchema.optional(),
});
export type GenerateInput = z.infer<typeof GenerateSchema>;

/** Catalog entry describing a built-in generator pattern (`GET /api/patterns`). */
export interface PatternInfo {
  id: string;
  name: string;
  description: string;
  /** number of bars produced when `lengthBars` is omitted */
  defaultBars: number;
  /** whether `lengthBars` meaningfully changes the output */
  variableLength: boolean;
}
