import { describe, it, expect } from 'vitest';
import { GridContentSchema } from '@jazz/shared';
import { generate, listPatterns } from './generate.js';

function symbols(content: ReturnType<typeof generate>): string[] {
  return content.bars.map((b) => b.chords.map((c) => c.symbol).join(' '));
}

describe('generate — fixed patterns and transposition', () => {
  it('ii–V–I major in C → Dm7 G7 Cmaj7 Cmaj7 (tonic two bars)', () => {
    expect(symbols(generate({ patternId: 'ii-V-I-major', key: 'C' }))).toEqual([
      'Dm7',
      'G7',
      'Cmaj7',
      'Cmaj7',
    ]);
  });

  it('ii–V–I major in F → Gm7 C7 Fmaj7 Fmaj7', () => {
    expect(symbols(generate({ patternId: 'ii-V-I-major', key: 'F' }))).toEqual([
      'Gm7',
      'C7',
      'Fmaj7',
      'Fmaj7',
    ]);
  });

  it('ii–V–I major in Eb uses flat spelling → Fm7 Bb7 Ebmaj7 Ebmaj7', () => {
    expect(symbols(generate({ patternId: 'ii-V-I-major', key: 'Eb' }))).toEqual([
      'Fm7',
      'Bb7',
      'Ebmaj7',
      'Ebmaj7',
    ]);
  });

  it('ii–V–i minor in C → Dm7b5 G7b9 Cm7 Cm7 (tonic two bars)', () => {
    expect(symbols(generate({ patternId: 'ii-V-I-minor', key: 'C' }))).toEqual([
      'Dm7b5',
      'G7b9',
      'Cm7',
      'Cm7',
    ]);
  });

  it('turnaround in C → Cmaj7 Am7 Dm7 G7', () => {
    expect(symbols(generate({ patternId: 'turnaround', key: 'C' }))).toEqual([
      'Cmaj7',
      'Am7',
      'Dm7',
      'G7',
    ]);
  });

  it('dominant chain in C → E7 A7 D7 G7', () => {
    expect(symbols(generate({ patternId: 'dominant-chain', key: 'C' }))).toEqual([
      'E7',
      'A7',
      'D7',
      'G7',
    ]);
  });

  it('modal vamp in C → Cm7 F7 Cm7 F7', () => {
    expect(symbols(generate({ patternId: 'modal-vamp', key: 'C' }))).toEqual([
      'Cm7',
      'F7',
      'Cm7',
      'F7',
    ]);
  });
});

describe('generate — length and structure', () => {
  it('tiles a fixed pattern to the requested length', () => {
    const content = generate({ patternId: 'ii-V-I-major', key: 'C', lengthBars: 6 });
    expect(content.bars).toHaveLength(6);
    expect(symbols(content)).toEqual(['Dm7', 'G7', 'Cmaj7', 'Cmaj7', 'Dm7', 'G7']);
  });

  it('circle of fifths produces N dominant chords', () => {
    const content = generate({ patternId: 'circle-of-fifths', key: 'C', lengthBars: 8 });
    expect(content.bars).toHaveLength(8);
    for (const bar of content.bars) {
      expect(bar.chords[0]!.parsed?.quality).toBe('dominant');
    }
  });

  it('every generated grid validates against GridContentSchema', () => {
    for (const p of listPatterns()) {
      const res = GridContentSchema.safeParse(generate({ patternId: p.id, key: 'Bb' }));
      expect(res.success, `pattern ${p.id} should produce valid content`).toBe(true);
    }
  });

  it('throws on an unknown pattern', () => {
    expect(() => generate({ patternId: 'nope', key: 'C' })).toThrow(/Unknown pattern/);
  });
});

describe('generate — random diatonic determinism', () => {
  it('is deterministic for a given seed', () => {
    const a = generate({ patternId: 'random-diatonic', key: 'C', options: { seed: 42 } });
    const b = generate({ patternId: 'random-diatonic', key: 'C', options: { seed: 42 } });
    expect(symbols(a)).toEqual(symbols(b));
    expect(a.bars).toHaveLength(8);
  });

  it('produces different output for different seeds', () => {
    const a = generate({
      patternId: 'random-diatonic',
      key: 'C',
      lengthBars: 16,
      options: { seed: 1 },
    });
    const b = generate({
      patternId: 'random-diatonic',
      key: 'C',
      lengthBars: 16,
      options: { seed: 2 },
    });
    expect(symbols(a)).not.toEqual(symbols(b));
  });
});

describe('listPatterns', () => {
  it('lists the ten built-in patterns', () => {
    const ids = listPatterns().map((p) => p.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'ii-V-I-major',
        'ii-V-I-minor',
        'circle-of-fifths',
        'rhythm-changes-a',
        'modal-vamp',
        'dominant-chain',
        'random-diatonic',
        'diatonic',
        'chromatic',
        'turnaround',
      ]),
    );
    expect(ids).toHaveLength(10);
  });
});
