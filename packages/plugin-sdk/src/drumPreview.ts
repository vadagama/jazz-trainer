import type { DrumHit } from '@jazz/music-core';

/** Drum kit identifier — resolved at runtime via the instrument registry. */
export type DrumPreviewKit = string;

export interface DrumPreviewPlayOptions {
  /** Playback tempo. */
  bpm: number;
  /** Total pattern length in bars — the loop period. */
  loopBars: number;
  /** Loop the pattern (default `true`). */
  loop?: boolean;
}

/**
 * Host-provided drum preview capability. Lets an admin/authoring plugin audition
 * a flat list of {@link DrumHit}s (a molecule loop or a whole assembled cell)
 * without touching the main grid transport.
 */
export interface DrumPreviewControls {
  /** `true` once the active kit's samples have finished loading. */
  ready: boolean;
  /** Currently loaded kit. */
  kit: DrumPreviewKit;
  /** Switch kit (reloads samples). */
  setKit: (kit: DrumPreviewKit) => void;
  /**
   * Play a flat list of hits. `atTick` is relative to the pattern start and may
   * span multiple bars (e.g. an assembled cell). Stops any current playback.
   */
  play: (hits: DrumHit[], opts: DrumPreviewPlayOptions) => Promise<void>;
  /** Stop playback. */
  stop: () => void;
  /** Текущий проигрываемый такт цикла (0-based); -1 когда остановлено. */
  currentBar: number;
}

export type UseDrumPreviewFn = () => DrumPreviewControls;
