import { describe, it, expect } from 'vitest';
import { generateScaleExercise } from '../generators/scaleExercise.js';
import type { ScaleExerciseConfig } from '../generators/types.js';

const baseConfig: Omit<ScaleExerciseConfig, 'scaleType' | 'direction' | 'octaves' | 'source'> = {
  type: 'scales' as const,
  keys: ['C'],
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
  barsPerChord: 1,
};

// ── Standalone (source.type === 'unified') ───────────────────────────────────

describe('generateScaleExercise — standalone', () => {
  it('generates one up bar for 1 octave, direction up', () => {
    const bars = generateScaleExercise({
      ...baseConfig,
      source: { type: 'unified', symbols: [] },
      scaleType: 'major',
      direction: 'up',
      octaves: 1,
    });
    expect(bars).toHaveLength(1);
    expect(bars[0]).toMatchObject({
      chords: ['Cmaj7'],
      scaleLabel: 'C мажор',
      direction: 'up',
    });
  });

  it('generates one down bar for 1 octave, direction down', () => {
    const bars = generateScaleExercise({
      ...baseConfig,
      source: { type: 'unified', symbols: [] },
      scaleType: 'dorian',
      direction: 'down',
      octaves: 1,
    });
    expect(bars).toHaveLength(1);
    expect(bars[0]).toMatchObject({
      chords: ['Cm7'],
      scaleLabel: 'C дорийский',
      direction: 'down',
    });
  });

  it('generates up+down for direction both, 1 octave', () => {
    const bars = generateScaleExercise({
      ...baseConfig,
      source: { type: 'unified', symbols: [] },
      scaleType: 'natural-minor',
      direction: 'both',
      octaves: 1,
    });
    expect(bars).toHaveLength(2);
    expect(bars[0]).toMatchObject({ direction: 'up' });
    expect(bars[1]).toMatchObject({ direction: 'down' });
  });

  it('generates 4 bars for direction both, 2 octaves', () => {
    const bars = generateScaleExercise({
      ...baseConfig,
      source: { type: 'unified', symbols: [] },
      scaleType: 'major',
      direction: 'both',
      octaves: 2,
    });
    expect(bars).toHaveLength(4);
    expect(bars[0]).toMatchObject({ direction: 'up' });
    expect(bars[1]).toMatchObject({ direction: 'down' });
    expect(bars[2]).toMatchObject({ direction: 'up' });
    expect(bars[3]).toMatchObject({ direction: 'down' });
  });

  it('generates for multiple keys sequentially', () => {
    const bars = generateScaleExercise({
      ...baseConfig,
      keys: ['C', 'G'],
      source: { type: 'unified', symbols: [] },
      scaleType: 'major',
      direction: 'up',
      octaves: 1,
    });
    expect(bars).toHaveLength(2);
    expect(bars[0]).toMatchObject({ scaleLabel: 'C мажор' });
    expect(bars[1]).toMatchObject({ scaleLabel: 'G мажор' });
  });

  it('repeats when repetitions > 1', () => {
    const bars = generateScaleExercise({
      ...baseConfig,
      keys: ['C'],
      repetitions: 3,
      source: { type: 'unified', symbols: [] },
      scaleType: 'major',
      direction: 'up',
      octaves: 1,
    });
    // 1 bar × 3 repetitions = 3 bars
    expect(bars).toHaveLength(3);
    expect(bars[0]!.index).toBe(0);
    expect(bars[1]!.index).toBe(1);
    expect(bars[2]!.index).toBe(2);
    expect(bars[0]!.scaleLabel).toBe('C мажор');
  });

  it('respects infinite flag (single pass)', () => {
    const bars = generateScaleExercise({
      ...baseConfig,
      keys: ['C'],
      infinite: true,
      repetitions: 1,
      source: { type: 'unified', symbols: [] },
      scaleType: 'major',
      direction: 'up',
      octaves: 1,
    });
    expect(bars).toHaveLength(1);
  });

  it('returns empty for empty keys', () => {
    const bars = generateScaleExercise({
      ...baseConfig,
      keys: [],
      source: { type: 'unified', symbols: [] },
      scaleType: 'major',
      direction: 'up',
      octaves: 1,
    });
    expect(bars).toHaveLength(0);
  });

  it('correctly labels different scale types', () => {
    const scales = [
      { scaleType: 'major' as const, label: 'C мажор' },
      { scaleType: 'dorian' as const, label: 'C дорийский' },
      { scaleType: 'mixolydian' as const, label: 'C миксолидийский' },
      { scaleType: 'lydian' as const, label: 'C лидийский' },
      { scaleType: 'phrygian' as const, label: 'C фригийский' },
      { scaleType: 'locrian' as const, label: 'C локрийский' },
      { scaleType: 'natural-minor' as const, label: 'C натуральный минор' },
      { scaleType: 'harmonic-minor' as const, label: 'C гармонический минор' },
      { scaleType: 'melodic-minor' as const, label: 'C мелодический минор' },
    ];
    for (const { scaleType, label } of scales) {
      const bars = generateScaleExercise({
        ...baseConfig,
        source: { type: 'unified', symbols: [] },
        scaleType,
        direction: 'up',
        octaves: 1,
      });
      expect(bars[0]!.scaleLabel).toBe(label);
    }
  });
});

// ── Over-chords (source.type !== 'unified') ──────────────────────────────────

describe('generateScaleExercise — over-chords', () => {
  it('generates scale labels for a ii–V–I in C', () => {
    const bars = generateScaleExercise({
      ...baseConfig,
      keys: ['C'],
      source: { type: 'pattern', patternId: 'ii-V-I-major' },
      scaleType: 'major',
      direction: 'up',
      octaves: 1,
    } as ScaleExerciseConfig);
    expect(bars).toHaveLength(4);
    expect(bars[0]).toMatchObject({
      chords: ['Dm7'],
      scaleLabel: 'D дорийский',
    });
    expect(bars[1]).toMatchObject({
      chords: ['G7'],
      scaleLabel: 'G миксолидийский',
    });
    expect(bars[2]).toMatchObject({
      chords: ['Cmaj7'],
      scaleLabel: 'C мажор',
    });
    expect(bars[3]).toMatchObject({
      chords: ['Cmaj7'],
      scaleLabel: 'C мажор',
    });
  });

  it('generates scale labels for a turnaround in C', () => {
    const bars = generateScaleExercise({
      ...baseConfig,
      keys: ['C'],
      source: { type: 'pattern', patternId: 'turnaround' },
      scaleType: 'major',
      direction: 'up',
      octaves: 1,
    } as ScaleExerciseConfig);
    expect(bars).toHaveLength(4);
    expect(bars[0]).toMatchObject({ chords: ['Cmaj7'], scaleLabel: 'C мажор' });
    expect(bars[1]).toMatchObject({ chords: ['Am7'], scaleLabel: 'A натуральный минор' });
    expect(bars[2]).toMatchObject({ chords: ['Dm7'], scaleLabel: 'D дорийский' });
    expect(bars[3]).toMatchObject({ chords: ['G7'], scaleLabel: 'G миксолидийский' });
  });

  it('generates for multiple keys', () => {
    const bars = generateScaleExercise({
      ...baseConfig,
      keys: ['C', 'F'],
      source: { type: 'pattern', patternId: 'ii-V-I-major' },
      scaleType: 'major',
      direction: 'up',
      octaves: 1,
    } as ScaleExerciseConfig);
    // 4 bars per key × 2 keys = 8 bars
    expect(bars).toHaveLength(8);
    expect(bars[0]).toMatchObject({ scaleLabel: 'D дорийский' });
    expect(bars[4]).toMatchObject({ scaleLabel: 'G дорийский' }); // ii in F = Gm7
  });

  it('repeats when repetitions > 1', () => {
    const bars = generateScaleExercise({
      ...baseConfig,
      keys: ['C'],
      repetitions: 2,
      source: { type: 'pattern', patternId: 'ii-V-I-major' },
      scaleType: 'major',
      direction: 'up',
      octaves: 1,
    } as ScaleExerciseConfig);
    expect(bars).toHaveLength(8);
    expect(bars[0]!.index).toBe(0);
    expect(bars[3]!.index).toBe(3);
  });

  it('returns empty when source type is unified with empty keys', () => {
    const bars = generateScaleExercise({
      ...baseConfig,
      keys: ['C'],
      source: { type: 'unified', symbols: [] },
      scaleType: 'major',
      direction: 'up',
      octaves: 1,
    } as ScaleExerciseConfig);
    // standalone, generates scale runs (not over-chords)
    expect(bars).toHaveLength(1);
    expect(bars[0]!.chords).toEqual(['Cmaj7']);
  });

  it('preserves chord symbols on PracticeBar', () => {
    const bars = generateScaleExercise({
      ...baseConfig,
      keys: ['Bb'],
      source: { type: 'pattern', patternId: 'ii-V-I-major' },
      scaleType: 'major',
      direction: 'up',
      octaves: 1,
    } as ScaleExerciseConfig);
    expect(bars).toHaveLength(4);
    // ii–V–I in Bb: Cm7 F7 Bbmaj7 Bbmaj7 (tonic two bars)
    expect(bars[0]!.chords).toEqual(['Cm7']);
    expect(bars[1]!.chords).toEqual(['F7']);
    expect(bars[2]!.chords).toEqual(['Bbmaj7']);
    expect(bars[3]!.chords).toEqual(['Bbmaj7']);
  });

  it('handles DSL source with transposition', () => {
    const bars = generateScaleExercise({
      ...baseConfig,
      keys: ['C', 'G'],
      source: { type: 'dsl', dsl: '| Imaj7 | IIm7 | V7 |' },
      scaleType: 'major',
      direction: 'up',
      octaves: 1,
    } as ScaleExerciseConfig);
    expect(bars).toHaveLength(6);
    // In C: Cmaj7 Dm7 G7
    expect(bars[0]).toMatchObject({ chords: ['Cmaj7'], scaleLabel: 'C мажор' });
    // In G (transposed): Gmaj7 Am7 D7
    expect(bars[3]).toMatchObject({ chords: ['Gmaj7'], scaleLabel: 'G мажор' });
    expect(bars[4]).toMatchObject({ chords: ['Am7'], scaleLabel: 'A дорийский' });
    expect(bars[5]).toMatchObject({ chords: ['D7'], scaleLabel: 'D миксолидийский' });
  });
});

// ── Structural ──────────────────────────────────────────────────────────────

describe('generateScaleExercise — structural', () => {
  it('every bar has a valid index', () => {
    const bars = generateScaleExercise({
      ...baseConfig,
      keys: ['C', 'Eb'],
      source: { type: 'unified', symbols: [] },
      scaleType: 'major',
      direction: 'both',
      octaves: 2,
    });
    expect(bars).toHaveLength(8);
    bars.forEach((bar, i) => {
      expect(bar.index).toBe(i);
    });
  });

  it('standalone bars have tonic chord', () => {
    const bars = generateScaleExercise({
      ...baseConfig,
      source: { type: 'unified', symbols: [] },
      scaleType: 'major',
      direction: 'up',
      octaves: 1,
    });
    for (const bar of bars) {
      expect(bar.chords).toEqual(['Cmaj7']);
    }
  });

  it('standalone bars have direction set', () => {
    const bars = generateScaleExercise({
      ...baseConfig,
      source: { type: 'unified', symbols: [] },
      scaleType: 'major',
      direction: 'up',
      octaves: 1,
    });
    for (const bar of bars) {
      expect(['up', 'down']).toContain(bar.direction);
    }
  });

  it('over-chords bars have no direction', () => {
    const bars = generateScaleExercise({
      ...baseConfig,
      keys: ['C'],
      source: { type: 'pattern', patternId: 'ii-V-I-major' },
      scaleType: 'major',
      direction: 'up',
      octaves: 1,
    } as ScaleExerciseConfig);
    for (const bar of bars) {
      expect(bar.direction).toBeUndefined();
    }
  });
});
