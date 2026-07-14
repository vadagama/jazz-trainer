import { z } from 'zod';

// ─── Rhodes source schemas (mirrors bass.ts / piano.ts) ─────────────────────

/** Rhodes cell — validated at the API boundary before writing to source. */
export const RhodesCellSchema = z.object({
  id: z.string().min(1),
  style: z.string().min(1),
  length: z.number().int().positive(),
  timeSignature: z.tuple([z.number(), z.number()]),
  lanes: z.array(z.unknown()).min(1),
});

/** Rhodes molecule — validated at the API boundary. */
export const RhodesMoleculeSchema = z.object({
  id: z.string().min(1),
  style: z.string().min(1),
  bars: z.number().int().positive(),
  atoms: z.array(z.unknown()),
});

/** Rhodes organism — validated at the API boundary. */
export const RhodesOrganismSchema = z.object({
  id: z.string().min(1),
  style: z.string().min(1),
  label: z.string(),
  sectionMap: z.record(z.string(), z.array(z.string())),
});

/** Top-level payload from the Rhodes Constructor "Опубликовать в код" action. */
export const RhodesSourcePayloadSchema = z.object({
  cells: z.record(z.string(), RhodesCellSchema),
  molecules: z.record(z.string(), RhodesMoleculeSchema),
  organisms: z.record(z.string(), RhodesOrganismSchema).optional(),
});
export type RhodesSourcePayload = z.infer<typeof RhodesSourcePayloadSchema>;
