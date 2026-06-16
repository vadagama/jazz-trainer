import { describe, it, expect } from 'vitest';
import { generateChordExercise } from '../generators/chordExercise.js';
import type { ChordExerciseConfig } from '../generators/types.js';

const baseConfig: Omit<ChordExerciseConfig, 'source' | 'keys' | 'barsPerChord'> = {
  type: 'chords' as const,
  repetitions: 1,
  infinite: false,
  countInBars: 0,
  cardMode: 'current',
  backingBass: false,
  backingDrums: false,
  backingPiano: false,
  backingRhodes: false,
  metronomeEnabled: false,
  metronomeVolume: 0,
  tempo: 120,
  timeSignature: '4/4' as const,
  playRandomly: false,
};

describe('generateChordExercise — degree DSL', () => {
  it('expands degrees into concrete chords for the key', () => {
    const bars = generateChordExercise({
      ...baseConfig,
      keys: ['C'],
      barsPerChord: 1,
      source: { type: 'dsl', dsl: '| IIm7 | V7 | Imaj7 |' },
    });
    expect(bars.map((b) => b.chords)).toEqual([['Dm7'], ['G7'], ['Cmaj7']]);
  });

  it('expands the same degrees differently per key', () => {
    const bars = generateChordExercise({
      ...baseConfig,
      keys: ['F'],
      barsPerChord: 1,
      source: { type: 'dsl', dsl: '| IIm7 | V7 | Imaj7 |' },
    });
    expect(bars.map((b) => b.chords)).toEqual([['Gm7'], ['C7'], ['Fmaj7']]);
  });

  it('handles 6 chords (I6)', () => {
    const bars = generateChordExercise({
      ...baseConfig,
      keys: ['C'],
      barsPerChord: 1,
      source: { type: 'dsl', dsl: '| I6 |' },
    });
    expect(bars[0]!.chords).toEqual(['C6']);
  });

  it('handles chromatic degrees and secondary dominants', () => {
    const bars = generateChordExercise({
      ...baseConfig,
      keys: ['C'],
      barsPerChord: 1,
      source: { type: 'dsl', dsl: '| bIImaj7 | V7/V | V7 | Imaj7 |' },
    });
    // C uses the sharp spelling table → bII = C#; V7/V = D7 (degree 2), V7 = G7, I = C
    expect(bars.map((b) => b.chords)).toEqual([['C#maj7'], ['D7'], ['G7'], ['Cmaj7']]);
  });

  it('iterates degrees across multiple keys', () => {
    const bars = generateChordExercise({
      ...baseConfig,
      keys: ['C', 'F'],
      barsPerChord: 1,
      source: { type: 'dsl', dsl: '| V7 | Imaj7 |' },
    });
    expect(bars.map((b) => b.chords)).toEqual([['G7'], ['Cmaj7'], ['C7'], ['Fmaj7']]);
  });

  it('throws on an invalid degree token', () => {
    expect(() =>
      generateChordExercise({
        ...baseConfig,
        keys: ['C'],
        barsPerChord: 1,
        source: { type: 'dsl', dsl: '| Xyz |' },
      }),
    ).toThrow(/DSL parse error/);
  });
});

describe('generateChordExercise — unified source', () => {
  it('plays each selected degree as its own bar in selection order', () => {
    const bars = generateChordExercise({
      ...baseConfig,
      keys: ['C'],
      barsPerChord: 1,
      source: { type: 'unified', symbols: ['IIm7', 'V7', 'Imaj7'] },
    });
    expect(bars.map((b) => b.chords)).toEqual([['Dm7'], ['G7'], ['Cmaj7']]);
  });

  it('expands selected degrees per key, key after key', () => {
    const bars = generateChordExercise({
      ...baseConfig,
      keys: ['C', 'F'],
      barsPerChord: 1,
      source: { type: 'unified', symbols: ['V7', 'Imaj7'] },
    });
    expect(bars.map((b) => b.chords)).toEqual([['G7'], ['Cmaj7'], ['C7'], ['Fmaj7']]);
  });

  it('supports chromatic degrees and secondary dominants', () => {
    const bars = generateChordExercise({
      ...baseConfig,
      keys: ['C'],
      barsPerChord: 1,
      source: { type: 'unified', symbols: ['♭IImaj7', 'V7/V'] },
    });
    expect(bars.map((b) => b.chords)).toEqual([['C#maj7'], ['D7']]);
  });

  it('respects barsPerChord by repeating each degree bar', () => {
    const bars = generateChordExercise({
      ...baseConfig,
      keys: ['C'],
      barsPerChord: 2,
      source: { type: 'unified', symbols: ['V7', 'Imaj7'] },
    });
    expect(bars.map((b) => b.chords)).toEqual([['G7'], ['G7'], ['Cmaj7'], ['Cmaj7']]);
  });

  it('returns no bars when nothing is selected', () => {
    const bars = generateChordExercise({
      ...baseConfig,
      keys: ['C'],
      barsPerChord: 1,
      source: { type: 'unified', symbols: [] },
    });
    expect(bars).toEqual([]);
  });

  it('throws on an invalid degree symbol', () => {
    expect(() =>
      generateChordExercise({
        ...baseConfig,
        keys: ['C'],
        barsPerChord: 1,
        source: { type: 'unified', symbols: ['Xyz'] },
      }),
    ).toThrow(/Degree parse error/);
  });
});
