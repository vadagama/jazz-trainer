import { describe, it, expect } from 'vitest';
import { parseDegree } from './parseDegree.js';

describe('parseDegree — diatonic degrees', () => {
  const cases: Array<[string, number, string]> = [
    ['I', 0, ''],
    ['II', 2, ''],
    ['III', 4, ''],
    ['IV', 5, ''],
    ['V', 7, ''],
    ['VI', 9, ''],
    ['VII', 11, ''],
    ['I6', 0, '6'],
    ['IIm7', 2, 'm7'],
    ['V7', 7, '7'],
    ['Imaj7', 0, 'maj7'],
    ['VIIm7b5', 11, 'm7b5'],
    ['V7b9', 7, '7b9'],
  ];

  it.each(cases)('parses %s', (text, degree, quality) => {
    const res = parseDegree(text);
    expect(res.ok).toBe(true);
    expect(res.value).toMatchObject({ degree, quality });
  });

  it('is case-insensitive on the Roman numeral', () => {
    expect(parseDegree('iim7').value).toMatchObject({ degree: 2, quality: 'm7' });
    expect(parseDegree('v7').value).toMatchObject({ degree: 7, quality: '7' });
    // quality case is preserved (m7 ≠ M7)
    expect(parseDegree('iM7').value).toMatchObject({ degree: 0, quality: 'M7' });
  });
});

describe('parseDegree — chromatic alterations', () => {
  it('flattens with b / ♭', () => {
    expect(parseDegree('bII').value).toMatchObject({ degree: 1 });
    expect(parseDegree('♭VImaj7').value).toMatchObject({ degree: 8, quality: 'maj7' });
  });
  it('sharpens with # / ♯', () => {
    expect(parseDegree('#IVm7b5').value).toMatchObject({ degree: 6, quality: 'm7b5' });
    expect(parseDegree('♯I').value).toMatchObject({ degree: 1 });
  });
  it('wraps around the octave', () => {
    expect(parseDegree('bI').value).toMatchObject({ degree: 11 });
  });
});

describe('parseDegree — secondary dominants', () => {
  it('V7/V → dominant on the 2nd degree', () => {
    expect(parseDegree('V7/V').value).toMatchObject({ degree: 2, quality: '7' });
  });
  it('ii/IV → minor on the 7th degree', () => {
    expect(parseDegree('ii/IV').value).toMatchObject({ degree: 7, quality: '' });
  });
  it('V7/ii → dominant a fifth above the 2nd degree', () => {
    // V (7) relative to ii (2) → (7 + 2) % 12 = 9
    expect(parseDegree('V7/ii').value).toMatchObject({ degree: 9, quality: '7' });
  });
});

describe('parseDegree — errors', () => {
  it('rejects a non-Roman token', () => {
    const res = parseDegree('Xyz');
    expect(res.ok).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
  });
  it('rejects an absolute chord (Bm7 is not a degree)', () => {
    expect(parseDegree('Bm7').ok).toBe(false);
  });
  it('rejects an unknown quality suffix', () => {
    const res = parseDegree('IIzzz');
    expect(res.ok).toBe(false);
  });
  it('rejects an empty token', () => {
    expect(parseDegree('').ok).toBe(false);
  });
  it('rejects an invalid secondary-dominant target', () => {
    expect(parseDegree('V7/X').ok).toBe(false);
  });
});
