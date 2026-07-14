import { z } from 'zod';

// ─── Bass source schemas (mirrors piano.ts / drums.ts) ──────────────────────

/** Bass cell — validated at the API boundary before writing to source. */
export const BassCellSchema = z.object({
  id: z.string().min(1),
  style: z.string().min(1),
  length: z.number().int().positive(),
  timeSignature: z.tuple([z.number(), z.number()]),
  lanes: z.array(z.unknown()).min(1),
});

/** Bass molecule — validated at the API boundary. */
export const BassMoleculeSchema = z.object({
  id: z.string().min(1),
  style: z.string().min(1),
  bars: z.number().int().positive(),
  atoms: z.array(z.unknown()),
});

/** Bass organism — validated at the API boundary. */
export const BassOrganismSchema = z.object({
  id: z.string().min(1),
  style: z.string().min(1),
  label: z.string(),
  sectionMap: z.record(z.string(), z.array(z.string())),
});

/** Top-level payload from the Bass Constructor "Опубликовать в код" action. */
export const BassSourcePayloadSchema = z.object({
  cells: z.record(z.string(), BassCellSchema),
  molecules: z.record(z.string(), BassMoleculeSchema),
  organisms: z.record(z.string(), BassOrganismSchema).optional(),
});
export type BassSourcePayload = z.infer<typeof BassSourcePayloadSchema>;
