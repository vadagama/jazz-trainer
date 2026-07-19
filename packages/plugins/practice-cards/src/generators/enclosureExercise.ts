import {
  chordDegreeToScale,
  getChordQualitySuffix,
  keyToPitchClass,
  randomEnclosureType,
  resolveChordTonePitchClass,
  resolveEnclosure,
} from '@jazz/music-core';
import type { ScaleType } from '@jazz/music-core';
import type { Key } from '@jazz/shared';
import type { EnclosureExerciseConfig, PracticeBar } from './types.js';
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
 * Generate enclosure exercise bars from an {@link EnclosureExerciseConfig}.
 *
 * Source type determines the mode:
 * - `unified` — standalone enclosures around chord tones of the tonic chord.
 * - `pattern` / `dsl` / `random` — one enclosure per chord of a progression.
 */
export function generateEnclosureExercise(
  config: EnclosureExerciseConfig,
  rng: Rng = Math.random,
): PracticeBar[] {
  const { source, keys, targetDegrees, playRandomly, barsPerChord } = config;
  if (keys.length === 0 || targetDegrees.length === 0) return [];
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
  config: EnclosureExerciseConfig,
  rng: Rng,
  barsPerChord: number,
): PracticeBar[] {
  const units = buildStandaloneUnits(config, rng);
  return repeatBars(expandBarsPerChord(units, barsPerChord), config.infinite, config.repetitions);
}

function generateStandaloneRandomized(
  config: EnclosureExerciseConfig,
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

function resolveEnclosureForDegree(
  symbol: string,
  degree: import('@jazz/music-core').TargetDegree,
  concreteType: import('@jazz/music-core').ConcreteEnclosureType,
  key: Key,
  scaleType: ScaleType,
): { type: import('@jazz/music-core').ConcreteEnclosureType; targetDegree: import('@jazz/music-core').TargetDegree; notes: import('@jazz/music-core').EnclosureNote[] } {
  const targetPc = resolveChordTonePitchClass(symbol, degree, scaleType);
  const notes = resolveEnclosure(targetPc, concreteType, key, scaleType);
  return { type: concreteType, targetDegree: degree, notes };
}

function buildStandaloneUnits(config: EnclosureExerciseConfig, rng: Rng): PracticeBar[] {
  const { keys, enclosureType, targetDegrees, scaleType } = config;
  const units: PracticeBar[] = [];
  let idx = 0;

  for (const key of keys) {
    const backingChord = buildTonicChord(key, scaleType);
    for (const degree of targetDegrees) {
      const concreteType = enclosureType === 'all' ? randomEnclosureType(rng) : enclosureType;
      units.push({
        index: idx++,
        chords: [backingChord],
        enclosure: resolveEnclosureForDegree(backingChord, degree, concreteType, key, scaleType),
      });
    }
  }

  return units;
}

// ── Over-chords mode (source.type !== 'unified') ─────────────────────────────

function generateOverChords(
  config: EnclosureExerciseConfig,
  rng: Rng,
  barsPerChord: number,
): PracticeBar[] {
  const { source, keys } = config;
  const chunks = keys.flatMap((key) =>
    extractChordsFromSource(source, key).map((chunk) => ({ ...chunk, key })),
  );

  const bars = buildEnclosureBars(chunks, config, rng);
  return repeatBars(expandBarsPerChord(bars, barsPerChord), config.infinite, config.repetitions);
}

function generateOverChordsRandomized(
  config: EnclosureExerciseConfig,
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

  const bars = buildEnclosureBars(allChunks, config, rng);
  return expandBarsPerChord(bars, barsPerChord);
}

function buildEnclosureBars(
  chunks: { chords: string[]; key: Key }[],
  config: EnclosureExerciseConfig,
  rng: Rng,
): PracticeBar[] {
  const { enclosureType, targetDegrees, scaleType } = config;
  const bars: PracticeBar[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!;
    const symbol = chunk.chords[0];
    if (!symbol) continue;

    const concreteType = enclosureType === 'all' ? randomEnclosureType(rng) : enclosureType;
    const resolvedScaleType = scaleTypeForSymbol(symbol, chunk.key, scaleType);
    const degree = targetDegrees[i % targetDegrees.length]!;
    bars.push({
      index: i,
      chords: chunk.chords,
      enclosure: resolveEnclosureForDegree(symbol, degree, concreteType, chunk.key, resolvedScaleType),
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
