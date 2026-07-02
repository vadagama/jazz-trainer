import type { Style } from '@jazz/shared';
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
 *   perStyleDefaults: {
 *     swing: { mode: 'comp', stringType: 'steel' },
 *     bossa: { mode: 'comp', stringType: 'nylon' },
 *   },
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
  /**
   * Per-style overrides for `defaultSettings`.
   * Merged on top of `defaultSettings` when a style is selected.
   * Only the keys present in the style entry are overridden; missing keys
   * fall back to `defaultSettings` values.
   */
  perStyleDefaults?: Partial<Record<Style, Record<string, unknown>>>;
}

/**
 * Resolve runtime defaults for an instrument in a given style.
 *
 * Starts with `manifest.defaultSettings` and shallow-merges the per-style
 * overrides from `manifest.perStyleDefaults[style]` on top.
 */
export function resolveInstrumentDefaults(
  manifest: InstrumentManifest,
  style: Style,
): Record<string, unknown> {
  const base = { ...manifest.defaultSettings };
  const perStyle = manifest.perStyleDefaults?.[style];
  if (perStyle) {
    return { ...base, ...perStyle };
  }
  return base;
}
