import type { CompEvent } from './pianoComping.js';
import type { PianoVoicingDensity } from './pianoVoicing.js';

export type PianoRandomizationLevel = 'off' | 'subtle' | 'moderate' | 'high';

export interface PianoBarContext {
  barIndex: number;
  /** Total number of bars in the form (0 = unknown / single bar). */
  formLength: number;
  /** Whether a next chord exists (for anticipations). */
  hasNextChord: boolean;
}

const PROBABILITY: Record<PianoRandomizationLevel, number> = {
  off: 0,
  subtle: 0.1,
  moderate: 0.25,
  high: 0.4,
};

function pseudoRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
}

/**
 * PianoRandomizer — modifies comp events for a bar using repeatable pseudo-randomness.
 *
 * Pure class, no IO, fully testable. All randomness is seeded by bar index,
 * guaranteeing identical output for the same input across runs.
 */
export class PianoRandomizer {
  private level: PianoRandomizationLevel = 'off';

  setLevel(level: PianoRandomizationLevel): void {
    this.level = level;
  }

  /**
   * Apply randomization to comp events for a bar.
   * Returns a new array (never mutates the input).
   *
   * @param events  Original comp events from the pattern.
   * @param ctx     Bar context (index, form length, chord availability).
   */
  apply(events: readonly CompEvent[], ctx: PianoBarContext): CompEvent[] {
    if (this.level === 'off') return [...events];

    const prob = PROBABILITY[this.level];
    const rand = pseudoRandom(ctx.barIndex * 17 + 1);

    let result = this.applySkipBeats(events, prob, rand);
    result = this.applyEighthShifts(result, prob, rand);
    result = this.applyAnticipations(result, prob, rand, ctx);

    return result;
  }

  /**
   * Determine whether voicing density should be varied for this bar.
   * Toggles between shell2 and rootless4.
   *
   * @returns The new density, or null if no change.
   */
  shouldVaryVoicing(barIndex: number, current: PianoVoicingDensity): PianoVoicingDensity | null {
    if (this.level === 'off') return null;

    const rand = pseudoRandom(barIndex * 17 + 31);
    if (rand() >= PROBABILITY[this.level] * 0.5) return null;

    if (current === 'shell2') return 'rootless4';
    if (current === 'rootless4') return 'shell2';
    return current === 'rootless3' ? 'rootless4' : 'rootless3';
  }

  // ── Private modifiers ────────────────────────────────────────────────────

  private applySkipBeats(
    events: readonly CompEvent[],
    prob: number,
    rand: () => number,
  ): CompEvent[] {
    return events.filter((event) => {
      // Never skip beat 1 downbeat
      if (event.beat === 1 && !event.subdivision) return true;
      return rand() >= prob * 0.6;
    });
  }

  private applyEighthShifts(events: CompEvent[], prob: number, rand: () => number): CompEvent[] {
    return events.map((event) => {
      if (!event.subdivision && rand() < prob * 0.35) {
        return { ...event, subdivision: 0.5 as const };
      }
      return event;
    });
  }

  private applyAnticipations(
    events: CompEvent[],
    prob: number,
    rand: () => number,
    ctx: PianoBarContext,
  ): CompEvent[] {
    if (!ctx.hasNextChord) return events;

    return events.map((event) => {
      // Anticipate on beats 3 or 4 only, not already an anticipation
      if (
        (event.beat === 3 || event.beat === 4) &&
        !event.subdivision &&
        !event.chordRef &&
        rand() < prob * 0.5
      ) {
        return { ...event, subdivision: 0.5 as const, chordRef: 'next' as const };
      }
      return event;
    });
  }
}
