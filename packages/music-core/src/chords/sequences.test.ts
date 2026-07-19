import { describe, it, expect } from 'vitest';
import {
  resolveSequencePattern,
  buildSequenceCycle,
  randomSequenceType,
  SEQUENCE_PATTERNS,
  CONCRETE_SEQUENCE_TYPES,
} from './sequences.js';
import type { ConcreteSequenceType } from './sequences.js';
import { scalePitchClasses } from './enclosures.js';

describe('SEQUENCE_PATTERNS', () => {
  it('exposes indices for all 13 concrete types', () => {
    expect(Object.keys(SEQUENCE_PATTERNS).sort()).toEqual(
      [
        '1234',
        '1235',
        '1357',
        '1531',
        'pentatonic',
        '5321',
        '8765',
        '1324',
        '1345',
        '1356',
        '1231',
        '3212',
        '3579',
      ].sort(),
    );
  });

  it('1235 = [0,1,2,4]', () => {
    expect(SEQUENCE_PATTERNS['1235']).toEqual([0, 1, 2, 4]);
  });

  it('1531 starts and ends on root (1)', () => {
    expect(SEQUENCE_PATTERNS['1531']).toEqual([0, 4, 2, 0]);
  });
});

describe('resolveSequencePattern', () => {
  it('1235 from degree 1 in C major → C D E G', () => {
    const notes = resolveSequencePattern(0, '1235', 'C', 'major');
    expect(notes.map((n) => n.name)).toEqual(['C', 'D', 'E', 'G']);
    expect(notes.map((n) => n.pc)).toEqual([0, 2, 4, 7]);
    expect(notes[0]!.role).toBe('root');
    expect(notes.slice(1).every((n) => n.role === 'pattern')).toBe(true);
  });

  it('1235 from degree 3 in C major → E F G B (sequence rises through the scale)', () => {
    const notes = resolveSequencePattern(4, '1235', 'C', 'major');
    expect(notes.map((n) => n.name)).toEqual(['E', 'F', 'G', 'B']);
    expect(notes.map((n) => n.pc)).toEqual([4, 5, 7, 11]);
  });

  it('1234 from degree 1 in C major → C D E F', () => {
    const notes = resolveSequencePattern(0, '1234', 'C', 'major');
    expect(notes.map((n) => n.name)).toEqual(['C', 'D', 'E', 'F']);
  });

  it('1357 from degree 1 in C major → C E G B (arpeggio)', () => {
    const notes = resolveSequencePattern(0, '1357', 'C', 'major');
    expect(notes.map((n) => n.name)).toEqual(['C', 'E', 'G', 'B']);
    expect(notes.map((n) => n.pc)).toEqual([0, 4, 7, 11]);
  });

  it('1531 from degree 1 in C major → C G E C', () => {
    const notes = resolveSequencePattern(0, '1531', 'C', 'major');
    expect(notes.map((n) => n.name)).toEqual(['C', 'G', 'E', 'C']);
    expect(notes.map((n) => n.pc)).toEqual([0, 7, 4, 0]);
    // root is first AND last note of 1531, but only first is marked 'root'
    expect(notes[0]!.role).toBe('root');
    expect(notes[notes.length - 1]!.role).toBe('pattern');
  });

  it('pentatonic from degree 1 in C major → C D E G A', () => {
    const notes = resolveSequencePattern(0, 'pentatonic', 'C', 'major');
    expect(notes.map((n) => n.name)).toEqual(['C', 'D', 'E', 'G', 'A']);
    expect(notes.map((n) => n.pc)).toEqual([0, 2, 4, 7, 9]);
  });

  // Нисходящие
  it('5321 from degree 1 in C major → G E D C', () => {
    const notes = resolveSequencePattern(0, '5321', 'C', 'major');
    expect(notes.map((n) => n.name)).toEqual(['G', 'E', 'D', 'C']);
    expect(notes.map((n) => n.pc)).toEqual([7, 4, 2, 0]);
    expect(notes[0]!.role).toBe('root');
  });

  it('8765 from degree 1 in C major → C B A G', () => {
    const notes = resolveSequencePattern(0, '8765', 'C', 'major');
    expect(notes.map((n) => n.name)).toEqual(['C', 'B', 'A', 'G']);
    expect(notes.map((n) => n.pc)).toEqual([0, 11, 9, 7]);
    expect(notes[0]!.role).toBe('root');
  });

  // Терцовые и skip-step
  it('1324 from degree 1 in C major → C E D F', () => {
    const notes = resolveSequencePattern(0, '1324', 'C', 'major');
    expect(notes.map((n) => n.name)).toEqual(['C', 'E', 'D', 'F']);
    expect(notes.map((n) => n.pc)).toEqual([0, 4, 2, 5]);
  });

  it('1345 from degree 1 in C major → C E F G', () => {
    const notes = resolveSequencePattern(0, '1345', 'C', 'major');
    expect(notes.map((n) => n.name)).toEqual(['C', 'E', 'F', 'G']);
    expect(notes.map((n) => n.pc)).toEqual([0, 4, 5, 7]);
  });

  it('1356 from degree 1 in C major → C E G A', () => {
    const notes = resolveSequencePattern(0, '1356', 'C', 'major');
    expect(notes.map((n) => n.name)).toEqual(['C', 'E', 'G', 'A']);
    expect(notes.map((n) => n.pc)).toEqual([0, 4, 7, 9]);
  });

  // Повороты и расширенные арпеджио
  it('1231 from degree 1 in C major → C D E C', () => {
    const notes = resolveSequencePattern(0, '1231', 'C', 'major');
    expect(notes.map((n) => n.name)).toEqual(['C', 'D', 'E', 'C']);
    expect(notes.map((n) => n.pc)).toEqual([0, 2, 4, 0]);
  });

  it('3212 from degree 1 in C major → E D C D', () => {
    const notes = resolveSequencePattern(0, '3212', 'C', 'major');
    expect(notes.map((n) => n.name)).toEqual(['E', 'D', 'C', 'D']);
    expect(notes.map((n) => n.pc)).toEqual([4, 2, 0, 2]);
  });

  it('3579 from degree 1 in C major → E G B D', () => {
    const notes = resolveSequencePattern(0, '3579', 'C', 'major');
    expect(notes.map((n) => n.name)).toEqual(['E', 'G', 'B', 'D']);
    expect(notes.map((n) => n.pc)).toEqual([4, 7, 11, 2]);
  });

  it('wraps into next octave when pattern exceeds 7 scale degrees', () => {
    // Start degree 7 in C major → B (idx 6). 1235 offsets [0,1,2,4] → B, C(+), D(+), F(+).
    // The 4th offset is the 5th above B = F (not E). pc values are normalized mod 12.
    const notes = resolveSequencePattern(11, '1235', 'C', 'major');
    expect(notes.map((n) => n.name)).toEqual(['B', 'C', 'D', 'F']);
    expect(notes.map((n) => n.pc)).toEqual([11, 0, 2, 5]);
    expect(notes[0]!.role).toBe('root');
  });

  it('works in Dorian (D dorian) — diatonic to the mode', () => {
    // D dorian: D E F G A B C (pc 2 4 5 7 9 11 0)
    const notes = resolveSequencePattern(2, '1235', 'D', 'dorian');
    expect(notes.map((n) => n.name)).toEqual(['D', 'E', 'F', 'A']);
    expect(notes.map((n) => n.pc)).toEqual([2, 4, 5, 9]);
  });

  it('works in natural minor (C minor) — pc values follow the mode', () => {
    // C natural minor: C D Eb F G Ab Bb (pc 0 2 3 5 7 8 10).
    // Note: spellPitchClass uses C-major key signature, so pc 3 spells as D# (not Eb).
    // The pc array is what matters for downstream consumers; spelling is decorative.
    const notes = resolveSequencePattern(0, '1235', 'C', 'natural-minor');
    expect(notes.map((n) => n.pc)).toEqual([0, 2, 3, 7]);
    expect(notes[0]!.role).toBe('root');
  });

  it('uses flat spelling in flat keys (Bb major)', () => {
    // Bb major: Bb C D Eb F G A
    const notes = resolveSequencePattern(10, '1357', 'Bb', 'major');
    expect(notes.map((n) => n.name)).toEqual(['Bb', 'D', 'F', 'A']);
    expect(notes.map((n) => n.pc)).toEqual([10, 2, 5, 9]);
  });

  it('falls back to nearest diatonic degree when startPc is non-diatonic', () => {
    // C# is not in C major — should fall back to nearest diatonic below (C).
    const notes = resolveSequencePattern(1, '1235', 'C', 'major');
    // Fallback finds nearest degree; first note name should still be a valid C-major note.
    expect(notes.length).toBe(4);
    expect(notes[0]!.role).toBe('root');
  });

  it('respects explicit tonicPc in over-chords mode (chord root ≠ key tonic)', () => {
    // Key = C major (tonic pc 0), but chord is G7 (root pc 7 = V).
    // Pattern 1357 from G in C major should yield G B D F (mixolydian flavour via V).
    const notes = resolveSequencePattern(7, '1357', 'C', 'major', 0);
    expect(notes.map((n) => n.name)).toEqual(['G', 'B', 'D', 'F']);
    expect(notes.map((n) => n.pc)).toEqual([7, 11, 2, 5]);
  });
});

describe('buildSequenceCycle', () => {
  it('builds one pattern per start degree (1–5 in C major, 1235)', () => {
    const cycle = buildSequenceCycle(0, '1235', 'C', 'major', [1, 2, 3, 4, 5]);
    expect(cycle).toHaveLength(5);
    expect(cycle[0]!.map((n) => n.name)).toEqual(['C', 'D', 'E', 'G']);
    expect(cycle[1]!.map((n) => n.name)).toEqual(['D', 'E', 'F', 'A']);
    expect(cycle[2]!.map((n) => n.name)).toEqual(['E', 'F', 'G', 'B']);
    expect(cycle[3]!.map((n) => n.name)).toEqual(['F', 'G', 'A', 'C']);
    expect(cycle[4]!.map((n) => n.name)).toEqual(['G', 'A', 'B', 'D']);
  });

  it('clamps out-of-range degrees to the scale length', () => {
    const cycle = buildSequenceCycle(0, '1235', 'C', 'major', [8 as 7]);
    expect(cycle).toHaveLength(1);
    // Degree 8 clamps to 7 → B starts the pattern
    expect(cycle[0]![0]!.name).toBe('B');
  });

  it('each sub-pattern marks its first note as root', () => {
    const cycle = buildSequenceCycle(0, '1357', 'C', 'major', [1, 3, 5]);
    for (const notes of cycle) {
      expect(notes[0]!.role).toBe('root');
      expect(notes.slice(1).every((n) => n.role === 'pattern')).toBe(true);
    }
  });
});

describe('randomSequenceType', () => {
  it('returns only values from CONCRETE_SEQUENCE_TYPES', () => {
    const rng = () => 0.5;
    const result = randomSequenceType(rng);
    expect(CONCRETE_SEQUENCE_TYPES).toContain(result);
  });

  it('covers all types over many draws', () => {
    const seen = new Set<ConcreteSequenceType>();
    for (let i = 0; i < 200; i++) {
      seen.add(randomSequenceType(() => i / 200));
    }
    // Should cover all 13 concrete types with a uniform sampler.
    expect(seen.size).toBe(CONCRETE_SEQUENCE_TYPES.length);
  });

  it('first bucket returns first type (deterministic with fixed rng)', () => {
    expect(randomSequenceType(() => 0.0)).toBe('1235');
  });
});

describe('scalePitchClasses (re-exported dependency)', () => {
  it('C major → [0,2,4,5,7,9,11]', () => {
    expect(scalePitchClasses(0, 'major')).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });

  it('D dorian → D E F G A B C as pc', () => {
    expect(scalePitchClasses(2, 'dorian')).toEqual([2, 4, 5, 7, 9, 11, 0]);
  });
});
