import { describe, it, expect } from 'vitest';
import { ChordTimeline, type ChordTimelineEntry } from './chordTimeline.js';
import { parseTimeSignature } from '../time/timeSignature.js';
import type { ChordSymbol, NoteName, ChordQuality } from '@jazz/shared';

// Helper: build a minimal ChordSymbol for testing
function chord(root: string, quality = 'minor'): ChordSymbol {
  const step = root[0]! as NoteName;
  const acc = root[1] === 'b' ? 'b' : root[1] === '#' ? '#' : '';
  return {
    raw: root + quality,
    root: step,
    rootAccidental: acc,
    quality: quality as ChordQuality,
    extensions: [],
    alterations: [],
    alt: false,
  };
}

const SIG_44 = parseTimeSignature('4/4');
const SIG_34 = parseTimeSignature('3/4');

// ─── Sub-bar ChordTimeline ──────────────────────────────────────────────────

describe('ChordTimeline (sub-bar)', () => {
  describe('getChordAtTick — single chord per bar (backward compat)', () => {
    it('returns chord for the whole bar when no beatStart/beatEnd', () => {
      const entries: ChordTimelineEntry[] = [
        { barIndex: 0, chord: chord('C', 'major') },
        { barIndex: 1, chord: chord('D') },
      ];
      const tl = new ChordTimeline(entries);

      expect(tl.getChordAtTick(0, SIG_44)?.root).toBe('C'); // bar 0, beat 0
      expect(tl.getChordAtTick(480 * 2, SIG_44)?.root).toBe('C'); // bar 0, beat 2
      expect(tl.getChordAtTick(480 * 4 - 1, SIG_44)?.root).toBe('C'); // bar 0, last tick
      expect(tl.getChordAtTick(480 * 4, SIG_44)?.root).toBe('D'); // bar 1, beat 0
    });
  });

  describe('getChordAtTick — 2 chords per bar (| Dm7 G7 |)', () => {
    it('resolves first chord on beats 0–1, second on beats 2–3', () => {
      const entries: ChordTimelineEntry[] = [
        { barIndex: 0, beatStart: 0, beatEnd: 2, chord: chord('D') },
        { barIndex: 0, beatStart: 2, beatEnd: 4, chord: chord('G', 'dominant') },
      ];
      const tl = new ChordTimeline(entries);

      expect(tl.getChordAtTick(0, SIG_44)?.root).toBe('D'); // beat 0
      expect(tl.getChordAtTick(480, SIG_44)?.root).toBe('D'); // beat 1
      expect(tl.getChordAtTick(480 * 2, SIG_44)?.root).toBe('G'); // beat 2
      expect(tl.getChordAtTick(480 * 3, SIG_44)?.root).toBe('G'); // beat 3
    });
  });

  describe('getChordAtTick — 4 chords per bar (| C Am Dm G7 |)', () => {
    it('resolves each chord on its beat', () => {
      const entries: ChordTimelineEntry[] = [
        { barIndex: 0, beatStart: 0, beatEnd: 1, chord: chord('C', 'major') },
        { barIndex: 0, beatStart: 1, beatEnd: 2, chord: chord('A') },
        { barIndex: 0, beatStart: 2, beatEnd: 3, chord: chord('D') },
        { barIndex: 0, beatStart: 3, beatEnd: 4, chord: chord('G', 'dominant') },
      ];
      const tl = new ChordTimeline(entries);

      expect(tl.getChordAtTick(0, SIG_44)?.root).toBe('C');
      expect(tl.getChordAtTick(480, SIG_44)?.root).toBe('A');
      expect(tl.getChordAtTick(480 * 2, SIG_44)?.root).toBe('D');
      expect(tl.getChordAtTick(480 * 3, SIG_44)?.root).toBe('G');
    });
  });

  describe('getChordAtTick — 3 chords (2+1+1)', () => {
    it('resolves first chord on beats 0–1, second on beat 2, third on beat 3', () => {
      const entries: ChordTimelineEntry[] = [
        { barIndex: 0, beatStart: 0, beatEnd: 2, chord: chord('C', 'major') },
        { barIndex: 0, beatStart: 2, beatEnd: 3, chord: chord('D') },
        { barIndex: 0, beatStart: 3, beatEnd: 4, chord: chord('G', 'dominant') },
      ];
      const tl = new ChordTimeline(entries);

      expect(tl.getChordAtTick(0, SIG_44)?.root).toBe('C');
      expect(tl.getChordAtTick(480, SIG_44)?.root).toBe('C');
      expect(tl.getChordAtTick(480 * 2, SIG_44)?.root).toBe('D');
      expect(tl.getChordAtTick(480 * 3, SIG_44)?.root).toBe('G');
    });
  });

  describe('getChordAtTick — 3/4 time signature', () => {
    it('resolves 2 chords in 3/4 (2+1 beats)', () => {
      const entries: ChordTimelineEntry[] = [
        { barIndex: 0, beatStart: 0, beatEnd: 2, chord: chord('C', 'major') },
        { barIndex: 0, beatStart: 2, beatEnd: 3, chord: chord('G', 'dominant') },
      ];
      const tl = new ChordTimeline(entries);
      const tpBar = 480 * 3;

      expect(tl.getChordAtTick(0, SIG_34)?.root).toBe('C');
      expect(tl.getChordAtTick(480, SIG_34)?.root).toBe('C');
      expect(tl.getChordAtTick(480 * 2, SIG_34)?.root).toBe('G');
      expect(tl.getChordAtTick(tpBar - 1, SIG_34)?.root).toBe('G');
    });
  });

  describe('getChordAtTick — null chord', () => {
    it('returns null for entries with chord: null', () => {
      const entries: ChordTimelineEntry[] = [
        { barIndex: 0, beatStart: 0, beatEnd: 4, chord: null },
      ];
      const tl = new ChordTimeline(entries);
      expect(tl.getChordAtTick(0, SIG_44)).toBeNull();
      expect(tl.getChordAtTick(480, SIG_44)).toBeNull();
    });

    it('returns null when no entry matches bar', () => {
      const tl = new ChordTimeline([]);
      expect(tl.getChordAtTick(0, SIG_44)).toBeNull();
      expect(tl.getChordAtTick(480 * 10, SIG_44)).toBeNull();
    });
  });

  describe('getNextChord', () => {
    it('returns next chord within the same bar', () => {
      const entries: ChordTimelineEntry[] = [
        { barIndex: 0, beatStart: 0, beatEnd: 2, chord: chord('D') },
        { barIndex: 0, beatStart: 2, beatEnd: 4, chord: chord('G', 'dominant') },
      ];
      const tl = new ChordTimeline(entries);

      // At beat 0 (Dm7), next should be G7 at beat 2
      const next = tl.getNextChord(0, SIG_44);
      expect(next?.root).toBe('G');
      expect(next?.quality).toBe('dominant');
    });

    it('returns next chord across bar boundary', () => {
      const entries: ChordTimelineEntry[] = [
        { barIndex: 0, beatStart: 0, beatEnd: 4, chord: chord('D') },
        { barIndex: 1, beatStart: 0, beatEnd: 4, chord: chord('G', 'dominant') },
      ];
      const tl = new ChordTimeline(entries);

      // At beat 0 of bar 0 (Dm7), next should be G7 in bar 1
      const next = tl.getNextChord(0, SIG_44);
      expect(next?.root).toBe('G');
    });

    it('returns null when there is no next chord', () => {
      const entries: ChordTimelineEntry[] = [
        { barIndex: 0, beatStart: 0, beatEnd: 4, chord: chord('D') },
      ];
      const tl = new ChordTimeline(entries);

      expect(tl.getNextChord(0, SIG_44)).toBeNull();
    });

    it('returns next different chord (skips same chord in multi-entry bar)', () => {
      const entries: ChordTimelineEntry[] = [
        { barIndex: 0, beatStart: 0, beatEnd: 1, chord: chord('C', 'major') },
        { barIndex: 0, beatStart: 1, beatEnd: 2, chord: chord('A') },
        { barIndex: 0, beatStart: 2, beatEnd: 3, chord: chord('D') },
        { barIndex: 0, beatStart: 3, beatEnd: 4, chord: chord('G', 'dominant') },
      ];
      const tl = new ChordTimeline(entries);

      // At beat 0 (C), next should be Am
      const next1 = tl.getNextChord(0, SIG_44);
      expect(next1?.root).toBe('A');

      // At beat 2 (Dm), next should be G7
      const next2 = tl.getNextChord(480 * 2, SIG_44);
      expect(next2?.root).toBe('G');
    });

    it('returns null when next chord is same as current (no change ahead)', () => {
      // Only one chord in the whole timeline
      const entries: ChordTimelineEntry[] = [
        { barIndex: 0, beatStart: 0, beatEnd: 4, chord: chord('C', 'major') },
      ];
      const tl = new ChordTimeline(entries);

      expect(tl.getNextChord(480, SIG_44)).toBeNull();
    });
  });

  describe('length', () => {
    it('reports total number of entries (not bars)', () => {
      const entries: ChordTimelineEntry[] = [
        { barIndex: 0, beatStart: 0, beatEnd: 2, chord: chord('D') },
        { barIndex: 0, beatStart: 2, beatEnd: 4, chord: chord('G', 'dominant') },
        { barIndex: 1, beatStart: 0, beatEnd: 4, chord: chord('C', 'major') },
      ];
      const tl = new ChordTimeline(entries);
      expect(tl.length).toBe(3);
    });

    it('returns 0 for empty timeline', () => {
      expect(new ChordTimeline().length).toBe(0);
    });
  });

  describe('getChordCountInBar', () => {
    it('returns 1 for single-chord bar', () => {
      const entries: ChordTimelineEntry[] = [
        { barIndex: 0, beatStart: 0, beatEnd: 4, chord: chord('C', 'major') },
      ];
      const tl = new ChordTimeline(entries);
      expect(tl.getChordCountInBar(0)).toBe(1);
    });

    it('returns 2 for | Dm7 G7 | bar', () => {
      const entries: ChordTimelineEntry[] = [
        { barIndex: 0, beatStart: 0, beatEnd: 2, chord: chord('D') },
        { barIndex: 0, beatStart: 2, beatEnd: 4, chord: chord('G', 'dominant') },
      ];
      const tl = new ChordTimeline(entries);
      expect(tl.getChordCountInBar(0)).toBe(2);
    });

    it('returns 4 for turnaround bar | C Am Dm G7 |', () => {
      const entries: ChordTimelineEntry[] = [
        { barIndex: 0, beatStart: 0, beatEnd: 1, chord: chord('C', 'major') },
        { barIndex: 0, beatStart: 1, beatEnd: 2, chord: chord('A') },
        { barIndex: 0, beatStart: 2, beatEnd: 3, chord: chord('D') },
        { barIndex: 0, beatStart: 3, beatEnd: 4, chord: chord('G', 'dominant') },
      ];
      const tl = new ChordTimeline(entries);
      expect(tl.getChordCountInBar(0)).toBe(4);
    });

    it('returns 3 for 2+1+1 bar', () => {
      const entries: ChordTimelineEntry[] = [
        { barIndex: 0, beatStart: 0, beatEnd: 2, chord: chord('C', 'major') },
        { barIndex: 0, beatStart: 2, beatEnd: 3, chord: chord('D') },
        { barIndex: 0, beatStart: 3, beatEnd: 4, chord: chord('G', 'dominant') },
      ];
      const tl = new ChordTimeline(entries);
      expect(tl.getChordCountInBar(0)).toBe(3);
    });

    it('returns 0 for empty bar (null chord)', () => {
      const entries: ChordTimelineEntry[] = [
        { barIndex: 0, beatStart: 0, beatEnd: 4, chord: null },
      ];
      const tl = new ChordTimeline(entries);
      expect(tl.getChordCountInBar(0)).toBe(0);
    });

    it('returns 0 for bar with no entries', () => {
      const tl = new ChordTimeline([]);
      expect(tl.getChordCountInBar(0)).toBe(0);
    });

    it('counts per-bar, ignoring other bars', () => {
      const entries: ChordTimelineEntry[] = [
        { barIndex: 0, beatStart: 0, beatEnd: 2, chord: chord('D') },
        { barIndex: 0, beatStart: 2, beatEnd: 4, chord: chord('G', 'dominant') },
        { barIndex: 1, beatStart: 0, beatEnd: 4, chord: chord('C', 'major') },
      ];
      const tl = new ChordTimeline(entries);
      expect(tl.getChordCountInBar(0)).toBe(2);
      expect(tl.getChordCountInBar(1)).toBe(1);
    });
  });

  describe('backward compatibility', () => {
    it('old-style entries (no beatStart/beatEnd) work with new getChordAtTick', () => {
      const entries: ChordTimelineEntry[] = [
        { barIndex: 0, chord: chord('C', 'major') },
        { barIndex: 1, chord: chord('D') },
        { barIndex: 2, chord: chord('G', 'dominant') },
      ];
      const tl = new ChordTimeline(entries);

      // All beats in bar 0 → Cmaj
      for (let beat = 0; beat < 4; beat++) {
        expect(tl.getChordAtTick(beat * 480, SIG_44)?.root).toBe('C');
      }
      // Bar 1 → Dm
      expect(tl.getChordAtTick(480 * 4, SIG_44)?.root).toBe('D');
      // Bar 2 → G7
      expect(tl.getChordAtTick(480 * 8, SIG_44)?.root).toBe('G');
    });
  });
});
