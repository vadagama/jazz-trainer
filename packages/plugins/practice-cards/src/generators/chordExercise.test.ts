import { describe, it, expect } from 'vitest';
import { generateChordExercise } from './chordExercise.js';
import type { ChordExerciseConfig } from './types.js';

const base: Omit<ChordExerciseConfig, 'source' | 'keys' | 'playRandomly'> = {
  type: 'chords',
  repetitions: 1,
  infinite: false,
  countInBars: 1,
  cardMode: 'current',
  backingBass: false,
  backingDrums: false,
  backingPiano: false,
  backingRhodes: false,
  metronomeEnabled: false,
  metronomeVolume: 0.5,
  tempo: 120,
  timeSignature: '4/4',
  barsPerChord: 1,
};

/** Deterministic rng cycling through the given values. */
function seqRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length]!;
}

describe('generateChordExercise — playRandomly', () => {
  it('non-random branch is unchanged (unified, two keys)', () => {
    const bars = generateChordExercise({
      ...base,
      keys: ['C', 'G'],
      source: { type: 'unified', symbols: ['IIm7', 'V7'] },
      playRandomly: false,
    });
    // 2 symbols × 2 keys = 4 bars
    expect(bars).toHaveLength(4);
  });

  it('random unified: generates all keys, shuffled each round', () => {
    const bars = generateChordExercise(
      {
        ...base,
        keys: ['C', 'G'],
        source: { type: 'unified', symbols: ['Imaj7', 'IIm7', 'V7'] },
        repetitions: 2,
        playRandomly: true,
      },
      seqRng([0]),
    );
    // 2 rounds × 2 keys × 3 symbols = 12 bars
    expect(bars).toHaveLength(12);
    // Both C and G roots appear (not just one key).
    const roots = new Set(bars.map((b) => b.chords[0]));
    const cRoots = ['Cmaj7', 'Dm7', 'G7'];
    const gRoots = ['Gmaj7', 'Am7', 'D7'];
    for (const r of cRoots) expect(roots.has(r)).toBe(true);
    for (const r of gRoots) expect(roots.has(r)).toBe(true);
  });

  it('random unified: all selected degrees appear with single key', () => {
    const symbols = ['Imaj7', 'IIm7', 'V7'];
    const bars = generateChordExercise(
      {
        ...base,
        keys: ['C'],
        source: { type: 'unified', symbols },
        repetitions: 1,
        playRandomly: true,
      },
      seqRng([0]),
    );
    // 1 round × 1 key × 3 symbols = 3 bars
    expect(bars).toHaveLength(3);
    const roots = bars.map((b) => b.chords[0]);
    // In C: Imaj7=Cmaj7, IIm7=Dm7, V7=G7 — all three roots present
    expect(roots).toContain('Cmaj7');
    expect(roots).toContain('Dm7');
    expect(roots).toContain('G7');
  });

  it('random infinite: buffer length = INFINITE_ROUNDS × keys × symbols', () => {
    const bars = generateChordExercise(
      {
        ...base,
        keys: ['C', 'G'],
        source: { type: 'unified', symbols: ['IIm7', 'V7'] },
        infinite: true,
        playRandomly: true,
      },
      seqRng([0]),
    );
    // 16 rounds × 2 keys × 2 symbols = 64 bars
    expect(bars).toHaveLength(64);
  });

  it('random: both keys appear when multiple selected', () => {
    const bars = generateChordExercise(
      {
        ...base,
        keys: ['C', 'G'],
        source: { type: 'unified', symbols: ['Imaj7'] },
        repetitions: 1,
        playRandomly: true,
      },
      // rng for shuffle of 2 chunks: i=1, j=floor(0.5*2)=1 → no swap
      seqRng([0.5]),
    );
    // 1 round × 2 keys × 1 symbol = 2 bars
    expect(bars).toHaveLength(2);
    const roots = bars.map((b) => b.chords[0]!);
    // Both C and G expansions present
    expect(roots).toContain('Cmaj7');
    expect(roots).toContain('Gmaj7');
  });
});
