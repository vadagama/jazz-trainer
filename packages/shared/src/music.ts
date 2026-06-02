import { z } from 'zod';

/**
 * Chord + harmony-grid contracts shared by music-core, api and web.
 * Zod schemas are the single source of truth; TS types are inferred from them.
 * See docs/06-dsl.md §2 and docs/03-data-model.md §3.
 */

// ── Chord primitives ───────────────────────────────────────────

export const NOTE_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
export const NoteNameSchema = z.enum(NOTE_NAMES);
export type NoteName = z.infer<typeof NoteNameSchema>;

export const AccidentalSchema = z.enum(['#', 'b', '']);
export type Accidental = z.infer<typeof AccidentalSchema>;

export const CHORD_QUALITIES = [
  'major',
  'minor',
  'dominant',
  'diminished',
  'halfDiminished',
  'augmented',
  'suspended',
  'power',
] as const;
export const ChordQualitySchema = z.enum(CHORD_QUALITIES);
export type ChordQuality = z.infer<typeof ChordQualitySchema>;

export const EXTENSIONS = ['7', '9', '11', '13'] as const;
export const ExtensionSchema = z.enum(EXTENSIONS);
export type Extension = z.infer<typeof ExtensionSchema>;

export const ALTERATIONS = ['b5', '#5', 'b9', '#9', '#11', 'b13'] as const;
export const AlterationSchema = z.enum(ALTERATIONS);
export type Alteration = z.infer<typeof AlterationSchema>;

export const BassNoteSchema = z.object({
  note: NoteNameSchema,
  accidental: AccidentalSchema,
});
export type BassNote = z.infer<typeof BassNoteSchema>;

export const ChordSymbolSchema = z.object({
  /** original text, e.g. "Dm7b5" */
  raw: z.string(),
  root: NoteNameSchema,
  rootAccidental: AccidentalSchema,
  quality: ChordQualitySchema,
  extensions: z.array(ExtensionSchema),
  alterations: z.array(AlterationSchema),
  /** altered dominant marker */
  alt: z.boolean(),
  sus: z.enum(['sus2', 'sus4']).optional(),
  /** slash chord bass note, e.g. C/E */
  bass: BassNoteSchema.nullable().optional(),
});
export type ChordSymbol = z.infer<typeof ChordSymbolSchema>;

// ── Harmony grid content (stored as JSON, see docs/03-data-model.md §3) ──

export const ChordSlotSchema = z.object({
  /** source text of the chord — the source of truth */
  symbol: z.string().min(1),
  /** parsed form is derived/cached; null when the symbol failed to parse */
  parsed: ChordSymbolSchema.nullable().optional(),
  /** how many beats this chord occupies; null = split the bar evenly */
  beats: z.number().int().positive().nullable().optional(),
});
export type ChordSlot = z.infer<typeof ChordSlotSchema>;

export const BarSchema = z.object({
  /** stable id for DnD/selection */
  id: z.string().min(1),
  chords: z.array(ChordSlotSchema),
});
export type Bar = z.infer<typeof BarSchema>;

export const GridContentSchema = z.object({
  /** content format version (for JSON migrations) */
  version: z.literal(1),
  bars: z.array(BarSchema),
});
export type GridContent = z.infer<typeof GridContentSchema>;

// ── Parser result contract (see docs/06-dsl.md §5) ─────────────

export interface ParseError {
  message: string;
  /** character offset into the parsed text */
  position: number;
  token?: string;
}

export interface ParseResult<T> {
  ok: boolean;
  value?: T;
  errors: ParseError[];
}
