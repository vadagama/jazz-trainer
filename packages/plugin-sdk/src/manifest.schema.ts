import { z } from 'zod';

export const manifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  apiVersion: z.literal(1),
  category: z.enum(['theory', 'technique', 'play', 'assess', 'practice', 'core', 'admin']),
  description: z.string(),
  enabled: z.boolean().default(true),
});

/** What a plugin author provides (enabled is optional, defaults to true). */
export type PluginManifestInput = z.input<typeof manifestSchema>;

/** Validated manifest after parse/coercion. */
export type PluginManifest = z.infer<typeof manifestSchema>;

/** Validate a manifest object. Returns the parsed manifest or throws ZodError. */
export function validateManifest(data: unknown): PluginManifest {
  return manifestSchema.parse(data);
}
