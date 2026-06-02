import { describe, it, expect } from 'vitest';
import { parseChord } from './parseChord.js';

describe('parseChord — base symbols (docs/06-dsl.md §3)', () => {
  const cases: Array<[string, Partial<ReturnType<typeof parseChord>['value']> & object]> = [
    ['C', { quality: 'major', extensions: [], alterations: [] }],
    ['Cmaj7', { quality: 'major', extensions: ['7'] }],
    ['Cm', { quality: 'minor', extensions: [] }],
    ['Cm7', { quality: 'minor', extensions: ['7'] }],
    ['C7', { quality: 'dominant', extensions: ['7'] }],
    ['Cm7b5', { quality: 'halfDiminished', extensions: ['7'], alterations: ['b5'] }],
    ['Cdim', { quality: 'diminished', extensions: [] }],
    ['Cdim7', { quality: 'diminished', extensions: ['7'] }],
    ['Caug', { quality: 'augmented' }],
    ['Csus', { quality: 'suspended', sus: 'sus4' }],
    ['Csus2', { quality: 'suspended', sus: 'sus2' }],
    ['C7b5', { quality: 'dominant', extensions: ['7'], alterations: ['b5'] }],
    ['C7#5', { quality: 'dominant', extensions: ['7'], alterations: ['#5'] }],
    ['C7b9', { quality: 'dominant', extensions: ['7'], alterations: ['b9'] }],
    ['C9', { quality: 'dominant', extensions: ['9'] }],
    ['C11', { quality: 'dominant', extensions: ['11'] }],
    ['C13', { quality: 'dominant', extensions: ['13'] }],
  ];

  it.each(cases)('parses %s', (text, expected) => {
    const res = parseChord(text);
    expect(res.ok).toBe(true);
    expect(res.value).toMatchObject(expected);
  });

  it('parses altered dominant (Calt / C7alt) as dominant with alt flag', () => {
    expect(parseChord('Calt').value).toMatchObject({ quality: 'dominant', alt: true });
    expect(parseChord('C7alt').value).toMatchObject({ quality: 'dominant', alt: true });
  });

  it('parses root accidentals', () => {
    expect(parseChord('Bb7').value).toMatchObject({ root: 'B', rootAccidental: 'b' });
    expect(parseChord('F#m7').value).toMatchObject({ root: 'F', rootAccidental: '#' });
  });
});

describe('parseChord — slash chords', () => {
  it('parses bass note', () => {
    const res = parseChord('C/E');
    expect(res.ok).toBe(true);
    expect(res.value).toMatchObject({ root: 'C', quality: 'major', bass: { note: 'E' } });
  });

  it('parses bass with accidental over a quality', () => {
    expect(parseChord('Dm7/G').value).toMatchObject({
      root: 'D',
      quality: 'minor',
      bass: { note: 'G', accidental: '' },
    });
    expect(parseChord('F/Bb').value?.bass).toMatchObject({ note: 'B', accidental: 'b' });
  });
});

describe('parseChord — combinations', () => {
  it('Dm9 → minor 9', () => {
    expect(parseChord('Dm9').value).toMatchObject({ quality: 'minor', extensions: ['9'] });
  });
  it('G13b9 → dominant 13 b9', () => {
    expect(parseChord('G13b9').value).toMatchObject({
      quality: 'dominant',
      extensions: ['13'],
      alterations: ['b9'],
    });
  });
  it('Am7b5 → half-diminished', () => {
    expect(parseChord('Am7b5').value).toMatchObject({ quality: 'halfDiminished' });
  });
});

describe('parseChord — synonyms', () => {
  it.each([
    ['C-7', 'minor'],
    ['Cmin7', 'minor'],
    ['C-', 'minor'],
    ['CΔ', 'major'],
    ['Cø', 'halfDiminished'],
    ['C°', 'diminished'],
    ['C°7', 'diminished'],
    ['C+', 'augmented'],
  ])('%s → %s', (text, quality) => {
    expect(parseChord(text).value?.quality).toBe(quality);
  });

  it('CΔ implies a major 7th', () => {
    expect(parseChord('CΔ').value).toMatchObject({ quality: 'major', extensions: ['7'] });
  });
});

describe('parseChord — invalid input', () => {
  it('rejects empty input', () => {
    const res = parseChord('   ');
    expect(res.ok).toBe(false);
    expect(res.errors[0]?.position).toBe(0);
  });

  it('rejects an invalid root with a position', () => {
    const res = parseChord('H7');
    expect(res.ok).toBe(false);
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0]?.position).toBe(0);
  });

  it('flags an unrecognized suffix but keeps a best-effort value', () => {
    const res = parseChord('C7xyz');
    expect(res.ok).toBe(false);
    expect(res.errors[0]?.message).toMatch(/Unrecognized/);
    expect(res.errors[0]?.position).toBeGreaterThan(0);
  });
});
