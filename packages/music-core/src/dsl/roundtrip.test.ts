import { describe, it, expect } from 'vitest';
import { parseGrid } from './parseGrid.js';
import { serializeGrid } from './serializeGrid.js';

const STANDARDS: Record<string, string> = {
  'ii-V-I in C': 'Dm7 | G7 | Cmaj7 | Cmaj7',
  'blues in F': 'F7 | Bb7 | F7 | F7 | Bb7 | Bb7 | F7 | F7 | C7 | Bb7 | F7 | C7',
  'rhythm changes A': 'Bb | G7 | Cm7 | F7 | Dm7 | G7 | Cm7 | F7',
};

describe('DSL round-trip (parse → serialize → parse)', () => {
  it.each(Object.entries(STANDARDS))('is stable for %s', (_name, dsl) => {
    const first = serializeGrid(parseGrid(dsl).value!);
    const second = serializeGrid(parseGrid(first).value!);
    expect(second).toBe(first);
  });

  it('preserves the bar/chord structure through a round-trip', () => {
    const dsl = STANDARDS['blues in F']!;
    const before = parseGrid(dsl).value!;
    const after = parseGrid(serializeGrid(before)).value!;
    expect(after.bars.map((b) => b.chords.map((c) => c.symbol))).toEqual(
      before.bars.map((b) => b.chords.map((c) => c.symbol)),
    );
  });

  it('normalizes synonyms on serialize', () => {
    expect(serializeGrid(parseGrid('C-7 | CΔ | Cø').value!)).toBe('Cm7 | Cmaj7 | Cm7b5 ||');
  });
});
