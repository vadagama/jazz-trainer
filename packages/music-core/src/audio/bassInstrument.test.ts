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

  it('uses pluck articulation on beat 1 (strong beat)', () => {
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

    it('uses pluck on beats 1 and 3, finger on beats 2 and 4', () => {
      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(2);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 }, ctx);

      expect(notes.map((n) => n.articulation)).toEqual(['pluck', 'finger', 'pluck', 'finger']);
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

    it('uses pluck on beats 1 and 3, finger on beats 2 and 4', () => {
      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
      const bass = new BassInstrument(timeline);
      bass.setComplexity(3);
      const { ctx, notes } = makeCtx();

      bass.schedule({ fromTicks: 0, toTicks: 1920 }, ctx);

      expect(notes.map((n) => n.articulation)).toEqual(['pluck', 'finger', 'pluck', 'finger']);
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
});
