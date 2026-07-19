import { describe, it, expect } from 'vitest';
import { generateEnclosureExercise } from './enclosureExercise.js';
import type { EnclosureExerciseConfig } from './types.js';

const base: Omit<
  EnclosureExerciseConfig,
  'keys' | 'playRandomly' | 'enclosureType' | 'targetDegrees' | 'scaleType' | 'source'
> = {
  type: 'enclosures',
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

describe('generateEnclosureExercise', () => {
  it('generates standalone enclosures for selected degrees', () => {
    const bars = generateEnclosureExercise({
      ...base,
      keys: ['C'],
      source: { type: 'unified', symbols: [] },
      enclosureType: 'diatonic-upper',
      targetDegrees: [1, 3, 5, 7],
      scaleType: 'major',
      playRandomly: false,
    });

    expect(bars).toHaveLength(4);
    expect(bars.every((b) => b.enclosure != null)).toBe(true);
    expect(bars[0]!.enclosure!.targetDegree).toBe(1);
    expect(bars[1]!.enclosure!.targetDegree).toBe(3);
    expect(bars[2]!.enclosure!.targetDegree).toBe(5);
    expect(bars[3]!.enclosure!.targetDegree).toBe(7);
  });

  it('shuffles standalone rounds deterministically when playRandomly is true', () => {
    const bars = generateEnclosureExercise(
      {
        ...base,
        keys: ['C', 'G'],
        source: { type: 'unified', symbols: [] },
        enclosureType: 'diatonic-upper',
        targetDegrees: [1],
        scaleType: 'major',
        repetitions: 2,
        playRandomly: true,
      },
      seqRng([0]),
    );

    // 2 rounds × 2 keys × 1 degree = 4 bars
    expect(bars).toHaveLength(4);
    // Round 1: shuffle [C,G] with rng 0 → swap → G, C
    expect(bars[0]!.chords[0]).toContain('G');
    expect(bars[1]!.chords[0]).toContain('C');
    // Round 2: same rng → G, C
    expect(bars[2]!.chords[0]).toContain('G');
    expect(bars[3]!.chords[0]).toContain('C');
  });

  it('repeats each enclosure bar according to barsPerChord', () => {
    const bars = generateEnclosureExercise({
      ...base,
      keys: ['C'],
      source: { type: 'unified', symbols: [] },
      enclosureType: 'chromatic-lower',
      targetDegrees: [3],
      scaleType: 'major',
      barsPerChord: 3,
      playRandomly: false,
    });

    expect(bars).toHaveLength(3);
    expect(bars.every((b) => b.enclosure!.targetDegree === 3)).toBe(true);
    expect(bars.map((b) => b.index)).toEqual([0, 1, 2]);
  });

  it('generates enclosures over chord progressions', () => {
    const bars = generateEnclosureExercise({
      ...base,
      keys: ['C'],
      source: { type: 'pattern', patternId: 'ii-V-I-major' },
      enclosureType: 'full-chromatic',
      targetDegrees: [1],
      scaleType: 'major',
      playRandomly: false,
    });

    expect(bars.length).toBeGreaterThan(0);
    expect(bars.every((b) => b.enclosure != null && b.chords.length > 0)).toBe(true);
    // ii-V-I-major has 4 bars per key
    expect(bars).toHaveLength(4);
  });

  it('picks a random concrete type when enclosureType is "all"', () => {
    const bars = generateEnclosureExercise(
      {
        ...base,
        keys: ['C'],
        source: { type: 'unified', symbols: [] },
        enclosureType: 'all',
        targetDegrees: [1, 3, 5, 7],
        scaleType: 'major',
        playRandomly: false,
      },
      seqRng([0, 0.2, 0.5, 0.9]),
    );

    expect(bars).toHaveLength(4);
    const types = new Set(bars.map((b) => b.enclosure!.type));
    expect(types.size).toBeGreaterThan(1);
  });

  it('supports target degrees 1 through 11', () => {
    const bars = generateEnclosureExercise({
      ...base,
      keys: ['C'],
      source: { type: 'unified', symbols: [] },
      enclosureType: 'chromatic-lower',
      targetDegrees: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      scaleType: 'major',
      playRandomly: false,
    });

    expect(bars).toHaveLength(11);
    expect(bars.map((b) => b.enclosure!.targetDegree)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it('returns an empty array when no keys or no target degrees are selected', () => {
    expect(
      generateEnclosureExercise({
        ...base,
        keys: [],
        source: { type: 'unified', symbols: [] },
        enclosureType: 'diatonic-upper',
        targetDegrees: [1],
        scaleType: 'major',
        playRandomly: false,
      }),
    ).toHaveLength(0);

    expect(
      generateEnclosureExercise({
        ...base,
        keys: ['C'],
        source: { type: 'unified', symbols: [] },
        enclosureType: 'diatonic-upper',
        targetDegrees: [],
        scaleType: 'major',
        playRandomly: false,
      }),
    ).toHaveLength(0);
  });
});
