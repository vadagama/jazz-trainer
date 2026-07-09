/**
 * Drum Constructor contract — zod schemas for the admin-edited pattern-engine
 * data (cells / molecules / organisms) that the Drum Constructor UI sends to
 * `POST /api/dev/drum-source` and the API writes into `*Generated.ts`.
 *
 * This is the single source of truth for the on-wire shape; `music-core` keeps
 * the runtime TS types (`DrumCell`/`DrumMolecule`/`DrumOrganism`), which are
 * structurally identical to `z.infer<>` of these schemas. Validating here (on
 * the API boundary, before writing to source files) prevents malformed admin
 * input from landing in `*Generated.ts` and producing silent `TypeError`s in
 * the audio callback at runtime.
 */
import { z } from 'zod';
import { SectionTypeSchema } from './music.js';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const DRUM_PATTERN_STYLES = ['swing', 'bossa', 'funk', 'latin', 'ballad'] as const;
export const DrumPatternStyleSchema = z.enum(DRUM_PATTERN_STYLES);
export type DrumPatternStyle = z.infer<typeof DrumPatternStyleSchema>;

/**
 * Sound vocabulary emitted by the pattern engine. Mirrors `DrumSound` in
 * `music-core/src/audio/drumSampleRegistry.ts`. Kept as a literal union (not
 * `z.string()`) so a typo in a molecule atom is caught at the API boundary.
 */
export const DrumSoundSchema = z.enum([
  // abstract roles
  'bassDrum',
  'snare',
  'hihat',
  'hihatHalf',
  'hihatOpen',
  'ride',
  'crash',
  'rim',
  'highTom',
  'lowTom',
  // concrete articulations
  'kick',
  'snare_center',
  'snare_edge',
  'snare_dig',
  'snare_buzz',
  'snare_flam',
  'snare_crossstick',
  'snare_muted',
  'snare_rimshot',
  'hihat_closed',
  'hihat_tight',
  'hihat_open',
  'hihat_foot',
  'hihat_stir',
  'ride_bow',
  'ride_bell',
  'crash_sizzle',
  'splash',
  'tom_mhi',
  'tom_mlow',
  'tom_hi',
  'tom_lo',
]);
export type DrumSound = z.infer<typeof DrumSoundSchema>;

export const MoleculeCategorySchema = z.enum([
  'groove',
  'fill',
  'texture',
  'accent',
  'intro',
  'ending',
]);

export const DrumDynamicsTypeSchema = z.enum([
  'steady',
  'crescendo',
  'decrescendo',
  'arch',
  'valley',
  'wave',
  'pulse',
]);

// ─── Molecule (Level 1) ───────────────────────────────────────────────────────

export const DrumAtomSchema = z.object({
  sound: DrumSoundSchema,
  /** Tick offset from start of the molecule (≥ 0). */
  atTick: z.number().int().nonnegative(),
  velocity: z.number().min(0).max(1),
  durationTicks: z.number().int().nonnegative(),
});

export const MoleculeConditionsSchema = z
  .object({
    requireRide: z.boolean().optional(),
    requireHihat: z.boolean().optional(),
    requireSnare: z.boolean().optional(),
    requireCrash: z.boolean().optional(),
    requireToms: z.boolean().optional(),
    requireStir: z.boolean().optional(),
    barModulo: z.number().int().positive().optional(),
    barRange: z
      .object({
        first: z.number().int().nonnegative().optional(),
        last: z.number().int().nonnegative().optional(),
      })
      .optional(),
  })
  .strict();

export const DrumMoleculeSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  style: DrumPatternStyleSchema,
  bars: z.union([z.literal(1), z.literal(2)]),
  atoms: z.array(DrumAtomSchema).min(1),
  category: MoleculeCategorySchema,
  tags: z.array(z.string()),
  complexity: z.object({
    min: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    max: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  }),
  conditions: MoleculeConditionsSchema.optional(),
});
export type DrumMoleculeDTO = z.infer<typeof DrumMoleculeSchema>;

// ─── Cell (Level 2) ───────────────────────────────────────────────────────────

export const DrumClipSchema = z.object({
  startBar: z.number().int().nonnegative(),
  lengthBars: z.number().int().positive(),
  pool: z.array(z.string().min(1)).min(1),
});

export const DrumLaneSchema = z.object({
  name: z.string().min(1),
  probability: z.number().min(0).max(1),
  clips: z.array(DrumClipSchema),
});

export const DrumDynamicsSchema = z.object({
  type: DrumDynamicsTypeSchema,
  amount: z.number().min(0).max(1),
});

export const DrumCellSchema = z.object({
  id: z.string().min(1),
  style: DrumPatternStyleSchema,
  length: z.union([z.literal(8), z.literal(12), z.literal(16), z.literal(32)]),
  timeSignature: z
    .tuple([z.literal(3), z.literal(4)])
    .or(z.tuple([z.literal(4), z.literal(4)]))
    .or(z.tuple([z.literal(5), z.literal(4)])),
  velocity: z.number().min(0).max(1),
  dynamics: DrumDynamicsSchema,
  lanes: z.array(DrumLaneSchema).min(1).max(15),
});
export type DrumCellDTO = z.infer<typeof DrumCellSchema>;

// ─── Organism (Level 3) — section-driven form ────────────────────────────────

export const OrganismSectionSchema = z.object({
  label: z.string(),
  type: SectionTypeSchema,
  cellPool: z.array(z.string().min(1)).min(1),
  repeats: z.number().int().positive().optional(),
  repeatsCompleted: z.number().int().nonnegative().optional(),
});

/** Time-signature key: '3/4', '4/4', '5/4', '6/8', etc. */
const TIME_SIGNATURE_KEY_RE = /^\d+\/\d+$/;

/** Section type → cell pool map (keys are valid SectionType, values are non-empty cell ID arrays). */
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

export const DrumOrganismSchema = z.object({
  id: z.string().min(1),
  style: DrumPatternStyleSchema,
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
export type DrumOrganismDTO = z.infer<typeof DrumOrganismSchema>;

// ─── Top-level payload ────────────────────────────────────────────────────────

/**
 * `POST /api/dev/drum-source` body. `cells` and `molecules` are required (a
 * kit always needs at least one of each to assemble a bar); `organisms` is
 * optional — when omitted, the existing generated organisms file is left
 * untouched (matches the prior `if (isMap(organisms))` behaviour).
 */
export const DrumSourcePayloadSchema = z.object({
  cells: z.record(z.string(), DrumCellSchema),
  molecules: z.record(z.string(), DrumMoleculeSchema),
  organisms: z.record(z.string(), DrumOrganismSchema).optional(),
});
export type DrumSourcePayload = z.infer<typeof DrumSourcePayloadSchema>;
