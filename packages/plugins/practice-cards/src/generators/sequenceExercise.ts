import {
  chordDegreeToScale,
  getChordQualitySuffix,
  keyToPitchClass,
  resolveChordTonePitchClass,
  resolveSequencePattern,
  randomSequenceType,
  scalePitchClasses,
} from '@jazz/music-core';
import type {
  ScaleType,
  ConcreteSequenceType,
  SequenceNote,
} from '@jazz/music-core';
import type { Key } from '@jazz/shared';
import type { SequenceExerciseConfig, PracticeBar, SequenceDirection } from './types.js';
import {
  INFINITE_ROUNDS,
  shuffle,
  expandBarsPerChord,
  repeatBars,
  extractChordsFromSource,
} from './core.js';
import type { Rng } from './core.js';

export type { Rng };

/**
 * Generate sequence exercise bars from a {@link SequenceExerciseConfig}.
 *
 * Source type determines the mode:
 * - `unified` — standalone sequences on the tonic of each selected key.
 * - `pattern` / `dsl` / `random` — one sequence per chord of a progression.
 *
 * Direction determines the order of start degrees:
 * - `up` — degrees in ascending order.
 * - `down` — degrees in descending order.
 * - `both` — up then down.
 */
export function generateSequenceExercise(
  config: SequenceExerciseConfig,
  rng: Rng = Math.random,
): PracticeBar[] {
  const { source, keys, startDegrees, playRandomly, barsPerChord } = config;
  if (keys.length === 0 || startDegrees.length === 0) return [];
  const bpc = barsPerChord ?? 1;

  if (source.type === 'unified') {
    if (playRandomly) {
      return generateStandaloneRandomized(config, rng, bpc);
    }
    return generateStandalone(config, rng, bpc);
  }

  if (playRandomly) {
    return generateOverChordsRandomized(config, rng, bpc);
  }
  return generateOverChords(config, rng, bpc);
}

// ── Standalone mode (source.type === 'unified') ──────────────────────────────

function generateStandalone(
  config: SequenceExerciseConfig,
  rng: Rng,
  barsPerChord: number,
): PracticeBar[] {
  const units = buildStandaloneUnits(config, rng);
  return repeatBars(expandBarsPerChord(units, barsPerChord), config.infinite, config.repetitions);
}

function generateStandaloneRandomized(
  config: SequenceExerciseConfig,
  rng: Rng,
  barsPerChord: number,
): PracticeBar[] {
  const rounds = config.infinite ? INFINITE_ROUNDS : Math.max(1, config.repetitions);
  const units: PracticeBar[] = [];

  for (let r = 0; r < rounds; r++) {
    const round = buildStandaloneUnits(config, rng);
    const shuffled = shuffle(round, rng);
    for (const u of shuffled) {
      units.push({ ...u, index: units.length });
    }
  }

  return expandBarsPerChord(units, barsPerChord);
}

const TONIC_CHORD_SUFFIX: Record<ScaleType, string> = {
  major: 'maj7',
  'natural-minor': 'm7',
  'harmonic-minor': 'm7',
  'melodic-minor': 'm7',
  dorian: 'm7',
  mixolydian: '7',
  phrygian: 'm7',
  lydian: 'maj7',
  locrian: 'm7b5',
};

function buildTonicChord(root: string, scaleType: ScaleType): string {
  return `${root}${TONIC_CHORD_SUFFIX[scaleType]}`;
}

/** Раскрыть стартовые ступени с учётом направления. */
function expandStartDegrees(
  degrees: readonly number[],
  direction: SequenceDirection,
): { degree: number; direction: 'up' | 'down' }[] {
  const ascending = [...degrees].sort((a, b) => a - b);
  if (direction === 'up') {
    return ascending.map((degree) => ({ degree, direction: 'up' as const }));
  }
  if (direction === 'down') {
    return [...ascending].reverse().map((degree) => ({ degree, direction: 'down' as const }));
  }
  // both: up then down (mirror without duplicating the peak)
  const up = ascending.map((degree) => ({ degree, direction: 'up' as const }));
  const down = [...ascending].reverse().slice(1).map((degree) => ({
    degree,
    direction: 'down' as const,
  }));
  return [...up, ...down];
}

function buildStandaloneUnits(config: SequenceExerciseConfig, rng: Rng): PracticeBar[] {
  const { keys, sequenceType, startDegrees, scaleType, direction } = config;
  const units: PracticeBar[] = [];
  let idx = 0;

  for (const key of keys) {
    const backingChord = buildTonicChord(key, scaleType);
    const tonicPc = keyToPitchClass(key);
    const scalePcs = scalePitchClasses(tonicPc, scaleType);
    const expanded = expandStartDegrees(startDegrees, direction);

    for (const { degree, direction: barDirection } of expanded) {
      const concreteType: ConcreteSequenceType =
        sequenceType === 'all' ? randomSequenceType(rng) : sequenceType;
      const degreeIdx = Math.min(Math.max(degree - 1, 0), scalePcs.length - 1);
      const startPc = scalePcs[degreeIdx]!;
      const notes = resolveSequencePattern(startPc, concreteType, key, scaleType, tonicPc);
      units.push({
        index: idx++,
        chords: [backingChord],
        sequence: {
          type: concreteType,
          startDegree: degree,
          notes,
          direction: barDirection,
        },
      });
    }
  }

  return units;
}

// ── Over-chords mode (source.type !== 'unified') ─────────────────────────────

function generateOverChords(
  config: SequenceExerciseConfig,
  rng: Rng,
  barsPerChord: number,
): PracticeBar[] {
  const { source, keys } = config;
  const chunks = keys.flatMap((key) =>
    extractChordsFromSource(source, key).map((chunk) => ({ ...chunk, key })),
  );

  const bars = buildSequenceBars(chunks, config, rng);
  return repeatBars(expandBarsPerChord(bars, barsPerChord), config.infinite, config.repetitions);
}

function generateOverChordsRandomized(
  config: SequenceExerciseConfig,
  rng: Rng,
  barsPerChord: number,
): PracticeBar[] {
  const { source, keys } = config;
  const rounds = config.infinite ? INFINITE_ROUNDS : Math.max(1, config.repetitions);
  const allChunks: { chords: string[]; key: Key }[] = [];

  for (let r = 0; r < rounds; r++) {
    const chunks = keys.flatMap((key) =>
      extractChordsFromSource(source, key).map((chunk) => ({ ...chunk, key })),
    );
    const shuffled = shuffle(chunks, rng);
    allChunks.push(...shuffled);
  }

  const bars = buildSequenceBars(allChunks, config, rng);
  return expandBarsPerChord(bars, barsPerChord);
}

function buildSequenceBars(
  chunks: { chords: string[]; key: Key }[],
  config: SequenceExerciseConfig,
  rng: Rng,
): PracticeBar[] {
  const { sequenceType, startDegrees, scaleType, direction } = config;
  const bars: PracticeBar[] = [];
  const barDirection: 'up' | 'down' = direction === 'down' ? 'down' : 'up';

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!;
    const symbol = chunk.chords[0];
    if (!symbol) continue;

    const concreteType: ConcreteSequenceType =
      sequenceType === 'all' ? randomSequenceType(rng) : sequenceType;
    const resolvedScaleType = scaleTypeForSymbol(symbol, chunk.key, scaleType);
    const startDegree = startDegrees[i % startDegrees.length]!;
    const startPc = resolveChordTonePitchClass(symbol, startDegree, resolvedScaleType);
    const notes: SequenceNote[] = resolveSequencePattern(
      startPc,
      concreteType,
      chunk.key,
      resolvedScaleType,
      keyToPitchClass(chunk.key),
    );
    bars.push({
      index: i,
      chords: chunk.chords,
      sequence: {
        type: concreteType,
        startDegree,
        notes,
        direction: barDirection,
      },
    });
  }

  return bars;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function scaleTypeForSymbol(symbol: string, key: Key, fallback: ScaleType): ScaleType {
  const suffix = getChordQualitySuffix(symbol);
  const rootPc = keyToPitchClass(chordRootName(symbol));
  const degree = (rootPc - keyToPitchClass(key) + 12) % 12;
  return chordDegreeToScale(degree, suffix) ?? fallback;
}

function chordRootName(symbol: string): string {
  let i = 1;
  if (symbol.length > 1 && (symbol[1] === '#' || symbol[1] === 'b')) i = 2;
  return symbol.slice(0, i);
}
