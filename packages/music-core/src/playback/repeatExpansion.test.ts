import { describe, it, expect } from 'vitest';
import { expandRange, buildFlatSequence, buildChordTimelineEntries } from './repeatExpansion.js';
import { ChordTimeline } from '../audio/chordTimeline.js';
import { parseTimeSignature } from '../time/timeSignature.js';
import type { Bar, Section } from '@jazz/shared';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeBar(
  chords: string[],
  opts?: { repeatEnd?: { count: number | null }; id?: string },
): Bar {
  return {
    id: opts?.id ?? `b${chords[0] ?? 'x'}`,
    chords: chords.map((s) => ({ symbol: s })),
    repeatEnd: opts?.repeatEnd,
  };
}

function makeSection(bars: Bar[], id = 's1', name = 'A'): Section {
  return { id, name, timeSignature: '4/4', bars };
}

function chordName(
  c: { root: string; quality: string; extensions: string[] } | null,
): string | null {
  if (!c) return null;
  const q = c.quality === 'minor' ? 'm' : c.quality === 'dominant' ? '' : c.quality;
  const ext = c.extensions.length > 0 ? c.extensions.join('') : '';
  return `${c.root}${q}${ext}`;
}

const SIG_44 = parseTimeSignature('4/4');
const TP_BAR = 480 * 4;

// ─── expandRange ─────────────────────────────────────────────────────────────

describe('expandRange', () => {
  it('linear pass — no repeats', () => {
    const bars = [makeBar(['A']), makeBar(['B']), makeBar(['C'])];
    const result: number[] = [];
    expandRange(bars, 0, 2, 0, result);
    expect(result).toEqual([0, 1, 2]);
  });

  it('single repeat at end — repeats entire range', () => {
    const bars = [makeBar(['A']), makeBar(['B'], { repeatEnd: { count: 2 } })];
    const result: number[] = [];
    expandRange(bars, 0, 1, 0, result);
    expect(result).toEqual([0, 1, 0, 1]);
  });

  it('repeat in middle — Dm7 Am7(x2) Am7 D9 → [0,1,0,1,2,3]', () => {
    const bars = [
      makeBar(['Dm7']),
      makeBar(['Am7'], { repeatEnd: { count: 2 } }),
      makeBar(['Am7']),
      makeBar(['D9']),
    ];
    const result: number[] = [];
    expandRange(bars, 0, 3, 0, result);
    expect(result).toEqual([0, 1, 0, 1, 2, 3]);
  });

  it('repeat ×3', () => {
    const bars = [makeBar(['A']), makeBar(['B'], { repeatEnd: { count: 3 } })];
    const result: number[] = [];
    expandRange(bars, 0, 1, 0, result);
    expect(result).toEqual([0, 1, 0, 1, 0, 1]);
  });

  it('nested repeats: [A, B(×2), C, D(×2)]', () => {
    const bars = [
      makeBar(['A']),
      makeBar(['B'], { repeatEnd: { count: 2 } }),
      makeBar(['C']),
      makeBar(['D'], { repeatEnd: { count: 2 } }),
    ];
    const result: number[] = [];
    expandRange(bars, 0, 3, 0, result);
    expect(result).toEqual([0, 1, 0, 1, 2, 3, 0, 1, 0, 1, 2, 3]);
  });

  it('with globalOffset', () => {
    const bars = [makeBar(['A']), makeBar(['B'], { repeatEnd: { count: 2 } })];
    const result: number[] = [];
    expandRange(bars, 0, 1, 5, result);
    expect(result).toEqual([5, 6, 5, 6]);
  });

  it('empty range (from > to)', () => {
    const result: number[] = [];
    expandRange([], 3, 1, 0, result);
    expect(result).toEqual([]);
  });
});

// ─── buildFlatSequence ───────────────────────────────────────────────────────

describe('buildFlatSequence', () => {
  it('linear — no repeats', () => {
    const sections = [makeSection([makeBar(['A']), makeBar(['B']), makeBar(['C'])])];
    const seq = buildFlatSequence(sections);
    expect(seq.bars).toEqual([0, 1, 2]);
    expect(seq.infiniteLoopStart).toBeNull();
  });

  it('repeat in middle: Dm7 Am7(x2) Am7 D9', () => {
    const sections = [
      makeSection([
        makeBar(['Dm7'], { id: 'b0' }),
        makeBar(['Am7'], { id: 'b1', repeatEnd: { count: 2 } }),
        makeBar(['Am7'], { id: 'b2' }),
        makeBar(['D9'], { id: 'b3' }),
      ]),
    ];
    const seq = buildFlatSequence(sections);
    expect(seq.bars).toEqual([0, 1, 0, 1, 2, 3]);
    expect(seq.infiniteLoopStart).toBeNull();
  });

  it('infinite loop on last section with count:null', () => {
    const sections = [
      makeSection([makeBar(['A']), makeBar(['B']), makeBar(['C'], { repeatEnd: { count: null } })]),
    ];
    const seq = buildFlatSequence(sections);
    expect(seq.bars).toEqual([0, 1, 2]);
    expect(seq.infiniteLoopStart).toBe(0);
  });

  it('multiple sections', () => {
    const sections = [
      makeSection([makeBar(['A']), makeBar(['B'])], 's1', 'Verse'),
      makeSection([makeBar(['C']), makeBar(['D'], { repeatEnd: { count: 2 } })], 's2', 'Chorus'),
    ];
    const seq = buildFlatSequence(sections);
    expect(seq.bars).toEqual([0, 1, 2, 3, 2, 3]);
    expect(seq.infiniteLoopStart).toBeNull();
  });
});

// ─── buildChordTimelineEntries ───────────────────────────────────────────────

describe('buildChordTimelineEntries', () => {
  describe('repeat in middle — Dm7 Am7(x2) Am7 D9', () => {
    const sections = [
      makeSection([
        makeBar(['Dm7'], { id: 'b0' }),
        makeBar(['Am7'], { id: 'b1', repeatEnd: { count: 2 } }),
        makeBar(['Am7'], { id: 'b2' }),
        makeBar(['D9'], { id: 'b3' }),
      ]),
    ];
    const flatBars = [0, 1, 0, 1, 2, 3];
    const entries = buildChordTimelineEntries(sections, flatBars, '4/4');

    it('produces 6 entries (one per virtual bar)', () => {
      expect(entries).toHaveLength(6);
    });

    it('uses flatPos as barIndex (not grid index)', () => {
      expect(entries.map((e) => e.barIndex)).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it('resolves correct chord for each virtual bar via ChordTimeline', () => {
      const timeline = new ChordTimeline(entries);

      const names: (string | null)[] = [];
      for (let bar = 0; bar < 6; bar++) {
        const c = timeline.getChordAtTick(bar * TP_BAR, SIG_44);
        names.push(c ? chordName(c) : null);
      }

      // Dm7=root D,minor,ext[7]; Am7=root A,minor,ext[7]; D9=root D,dominant,ext[9]
      expect(names).toEqual(['Dm7', 'Am7', 'Dm7', 'Am7', 'Am7', 'D9']);
    });

    it('each virtual bar can be queried mid-beat correctly', () => {
      const timeline = new ChordTimeline(entries);
      const tpBeat = 480;

      // Virtual bar 2 (second repeat pass, should be Dm7)
      const c1 = timeline.getChordAtTick(2 * TP_BAR, SIG_44);
      expect(c1?.root).toBe('D');
      expect(c1?.quality).toBe('minor');
      expect(c1?.extensions).toContain('7');

      // Mid-beat of virtual bar 2 → still Dm7
      const c2 = timeline.getChordAtTick(2 * TP_BAR + tpBeat, SIG_44);
      expect(c2?.root).toBe('D');

      // Virtual bar 3 → Am7
      const c3 = timeline.getChordAtTick(3 * TP_BAR, SIG_44);
      expect(c3?.root).toBe('A');

      // Virtual bar 4 → Am7 (the one AFTER the repeat in the grid)
      const c4 = timeline.getChordAtTick(4 * TP_BAR, SIG_44);
      expect(c4?.root).toBe('A');
    });
  });

  describe('linear grid — no repeats', () => {
    const sections = [makeSection([makeBar(['Cmaj7']), makeBar(['Dm7']), makeBar(['G7'])])];
    const flatBars = [0, 1, 2];
    const entries = buildChordTimelineEntries(sections, flatBars, '4/4');

    it('produces correct barIndex sequence', () => {
      expect(entries.map((e) => e.barIndex)).toEqual([0, 1, 2]);
    });

    it('returns correct chords', () => {
      const timeline = new ChordTimeline(entries);
      expect(timeline.getChordAtTick(0, SIG_44)?.root).toBe('C');
      expect(timeline.getChordAtTick(1 * TP_BAR, SIG_44)?.root).toBe('D');
      expect(timeline.getChordAtTick(2 * TP_BAR, SIG_44)?.root).toBe('G');
    });
  });

  describe('empty bars', () => {
    it('produces null-chord entries for empty bars', () => {
      const sections = [
        makeSection([
          makeBar(['Cmaj7']),
          makeBar([]), // empty bar
          makeBar(['Dm7']),
        ]),
      ];
      const entries = buildChordTimelineEntries(sections, [0, 1, 2], '4/4');
      expect(entries).toHaveLength(3);
      expect(entries[0]!.chord).not.toBeNull();
      expect(entries[1]!.chord).toBeNull();
      expect(entries[2]!.chord).not.toBeNull();
    });
  });
});
