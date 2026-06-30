// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface DuckingCompressorOptions {
  /** Attack time in seconds (default: 0.02). */
  attackTime?: number;
  /** Release time in seconds (default: 0.3). */
  releaseTime?: number;
  /** Depth of ducking in dB (negative value, default: -6). */
  depthDb?: number;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_ATTACK = 0.02;
const DEFAULT_RELEASE = 0.3;
const DEFAULT_DEPTH_DB = -6;

// ---------------------------------------------------------------------------
// DuckingCompressor
// ---------------------------------------------------------------------------

/**
 * Pure-logic sidechain ducking compressor.
 *
 * Receives note-on/note-off events and computes a target gain (0–1)
 * for the accompaniment bus. Does not depend on Tone.js or any audio API.
 *
 * Usage:
 * ```ts
 * const comp = new DuckingCompressor();
 * // On every MIDI note-on:
 * comp.noteOn();
 * // On every MIDI note-off:
 * comp.noteOff();
 * // Read target gain each frame / periodically:
 * const gain = comp.getDuckingGain(nowSeconds);
 * ```
 */
export class DuckingCompressor {
  private attackTime: number;
  private releaseTime: number;
  private depthLinear: number;

  /** Number of currently active (held) notes. */
  private activeNotes = 0;

  /** Time (seconds) when the last note-on occurred. */
  private lastNoteOnTime = 0;

  /** Time (seconds) when the last note-off occurred (all notes released). */
  private lastNoteOffTime = 0;

  /** Whether we are currently in "ducked" state. */
  private ducked = false;

  constructor(options: DuckingCompressorOptions = {}) {
    this.attackTime = options.attackTime ?? DEFAULT_ATTACK;
    this.releaseTime = options.releaseTime ?? DEFAULT_RELEASE;
    // Convert dB to linear gain: depthDb is negative (e.g. -6 dB)
    const db = options.depthDb ?? DEFAULT_DEPTH_DB;
    this.depthLinear = Math.pow(10, db / 20);
  }

  /** Call on every MIDI note-on event. */
  noteOn(nowSeconds: number): void {
    this.activeNotes++;
    if (this.activeNotes === 1) {
      this.lastNoteOnTime = nowSeconds;
      this.ducked = false; // entering attack phase
    }
  }

  /** Call on every MIDI note-off event. */
  noteOff(nowSeconds: number): void {
    this.activeNotes = Math.max(0, this.activeNotes - 1);
    if (this.activeNotes === 0) {
      this.lastNoteOffTime = nowSeconds;
    }
  }

  /**
   * Compute the target accompaniment gain (0–1) at the given time.
   *
   * - 1.0 = full accompaniment volume (no solo activity)
   * - `depthLinear` = maximally ducked (e.g. 0.5 for -6 dB)
   *
   * Ramps between 1 and depthLinear over `attackTime` / `releaseTime`.
   */
  getDuckingGain(nowSeconds: number): number {
    const active = this.activeNotes > 0;

    if (active) {
      // Attack phase: ramp from 1 to depthLinear
      const elapsed = nowSeconds - this.lastNoteOnTime;
      if (elapsed >= this.attackTime) {
        this.ducked = true;
        return this.depthLinear;
      }
      const t = elapsed / this.attackTime;
      return 1 + (this.depthLinear - 1) * t;
    }

    // Release phase: ramp from current to 1
    if (!this.ducked) return 1;

    const elapsed = nowSeconds - this.lastNoteOffTime;
    if (elapsed >= this.releaseTime) {
      this.ducked = false;
      return 1;
    }
    const t = elapsed / this.releaseTime;
    // Interpolate from depthLinear back to 1
    return this.depthLinear + (1 - this.depthLinear) * t;
  }

  /** Reset state (e.g. on transport stop). */
  reset(): void {
    this.activeNotes = 0;
    this.ducked = false;
  }
}
