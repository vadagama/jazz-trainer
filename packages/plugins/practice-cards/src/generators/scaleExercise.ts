import {
  chordDegreeToScale,
  getChordQualitySuffix,
  scaleLabel,
  keyToPitchClass,
  buildTonicChord,
} from '@jazz/music-core';
import type { Key } from '@jazz/shared';
import type { ScaleExerciseConfig, PracticeBar } from './types.js';
import {
  INFINITE_ROUNDS,
  shuffle,
  expandBarsPerChord,
  repeatBars,
  extractChordsFromSource,
  toPracticeBars,
} from './core.js';
import type { Rng } from './core.js';

export type { Rng };

/**
 * Generate scale exercise bars from a {@link ScaleExerciseConfig}.
 *
 * Source type determines the mode:
 * - `unified` — pure scale runs, metronome only (standalone).
 * - `pattern` / `dsl` / `random` — play the appropriate mode over each chord of a progression.
 */
export function generateScaleExercise(
  config: ScaleExerciseConfig,
  rng: Rng = Math.random,
): PracticeBar[] {
  const { source, scaleType, direction, octaves, keys, repetitions, infinite, playRandomly } =
    config;
  const barsPerChord = config.barsPerChord ?? 1;

  if (keys.length === 0) return [];

  if (source.type === 'unified') {
    if (playRandomly) {
      return generateStandaloneRandomized(
        keys,
        scaleType,
        direction,
        octaves,
        repetitions,
        infinite,
        barsPerChord,
        rng,
      );
    }
    return generateStandalone(
      keys,
      scaleType,
      direction,
      octaves,
      repetitions,
      infinite,
      barsPerChord,
    );
  }
  if (playRandomly) {
    return generateOverChordsRandomized(config, rng);
  }
  return generateOverChords(config);
}

// ── Standalone mode (source.type === 'unified') ──────────────────────────────

function generateStandalone(
  keys: Key[],
  scaleType: ScaleExerciseConfig['scaleType'],
  direction: ScaleExerciseConfig['direction'],
  octaves: 1 | 2,
  repetitions: number,
  infinite: boolean,
  barsPerChord: number,
): PracticeBar[] {
  const units = buildStandaloneUnits(keys, scaleType, direction, octaves);
  return repeatBars(expandBarsPerChord(units, barsPerChord), infinite, repetitions);
}

function generateStandaloneRandomized(
  keys: Key[],
  scaleType: ScaleExerciseConfig['scaleType'],
  direction: ScaleExerciseConfig['direction'],
  octaves: 1 | 2,
  repetitions: number,
  infinite: boolean,
  barsPerChord: number,
  rng: Rng,
): PracticeBar[] {
  const rounds = infinite ? INFINITE_ROUNDS : Math.max(1, repetitions);
  const units: PracticeBar[] = [];

  for (let r = 0; r < rounds; r++) {
    const round = buildStandaloneUnits(keys, scaleType, direction, octaves);
    const shuffled = shuffle(round, rng);
    for (const u of shuffled) {
      units.push({ ...u, index: units.length });
    }
  }

  return expandBarsPerChord(units, barsPerChord);
}

function buildStandaloneUnits(
  keys: Key[],
  scaleType: ScaleExerciseConfig['scaleType'],
  direction: ScaleExerciseConfig['direction'],
  octaves: 1 | 2,
): PracticeBar[] {
  const units: PracticeBar[] = [];
  let idx = 0;
  for (const key of keys) {
    const backingChord = buildTonicChord(key, scaleType);
    for (let o = 0; o < octaves; o++) {
      if (direction === 'up' || direction === 'both') {
        units.push({
          index: idx++,
          chords: [backingChord],
          scaleLabel: scaleLabel(key, scaleType),
          direction: 'up' as const,
        });
      }
      if (direction === 'down' || direction === 'both') {
        units.push({
          index: idx++,
          chords: [backingChord],
          scaleLabel: scaleLabel(key, scaleType),
          direction: 'down' as const,
        });
      }
    }
  }
  return units;
}

// ── Over-chords mode (source.type !== 'unified') ─────────────────────────────

function generateOverChords(config: ScaleExerciseConfig): PracticeBar[] {
  const { source, keys, repetitions, infinite, barsPerChord } = config;

  const allBarChunks = keys.flatMap((key) =>
    extractChordsFromSource(source, key).map((chunk) => ({
      ...chunk,
      scaleLabel: scaleForChunk(chunk, key),
    })),
  );

  const base = toPracticeBars(allBarChunks);
  return repeatBars(expandBarsPerChord(base, barsPerChord ?? 1), infinite, repetitions);
}

function generateOverChordsRandomized(config: ScaleExerciseConfig, rng: Rng): PracticeBar[] {
  const { source, keys, repetitions, infinite, barsPerChord } = config;

  const rounds = infinite ? INFINITE_ROUNDS : Math.max(1, repetitions);
  const allBarChunks: { chords: string[]; scaleLabel: string }[] = [];

  for (let r = 0; r < rounds; r++) {
    const chunks = keys.flatMap((key) =>
      extractChordsFromSource(source, key).map((chunk) => ({
        ...chunk,
        scaleLabel: scaleForChunk(chunk, key),
      })),
    );
    const shuffled = shuffle(chunks, rng);
    allBarChunks.push(...shuffled);
  }

  const base = toPracticeBars(allBarChunks);
  return expandBarsPerChord(base, barsPerChord ?? 1);
}

// ── Scale helpers ────────────────────────────────────────────────────────────

function scaleForChunk(chunk: { chords: string[] }, key: Key): string {
  const symbol = chunk.chords[0];
  if (!symbol) return '';
  const suffix = getChordQualitySuffix(symbol);
  const rootPc = chordRootPitchClass(symbol);
  const degree = (rootPc - keyToPitchClass(key) + 12) % 12;
  const scaleType = chordDegreeToScale(degree, suffix);
  const root = chordRootName(symbol);
  return scaleLabel(root, scaleType);
}

function chordRootPitchClass(symbol: string): number {
  return keyToPitchClass(chordRootName(symbol));
}

function chordRootName(symbol: string): string {
  let i = 1;
  if (symbol.length > 1 && (symbol[1] === '#' || symbol[1] === 'b')) i = 2;
  return symbol.slice(0, i);
}
