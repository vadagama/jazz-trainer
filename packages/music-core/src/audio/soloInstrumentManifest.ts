import type { SoloInstrument, PolySynthLike, SamplerLike } from './soloInstrument.js';
import type { SynthSoloInstrumentOptions } from './synthSoloInstrument.js';

// ---------------------------------------------------------------------------
// SoloInstrumentSamples
// ---------------------------------------------------------------------------

/** Sample layout for a solo instrument. */
export interface SoloInstrumentSamples {
  /** Base URL prepended to every filename. */
  baseUrl: string;
  /** Note name → filename (relative to baseUrl). */
  notes: Record<string, string>;
  /**
   * Optional note → duration (seconds) mapping.
   * Used to auto-release sustained notes when release time differs
   * from the sampler default.
   */
  noteDurations?: Record<string, number>;
}

// ---------------------------------------------------------------------------
// SoloInstrumentFactories
// ---------------------------------------------------------------------------

/**
 * Audio-object factories injected by the adapter layer.
 *
 * Keeps music-core free of Tone.js imports while allowing manifests
 * to create actual audio objects when needed.
 */
export interface SoloInstrumentFactories {
  /** Create a polyphonic synth (for 'synth'-category instruments). */
  createPolySynth(options?: SynthSoloInstrumentOptions): PolySynthLike;

  /** Create a sampler from a note→file map (for 'sampled'-category instruments). */
  createSampler(samples: Record<string, string>, baseUrl: string): SamplerLike;

  /**
   * Get an existing sampler from an accompaniment instrument.
   * Returns null if the instrument is not loaded.
   */
  getReuseSampler(instrumentId: string): SamplerLike | null;
}

// ---------------------------------------------------------------------------
// SoloInstrumentManifest
// ---------------------------------------------------------------------------

/**
 * Self-describing solo instrument module.
 *
 * Analogue of {@link InstrumentManifest} for solo instruments.
 * Bundles everything needed to instantiate a live-playable timbre.
 */
export interface SoloInstrumentManifest {
  /** Unique timbre ID, e.g. 'synth-default', 'clarinet'. */
  id: string;

  /** Human-readable display name. */
  name: string;

  /** Category. */
  category: 'synth' | 'sampled' | 'reuse';

  /**
   * Factory: creates a SoloInstrument instance.
   * Receives factories from the adapter layer to create audio objects.
   */
  createInstrument(factories: SoloInstrumentFactories): SoloInstrument;

  /**
   * Sample layout (for 'sampled' and optionally 'reuse' categories).
   * `undefined` for synth instruments.
   */
  samples?: SoloInstrumentSamples;

  /** Loading priority for lazy-load strategies. */
  priority?: 'high' | 'normal' | 'low';
}
