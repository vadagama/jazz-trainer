import { describe, it, expect } from 'vitest';
import { generateScaleExercise } from './scaleExercise.js';
import type { ScaleExerciseConfig } from './types.js';

const base: Omit<
  ScaleExerciseConfig,
  'keys' | 'playRandomly' | 'scaleType' | 'direction' | 'octaves' | 'source'
> = {
  type: 'scales',
  repetitions: 1,
  infinite: false,
  barsPerChord: 1,
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
};

function seqRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length]!;
}

describe('generateScaleExercise — playRandomly', () => {
  it('non-random standalone branch is unchanged', () => {
    const bars = generateScaleExercise({
      ...base,
      keys: ['C', 'G'],
      source: { type: 'unified', symbols: [] },
      scaleType: 'major',
      direction: 'both',
      octaves: 1,
      playRandomly: false,
    });
    // 2 keys × 1 octave × (up+down) = 4 bars
    expect(bars).toHaveLength(4);
  });

  it('random standalone: generates all keys, shuffled each round', () => {
    const bars = generateScaleExercise(
      {
        ...base,
        keys: ['C', 'G'],
        source: { type: 'unified', symbols: [] },
        scaleType: 'major',
        direction: 'up',
        octaves: 1,
        repetitions: 3,
        playRandomly: true,
      },
      // Fisher-Yates shuffle: each round consumes 1 rng() call (len=2, i=1 only).
      // Round 1: rng=0 → j=0 → swap → [G, C]
      // Round 2: rng=0.5 → j=1 → no swap → [C, G]
      // Round 3: rng=0 → j=0 → swap → [G, C]
      seqRng([0, 0.5, 0]),
    );
    // 3 rounds × 2 keys × 1 octave × up = 6 bars
    expect(bars).toHaveLength(6);
    const labels = bars.map((b) => b.scaleLabel);
    // round 1: G, C
    expect(labels[0]).toContain('G');
    expect(labels[1]).toContain('C');
    // round 2: C, G
    expect(labels[2]).toContain('C');
    expect(labels[3]).toContain('G');
    // round 3: G, C
    expect(labels[4]).toContain('G');
    expect(labels[5]).toContain('C');
  });

  it('random standalone infinite: buffer = INFINITE_ROUNDS × material', () => {
    const bars = generateScaleExercise(
      {
        ...base,
        keys: ['C'],
        source: { type: 'unified', symbols: [] },
        scaleType: 'major',
        direction: 'both',
        octaves: 1,
        infinite: true,
        playRandomly: true,
      },
      seqRng([0]),
    );
    // 16 rounds × 1 key × (up+down) = 32 bars
    expect(bars).toHaveLength(32);
  });

  it('standalone: barsPerChord repeats each scale run N bars', () => {
    const bars = generateScaleExercise({
      ...base,
      keys: ['C'],
      source: { type: 'unified', symbols: [] },
      scaleType: 'major',
      direction: 'both',
      octaves: 1,
      barsPerChord: 3,
      playRandomly: false,
    });
    // 1 key × (up+down) × 3 bars = 6 bars
    expect(bars).toHaveLength(6);
    // первые 3 такта — один и тот же прогон (вверх), следующие 3 — вниз
    expect(bars.slice(0, 3).every((b) => b.direction === 'up')).toBe(true);
    expect(bars.slice(3, 6).every((b) => b.direction === 'down')).toBe(true);
    // индексы переиндексированы подряд
    expect(bars.map((b) => b.index)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('over-chords: barsPerChord repeats each chord bar N bars', () => {
    const single = generateScaleExercise({
      ...base,
      keys: ['C'],
      source: { type: 'pattern', patternId: 'ii-V-I-major' },
      scaleType: 'major',
      direction: 'up',
      octaves: 1,
      barsPerChord: 1,
      playRandomly: false,
    });
    const doubled = generateScaleExercise({
      ...base,
      keys: ['C'],
      source: { type: 'pattern', patternId: 'ii-V-I-major' },
      scaleType: 'major',
      direction: 'up',
      octaves: 1,
      barsPerChord: 2,
      playRandomly: false,
    });
    expect(doubled).toHaveLength(single.length * 2);
    // каждый аккорд продублирован: такт 0 и 1 — один аккорд
    expect(doubled[0]!.chords).toEqual(doubled[1]!.chords);
  });

  it('generates with explicit direction and octaves (no default filling)', () => {
    const bars = generateScaleExercise({
      ...base,
      keys: ['C', 'D'],
      source: { type: 'unified', symbols: [] },
      scaleType: 'natural-minor',
      direction: 'both',
      octaves: 1,
    } as ScaleExerciseConfig);
    // both, 1 октава → 2 keys × (up+down) = 4 такта
    expect(bars).toHaveLength(4);
    expect(bars.every((b) => b.scaleLabel && b.scaleLabel.length > 0)).toBe(true);
  });

  it('random over-chords: generates all keys, shuffled each round', () => {
    const bars = generateScaleExercise(
      {
        ...base,
        keys: ['C', 'G'],
        source: { type: 'pattern', patternId: 'ii-V-I-major' },
        scaleType: 'major',
        direction: 'up',
        octaves: 1,
        repetitions: 2,
        playRandomly: true,
      },
      seqRng([0]),
    );
    // 2 rounds × 2 keys × ii-V-I (4 bars per key) = 16 bars
    expect(bars).toHaveLength(16);
    // All chords from both C and G ii-V-I appear somewhere.
    const chords = bars.map((b) => b.chords[0]!);
    expect(chords).toContain('Dm7'); // ii of C
    expect(chords).toContain('G7'); // V of C
    expect(chords).toContain('Cmaj7'); // I of C
    expect(chords).toContain('Am7'); // ii of G
    expect(chords).toContain('D7'); // V of G
    expect(chords).toContain('Gmaj7'); // I of G
  });
});
