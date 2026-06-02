import { describe, it, expect } from 'vitest';
import { parseGrid } from './parseGrid.js';

function symbols(dsl: string): string[][] {
  const res = parseGrid(dsl);
  return res.value!.bars.map((b) => b.chords.map((c) => c.symbol));
}

describe('parseGrid — separators and bars', () => {
  it('splits bars on |', () => {
    expect(symbols('Dm7 | G7 | Cmaj7')).toEqual([['Dm7'], ['G7'], ['Cmaj7']]);
  });

  it('splits chords within a bar on space or comma', () => {
    expect(symbols('Cmaj7 A7 | Dm7')).toEqual([['Cmaj7', 'A7'], ['Dm7']]);
    expect(symbols('Cmaj7, A7 | Dm7')).toEqual([['Cmaj7', 'A7'], ['Dm7']]);
  });

  it('treats a trailing || terminator as the end (no extra bar)', () => {
    expect(symbols('Dm7 | G7 ||')).toEqual([['Dm7'], ['G7']]);
  });

  it('keeps an internal empty bar', () => {
    expect(symbols('C | | G')).toEqual([['C'], [], ['G']]);
  });

  it('treats newlines as spaces (multiline)', () => {
    expect(symbols('Dm7 | G7\nCmaj7 | A7')).toEqual([['Dm7'], ['G7', 'Cmaj7'], ['A7']]);
  });

  it('assigns stable bar ids and version', () => {
    const res = parseGrid('Dm7 | G7');
    expect(res.value!.version).toBe(1);
    expect(res.value!.bars.map((b) => b.id)).toEqual(['b1', 'b2']);
  });

  it('caches the parsed chord on each slot', () => {
    const res = parseGrid('Dm7');
    expect(res.value!.bars[0]!.chords[0]!.parsed).toMatchObject({
      root: 'D',
      quality: 'minor',
    });
  });
});

describe('parseGrid — errors', () => {
  it('collects multiple positioned errors without aborting the form', () => {
    const res = parseGrid('H7 | Xm7 | C7');
    expect(res.ok).toBe(false);
    expect(res.errors).toHaveLength(2);
    expect(res.value!.bars).toHaveLength(3);
    for (const err of res.errors) {
      expect(typeof err.position).toBe('number');
      expect(err.position).toBeGreaterThanOrEqual(0);
    }
  });

  it('points the error at the offending token offset', () => {
    const res = parseGrid('Dm7 | H7');
    expect(res.ok).toBe(false);
    // "H7" begins at index 6 in the source string
    expect(res.errors[0]?.position).toBe(6);
  });
});
