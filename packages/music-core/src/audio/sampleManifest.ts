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
