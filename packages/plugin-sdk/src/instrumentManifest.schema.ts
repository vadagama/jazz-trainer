import { z } from 'zod';

/**
 * Zod schema for validating an {@link InstrumentManifest} at plugin-load time.
 *
 * Kept in plugin-sdk (not music-core) because Zod is not a dependency of
 * music-core and adding it would violate the "no browser APIs" constraint of
 * the core layer. The schema imports the type from core.
 */
export const instrumentManifestSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    family: z.enum(['drums', 'percussion', 'pitched']),
    settingsPrefix: z.string().min(1),
    icon: z.string().optional(),
    createInstrument: z.function(),
    sampleManifest: z.object({ baseUrl: z.string() }).passthrough(),
    defaultSettings: z.record(z.unknown()).optional(),
    perStyleDefaults: z.record(z.record(z.unknown())).optional(),
    sounds: z.array(z.string()).readonly().optional(),
  })
  .passthrough();

export type ValidatedInstrumentManifest = z.infer<typeof instrumentManifestSchema>;

/**
 * Validate an instrument manifest object. Returns the parsed manifest or throws ZodError.
 */
export function validateInstrumentManifest(data: unknown): ValidatedInstrumentManifest {
  return instrumentManifestSchema.parse(data) as ValidatedInstrumentManifest;
}
