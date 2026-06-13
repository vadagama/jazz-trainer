import type { Instrument } from './instrument.js';
import type { SampleManifest } from './sampleManifest.js';

/**
 * Self-describing instrument module.
 *
 * Bundles everything needed to add an instrument to the engine:
 * scheduling logic (Instrument), sample layout (SampleManifest),
 * and optionally a settings schema + defaults.
 *
 * Adding a new instrument = write an Instrument class + export one manifest.
 *
 * @example
 * ```ts
 * export const guitarManifest: InstrumentManifest = {
 *   id: 'guitar',
 *   name: 'Guitar',
 *   createInstrument: () => new GuitarInstrument(new ChordTimeline()),
 *   sampleManifest: { baseUrl: '/samples/guitar/', layers: { nylon: {...} } },
 *   defaultSettings: { enabled: false, volume: 0.7 },
 * };
 * ```
 */
export interface InstrumentManifest {
  /** Unique instrument ID — must match the `instrumentId` used in `scheduleEvent()`. */
  id: string;
  /** Human-readable display name. */
  name: string;
  /** Factory: creates a fresh Instrument instance (pure scheduling logic, no Tone.js). */
  createInstrument(): Instrument;
  /** Sample layout — what audio files this instrument needs and how they're organized. */
  sampleManifest: SampleManifest;
  /** Default settings merged into UserSettingsDTO under `instruments.<id>`. */
  defaultSettings?: Record<string, unknown>;
}
