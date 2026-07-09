/**
 * Unified audio sample description — one format for any instrument.
 *
 * Pitched instruments use `layers` (layer name → note → filename).
 * Unpitched (drums/percussion) use `oneshots` (sound → [filenames] for RR).
 *
 * @see InstrumentManifest
 */
export interface SampleManifest {
  /** Base URL prepended to every filename. */
  baseUrl: string;
  /**
   * Fallback base URL for browsers that don't support the primary format.
   * When active, primary extensions in filenames are replaced with fallback extensions.
   * Default swap: `.m4a` → `.mp3`. Override via {@link formatSwap}.
   */
  fallbackBaseUrl?: string;
  /**
   * Custom extension swap for format fallback.
   * `[primaryExt, fallbackExt]` — e.g. `['.m4a', '.mp3']` for AAC→MP3 fallback.
   * Defaults to `['.m4a', '.mp3']` when not specified.
   */
  formatSwap?: readonly [string, string];
  /**
   * For pitched instruments: each layer is a separate Tone.Sampler instance.
   * Key = layer name (e.g. 'pluck_rr1', 'soft', 'nylon').
   * Value = { [scientificNote]: filename-relative-to-baseUrl }.
   */
  layers?: Record<string, Record<string, string>>;
  /**
   * For unpitched / percussion instruments: each sound has N round-robin variants.
   * Key = sound name (e.g. 'ride', 'kick').
   * Value = array of filenames (one per RR variant).
   */
  oneshots?: Record<string, string[]>;
  /**
   * For multi-velocity unpitched instruments (jazz / funk drum kits): each sound
   * maps to velocity layers, each layer to its round-robin filenames.
   * Key = sound name → velocity layer name → [rr filenames].
   */
  velocityOneshots?: Record<string, Record<string, string[]>>;
  /** Ordered velocity layer names (quietest → loudest) for {@link velocityOneshots}. */
  velocityLayers?: readonly string[];
  /** Round-robin variant count. Used by oneshot sinks to cycle through variants. */
  rrCount?: number;
  /** Release duration in seconds for Tone.Sampler (pitched instruments only). */
  release?: number;
}

/**
 * Resolve the base URL for an instrument's samples from its family and id.
 *
 * Replaces hardcoded `/samples/<fmt>/<family>/<id>/` literals in each
 * manifest with a single convention. The actual `<STORE>` prefix is injected
 * by the build/runtime environment (default: empty string for local public/).
 *
 * Families with multiple kit variants (e.g. `drums`) nest samples under the
 * instrument id. Single-kit families (e.g. `percussion`, where `id === family`)
 * are stored flat, so the id segment is omitted to match the on-disk layout.
 *
 * @example sampleBaseUrl('drums', 'jazz-drum-kit', 'aac')
 *   // → '/samples/aac/drums/jazz-drum-kit/'
 * @example sampleBaseUrl('percussion', 'percussion', 'aac')
 *   // → '/samples/aac/percussion/'
 */
export function sampleBaseUrl(
  family: string,
  id: string,
  format: 'aac' | 'mp3',
  store = '',
): string {
  const idSegment = id && id !== family ? `${id}/` : '';
  return `${store}/samples/${format}/${family}/${idSegment}`;
}

/**
 * Build a velocity-layered round-robin filename map for {@link SampleManifest.velocityOneshots}.
 *
 * For each velocity layer, produces `rrCount` filenames of the form
 * `<name>_<layer>_rr<n>.<ext>`. Shared by drum-kit plugins so the naming
 * convention lives in one place.
 *
 * @example buildVelocityRR('kick', ['vl5', 'vl10']) // → { vl5: ['kick_vl5_rr1.m4a', …], … }
 */
export function buildVelocityRR(
  name: string,
  layers: readonly string[],
  rrCount = 4,
  ext = 'm4a',
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const layer of layers) {
    out[layer] = Array.from({ length: rrCount }, (_, i) => `${name}_${layer}_rr${i + 1}.${ext}`);
  }
  return out;
}
