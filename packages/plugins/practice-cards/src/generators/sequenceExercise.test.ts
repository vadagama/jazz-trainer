import { describe, it, expect } from 'vitest';
import { generateSequenceExercise } from './sequenceExercise.js';
import type { SequenceExerciseConfig } from './types.js';

const base: Omit<
  SequenceExerciseConfig,
  'keys' | 'playRandomly' | 'sequenceType' | 'startDegrees' | 'scaleType' | 'source' | 'direction'
> = {
  type: 'sequences',
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

describe('generateSequenceExercise — standalone (unified)', () => {
  it('generates one bar per selected start degree (direction up)', () => {
    const bars = generateSequenceExercise({
      ...base,
      keys: ['C'],
      source: { type: 'unified', symbols: [] },
      sequenceType: '1235',
      startDegrees: [1, 2, 3],
      scaleType: 'major',
      direction: 'up',
      playRandomly: false,
    });

    expect(bars).toHaveLength(3);
    expect(bars.every((b) => b.sequence != null)).toBe(true);
    expect(bars[0]!.sequence!.startDegree).toBe(1);
    expect(bars[1]!.sequence!.startDegree).toBe(2);
    expect(bars[2]!.sequence!.startDegree).toBe(3);
    expect(bars.every((b) => b.sequence!.direction === 'up')).toBe(true);
  });

  it('reverses start degrees when direction is down', () => {
    const bars = generateSequenceExercise({
      ...base,
      keys: ['C'],
      source: { type: 'unified', symbols: [] },
      sequenceType: '1235',
      startDegrees: [1, 2, 3],
      scaleType: 'major',
      direction: 'down',
      playRandomly: false,
    });

    expect(bars).toHaveLength(3);
    expect(bars.map((b) => b.sequence!.startDegree)).toEqual([3, 2, 1]);
    expect(bars.every((b) => b.sequence!.direction === 'down')).toBe(true);
  });

  it('produces up then down when direction is both', () => {
    const bars = generateSequenceExercise({
      ...base,
      keys: ['C'],
      source: { type: 'unified', symbols: [] },
      sequenceType: '1235',
      startDegrees: [1, 2, 3],
      scaleType: 'major',
      direction: 'both',
      playRandomly: false,
    });

    // up: 1, 2, 3; down (skipping peak): 2, 1 → 5 total
    expect(bars).toHaveLength(5);
    expect(bars.map((b) => b.sequence!.startDegree)).toEqual([1, 2, 3, 2, 1]);
    expect(bars.slice(0, 3).every((b) => b.sequence!.direction === 'up')).toBe(true);
    expect(bars.slice(3).every((b) => b.sequence!.direction === 'down')).toBe(true);
  });

  it('multiplies bars by number of keys', () => {
    const bars = generateSequenceExercise({
      ...base,
      keys: ['C', 'F'],
      source: { type: 'unified', symbols: [] },
      sequenceType: '1235',
      startDegrees: [1, 2, 3],
      scaleType: 'major',
      direction: 'up',
      playRandomly: false,
    });

    expect(bars).toHaveLength(6);
    // First 3 bars are Cmaj7, next 3 are Fmaj7
    expect(bars[0]!.chords[0]).toBe('Cmaj7');
    expect(bars[3]!.chords[0]).toBe('Fmaj7');
  });

  it('produces correct pattern notes for 1235 in C major from degree 1', () => {
    const bars = generateSequenceExercise({
      ...base,
      keys: ['C'],
      source: { type: 'unified', symbols: [] },
      sequenceType: '1235',
      startDegrees: [1],
      scaleType: 'major',
      direction: 'up',
      playRandomly: false,
    });

    expect(bars).toHaveLength(1);
    expect(bars[0]!.sequence!.notes.map((n) => n.name)).toEqual(['C', 'D', 'E', 'G']);
    expect(bars[0]!.sequence!.notes.map((n) => n.pc)).toEqual([0, 2, 4, 7]);
    expect(bars[0]!.sequence!.type).toBe('1235');
  });

  it('builds a tonic chord that matches the scale type', () => {
    const bars = generateSequenceExercise({
      ...base,
      keys: ['C'],
      source: { type: 'unified', symbols: [] },
      sequenceType: '1357',
      startDegrees: [1],
      scaleType: 'mixolydian',
      direction: 'up',
      playRandomly: false,
    });

    expect(bars[0]!.chords[0]).toBe('C7');
  });
});

describe('generateSequenceExercise — randomized standalone', () => {
  it('shuffles standalone rounds deterministically when playRandomly is true', () => {
    const bars = generateSequenceExercise(
      {
        ...base,
        keys: ['C', 'G'],
        source: { type: 'unified', symbols: [] },
        sequenceType: '1235',
        startDegrees: [1],
        scaleType: 'major',
        direction: 'up',
        repetitions: 2,
        playRandomly: true,
      },
      seqRng([0]),
    );

    // 2 rounds × 2 keys × 1 degree = 4 bars
    expect(bars).toHaveLength(4);
    // Round 1: shuffle [Cmaj7, Gmaj7] with rng 0 → swap → Gmaj7, Cmaj7
    expect(bars[0]!.chords[0]).toContain('G');
    expect(bars[1]!.chords[0]).toContain('C');
    expect(bars[2]!.chords[0]).toContain('G');
    expect(bars[3]!.chords[0]).toContain('C');
  });
});

describe('generateSequenceExercise — over-chords', () => {
  it('generates sequence bars over a chord progression', () => {
    const bars = generateSequenceExercise({
      ...base,
      keys: ['C'],
      source: { type: 'pattern', patternId: 'ii-V-I-major' },
      sequenceType: '1357',
      startDegrees: [1],
      scaleType: 'major',
      direction: 'up',
      playRandomly: false,
    });

    expect(bars.length).toBeGreaterThan(0);
    expect(bars.every((b) => b.sequence != null && b.chords.length > 0)).toBe(true);
    // ii-V-I-major has 4 bars per key
    expect(bars).toHaveLength(4);
    expect(bars.every((b) => b.sequence!.startDegree === 1)).toBe(true);
  });

  it('cycles start degrees across chords', () => {
    const bars = generateSequenceExercise({
      ...base,
      keys: ['C'],
      source: { type: 'pattern', patternId: 'ii-V-I-major' },
      sequenceType: '1235',
      startDegrees: [1, 3, 5],
      scaleType: 'major',
      direction: 'up',
      playRandomly: false,
    });

    // 4 bars cycling [1, 3, 5, 1]
    expect(bars).toHaveLength(4);
    expect(bars[0]!.sequence!.startDegree).toBe(1);
    expect(bars[1]!.sequence!.startDegree).toBe(3);
    expect(bars[2]!.sequence!.startDegree).toBe(5);
    expect(bars[3]!.sequence!.startDegree).toBe(1);
  });
});

describe('generateSequenceExercise — sequenceType "all"', () => {
  it('picks a random concrete type on every bar when sequenceType is "all"', () => {
    const bars = generateSequenceExercise(
      {
        ...base,
        keys: ['C'],
        source: { type: 'unified', symbols: [] },
        sequenceType: 'all',
        startDegrees: [1, 2, 3, 4],
        scaleType: 'major',
        direction: 'up',
        playRandomly: false,
      },
      seqRng([0, 0.2, 0.5, 0.9]),
    );

    expect(bars).toHaveLength(4);
    const types = new Set(bars.map((b) => b.sequence!.type));
    expect(types.size).toBeGreaterThan(1);
  });
});

describe('generateSequenceExercise — options', () => {
  it('repeats each sequence bar according to barsPerChord', () => {
    const bars = generateSequenceExercise({
      ...base,
      keys: ['C'],
      source: { type: 'unified', symbols: [] },
      sequenceType: '1235',
      startDegrees: [1],
      scaleType: 'major',
      direction: 'up',
      barsPerChord: 3,
      playRandomly: false,
    });

    expect(bars).toHaveLength(3);
    expect(bars.every((b) => b.sequence!.startDegree === 1)).toBe(true);
    expect(bars.map((b) => b.index)).toEqual([0, 1, 2]);
  });

  it('repeats the whole buffer according to repetitions', () => {
    const bars = generateSequenceExercise({
      ...base,
      keys: ['C'],
      source: { type: 'unified', symbols: [] },
      sequenceType: '1235',
      startDegrees: [1],
      scaleType: 'major',
      direction: 'up',
      repetitions: 3,
      playRandomly: false,
    });

    expect(bars).toHaveLength(3);
  });

  it('returns an empty array when no keys or no start degrees are selected', () => {
    expect(
      generateSequenceExercise({
        ...base,
        keys: [],
        source: { type: 'unified', symbols: [] },
        sequenceType: '1235',
        startDegrees: [1],
        scaleType: 'major',
        direction: 'up',
        playRandomly: false,
      }),
    ).toHaveLength(0);

    expect(
      generateSequenceExercise({
        ...base,
        keys: ['C'],
        source: { type: 'unified', symbols: [] },
        sequenceType: '1235',
        startDegrees: [],
        scaleType: 'major',
        direction: 'up',
        playRandomly: false,
      }),
    ).toHaveLength(0);
  });
});
