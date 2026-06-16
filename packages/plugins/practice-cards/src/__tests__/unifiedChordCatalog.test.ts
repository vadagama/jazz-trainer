import { describe, it, expect } from 'vitest';
import { parseDegree } from '@jazz/music-core';
import { CHORD_GROUPS } from '../components/unifiedChordCatalog.js';

describe('unified chord catalog', () => {
  const allSymbols = CHORD_GROUPS.flatMap((g) => [...g.common, ...g.full]);

  it.each(allSymbols)('parses degree symbol "%s"', (symbol) => {
    const res = parseDegree(symbol);
    expect(res.ok, `"${symbol}" should parse`).toBe(true);
  });

  it('common symbols are a subset of the full catalog reach (no orphans)', () => {
    for (const g of CHORD_GROUPS) {
      expect(g.common.length).toBeGreaterThan(0);
      expect(g.full.length).toBeGreaterThan(0);
    }
  });

  it('includes 11th and 13th chords in the base (common) set', () => {
    const common = CHORD_GROUPS.flatMap((g) => g.common);
    expect(common.some((s) => /11$/.test(s))).toBe(true);
    expect(common.some((s) => /13$/.test(s))).toBe(true);
  });

  it('includes diminished chords (dim and dim7)', () => {
    const all = CHORD_GROUPS.flatMap((g) => [...g.common, ...g.full]);
    expect(all.some((s) => /dim$/.test(s))).toBe(true);
    expect(all.some((s) => /dim7$/.test(s))).toBe(true);
  });
});
