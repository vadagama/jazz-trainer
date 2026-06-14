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
  /** Round-robin variant count. Used by oneshot sinks to cycle through variants. */
  rrCount?: number;
  /** Release duration in seconds for Tone.Sampler (pitched instruments only). */
  release?: number;
}
