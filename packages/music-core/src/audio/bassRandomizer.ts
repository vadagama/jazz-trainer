/**
 * BassRandomizer — deterministic pseudo-random variation for bass lines.
 *
 * Seeds randomness from barIndex, guaranteeing identical output for the same
 * input across runs (testable, repeatable). Follows the same pattern as
 * PianoRandomizer and DrumRandomizer.
 */

export type BassRandomizationLevel = 'off' | 'subtle' | 'moderate';

/** Describes the approach-note strategy for walking bass line transitions. */
export type ApproachVariant =
  | 'chromaticAbove'
  | 'chromaticBelow'
  | 'diatonicAbove'
  | 'diatonicBelow';

const PROBABILITY: Record<BassRandomizationLevel, number> = {
  off: 0,
  subtle: 0.15,
  moderate: 0.35,
};

function pseudoRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
}

const APPROACH_VARIANTS: ApproachVariant[] = [
  'chromaticAbove',
  'chromaticBelow',
  'diatonicAbove',
  'diatonicBelow',
];

export class BassRandomizer {
  private level: BassRandomizationLevel = 'off';

  setLevel(level: BassRandomizationLevel): void {
    this.level = level;
  }

  /**
   * Selects an approach variant for the transition from one chord to the next.
   * When randomization is off, always falls back to chromatic (above on even
   * bars, below on odd bars — matching legacy behaviour).
   *
   * @param barIndex  Absolute bar index (for seed).
   * @param beat      Beat within bar where the approach note is played (for seed).
   */
  selectApproachVariant(barIndex: number, beat: number): ApproachVariant {
    if (this.level === 'off') {
      return barIndex % 2 === 0 ? 'chromaticAbove' : 'chromaticBelow';
    }
    const rand = pseudoRandom(barIndex * 17 + beat * 31 + 1);
    if (rand() < PROBABILITY[this.level]) {
      return APPROACH_VARIANTS[Math.floor(rand() * APPROACH_VARIANTS.length)]!;
    }
    return barIndex % 2 === 0 ? 'chromaticAbove' : 'chromaticBelow';
  }

  /**
   * Whether the bass should play a sparse line (e.g., half-notes instead of
   * walking quarters) in a bar with many chord changes.
   *
   * @param barIndex   Absolute bar index (for seed).
   * @param chordCount Number of distinct chords in the current bar.
   */
  shouldPlaySparse(barIndex: number, chordCount: number): boolean {
    if (this.level === 'off' || chordCount < 3) return false;
    const rand = pseudoRandom(barIndex * 31 + 7);
    return rand() < PROBABILITY[this.level] * 0.8;
  }

  /**
   * Whether to shift up an octave on a chord boundary beat for extra variety.
   * Only active for bars with 3+ chords.
   *
   * @param barIndex  Absolute bar index (for seed).
   * @param beat      Beat within bar where the note is played.
   */
  shouldShiftOctave(barIndex: number, beat: number): boolean {
    if (this.level === 'off') return false;
    const rand = pseudoRandom(barIndex * 41 + beat * 13 + 3);
    return rand() < PROBABILITY[this.level] * 0.6;
  }

  /**
   * Whether to play a root note an octave lower for a sudden drop effect.
   * Balanced against shouldShiftOctave (same probability multiplier) to
   * prevent net upward drift.
   *
   * @param barIndex Absolute bar index.
   * @param beat     Beat within bar.
   */
  shouldDropOctave(barIndex: number, beat: number): boolean {
    if (this.level === 'off') return false;
    const rand = pseudoRandom(barIndex * 53 + beat * 19 + 11);
    return rand() < PROBABILITY[this.level] * 0.6;
  }
}
