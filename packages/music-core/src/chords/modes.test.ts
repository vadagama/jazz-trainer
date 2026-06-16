import { describe, it, expect } from 'vitest';
import {
  chordDegreeToScale,
  getChordQualitySuffix,
  scaleLabel,
  SCALE_INTERVALS,
  SCALE_TYPES,
} from './modes.js';

describe('chordDegreeToScale', () => {
  it('Imaj7 → major', () => {
    expect(chordDegreeToScale(0, 'maj7')).toBe('major');
  });

  it('iim7 → dorian', () => {
    expect(chordDegreeToScale(2, 'm7')).toBe('dorian');
  });

  it('iiim7 → phrygian', () => {
    expect(chordDegreeToScale(4, 'm7')).toBe('phrygian');
  });

  it('IVmaj7 → lydian', () => {
    expect(chordDegreeToScale(5, 'maj7')).toBe('lydian');
  });

  it('V7 → mixolydian', () => {
    expect(chordDegreeToScale(7, '7')).toBe('mixolydian');
  });

  it('vim7 → natural-minor', () => {
    expect(chordDegreeToScale(9, 'm7')).toBe('natural-minor');
  });

  it('viim7b5 → locrian', () => {
    expect(chordDegreeToScale(11, 'm7b5')).toBe('locrian');
  });

  it('V7b9 → harmonic-minor', () => {
    expect(chordDegreeToScale(7, '7b9')).toBe('harmonic-minor');
  });

  it('V7#9 → harmonic-minor', () => {
    expect(chordDegreeToScale(7, '7#9')).toBe('harmonic-minor');
  });

  it('V7b13 → harmonic-minor', () => {
    expect(chordDegreeToScale(7, '7b13')).toBe('harmonic-minor');
  });

  it('V7alt → harmonic-minor', () => {
    expect(chordDegreeToScale(7, '7alt')).toBe('harmonic-minor');
  });

  it('V9 → mixolydian (dominant family)', () => {
    expect(chordDegreeToScale(7, '9')).toBe('mixolydian');
  });

  it('V13 → mixolydian (dominant family)', () => {
    expect(chordDegreeToScale(7, '13')).toBe('mixolydian');
  });

  it('I7 → mixolydian (dominant on tonic, blues)', () => {
    expect(chordDegreeToScale(0, '7')).toBe('mixolydian');
  });

  it('unknown chord falls back to major', () => {
    expect(chordDegreeToScale(3, '???')).toBe('major');
  });

  it('degree is normalised to 0–11', () => {
    expect(chordDegreeToScale(14, 'm7')).toBe('dorian'); // 14 % 12 = 2
    expect(chordDegreeToScale(-10, 'm7')).toBe('dorian'); // (-10 % 12 + 12) % 12 = 2
  });
});

describe('getChordQualitySuffix', () => {
  it('extracts from simple chord', () => {
    expect(getChordQualitySuffix('Dm7')).toBe('m7');
  });

  it('extracts from chord with accidental root', () => {
    expect(getChordQualitySuffix('F#m7b5')).toBe('m7b5');
  });

  it('extracts from flat root', () => {
    expect(getChordQualitySuffix('Bbmaj7')).toBe('maj7');
  });

  it('extracts from dominant', () => {
    expect(getChordQualitySuffix('C7')).toBe('7');
  });

  it('extracts from altered dominant', () => {
    expect(getChordQualitySuffix('G7b9')).toBe('7b9');
  });

  it('extracts from slash chord', () => {
    expect(getChordQualitySuffix('Am7/C')).toBe('m7');
  });

  it('handles major triad (no suffix)', () => {
    expect(getChordQualitySuffix('C')).toBe('');
  });
});

describe('scaleLabel', () => {
  it('C major → C мажор', () => {
    expect(scaleLabel('C', 'major')).toBe('C мажор');
  });

  it('D dorian → D дорийский', () => {
    expect(scaleLabel('D', 'dorian')).toBe('D дорийский');
  });

  it('E phrygian → E фригийский', () => {
    expect(scaleLabel('E', 'phrygian')).toBe('E фригийский');
  });

  it('A natural-minor → A натуральный минор', () => {
    expect(scaleLabel('A', 'natural-minor')).toBe('A натуральный минор');
  });
});

describe('SCALE_INTERVALS', () => {
  it('covers all 9 scale types', () => {
    expect(Object.keys(SCALE_INTERVALS).sort()).toEqual([...SCALE_TYPES].sort());
  });

  it('all start with 0 (tonic)', () => {
    for (const [name, intervals] of Object.entries(SCALE_INTERVALS)) {
      expect(intervals[0], `scale ${name} should start with 0`).toBe(0);
    }
  });

  it('all have 7 notes', () => {
    for (const intervals of Object.values(SCALE_INTERVALS)) {
      expect(intervals).toHaveLength(7);
    }
  });
});
