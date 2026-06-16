import { describe, it, expect } from 'vitest';
import { parseDegreeGrid } from './parseDegreeGrid.js';

describe('parseDegreeGrid', () => {
  it('splits bars on |', () => {
    const res = parseDegreeGrid('| I6 | IIm7 V7 | Imaj7 |');
    expect(res.ok).toBe(true);
    expect(res.value!.bars).toHaveLength(3);
    expect(res.value!.bars[1]!.slots.map((s) => s.symbol)).toEqual(['IIm7', 'V7']);
  });

  it('splits steps within a bar on whitespace or commas', () => {
    const res = parseDegreeGrid('IIm7, V7 | Imaj7');
    expect(res.value!.bars[0]!.slots).toHaveLength(2);
    expect(res.value!.bars[1]!.slots).toHaveLength(1);
  });

  it('assigns stable bar ids', () => {
    const res = parseDegreeGrid('I | IV | V');
    expect(res.value!.bars.map((b) => b.id)).toEqual(['b1', 'b2', 'b3']);
  });

  it('treats newlines as spaces (multiline input)', () => {
    const res = parseDegreeGrid('I6 |\n IIm7 V7 |\n Imaj7');
    expect(res.ok).toBe(true);
    expect(res.value!.bars).toHaveLength(3);
  });

  it('parses degree values, not absolute chords', () => {
    const res = parseDegreeGrid('| IIm7 | V7 |');
    expect(res.value!.bars[0]!.slots[0]).toMatchObject({ degree: 2, quality: 'm7' });
    expect(res.value!.bars[1]!.slots[0]).toMatchObject({ degree: 7, quality: '7' });
  });

  it('collects positioned errors without aborting', () => {
    const res = parseDegreeGrid('| IIm7 Xyz | V7 |');
    expect(res.ok).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.errors[0]!.token).toBe('Xyz');
  });
});
