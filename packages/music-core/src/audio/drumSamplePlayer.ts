/**
 * Shared drum sample player logic — pure functions with no Tone.js dependency.
 *
 * Used by both the main transport engine (`useTransport`) and the admin
 * preview hook (`useDrumPreview`) to eliminate duplicated sound-fallback
 * resolution and velocity-layer round-robin math.
 */

/**
 * Canonical fallback map: concrete articulation → alternative articulation
 * when the active kit lacks a particular sample.
 * Shared between the main player and the admin drum preview.
 */
export const DRUM_SOUND_FALLBACK: Record<string, string> = {
  ride_bell: 'ride_bow',
  hihat_tight: 'hihat_closed',
  hihat_stir: 'hihat_closed',
  hihat_open: 'hihat_closed',
  splash: 'crash',
  crash_sizzle: 'crash',
  snare_edge: 'snare_center',
  snare_dig: 'snare_center',
  snare_crossstick: 'snare_center',
  snare_buzz: 'snare_center',
  snare_flam: 'snare_center',
  snare_muted: 'snare_center',
  snare_rimshot: 'snare_center',
  tom_mhi: 'tom_hi',
  tom_hi: 'tom_mhi',
  tom_mlow: 'tom_lo',
  tom_lo: 'tom_mlow',
};

/**
 * Resolve a drum sound name to the best available concrete sample key.
 * Tries the original name, then follows the fallback chain, returning the
 * first key present in `availableSamples`.
 *
 * @returns The resolved key, or `null` if no sample is available.
 */
export function resolveDrumSound(
  sound: string,
  availableSamples: ReadonlyMap<string, unknown>,
  fallback?: Record<string, string>,
): string | null {
  const fb = fallback ?? DRUM_SOUND_FALLBACK;
  const candidates = [sound, fb[sound]].filter(Boolean) as string[];
  for (const key of candidates) {
    if (availableSamples.has(key)) return key;
  }
  return null;
}

/**
 * Result of round-robin player selection for a single drum hit.
 */
export interface DrumHitSelection {
  /** Index into the flat player pool array. */
  playerIndex: number;
  /** Volume in dB derived from velocity (without any extra compensation). */
  volumeDb: number;
}

/**
 * Select which player from a velocity-layered, round-robin pool to use
 * for a drum hit. Pure function — no Tone.js or Web Audio dependencies.
 *
 * The pool is assumed flat: all velocity layers concatenated, with
 * `rrPerLayer` players per layer. Layer selection and round-robin are
 * derived from `velocity` and the mutable `rrState` counter.
 *
 * @param velocity  – 0..1
 * @param poolSize  – total number of players for this sound
 * @param rrPerLayer – players per velocity layer
 * @param rrState   – mutable record tracking RR position per (sound, layer)
 * @param soundKey  – unique key for this sound (used as RR namespace)
 */
export function selectDrumPlayer(
  velocity: number,
  poolSize: number,
  rrPerLayer: number,
  rrState: Record<string, number>,
  soundKey: string,
): DrumHitSelection | null {
  const v = Math.max(0, Math.min(1, velocity));
  const layerCount = Math.max(1, Math.floor(poolSize / rrPerLayer));
  const layerIdx = Math.min(Math.floor(v * layerCount), layerCount - 1);
  const layerStart = layerIdx * rrPerLayer;
  const layerEnd = Math.min(layerStart + rrPerLayer, poolSize);
  const layerSize = layerEnd - layerStart;
  if (layerSize <= 0) return null;

  const rrKey = `${soundKey}_l${layerIdx}`;
  const rr = (rrState[rrKey] ?? 0) % layerSize;
  rrState[rrKey] = (rrState[rrKey] ?? 0) + 1;

  const volumeDb = v < 1 ? gainToDb(Math.max(0.0001, v)) : 0;
  return { playerIndex: layerStart + rr, volumeDb };
}

function gainToDb(gain: number): number {
  return 20 * Math.log10(gain);
}
