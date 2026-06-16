import {
  generate,
  keyToPitchClass,
  parseDegree,
  parseDegreeGrid,
  spellPitchClass,
} from '@jazz/music-core';
import type { Key } from '@jazz/shared';
import type { ChordSource, PracticeBar } from './types.js';

// ---------------------------------------------------------------------------
// Shared types & constants
// ---------------------------------------------------------------------------

/** Random number generator: returns a value in [0, 1). Defaults to Math.random. */
export type Rng = () => number;

/** Число раундов (полных прогонов всех тональностей) при бесконечном рандом-режиме. */
export const INFINITE_ROUNDS = 16;

// ---------------------------------------------------------------------------
// Shuffle (Fisher–Yates, immutable)
// ---------------------------------------------------------------------------

export function shuffle<T>(arr: readonly T[], rng: Rng): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

// ---------------------------------------------------------------------------
// Bar expansion & repetition
// ---------------------------------------------------------------------------

/** Размножить каждый такт `barsPerChord` раз и переиндексировать буфер. */
export function expandBarsPerChord(bars: PracticeBar[], n: number): PracticeBar[] {
  if (n <= 1) return bars;
  return bars
    .flatMap((bar) => Array.from({ length: n }, () => ({ ...bar })))
    .map((bar, i) => ({ ...bar, index: i }));
}

/** Повторить буфер `repetitions` раз (кроме бесконечного режима) с переиндексацией. */
export function repeatBars(
  bars: PracticeBar[],
  infinite: boolean,
  repetitions: number,
): PracticeBar[] {
  if (infinite || repetitions <= 1) return bars;
  const baseLen = bars.length;
  const out = bars.slice();
  for (let r = 1; r < repetitions; r++) {
    for (let i = 0; i < baseLen; i++) {
      out.push({ ...bars[i]!, index: baseLen * r + i });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Source → chord symbols extraction (shared by chord & scale generators)
// ---------------------------------------------------------------------------

/** Результат раскрытия источника: набор тактов с символами аккордов. */
export type ChordChunk = { chords: string[] };

/**
 * Раскрыть один источник в такты для заданной тональности.
 * Общий для аккордового и гаммового генераторов — гаммовый навешивает scaleLabel сверху.
 */
export function extractChordsFromSource(source: ChordSource, key: Key): ChordChunk[] {
  const keyPc = keyToPitchClass(key);

  switch (source.type) {
    case 'pattern': {
      const content = generate({ patternId: source.patternId, key });
      return content.bars.map((b) => ({ chords: b.chords.map((c) => c.symbol) }));
    }
    case 'random': {
      const content = generate({ patternId: 'random-diatonic', key, lengthBars: source.bars });
      return content.bars.map((b) => ({ chords: b.chords.map((c) => c.symbol) }));
    }
    case 'dsl': {
      const result = parseDegreeGrid(source.dsl);
      if (!result.ok || !result.value) {
        throw new Error(`DSL parse error: ${result.errors.map((e) => e.message).join('; ')}`);
      }
      return result.value.bars.map((b) => ({
        chords: b.slots.map((s) => spellPitchClass((keyPc + s.degree) % 12, key) + s.quality),
      }));
    }
    case 'unified': {
      return source.symbols.map((symbol) => {
        const res = parseDegree(symbol);
        if (!res.ok || !res.value) {
          throw new Error(
            `Degree parse error "${symbol}": ${res.errors.map((e) => e.message).join('; ')}`,
          );
        }
        const s = res.value;
        return { chords: [spellPitchClass((keyPc + s.degree) % 12, key) + s.quality] };
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Randomized round framework
// ---------------------------------------------------------------------------

/**
 * Общий каркас для рандомизированной генерации:
 * - `rounds` раундов, в каждом `buildRound(source, keys, rng)` даёт чанки;
 * - чанки перемешиваются, накапливаются в общий буфер;
 * - результат размножается `expandBarsPerChord`.
 */
export function buildRandomized(
  rounds: number,
  buildRound: (keys: Key[], rng: Rng) => ChordChunk[],
  keys: Key[],
  barsPerChord: number,
  rng: Rng,
): PracticeBar[] {
  const allChunks: ChordChunk[] = [];

  for (let r = 0; r < rounds; r++) {
    const chunks = buildRound(keys, rng);
    const shuffled = shuffle(chunks, rng);
    allChunks.push(...shuffled);
  }

  return toPracticeBars(allChunks);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function toPracticeBars(chunks: ChordChunk[]): PracticeBar[] {
  return chunks.map((bar, i) => ({
    index: i,
    ...bar,
  }));
}
