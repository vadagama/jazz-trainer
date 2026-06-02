import { describe, it, expect } from 'vitest';
import { GridContentSchema, ChordSymbolSchema } from './music.js';

describe('GridContentSchema', () => {
  it('accepts a valid grid content', () => {
    const ok = GridContentSchema.safeParse({
      version: 1,
      bars: [
        { id: 'b1', chords: [{ symbol: 'Dm7' }] },
        { id: 'b2', chords: [{ symbol: 'Cmaj7', beats: 2 }, { symbol: 'A7', beats: 2 }] },
      ],
    });
    expect(ok.success).toBe(true);
  });

  it('rejects an unknown content version', () => {
    const res = GridContentSchema.safeParse({ version: 2, bars: [] });
    expect(res.success).toBe(false);
  });

  it('rejects an empty chord symbol', () => {
    const res = GridContentSchema.safeParse({
      version: 1,
      bars: [{ id: 'b1', chords: [{ symbol: '' }] }],
    });
    expect(res.success).toBe(false);
  });
});

describe('ChordSymbolSchema', () => {
  it('validates a parsed chord structure', () => {
    const res = ChordSymbolSchema.safeParse({
      raw: 'Dm7',
      root: 'D',
      rootAccidental: '',
      quality: 'minor',
      extensions: ['7'],
      alterations: [],
      alt: false,
      bass: null,
    });
    expect(res.success).toBe(true);
  });
});
