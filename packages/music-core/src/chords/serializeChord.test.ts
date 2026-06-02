import { describe, it, expect } from 'vitest';
import { parseChord } from './parseChord.js';
import { serializeChord } from './serializeChord.js';

function round(text: string): string {
  const res = parseChord(text);
  if (!res.value) throw new Error(`failed to parse ${text}`);
  return serializeChord(res.value);
}

describe('serializeChord — canonical output', () => {
  it.each([
    ['C', 'C'],
    ['Cmaj7', 'Cmaj7'],
    ['Cm', 'Cm'],
    ['Cm7', 'Cm7'],
    ['C7', 'C7'],
    ['Cm7b5', 'Cm7b5'],
    ['Cdim', 'Cdim'],
    ['Cdim7', 'Cdim7'],
    ['Caug', 'Caug'],
    ['C7b9', 'C7b9'],
    ['Dm9', 'Dm9'],
    ['G13b9', 'G13b9'],
    ['C/E', 'C/E'],
    ['Bb7', 'Bb7'],
  ])('serializes %s → %s', (input, expected) => {
    expect(round(input)).toBe(expected);
  });

  it('normalizes synonyms to canonical spelling', () => {
    expect(round('C-7')).toBe('Cm7');
    expect(round('Cmin7')).toBe('Cm7');
    expect(round('Cø')).toBe('Cm7b5');
    expect(round('C+')).toBe('Caug');
    expect(round('CΔ')).toBe('Cmaj7');
  });

  it('serializes altered dominant with an explicit 7', () => {
    expect(round('Calt')).toBe('C7alt');
    expect(round('C7alt')).toBe('C7alt');
  });

  it('is idempotent on its own output', () => {
    for (const sym of ['Cm7b5', 'G13b9', 'F#m7', 'Dm7/G', 'Csus4']) {
      const once = round(sym);
      expect(round(once)).toBe(once);
    }
  });
});
