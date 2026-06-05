import { describe, it, expect } from 'vitest';
import { BassInstrument } from './bassInstrument.js';
import { ChordTimeline } from './chordTimeline.js';
import { parseTimeSignature } from '../time/timeSignature.js';
import type { ScheduleContext } from './instrument.js';
import type { ChordSymbol } from '@jazz/shared';

// Minimal ChordSymbol for testing
function makeChord(root: ChordSymbol['root'], accidental: ChordSymbol['rootAccidental'] = ''): ChordSymbol {
  return {
    raw: `${root}${accidental}m7`,
    root,
    rootAccidental: accidental,
    quality: 'minor',
    extensions: ['7'],
    alterations: [],
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

  it('uses RR articulation "finger"', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = new BassInstrument(timeline);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: 1920 }, ctx);

    expect(notes[0]?.articulation).toBe('finger');
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
});
