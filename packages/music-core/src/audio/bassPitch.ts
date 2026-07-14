/**
 * Bass pitch resolution — pure functions, extracted from {@link BassInstrument}.
 *
 * A {@link BassStep} names *which* scale degree of the current chord a bass atom
 * plays; the actual scientific pitch is resolved here at playback (or preview)
 * time against the real chord + root. Notes are centred on octave 2 and clamped
 * to the {@link BASS_CEILING_OCTAVE} ceiling so the bass stays in its foundational
 * register (B1–C4) under piano/rhodes.
 *
 * Extracted as a public module so both the real {@link BassInstrument} and the
 * admin-constructor preview hook resolve pitches through the same formula
 * (no duplicated pitch logic that could drift apart).
 */
import type { ChordSymbol } from '@jazz/shared';
import type { BassRange, BassStep } from './bassPatternTypes.js';
import type { ApproachVariant } from './bassRandomizer.js';

/**
 * Walking-bass pitch ceiling. Notes are clamped so they never rise above C4,
 * keeping the bass in its foundational register (B1–C4) under piano/rhodes.
 */
export const BASS_CEILING_OCTAVE = 4;

const NOTE_SEMITONES: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

const SEMITONE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

// ─── Chord-quality → interval-in-semitones helpers ───────────────────────────

/** Interval in semitones from root to third based on chord quality. */
export function thirdInterval(chord: ChordSymbol): number {
  switch (chord.quality) {
    case 'major':
    case 'dominant':
    case 'augmented':
      return 4;
    default:
      return 3; // minor, halfDiminished, diminished
  }
}

/** Interval in semitones from root to fifth based on chord quality/alterations. */
export function fifthInterval(chord: ChordSymbol): number {
  if (chord.quality === 'diminished' || chord.quality === 'halfDiminished') return 6;
  if (chord.quality === 'augmented') return 8;
  if (chord.alterations.includes('b5')) return 6;
  return 7;
}

/** Interval in semitones from root to seventh based on chord quality. */
export function seventhInterval(chord: ChordSymbol): number {
  if (chord.quality === 'major') return 11;
  if (chord.quality === 'diminished') return 9;
  return 10;
}

// ─── Note resolution (octave-2 centred, C4 ceiling) ──────────────────────────

/**
 * Convert a chord root to a scientific pitch at the given octave, clamped to
 * the bass ceiling (C4). Root defaults to octave 2.
 */
export function resolveRootNote(chord: ChordSymbol, octave: number): string {
  const accOffset = chord.rootAccidental === '#' ? 1 : chord.rootAccidental === 'b' ? -1 : 0;
  const rootSemitone = ((NOTE_SEMITONES[chord.root] ?? 0) + accOffset + 12) % 12;
  let finalOctave = octave;
  if (
    finalOctave > BASS_CEILING_OCTAVE ||
    (finalOctave === BASS_CEILING_OCTAVE && rootSemitone > 0)
  ) {
    finalOctave -= 1;
  }
  return `${chord.root}${chord.rootAccidental}${finalOctave}`;
}

/**
 * Resolve a chord interval (semitones above root) to a scientific pitch,
 * clamped to the given maxOctave (defaults to BASS_CEILING_OCTAVE).
 */
export function resolveIntervalNote(
  chord: ChordSymbol,
  rootOctave: number,
  intervalSemitones: number,
  octaveShift = 0,
  maxOctave = BASS_CEILING_OCTAVE,
): string {
  const accOffset = chord.rootAccidental === '#' ? 1 : chord.rootAccidental === 'b' ? -1 : 0;
  const rootSemitone = ((NOTE_SEMITONES[chord.root] ?? 0) + accOffset + 12) % 12;
  const targetSemitone = (rootSemitone + intervalSemitones) % 12;
  let octave = rootOctave + (targetSemitone < rootSemitone ? 1 : 0);
  const ceilOct = maxOctave + octaveShift;
  if (octave > ceilOct || (octave === ceilOct && targetSemitone > 0)) octave -= 1;
  return `${SEMITONE_NAMES[targetSemitone]}${octave}`;
}

/** Chromatic/diatonic approach into `nextChord`'s root, clamped to the bass ceiling. */
export function resolveApproachNote(
  nextChord: ChordSymbol,
  variant: ApproachVariant | boolean,
  targetOctave: number,
  octaveShift = 0,
): string {
  const accOffset =
    nextChord.rootAccidental === '#' ? 1 : nextChord.rootAccidental === 'b' ? -1 : 0;
  const nextRootSemitone = ((NOTE_SEMITONES[nextChord.root] ?? 0) + accOffset + 12) % 12;

  if (variant === true) variant = 'chromaticAbove';
  else if (variant === false) variant = 'chromaticBelow';

  const stepSemitones = variant === 'chromaticAbove' || variant === 'chromaticBelow' ? 1 : 2;
  const isAbove = variant === 'chromaticAbove' || variant === 'diatonicAbove';

  let approachSemitone: number;
  let approachOctave: number;
  if (isAbove) {
    approachSemitone = (nextRootSemitone + stepSemitones) % 12;
    approachOctave = approachSemitone <= nextRootSemitone ? targetOctave + 1 : targetOctave;
  } else {
    approachSemitone = (nextRootSemitone + (12 - stepSemitones)) % 12;
    approachOctave = approachSemitone >= nextRootSemitone ? targetOctave - 1 : targetOctave;
  }
  const ceilOct = BASS_CEILING_OCTAVE + octaveShift;
  if (approachOctave > ceilOct || (approachOctave === ceilOct && approachSemitone > 0)) {
    approachOctave -= 1;
  }
  return `${SEMITONE_NAMES[approachSemitone]}${approachOctave}`;
}

// ─── Top-level step → pitch resolution ───────────────────────────────────────

export interface ResolveBassStepPitchOptions {
  /** Octave shift applied to the bass (mirrors `BassInstrument.setOctaveShift`). */
  octaveShift?: number;
  /** The chord being approached — used by the `approach` step (falls back to `chord`). */
  nextChord?: ChordSymbol | null;
  /** Bar index — seeds the default approach-variant selection. */
  barIndex?: number;
  /** Explicit approach variant (overrides the default bar-parity selection). */
  approachVariant?: ApproachVariant;
  /** Octave range knob (narrow|medium|wide). */
  range?: BassRange;
}

/**
 * Resolve a {@link BassStep} against `chord` into a scientific pitch string,
 * centred on octave 2 and clamped to the C4 ceiling. `approach` resolves
 * against `nextChord` (the chord being approached).
 *
 * @param opts.range — narrow: intervals stay in octave 2, octave step disabled.
 *   medium (default): current behaviour. wide: full B1–C4 range.
 */
export function resolveBassStepPitch(
  step: BassStep,
  chord: ChordSymbol,
  opts: ResolveBassStepPitchOptions = {},
): string | null {
  const os = opts.octaveShift ?? 0;
  const range = opts.range ?? 'medium';

  // Range → max octave for interval notes:
  //   narrow: everything in octave 2 (B1–B2)
  //   medium: C4 ceiling (standard walking bass)
  //   wide:   no ceiling — intervals go where they naturally fall
  const intervalMaxOctave = range === 'narrow' ? 2 : range === 'wide' ? 5 : BASS_CEILING_OCTAVE;
  const intervalRootOctave = 2;

  switch (step) {
    case 'root':
      return resolveRootNote(chord, 2 + os);
    case 'octave':
      // Narrow: disable octave jump, play root at octave 2 instead
      if (range === 'narrow') return resolveRootNote(chord, 2 + os);
      return resolveRootNote(chord, 3 + os);
    case 'fifth':
      return resolveIntervalNote(
        chord,
        intervalRootOctave + os,
        fifthInterval(chord),
        os,
        intervalMaxOctave,
      );
    case 'third':
      return resolveIntervalNote(
        chord,
        intervalRootOctave + os,
        thirdInterval(chord),
        os,
        intervalMaxOctave,
      );
    case 'seventh':
      return resolveIntervalNote(
        chord,
        intervalRootOctave + os,
        seventhInterval(chord),
        os,
        intervalMaxOctave,
      );
    case 'approach': {
      const target = opts.nextChord ?? chord;
      const variant = opts.approachVariant ?? defaultApproachVariantFor(opts.barIndex ?? 0);
      return resolveApproachNote(target, variant, 2 + os, os);
    }
    default:
      return null;
  }
}

/**
 * Default approach variant mirroring `BassRandomizer` at level `'off'`, derived
 * from barIndex. Exported for callers that need to preview the exact same
 * selection the real engine makes without a randomizer.
 */
export function defaultApproachVariantFor(barIndex: number): ApproachVariant {
  return barIndex % 2 === 0 ? 'chromaticAbove' : 'chromaticBelow';
}
