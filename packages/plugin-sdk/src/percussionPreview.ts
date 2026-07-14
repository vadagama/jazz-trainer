import type { Hit } from '@jazz/music-core';

export interface PercussionPreviewPlayOptions {
  /** Playback tempo. */
  bpm: number;
  /** Total pattern length in bars — the loop period. */
  loopBars: number;
  /** Loop the pattern (default `true`). */
  loop?: boolean;
}

/**
 * Host-provided percussion preview capability. Lets an admin/authoring plugin
 * audition a flat list of {@link Hit}s (a molecule loop or a whole assembled
 * cell) without touching the main grid transport.
 *
 * Simpler than {@link DrumPreviewControls}: percussion has a single instrument
 * (no kit switching) and no velocity layers / articulation map — sounds in
 * molecules map directly to oneshot sample keys.
 */
export interface PercussionPreviewControls {
  /** `true` once the percussion samples have finished loading. */
  ready: boolean;
  /**
   * Play a flat list of hits. `atTick` is relative to the pattern start and may
   * span multiple bars (e.g. an assembled cell). Stops any current playback.
   */
  play: (hits: Hit[], opts: PercussionPreviewPlayOptions) => Promise<void>;
  /** Stop playback. */
  stop: () => void;
  /** Текущий проигрываемый такт цикла (0-based); -1 когда остановлено. */
  currentBar: number;
}

export type UsePercussionPreviewFn = () => PercussionPreviewControls;
