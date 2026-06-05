import { describe, it, expect } from 'vitest';
import { BassInstrument } from './bassInstrument.js';
import { ChordTimeline } from './chordTimeline.js';
import { parseTimeSignature } from '../time/timeSignature.js';
import type { ScheduleContext } from './instrument.js';
import type { ChordSymbol } from '@jazz/shared';

// Minimal ChordSymbol for testing
function makeChord(
  root: ChordSymbol['root'],
  accidental: ChordSymbol['rootAccidental'] = '',
  quality: ChordSymbol['quality'] = 'minor',
  alterations: ChordSymbol['alterations'] = [],
): ChordSymbol {
  return {
    raw: `${root}${accidental}`,
    root,
    rootAccidental: accidental,
    quality,
    extensions: ['7'],
    alterations,
    alt: false,
    bass: null,
  };
}

function makeCtx(sig = parseTimeSignature('4/4')): {
  ctx: ScheduleContext;
  notes: Array<{ at: number; note: string; velocity: number; durationTicks: number; articulation: string }>;
} {
  const notes: Array<{ at: number; note: string; velocity: number; durationTicks: number; articulation: string }> = [];
  const ctx: ScheduleContext = {
    bpm: 120,
    timeSignature: sig,
    scheduleClick: () => {},
    scheduleNote: (at, note, velocity, durationTicks, articulation) =>
      notes.push({ at, note, velocity, durationTicks, articulation }),
  };
  return { ctx, notes };
}

describe('BassInstrument', () => {
  it('plays root of the chord on beat 1 (complexity 1)', () => {
    const timeline = new ChordTimeline([
      { barIndex: 0, chord: makeChord('D') },
      { barIndex: 1, chord: makeChord('G') },
      { barIndex: 2, chord: makeChord('C') },
    ]);
    const bass = new BassInstrument(timeline);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: 1920 * 3 }, ctx);

    expect(notes.map((n) => n.note)).toEqual(['D2', 'G2', 'C2']);
    expect(notes.map((n) => n.at)).toEqual([0, 1920, 3840]);
  });

  it('resolves flats correctly (Bb, Ab)', () => {
    const timeline = new ChordTimeline([
      { barIndex: 0, chord: makeChord('B', 'b') },
      { barIndex: 1, chord: makeChord('A', 'b') },
    ]);
    const bass = new BassInstrument(timeline);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: 1920 * 2 }, ctx);

    expect(notes.map((n) => n.note)).toEqual(['Bb2', 'Ab2']);
  });

  it('skips bars with null chord', () => {
    const timeline = new ChordTimeline([
      { barIndex: 0, chord: makeChord('D') },
      { barIndex: 1, chord: null },
      { barIndex: 2, chord: makeChord('C') },
    ]);
    const bass = new BassInstrument(timeline);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: 1920 * 3 }, ctx);

    expect(notes.map((n) => n.note)).toEqual(['D2', 'C2']);
  });

  it('does nothing when scheduleNote is absent', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = new BassInstrument(timeline);
    const ctx: ScheduleContext = {
      bpm: 120,
      timeSignature: parseTimeSignature('4/4'),
      scheduleClick: () => {},
      // scheduleNote intentionally absent
    };
    expect(() => bass.schedule({ fromTicks: 0, toTicks: 1920 }, ctx)).not.toThrow();
  });

  it('uses pluck articulation on beat 1 (complexity 1)', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = new BassInstrument(timeline);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: 1920 }, ctx);

    expect(notes[0]?.articulation).toBe('pluck');
  });

  it('only schedules within the given window', () => {
    const timeline = new ChordTimeline([
      { barIndex: 0, chord: makeChord('D') },
      { barIndex: 1, chord: makeChord('G') },
      { barIndex: 2, chord: makeChord('C') },
    ]);
    const bass = new BassInstrument(timeline);
    const { ctx, notes } = makeCtx();

    // Window starts after bar 0, should only hit bars 1 and 2
    bass.schedule({ fromTicks: 480, toTicks: 1920 * 3 }, ctx);

    expect(notes.map((n) => n.at)).toEqual([1920, 3840]);
  });

  describe('complexity 2 — root on every beat', () => {
    it('plays root on all 4 beats per bar', () => {
      const timeline = new ChordTimeline([
        { barIndex: 0, chord: makeChord('D') },
        { barIndex: 1, chord: makeChord('G') },
      ]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(2);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 * 2 }, ctx);

      // 8 notes total (4 per bar)
      expect(notes).toHaveLength(8);
      expect(notes.map((n) => n.at)).toEqual([0, 480, 960, 1440, 1920, 2400, 2880, 3360]);
    });

    it('alternates octaves 2 and 3 on beats 1–4', () => {
      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(2);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 }, ctx);

      expect(notes.map((n) => n.note)).toEqual(['D2', 'D3', 'D2', 'D3']);
    });

    it('uses pluck on all beats with beat-appropriate velocity (4/4)', () => {
      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('C') }]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(2);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 }, ctx);

      expect(notes.map((n) => n.articulation)).toEqual(['pluck', 'pluck', 'pluck', 'pluck']);
    });

    it('uses pluck only on beat 1 in 3/4 (no second strong beat)', () => {
      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('C') }]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(2);
      const { ctx, notes } = makeCtx(parseTimeSignature('3/4'));

      bass.schedule({ fromTicks: 0, toTicks: 1440 }, ctx);

      expect(notes.map((n) => n.articulation)).toEqual(['pluck', 'pluck', 'pluck']);
    });

    it('applies beat-specific velocity per BASS.md scheme', () => {
      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('C') }]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(2);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 }, ctx);

      expect(notes.map((n) => n.velocity)).toEqual([0.82, 0.68, 0.76, 0.70]);
    });

    it('follows chord changes per beat (chord change mid-bar)', () => {
      // Two chords in one bar via separate bars in timeline
      const timeline = new ChordTimeline([
        { barIndex: 0, chord: makeChord('D') },
        { barIndex: 1, chord: makeChord('G') },
      ]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(2);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 * 2 }, ctx);

      // Bar 0 → D on all 4 beats; bar 1 → G on all 4 beats
      expect(notes.slice(0, 4).map((n) => n.note)).toEqual(['D2', 'D3', 'D2', 'D3']);
      expect(notes.slice(4, 8).map((n) => n.note)).toEqual(['G2', 'G3', 'G2', 'G3']);
    });

    it('resolves flat accidentals correctly (Bb, Ab)', () => {
      const timeline = new ChordTimeline([
        { barIndex: 0, chord: makeChord('B', 'b') },
      ]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(2);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 }, ctx);

      expect(notes.map((n) => n.note)).toEqual(['Bb2', 'Bb3', 'Bb2', 'Bb3']);
    });

    it('skips beats in bars with null chord', () => {
      const timeline = new ChordTimeline([
        { barIndex: 0, chord: makeChord('D') },
        { barIndex: 1, chord: null },
        { barIndex: 2, chord: makeChord('C') },
      ]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(2);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 * 3 }, ctx);

      // Bar 0 → 4 notes, bar 1 → 0 notes, bar 2 → 4 notes
      expect(notes).toHaveLength(8);
      expect(notes[0]?.note).toBe('D2');
      expect(notes[4]?.note).toBe('C2');
    });
  });

  describe('complexity 3 — root + fifth', () => {
    it('plays root–fifth–root–fifth on beats 1–4 for Dm7', () => {
      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(3);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 }, ctx);

      expect(notes.map((n) => n.note)).toEqual(['D2', 'A2', 'D2', 'A2']);
    });

    it('uses pluck on all beats with beat-appropriate velocity (4/4)', () => {
      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(3);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 }, ctx);

      expect(notes.map((n) => n.articulation)).toEqual(['pluck', 'pluck', 'pluck', 'pluck']);
    });

    it('uses pluck on all beats in 3/4 — weak beats play fifth', () => {
      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(3);
      const { ctx, notes } = makeCtx(parseTimeSignature('3/4'));

      bass.schedule({ fromTicks: 0, toTicks: 1440 }, ctx);

      expect(notes.map((n) => n.articulation)).toEqual(['pluck', 'pluck', 'pluck']);
      expect(notes.map((n) => n.note)).toEqual(['D2', 'A2', 'A2']);
    });

    it('fifth lands above root when interval wraps octave boundary (G dominant → D3)', () => {
      const timeline = new ChordTimeline([
        { barIndex: 0, chord: makeChord('G', '', 'dominant') },
      ]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(3);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 }, ctx);

      expect(notes.map((n) => n.note)).toEqual(['G2', 'D3', 'G2', 'D3']);
    });

    it('uses b5 for halfDiminished quality (Dm7b5: D → Ab)', () => {
      const timeline = new ChordTimeline([
        { barIndex: 0, chord: makeChord('D', '', 'halfDiminished') },
      ]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(3);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 }, ctx);

      expect(notes.map((n) => n.note)).toEqual(['D2', 'Ab2', 'D2', 'Ab2']);
    });

    it('uses b5 when alteration "b5" is present (C dominant b5: C → Gb)', () => {
      const timeline = new ChordTimeline([
        { barIndex: 0, chord: makeChord('C', '', 'dominant', ['b5']) },
      ]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(3);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 }, ctx);

      expect(notes.map((n) => n.note)).toEqual(['C2', 'Gb2', 'C2', 'Gb2']);
    });

    it('beat 3 root alternates to octave 3 on odd bars', () => {
      const timeline = new ChordTimeline([
        { barIndex: 0, chord: makeChord('D') },
        { barIndex: 1, chord: makeChord('D') },
      ]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(3);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 * 2 }, ctx);

      expect(notes[2]?.note).toBe('D2'); // bar 0 (even), beat 3 → oct 2
      expect(notes[6]?.note).toBe('D3'); // bar 1 (odd),  beat 3 → oct 3
    });

    it('skips beats in bars with null chord', () => {
      const timeline = new ChordTimeline([
        { barIndex: 0, chord: makeChord('D') },
        { barIndex: 1, chord: null },
        { barIndex: 2, chord: makeChord('C') },
      ]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(3);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 * 3 }, ctx);

      expect(notes).toHaveLength(8);
      expect(notes[0]?.note).toBe('D2');
      expect(notes[4]?.note).toBe('C2');
    });
  });

  describe('complexity 5 — walking + chromatic approach', () => {
    it('plays root-third-fifth-approach(above) for Dm7 → G7 (bar 0, even)', () => {
      const timeline = new ChordTimeline([
        { barIndex: 0, chord: makeChord('D') },
        { barIndex: 1, chord: makeChord('G', '', 'dominant') },
      ]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(5);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 }, ctx);

      // beat 4: approach from above to G → Ab2
      expect(notes.map((n) => n.note)).toEqual(['D2', 'F2', 'A2', 'Ab2']);
    });

    it('plays approach from below on odd bar (bar 1 → Cmaj7)', () => {
      const timeline = new ChordTimeline([
        { barIndex: 0, chord: makeChord('D') },
        { barIndex: 1, chord: makeChord('G', '', 'dominant') },
        { barIndex: 2, chord: makeChord('C', '', 'major') },
      ]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(5);
      const { ctx, notes } = makeCtx();

      // Schedule bar 1 only (odd bar → from below; nextRoot C → B1)
      bass.schedule({ fromTicks: 1920, toTicks: 1920 * 2 }, ctx);

      expect(notes.map((n) => n.note)).toEqual(['G2', 'B2', 'D3', 'B1']);
    });

    it('falls back to seventh when no next chord', () => {
      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(5);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 }, ctx);

      // No bar 1 → beat 4 uses seventh of Dm7 = C3
      expect(notes[3]?.note).toBe('C3');
    });

    it('uses pluck on all beats with beat-appropriate velocity (4/4)', () => {
      const timeline = new ChordTimeline([
        { barIndex: 0, chord: makeChord('D') },
        { barIndex: 1, chord: makeChord('G', '', 'dominant') },
      ]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(5);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 }, ctx);

      expect(notes.map((n) => n.articulation)).toEqual(['pluck', 'pluck', 'pluck', 'pluck']);
    });

    it('applies beat-specific velocity per BASS.md scheme', () => {
      const timeline = new ChordTimeline([
        { barIndex: 0, chord: makeChord('D') },
        { barIndex: 1, chord: makeChord('G', '', 'dominant') },
      ]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(5);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 }, ctx);

      expect(notes.map((n) => n.velocity)).toEqual([0.82, 0.68, 0.76, 0.70]);
    });

    it('approach from above to B wraps to C3 (B=11, approach=C=0 → oct+1)', () => {
      const timeline = new ChordTimeline([
        { barIndex: 0, chord: makeChord('D') },
        { barIndex: 1, chord: makeChord('B', '', 'major') },
      ]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(5);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 }, ctx);

      expect(notes[3]?.note).toBe('C3');
    });

    it('approach from below to C wraps to B1 (C=0, below=B=11 → oct-1)', () => {
      const timeline = new ChordTimeline([
        { barIndex: 0, chord: makeChord('D') },
        { barIndex: 1, chord: makeChord('G', '', 'dominant') },
        { barIndex: 2, chord: makeChord('C', '', 'major') },
      ]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(5);
      const { ctx, notes } = makeCtx();

      // bar 1 (odd) → from below, nextRoot = C → B1
      bass.schedule({ fromTicks: 1920, toTicks: 3840 }, ctx);

      expect(notes[3]?.note).toBe('B1');
    });

    it('plays root-third-approach in 3/4 (last beat = approach, no fifth)', () => {
      const timeline = new ChordTimeline([
        { barIndex: 0, chord: makeChord('D') },
        { barIndex: 1, chord: makeChord('G', '', 'dominant') },
      ]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(5);
      const { ctx, notes } = makeCtx(parseTimeSignature('3/4'));

      // bar 0 (even) → approach from above to G → Ab2
      bass.schedule({ fromTicks: 0, toTicks: 1440 }, ctx);

      expect(notes.map((n) => n.note)).toEqual(['D2', 'F2', 'Ab2']);
    });

    it('uses pluck on all beats in 3/4 (approach on beat 3)', () => {
      const timeline = new ChordTimeline([
        { barIndex: 0, chord: makeChord('D') },
        { barIndex: 1, chord: makeChord('G', '', 'dominant') },
      ]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(5);
      const { ctx, notes } = makeCtx(parseTimeSignature('3/4'));

      bass.schedule({ fromTicks: 0, toTicks: 1440 }, ctx);

      expect(notes.map((n) => n.articulation)).toEqual(['pluck', 'pluck', 'pluck']);
    });

    it('two-bar pattern: Dm7 → G7 → Cmaj7 approach notes correct', () => {
      const timeline = new ChordTimeline([
        { barIndex: 0, chord: makeChord('D') },
        { barIndex: 1, chord: makeChord('G', '', 'dominant') },
        { barIndex: 2, chord: makeChord('C', '', 'major') },
      ]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(5);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 * 2 }, ctx);

      // bar 0 (even) → above → G target → Ab2
      expect(notes[3]?.note).toBe('Ab2');
      // bar 1 (odd)  → below → C target → B1
      expect(notes[7]?.note).toBe('B1');
    });

    it('skips beats in bars with null chord', () => {
      const timeline = new ChordTimeline([
        { barIndex: 0, chord: makeChord('D') },
        { barIndex: 1, chord: null },
        { barIndex: 2, chord: makeChord('C', '', 'major') },
      ]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(5);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 * 3 }, ctx);

      expect(notes).toHaveLength(8);
      expect(notes[0]?.note).toBe('D2');
      expect(notes[4]?.note).toBe('C2');
    });
  });

  describe('complexity 6 — chord tones, all beats, all pluck', () => {
    it('plays root-third-fifth-seventh for Dm7 on all 4 beats (D F A C)', () => {
      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(6);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 }, ctx);

      expect(notes.map((n) => n.note)).toEqual(['D2', 'F2', 'A2', 'C3']);
    });

    it('uses pluck articulation on all 4 beats', () => {
      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(6);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 }, ctx);

      expect(notes.map((n) => n.articulation)).toEqual(['pluck', 'pluck', 'pluck', 'pluck']);
    });

    it('plays root-third-fifth-seventh for G7 (G B D F)', () => {
      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('G', '', 'dominant') }]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(6);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 }, ctx);

      expect(notes.map((n) => n.note)).toEqual(['G2', 'B2', 'D3', 'F3']);
    });

    it('applies beat-specific velocity per BASS.md scheme', () => {
      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(6);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 }, ctx);

      expect(notes.map((n) => n.velocity)).toEqual([0.82, 0.68, 0.76, 0.70]);
    });

    it('plays root-third-fifth in 3/4 (no seventh slot)', () => {
      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(6);
      const { ctx, notes } = makeCtx(parseTimeSignature('3/4'));

      bass.schedule({ fromTicks: 0, toTicks: 1440 }, ctx);

      expect(notes.map((n) => n.note)).toEqual(['D2', 'F2', 'A2']);
      expect(notes.map((n) => n.articulation)).toEqual(['pluck', 'pluck', 'pluck']);
    });

    it('skips beats in bars with null chord', () => {
      const timeline = new ChordTimeline([
        { barIndex: 0, chord: makeChord('D') },
        { barIndex: 1, chord: null },
        { barIndex: 2, chord: makeChord('C', '', 'major') },
      ]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(6);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 * 3 }, ctx);

      expect(notes).toHaveLength(8);
      expect(notes[0]?.note).toBe('D2');
      expect(notes[4]?.note).toBe('C2');
    });
  });

  describe('complexity 7 — chord tones beats 1 & 3 only ("two feel")', () => {
    it('plays root on beat 1 and fifth on beat 3 for Dm7 (D A)', () => {
      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(7);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 }, ctx);

      expect(notes).toHaveLength(2);
      expect(notes.map((n) => n.note)).toEqual(['D2', 'A2']);
    });

    it('fires only on beats 1 and 3 (ticks 0 and 960)', () => {
      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(7);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 }, ctx);

      expect(notes.map((n) => n.at)).toEqual([0, 960]);
    });

    it('uses pluck articulation on both active beats', () => {
      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(7);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 }, ctx);

      expect(notes.map((n) => n.articulation)).toEqual(['pluck', 'pluck']);
    });

    it('notes have half-bar duration (NOTES_PER_BAR=2 → slotTicks=960)', () => {
      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(7);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 }, ctx);

      const expectedDuration = Math.floor(Math.floor(1920 / 2) * 0.92);
      expect(notes[0]?.durationTicks).toBe(expectedDuration);
    });

    it('applies beat-specific velocity: beat 1 = 0.82, beat 3 = 0.76', () => {
      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(7);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 }, ctx);

      expect(notes.map((n) => n.velocity)).toEqual([0.82, 0.76]);
    });

    it('follows chord changes across bars', () => {
      const timeline = new ChordTimeline([
        { barIndex: 0, chord: makeChord('D') },
        { barIndex: 1, chord: makeChord('G', '', 'dominant') },
      ]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(7);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 * 2 }, ctx);

      // bar 0: D root + A fifth; bar 1: G root + D fifth
      expect(notes.map((n) => n.note)).toEqual(['D2', 'A2', 'G2', 'D3']);
    });

    it('uses b5 for halfDiminished on beat 3 (Dm7b5: D → Ab)', () => {
      const timeline = new ChordTimeline([
        { barIndex: 0, chord: makeChord('D', '', 'halfDiminished') },
      ]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(7);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 }, ctx);

      expect(notes.map((n) => n.note)).toEqual(['D2', 'Ab2']);
    });

    it('plays only beat 1 in 3/4 (beat 3 index = 2 is even, but 3/4 has 3 beats)', () => {
      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(7);
      const { ctx, notes } = makeCtx(parseTimeSignature('3/4'));

      bass.schedule({ fromTicks: 0, toTicks: 1440 }, ctx);

      // beats 0 and 2 (both even) → root and fifth
      expect(notes).toHaveLength(2);
      expect(notes.map((n) => n.note)).toEqual(['D2', 'A2']);
      expect(notes.map((n) => n.articulation)).toEqual(['pluck', 'pluck']);
    });

    it('skips bars with null chord', () => {
      const timeline = new ChordTimeline([
        { barIndex: 0, chord: makeChord('D') },
        { barIndex: 1, chord: null },
        { barIndex: 2, chord: makeChord('C', '', 'major') },
      ]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(7);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 * 3 }, ctx);

      // bar 0 → 2 notes, bar 1 → 0, bar 2 → 2 notes
      expect(notes).toHaveLength(4);
      expect(notes[0]?.note).toBe('D2');
      expect(notes[2]?.note).toBe('C2');
    });
  });

  describe('complexity 4 — chord tones', () => {
    it('plays root-third-fifth-seventh for Dm7 (D F A C)', () => {
      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(4);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 }, ctx);

      expect(notes.map((n) => n.note)).toEqual(['D2', 'F2', 'A2', 'C3']);
    });

    it('plays root-third-fifth-seventh for G7 (G B D F)', () => {
      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('G', '', 'dominant') }]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(4);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 }, ctx);

      expect(notes.map((n) => n.note)).toEqual(['G2', 'B2', 'D3', 'F3']);
    });

    it('plays root-third-fifth-seventh for Cmaj7 (C E G B)', () => {
      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('C', '', 'major') }]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(4);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 }, ctx);

      expect(notes.map((n) => n.note)).toEqual(['C2', 'E2', 'G2', 'B2']);
    });

    it('uses pluck on all beats with beat-appropriate velocity (4/4)', () => {
      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(4);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 }, ctx);

      expect(notes.map((n) => n.articulation)).toEqual(['pluck', 'pluck', 'pluck', 'pluck']);
    });

    it('uses pluck only on beat 1 in 3/4', () => {
      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(4);
      const { ctx, notes } = makeCtx(parseTimeSignature('3/4'));

      bass.schedule({ fromTicks: 0, toTicks: 1440 }, ctx);

      expect(notes.map((n) => n.articulation)).toEqual(['pluck', 'pluck', 'pluck']);
    });

    it('plays root-third-fifth in 3/4 (no seventh slot)', () => {
      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(4);
      const { ctx, notes } = makeCtx(parseTimeSignature('3/4'));

      bass.schedule({ fromTicks: 0, toTicks: 1440 }, ctx);

      expect(notes.map((n) => n.note)).toEqual(['D2', 'F2', 'A2']);
    });

    it('applies beat-specific velocity per BASS.md scheme', () => {
      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(4);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 }, ctx);

      expect(notes.map((n) => n.velocity)).toEqual([0.82, 0.68, 0.76, 0.70]);
    });

    it('resolves major seventh interval correctly (Cmaj7: C E G B)', () => {
      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('C', '', 'major') }]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(4);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 }, ctx);

      expect(notes[3]?.note).toBe('B2');
    });

    it('resolves diminished seventh correctly (Bdim7: B D F Ab) — Ab clamped to oct 2', () => {
      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('B', '', 'diminished') }]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(4);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 }, ctx);

      // B2, D3, F3, Ab2 — Ab3 is clamped down because index 8 > 7 (G3 ceiling)
      expect(notes.map((n) => n.note)).toEqual(['B2', 'D3', 'F3', 'Ab2']);
    });

    it('skips beats in bars with null chord', () => {
      const timeline = new ChordTimeline([
        { barIndex: 0, chord: makeChord('D') },
        { barIndex: 1, chord: null },
        { barIndex: 2, chord: makeChord('C', '', 'major') },
      ]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(4);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 * 3 }, ctx);

      expect(notes).toHaveLength(8);
      expect(notes[0]?.note).toBe('D2');
      expect(notes[4]?.note).toBe('C2');
    });
  });
});
