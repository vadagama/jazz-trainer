import type { ChordExerciseConfig, ChordSource, PracticeBar } from './types.js';
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

export function generateChordExercise(
  config: ChordExerciseConfig,
  rng: Rng = Math.random,
): PracticeBar[] {
  const { source, keys, repetitions, infinite, barsPerChord = 1, playRandomly } = config;

  if (keys.length === 0) return [];

  if (playRandomly) {
    return generateRandomized(source, keys, repetitions, infinite, barsPerChord, rng);
  }

  const allBarChunks = keys.flatMap((key) => extractChordsFromSource(source, key));

  const bars = toPracticeBars(allBarChunks);
  const expanded = expandBarsPerChord(bars, barsPerChord);
  return repeatBars(expanded, infinite, repetitions);
}

/**
 * Режим «Играть рандомно»: генерирует все тональности, перемешивает чанки,
 * повторяет `repetitions` раз (или заполняет INFINITE_ROUNDS раундов).
 * Для unified — порядок ступеней дополнительно перемешивается в каждом раунде.
 */
function generateRandomized(
  source: ChordSource,
  keys: ChordExerciseConfig['keys'],
  repetitions: number,
  infinite: boolean,
  barsPerChord: number,
  rng: Rng,
): PracticeBar[] {
  const rounds = infinite ? INFINITE_ROUNDS : Math.max(1, repetitions);
  const allBarChunks = [];

  for (let r = 0; r < rounds; r++) {
    // Для unified перемешиваем ступени в каждом раунде.
    const roundSource =
      source.type === 'unified'
        ? ({ type: 'unified', symbols: shuffle(source.symbols, rng) } satisfies ChordSource)
        : source;

    const chunks = keys.flatMap((key) => extractChordsFromSource(roundSource, key));
    const shuffled = shuffle(chunks, rng);
    allBarChunks.push(...shuffled);
  }

  const bars = toPracticeBars(allBarChunks);
  return expandBarsPerChord(bars, barsPerChord);
}
