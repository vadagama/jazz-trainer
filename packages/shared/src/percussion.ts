/**
 * Percussion Constructor contract — zod schemas for the admin-edited pattern-engine
 * data (cells / molecules / organisms) that the Percussion Constructor UI sends to
 * `POST /api/dev/percussion-source` and the API writes into `*Generated.ts`.
 *
 * Mirrors `drums.ts` but bound to the percussion vocabulary: 3 styles (latin/bossa/funk),
 * 16 unpitched sounds, no velocity layers.
 */
import { z } from 'zod';
import { SectionTypeSchema } from './music.js';
import { MoleculeCategorySchema, DrumDynamicsTypeSchema, DrumDynamicsSchema } from './drums.js';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const PERCUSSION_PATTERN_STYLES = ['latin', 'bossa', 'funk'] as const;
export const PercussionPatternStyleSchema = z.enum(PERCUSSION_PATTERN_STYLES);
export type PercussionPatternStyle = z.infer<typeof PercussionPatternStyleSchema>;

/**
 * Sound vocabulary for the percussion instrument. Mirrors `PercussionSound` in
 * `music-core/src/audio/percussionPatternTypes.ts`.
 */
export const PercussionSoundSchema = z.enum([
  'congaHigh',
  'congaLow',
  'bongoHigh',
  'bongoLow',
  'tumba',
  'timbales',
  'cowbell',
  'clave',
  'shaker',
  'guiro',
  'cabasa',
  'triangle',
  'tambourine',
  'vibraslap',
  'belltree',
  'whistle',
  'sleighBells',
]);
export type PercussionSound = z.infer<typeof PercussionSoundSchema>;

// Reuse the shared category/dynamics schemas from drums.ts
export const PercussionDynamicsTypeSchema = DrumDynamicsTypeSchema;
export const PercussionDynamicsSchema = DrumDynamicsSchema;

// ─── Molecule (Level 1) ───────────────────────────────────────────────────────

export const PercussionAtomSchema = z.object({
  sound: PercussionSoundSchema,
  /** Tick offset from start of the molecule (≥ 0). */
  atTick: z.number().int().nonnegative(),
  velocity: z.number().min(0).max(1),
  durationTicks: z.number().int().nonnegative(),
});

export const PercussionMoleculeSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  style: PercussionPatternStyleSchema,
  bars: z.union([z.literal(1), z.literal(2)]),
  atoms: z.array(PercussionAtomSchema).min(1),
  category: MoleculeCategorySchema,
  tags: z.array(z.string()),
  complexity: z.object({
    min: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    max: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  }),
  conditions: z
    .object({
      barModulo: z.number().int().positive().optional(),
      barRange: z
        .object({
          first: z.number().int().nonnegative().optional(),
          last: z.number().int().nonnegative().optional(),
        })
        .optional(),
    })
    .strict()
    .optional(),
});
export type PercussionMoleculeDTO = z.infer<typeof PercussionMoleculeSchema>;

// ─── Cell (Level 2) ───────────────────────────────────────────────────────────

export const PercussionClipSchema = z.object({
  startBar: z.number().int().nonnegative(),
  lengthBars: z.number().int().positive(),
  pool: z.array(z.string().min(1)).min(1),
});

export const PercussionLaneSchema = z.object({
  name: z.string().min(1),
  probability: z.number().min(0).max(1),
  clips: z.array(PercussionClipSchema),
});

export const PercussionCellSchema = z.object({
  id: z.string().min(1),
  style: PercussionPatternStyleSchema,
  length: z.union([z.literal(4), z.literal(8), z.literal(12), z.literal(16), z.literal(32)]),
  timeSignature: z
    .tuple([z.literal(3), z.literal(4)])
    .or(z.tuple([z.literal(4), z.literal(4)]))
    .or(z.tuple([z.literal(5), z.literal(4)])),
  velocity: z.number().min(0).max(1),
  dynamics: PercussionDynamicsSchema,
  lanes: z.array(PercussionLaneSchema).min(1).max(15),
});
export type PercussionCellDTO = z.infer<typeof PercussionCellSchema>;

// ─── Organism (Level 3) — section-driven form ────────────────────────────────

export const PercussionOrganismSchema = z.object({
  id: z.string().min(1),
  style: PercussionPatternStyleSchema,
  label: z.string(),
  sectionMap: z.record(z.string(), z.array(z.string().min(1)).min(1)).superRefine((map, ctx) => {
    for (const key of Object.keys(map)) {
      const result = SectionTypeSchema.safeParse(key);
      if (!result.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `"${key}" is not a valid SectionType`,
        });
      }
    }
  }),
  timeSignatureOverrides: z
    .record(z.string(), z.record(z.string(), z.array(z.string().min(1)).min(1)))
    .superRefine((overrides, ctx) => {
      const tsRe = /^\d+\/\d+$/;
      for (const tsKey of Object.keys(overrides)) {
        if (!tsRe.test(tsKey)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `"${tsKey}" is not a valid time signature (expected like "3/4")`,
          });
          continue;
        }
        for (const secKey of Object.keys(overrides[tsKey]!)) {
          const result = SectionTypeSchema.safeParse(secKey);
          if (!result.success) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `timeSignatureOverrides["${tsKey}"]."${secKey}" is not a valid SectionType`,
            });
          }
        }
      }
    })
    .optional(),
  defaultForm: z
    .array(
      z.object({
        label: z.string(),
        type: SectionTypeSchema,
        cellPool: z.array(z.string().min(1)).min(1),
        repeats: z.number().int().positive().optional(),
        repeatsCompleted: z.number().int().nonnegative().optional(),
      }),
    )
    .optional(),
});
export type PercussionOrganismDTO = z.infer<typeof PercussionOrganismSchema>;

// ─── Top-level payload ────────────────────────────────────────────────────────

export const PercussionSourcePayloadSchema = z.object({
  cells: z.record(z.string(), PercussionCellSchema),
  molecules: z.record(z.string(), PercussionMoleculeSchema),
  organisms: z.record(z.string(), PercussionOrganismSchema).optional(),
});
export type PercussionSourcePayload = z.infer<typeof PercussionSourcePayloadSchema>;
