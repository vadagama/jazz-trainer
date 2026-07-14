/**
 * Piano Constructor contract — zod schemas for the admin-edited pattern-engine
 * data (cells / molecules / organisms) that the Piano Constructor UI sends to
 * `POST /api/dev/piano-source` and the API writes into `*Generated.ts`.
 *
 * Mirrors the drum contract (drums.ts) but for piano MIDI-note-based patterns.
 * Reuses shared schemas from drums.ts where structurally identical.
 */
import { z } from 'zod';
import { SectionTypeSchema } from './music.js';
import {
  MoleculeCategorySchema,
  MoleculeConditionsSchema,
  OrganismSectionSchema,
} from './drums.js';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const PIANO_PATTERN_STYLES = ['swing', 'bossa', 'funk', 'latin', 'ballad'] as const;
export const PianoPatternStyleSchema = z.enum(PIANO_PATTERN_STYLES);
export type PianoPatternStyleDTO = z.infer<typeof PianoPatternStyleSchema>;

/**
 * Voice role — which part of the resolved chord voicing an atom plays.
 * The engine resolves actual pitches from the real chord + density + tension
 * at playback time (see docs/PIANO-EXTENDED-ARRANGEMENT-2.md); atoms never
 * bake in an interval or MIDI note.
 */
export const PianoSoundSchema = z.enum(['chord', 'shell', 'top', 'bass', 'upper']);

export const PianoDynamicsTypeSchema = z.enum([
  'steady',
  'crescendo',
  'decrescendo',
  'arch',
  'valley',
  'wave',
  'pulse',
]);

// ─── Molecule (Level 1) ───────────────────────────────────────────────────────

export const PianoAtomSchema = z.object({
  sound: PianoSoundSchema,
  atTick: z.number().int().nonnegative(),
  velocity: z.number().min(0).max(1),
  durationTicks: z.number().int().nonnegative(),
});

export const PianoMoleculeSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  style: PianoPatternStyleSchema,
  bars: z.union([z.literal(1), z.literal(2)]),
  atoms: z.array(PianoAtomSchema),
  category: MoleculeCategorySchema,
  tags: z.array(z.string()),
  complexity: z.object({
    min: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    max: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  }),
  conditions: MoleculeConditionsSchema.optional(),
});
export type PianoMoleculeDTO = z.infer<typeof PianoMoleculeSchema>;

// ─── Cell (Level 2) ───────────────────────────────────────────────────────────

export const PianoClipSchema = z.object({
  startBar: z.number().int().nonnegative(),
  lengthBars: z.number().int().positive(),
  pool: z.array(z.string().min(1)).min(1),
});

export const PianoLaneSchema = z.object({
  name: z.string().min(1),
  probability: z.number().min(0).max(1),
  clips: z.array(PianoClipSchema),
});

export const PianoDynamicsSchema = z.object({
  type: PianoDynamicsTypeSchema,
  amount: z.number().min(0).max(1),
});

export const PianoCellSchema = z.object({
  id: z.string().min(1),
  style: PianoPatternStyleSchema,
  length: z.union([z.literal(8), z.literal(12), z.literal(16), z.literal(32)]),
  timeSignature: z
    .tuple([z.literal(3), z.literal(4)])
    .or(z.tuple([z.literal(4), z.literal(4)]))
    .or(z.tuple([z.literal(5), z.literal(4)])),
  velocity: z.number().min(0).max(1),
  dynamics: PianoDynamicsSchema,
  lanes: z.array(PianoLaneSchema).min(1).max(15),
});
export type PianoCellDTO = z.infer<typeof PianoCellSchema>;

// ─── Organism (Level 3) ───────────────────────────────────────────────────────

const TIME_SIGNATURE_KEY_RE = /^\d+\/\d+$/;

const SectionCellMapSchema = z
  .record(z.string(), z.array(z.string().min(1)).min(1))
  .superRefine((map, ctx) => {
    for (const key of Object.keys(map)) {
      const result = SectionTypeSchema.safeParse(key);
      if (!result.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `"${key}" is not a valid SectionType`,
        });
      }
    }
  });

export const PianoOrganismSchema = z.object({
  id: z.string().min(1),
  style: PianoPatternStyleSchema,
  label: z.string(),
  sectionMap: SectionCellMapSchema,
  timeSignatureOverrides: z
    .record(z.string(), z.record(z.string(), z.array(z.string().min(1)).min(1)))
    .superRefine((overrides, ctx) => {
      for (const tsKey of Object.keys(overrides)) {
        if (!TIME_SIGNATURE_KEY_RE.test(tsKey)) {
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
  defaultForm: z.array(OrganismSectionSchema).optional(),
});
export type PianoOrganismDTO = z.infer<typeof PianoOrganismSchema>;

// ─── Top-level payload ────────────────────────────────────────────────────────

export const PianoSourcePayloadSchema = z.object({
  cells: z.record(z.string(), PianoCellSchema),
  molecules: z.record(z.string(), PianoMoleculeSchema),
  organisms: z.record(z.string(), PianoOrganismSchema).optional(),
});
export type PianoSourcePayload = z.infer<typeof PianoSourcePayloadSchema>;
