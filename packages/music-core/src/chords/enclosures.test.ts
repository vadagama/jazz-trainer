import { describe, it, expect } from 'vitest';
import {
  resolveEnclosure,
  resolveChordTonePitchClass,
  randomEnclosureType,
  scalePitchClasses,
  CONCRETE_TYPES,
} from './enclosures.js';
import type { ConcreteEnclosureType, TargetDegree } from './enclosures.js';

describe('scalePitchClasses', () => {
  it('returns C major scale pcs', () => {
    expect(scalePitchClasses(0, 'major')).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });

  it('wraps around octave for non-zero tonic', () => {
    expect(scalePitchClasses(2, 'major')).toEqual([2, 4, 6, 7, 9, 11, 1]);
  });
});

describe('resolveEnclosure', () => {
  it('diatonic upper for E in C major', () => {
    const notes = resolveEnclosure(4, 'diatonic-upper', 'C', 'major');
    expect(notes).toHaveLength(2);
    expect(notes[0]).toEqual({ name: 'F', pc: 5, role: 'approach' });
    expect(notes[1]).toEqual({ name: 'E', pc: 4, role: 'target' });
  });

  it('diatonic lower for E in C major', () => {
    const notes = resolveEnclosure(4, 'diatonic-lower', 'C', 'major');
    expect(notes).toHaveLength(2);
    expect(notes[0]).toEqual({ name: 'D', pc: 2, role: 'approach' });
    expect(notes[1]).toEqual({ name: 'E', pc: 4, role: 'target' });
  });

  it('chromatic upper for E in C major', () => {
    const notes = resolveEnclosure(4, 'chromatic-upper', 'C', 'major');
    expect(notes).toHaveLength(2);
    expect(notes[0]).toEqual({ name: 'F', pc: 5, role: 'approach' });
    expect(notes[1]).toEqual({ name: 'E', pc: 4, role: 'target' });
  });

  it('chromatic lower for E in C major', () => {
    const notes = resolveEnclosure(4, 'chromatic-lower', 'C', 'major');
    expect(notes).toHaveLength(2);
    expect(notes[0]).toEqual({ name: 'Eb', pc: 3, role: 'approach' });
    expect(notes[1]).toEqual({ name: 'E', pc: 4, role: 'target' });
  });

  it('full diatonic for E in C major', () => {
    const notes = resolveEnclosure(4, 'full-diatonic', 'C', 'major');
    expect(notes).toHaveLength(3);
    expect(notes[0]).toEqual({ name: 'F', pc: 5, role: 'approach' });
    expect(notes[1]).toEqual({ name: 'D', pc: 2, role: 'approach' });
    expect(notes[2]).toEqual({ name: 'E', pc: 4, role: 'target' });
  });

  it('full chromatic for E in C major', () => {
    const notes = resolveEnclosure(4, 'full-chromatic', 'C', 'major');
    expect(notes).toHaveLength(3);
    expect(notes[0]).toEqual({ name: 'F', pc: 5, role: 'approach' });
    expect(notes[1]).toEqual({ name: 'Eb', pc: 3, role: 'approach' });
    expect(notes[2]).toEqual({ name: 'E', pc: 4, role: 'target' });
  });

  it('diatonic upper + chromatic lower for E in C major', () => {
    const notes = resolveEnclosure(4, 'diatonic-upper-chromatic-lower', 'C', 'major');
    expect(notes).toHaveLength(3);
    expect(notes[0]).toEqual({ name: 'F', pc: 5, role: 'approach' });
    expect(notes[1]).toEqual({ name: 'Eb', pc: 3, role: 'approach' });
    expect(notes[2]).toEqual({ name: 'E', pc: 4, role: 'target' });
  });

  it('4-note bottom-up for C, D, E, F in C major', () => {
    expect(resolveEnclosure(0, 'four-note-bottom-up', 'C', 'major').map((n) => n.name)).toEqual([
      'D',
      'Db',
      'B',
      'C',
    ]);
    expect(resolveEnclosure(2, 'four-note-bottom-up', 'C', 'major').map((n) => n.name)).toEqual([
      'E',
      'Eb',
      'Db',
      'D',
    ]);
    expect(resolveEnclosure(4, 'four-note-bottom-up', 'C', 'major').map((n) => n.name)).toEqual([
      'F',
      'D',
      'Eb',
      'E',
    ]);
    expect(resolveEnclosure(5, 'four-note-bottom-up', 'C', 'major').map((n) => n.name)).toEqual([
      'G',
      'Gb',
      'E',
      'F',
    ]);
  });

  it('4-note top-down for C, B, A in C major', () => {
    expect(resolveEnclosure(0, 'four-note-top-down', 'C', 'major').map((n) => n.name)).toEqual([
      'B',
      'D',
      'Db',
      'C',
    ]);
    expect(resolveEnclosure(11, 'four-note-top-down', 'C', 'major').map((n) => n.name)).toEqual([
      'A',
      'Bb',
      'C',
      'B',
    ]);
    expect(resolveEnclosure(9, 'four-note-top-down', 'C', 'major').map((n) => n.name)).toEqual([
      'G',
      'Ab',
      'Bb',
      'A',
    ]);
  });

  it('uses flat spelling for flat keys', () => {
    const notes = resolveEnclosure(6, 'chromatic-lower', 'F', 'major');
    expect(notes[1]!.name).toBe('Gb');
  });

  it('uses sharp spelling for sharp keys', () => {
    const notes = resolveEnclosure(6, 'chromatic-lower', 'G', 'major');
    expect(notes[1]!.name).toBe('F#');
  });

  it('wraps chromatic lower across octave boundary', () => {
    const notes = resolveEnclosure(0, 'chromatic-lower', 'C', 'major');
    expect(notes[0]).toEqual({ name: 'B', pc: 11, role: 'approach' });
  });

  it('wraps chromatic upper across octave boundary', () => {
    const notes = resolveEnclosure(11, 'chromatic-upper', 'C', 'major');
    expect(notes[0]).toEqual({ name: 'C', pc: 0, role: 'approach' });
  });

  it('falls back to major scale when scaleType omitted', () => {
    const notes = resolveEnclosure(4, 'diatonic-upper', 'C');
    expect(notes[0]).toEqual({ name: 'F', pc: 5, role: 'approach' });
  });
});

describe('resolveChordTonePitchClass', () => {
  it.each<[string, TargetDegree, number]>([
    ['Cmaj7', 1, 0],
    ['Cmaj7', 2, 2],
    ['Cmaj7', 3, 4],
    ['Cmaj7', 4, 5],
    ['Cmaj7', 5, 7],
    ['Cmaj7', 6, 9],
    ['Cmaj7', 7, 11],
    ['Cmaj7', 8, 0],
    ['Cmaj7', 9, 2],
    ['Cmaj7', 10, 4],
    ['Cmaj7', 11, 5],
    ['Dm7', 1, 2],
    ['Dm7', 3, 5],
    ['Dm7', 5, 9],
    ['Dm7', 7, 0],
    ['G7', 1, 7],
    ['G7', 3, 11],
    ['G7', 5, 2],
    ['G7', 7, 5],
    ['Bdim7', 5, 5],
    ['Bm7b5', 5, 5],
    ['Bm7b5', 7, 9],
    ['C7', 9, 2],
    ['C7', 11, 5],
    ['Cmaj7#11', 11, 6],
    ['C7b9', 9, 1],
    ['C7#9', 9, 3],
  ])('%s degree %i → pc %i', (symbol, degree, expected) => {
    expect(resolveChordTonePitchClass(symbol, degree)).toBe(expected);
  });

  it('uses the provided scale type for diatonic degrees 2,4,6,8,9,10,11', () => {
    // D natural minor: D E F G A Bb C
    expect(resolveChordTonePitchClass('Dm7', 2, 'natural-minor')).toBe(4); // E
    expect(resolveChordTonePitchClass('Dm7', 4, 'natural-minor')).toBe(7); // G
    expect(resolveChordTonePitchClass('Dm7', 6, 'natural-minor')).toBe(10); // Bb
    expect(resolveChordTonePitchClass('Dm7', 9, 'natural-minor')).toBe(4); // E
  });

  it('throws on invalid chord', () => {
    expect(() => resolveChordTonePitchClass('XYZ', 1)).toThrow('Invalid chord symbol');
  });
});

describe('randomEnclosureType', () => {
  it('returns a valid concrete type', () => {
    const rng = () => 0.5;
    const type = randomEnclosureType(rng);
    expect(CONCRETE_TYPES).toContain(type);
  });

  it('cycles through all types deterministically', () => {
    let value = 0;
    const rng = () => {
      value = (value + 0.17) % 1;
      return value;
    };
    const seen = new Set<ConcreteEnclosureType>();
    for (let i = 0; i < 50; i++) {
      seen.add(randomEnclosureType(rng));
    }
    expect(seen.size).toBe(CONCRETE_TYPES.length);
  });
});
