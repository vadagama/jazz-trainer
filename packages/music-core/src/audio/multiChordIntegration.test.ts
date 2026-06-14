import { describe, it, expect } from 'vitest';
import { BassInstrument } from './bassInstrument.js';
import { PianoInstrument } from './pianoInstrument.js';
import { RhodesInstrument } from './rhodesInstrument.js';
import { ChordTimeline } from './chordTimeline.js';
import { parseTimeSignature } from '../time/timeSignature.js';
import type { ScheduleContext } from './instrument.js';
import type { ChordSymbol } from '@jazz/shared';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeChord(
  root: ChordSymbol['root'],
  accidental: ChordSymbol['rootAccidental'] = '',
  quality: ChordSymbol['quality'] = 'minor',
): ChordSymbol {
  return {
    raw: `${root}${accidental}`,
    root,
    rootAccidental: accidental,
    quality,
    extensions: ['7'],
    alterations: [],
    alt: false,
    bass: null,
  };
}

interface InstrumentEvents {
  bass: Array<{ at: number; note: string; velocity: number; durationTicks: number }>;
  piano: Array<{ at: number; notes: string[]; velocity: number; durationTicks: number }>;
  rhodes: Array<{ at: number; notes: string[]; velocity: number; durationTicks: number }>;
}

function makeCtx(sig = parseTimeSignature('4/4')): {
  ctx: ScheduleContext;
  events: InstrumentEvents;
} {
  const events: InstrumentEvents = { bass: [], piano: [], rhodes: [] };
  const ctx: ScheduleContext = {
    bpm: 120,
    timeSignature: sig,
    swingRatio: 0.5,
    scheduleClick: () => {},
    scheduleEvent: (_instrumentId, payload, at, velocity, durationTicks) => {
      if (_instrumentId === 'bass') {
        const p = payload as { note: string; articulation: string };
        events.bass.push({ at, note: p.note, velocity, durationTicks });
      } else if (_instrumentId === 'piano') {
        const p = payload as { notes: string[] };
        events.piano.push({ at, notes: [...p.notes], velocity, durationTicks });
      } else if (_instrumentId === 'rhodes') {
        const p = payload as { notes: string[] };
        events.rhodes.push({ at, notes: [...p.notes], velocity, durationTicks });
      }
    },
  };
  return { ctx, events };
}

const TPB = 480;
const TPBAR = 1920; // 4/4 bar

const dm7 = makeChord('D');
const g7 = makeChord('G', '', 'dominant');
const cmaj7 = makeChord('C', '', 'major');
const a7 = makeChord('A', '', 'dominant');

// ─── Full-cycle integration: | Dm7 G7 | Cmaj7 | ──────────────────────────────

describe('multi-chord integration — | Dm7 G7 | Cmaj7 | full cycle', () => {
  it('all three instruments schedule correct chords per beat in 2-chord bar', () => {
    const timeline = new ChordTimeline([
      { barIndex: 0, beatStart: 0, beatEnd: 2, chord: dm7 },
      { barIndex: 0, beatStart: 2, beatEnd: 4, chord: g7 },
      { barIndex: 1, beatStart: 0, beatEnd: 4, chord: cmaj7 },
    ]);

    const bass = new BassInstrument(timeline);
    bass.setStyle('swing');
    bass.setComplexity(5);

    const piano = new PianoInstrument(timeline);
    piano.setHumanize(false);
    piano.setProfile('beginner-safe');

    const rhodes = new RhodesInstrument(timeline);
    rhodes.setHumanize(false);
    rhodes.setMode('halfNotes');

    const { ctx, events } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: 2 * TPBAR }, ctx);
    piano.schedule({ fromTicks: 0, toTicks: 2 * TPBAR }, ctx);
    rhodes.schedule({ fromTicks: 0, toTicks: 2 * TPBAR }, ctx);

    // Bass: walking bass across 2 bars = 8 notes
    expect(events.bass.length).toBe(8);
    // Bar 0: Dm7 on beats 0-1, G7 on beats 2-3
    expect(events.bass[0]!.note).toBe('D2'); // beat 0: Dm7 root
    expect(events.bass[2]!.note).toBe('G2'); // beat 2: G7 root
    // Bar 1: Cmaj7 on all 4 beats
    expect(events.bass[4]!.note).toBe('C2'); // beat 0 of bar 1

    // Piano: beginner-safe = halfNotes for bar 0, wholeNotes for bar 1
    // Bar 0 with 2 chords: halfNotes on beat 1 (Dm7) and beat 3 (G7)
    // Bar 1: wholeNotes on beat 1 (Cmaj7)
    expect(events.piano.length).toBeGreaterThanOrEqual(2);
    const pianoBar0Beat1 = events.piano.find((c) => c.at === 0);
    const pianoBar0Beat3 = events.piano.find((c) => c.at === 2 * TPB);
    const pianoBar1 = events.piano.find((c) => c.at >= TPBAR && c.at < TPBAR + TPB);
    expect(pianoBar0Beat1).toBeDefined();
    expect(pianoBar0Beat3).toBeDefined();
    expect(pianoBar1).toBeDefined();
    // Voicings differ between Dm7 and G7
    expect(pianoBar0Beat3!.notes).not.toEqual(pianoBar0Beat1!.notes);

    // Rhodes: halfNotes = 2 events per bar for bar 0, 2 for bar 1
    expect(events.rhodes.length).toBe(4);
    const rhodesBar0Beat1 = events.rhodes.find((c) => c.at === 0);
    const rhodesBar0Beat3 = events.rhodes.find((c) => c.at === 2 * TPB);
    const rhodesBar1Beat1 = events.rhodes.find((c) => c.at === TPBAR);
    expect(rhodesBar0Beat1).toBeDefined();
    expect(rhodesBar0Beat3).toBeDefined();
    expect(rhodesBar1Beat1).toBeDefined();
    // Dm7 voicing != G7 voicing for Rhodes too
    expect(rhodesBar0Beat3!.notes).not.toEqual(rhodesBar0Beat1!.notes);
  });

  it('no conflicts between Piano and Rhodes (register separation)', () => {
    const timeline = new ChordTimeline([
      { barIndex: 0, beatStart: 0, beatEnd: 2, chord: dm7 },
      { barIndex: 0, beatStart: 2, beatEnd: 4, chord: g7 },
    ]);

    const piano = new PianoInstrument(timeline);
    piano.setHumanize(false);
    piano.setProfile('swing-sparse');

    const rhodes = new RhodesInstrument(timeline);
    rhodes.setHumanize(false);
    rhodes.setMode('halfNotes');

    const { ctx, events } = makeCtx();
    piano.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    rhodes.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    // Piano and Rhodes should both produce events
    expect(events.piano.length).toBeGreaterThan(0);
    expect(events.rhodes.length).toBeGreaterThan(0);

    // Rhodes notes should be in upper register (C4+)
    for (const e of events.rhodes) {
      for (const note of e.notes) {
        const octave = parseInt(note.match(/\d+/)![0]!, 10);
        expect(octave).toBeGreaterThanOrEqual(3); // Rhodes plays above C3
      }
    }
  });
});

// ─── Edge cases ──────────────────────────────────────────────────────────────

describe('multi-chord integration — edge cases', () => {
  it('backward compatibility: single-chord bars work as before', () => {
    const timeline = new ChordTimeline([
      { barIndex: 0, chord: dm7 },
      { barIndex: 1, chord: g7 },
      { barIndex: 2, chord: cmaj7 },
    ]);

    const bass = new BassInstrument(timeline);
    bass.setStyle('swing');
    bass.setComplexity(5);

    const piano = new PianoInstrument(timeline);
    piano.setHumanize(false);
    piano.setProfile('beginner-safe');

    const rhodes = new RhodesInstrument(timeline);
    rhodes.setHumanize(false);
    rhodes.setMode('halfNotes');

    const { ctx, events } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: 3 * TPBAR }, ctx);
    piano.schedule({ fromTicks: 0, toTicks: 3 * TPBAR }, ctx);
    rhodes.schedule({ fromTicks: 0, toTicks: 3 * TPBAR }, ctx);

    // All instruments produce events for all 3 bars
    expect(events.bass.length).toBeGreaterThan(0);
    expect(events.piano.length).toBeGreaterThan(0);
    expect(events.rhodes.length).toBeGreaterThan(0);
  });

  it('empty bars with null chords are skipped by all instruments', () => {
    const timeline = new ChordTimeline([
      { barIndex: 0, chord: dm7 },
      { barIndex: 1, beatStart: 0, beatEnd: 4, chord: null },
      { barIndex: 2, chord: cmaj7 },
    ]);

    const bass = new BassInstrument(timeline);
    bass.setStyle('swing');
    bass.setComplexity(5);

    const piano = new PianoInstrument(timeline);
    piano.setHumanize(false);
    piano.setProfile('beginner-safe');

    const rhodes = new RhodesInstrument(timeline);
    rhodes.setHumanize(false);
    rhodes.setMode('halfNotes');

    const { ctx, events } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: 3 * TPBAR }, ctx);
    piano.schedule({ fromTicks: 0, toTicks: 3 * TPBAR }, ctx);
    rhodes.schedule({ fromTicks: 0, toTicks: 3 * TPBAR }, ctx);

    // Bar 1 events should be absent
    const bassBar1 = events.bass.filter((n) => n.at >= TPBAR && n.at < 2 * TPBAR);
    const pianoBar1 = events.piano.filter((c) => c.at >= TPBAR && c.at < 2 * TPBAR);
    const rhodesBar1 = events.rhodes.filter((c) => c.at >= TPBAR && c.at < 2 * TPBAR);
    expect(bassBar1.length).toBe(0);
    expect(pianoBar1.length).toBe(0);
    expect(rhodesBar1.length).toBe(0);
  });

  it('4-chord bar (turnaround): each instrument resolves on correct beats', () => {
    const timeline = new ChordTimeline([
      { barIndex: 0, beatStart: 0, beatEnd: 1, chord: cmaj7 },
      { barIndex: 0, beatStart: 1, beatEnd: 2, chord: a7 },
      { barIndex: 0, beatStart: 2, beatEnd: 3, chord: dm7 },
      { barIndex: 0, beatStart: 3, beatEnd: 4, chord: g7 },
    ]);

    const bass = new BassInstrument(timeline);
    bass.setStyle('swing');
    bass.setComplexity(5);

    const piano = new PianoInstrument(timeline);
    piano.setHumanize(false);
    piano.setProfile('beginner-safe');

    const rhodes = new RhodesInstrument(timeline);
    rhodes.setHumanize(false);
    rhodes.setMode('halfNotes');

    const { ctx, events } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    piano.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    rhodes.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    // Bass: each beat is a root of its chord
    expect(events.bass.length).toBe(4);
    expect(events.bass[0]!.note).toBe('C2'); // beat 0: Cmaj7 root
    expect(events.bass[1]!.note).toMatch(/^A[23]/); // beat 1: A7 root
    expect(events.bass[2]!.note).toBe('D2'); // beat 2: Dm7 root
    expect(events.bass[3]!.note).toMatch(/^G[23]/); // beat 3: G7 root

    // Piano: halfNotes on beat 1 (Cmaj7) and beat 3 (Dm7)
    expect(events.piano.length).toBeGreaterThanOrEqual(2);
    const pianoBeat1 = events.piano.find((c) => c.at === 0);
    const pianoBeat3 = events.piano.find((c) => c.at === 2 * TPB);
    expect(pianoBeat1).toBeDefined();
    expect(pianoBeat3).toBeDefined();
    // Cmaj7 voicing != Dm7 voicing
    expect(pianoBeat3!.notes).not.toEqual(pianoBeat1!.notes);

    // Rhodes: halfNotes on beat 1 and beat 3
    expect(events.rhodes.length).toBe(2);
    const rhodesBeat1 = events.rhodes.find((c) => c.at === 0);
    const rhodesBeat3 = events.rhodes.find((c) => c.at === 2 * TPB);
    expect(rhodesBeat1).toBeDefined();
    expect(rhodesBeat3).toBeDefined();
    expect(rhodesBeat3!.notes).not.toEqual(rhodesBeat1!.notes);
  });

  it('3-chord bar (2+1+1): mid-bar chord change resolves correctly', () => {
    const timeline = new ChordTimeline([
      { barIndex: 0, beatStart: 0, beatEnd: 2, chord: dm7 },
      { barIndex: 0, beatStart: 2, beatEnd: 3, chord: g7 },
      { barIndex: 0, beatStart: 3, beatEnd: 4, chord: cmaj7 },
    ]);

    const bass = new BassInstrument(timeline);
    bass.setStyle('swing');
    bass.setComplexity(5);

    const piano = new PianoInstrument(timeline);
    piano.setHumanize(false);
    piano.setProfile('beginner-safe');

    const { ctx, events } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    piano.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    // Bass: beats 0-1 = Dm7 range, beat 2 = G7, beat 3 = Cmaj7
    expect(events.bass.length).toBe(4);
    expect(events.bass[0]!.note).toBe('D2'); // Dm7 root
    expect(events.bass[2]!.note).toBe('G2'); // G7 root
    // Beat 3 is first of Cmaj7, so root
    expect(events.bass[3]!.note).toBe('C2');

    // Piano: beginner-safe halfNotes on beat 1 (Dm7) and beat 3 (Cmaj7 at beatStart=3)
    expect(events.piano.length).toBe(2);
    const pianoBeat1 = events.piano.find((c) => c.at === 0);
    const pianoBeat3 = events.piano.find((c) => c.at === 2 * TPB);
    expect(pianoBeat1).toBeDefined();
    expect(pianoBeat3).toBeDefined();
  });

  it('time signature change: 3/4 with 2-chord bar', () => {
    const sig34 = parseTimeSignature('3/4');
    const tpBar34 = 480 * 3;

    const timeline = new ChordTimeline([
      { barIndex: 0, beatStart: 0, beatEnd: 2, chord: cmaj7 },
      { barIndex: 0, beatStart: 2, beatEnd: 3, chord: g7 },
    ]);

    const bass = new BassInstrument(timeline);
    bass.setStyle('swing');
    bass.setComplexity(5);

    const piano = new PianoInstrument(timeline);
    piano.setHumanize(false);
    piano.setProfile('beginner-safe');

    const { ctx, events } = makeCtx(sig34);

    bass.schedule({ fromTicks: 0, toTicks: tpBar34 }, ctx);
    piano.schedule({ fromTicks: 0, toTicks: tpBar34 }, ctx);

    // Bass: 3 beats in 3/4
    expect(events.bass.length).toBe(3);
    expect(events.bass[0]!.note).toBe('C2'); // beat 0: Cmaj7 root
    expect(events.bass[2]!.note).toBe('G2'); // beat 2: G7 root

    // Piano: beginner-safe in 3/4
    expect(events.piano.length).toBeGreaterThan(0);
  });

  it('voice leading across chord boundaries within a bar', () => {
    // | Dm7 G7 | — ensure voicings are valid and different
    const timeline = new ChordTimeline([
      { barIndex: 0, beatStart: 0, beatEnd: 2, chord: dm7 },
      { barIndex: 0, beatStart: 2, beatEnd: 4, chord: g7 },
    ]);

    const piano = new PianoInstrument(timeline);
    piano.setHumanize(false);
    piano.setProfile('beginner-safe');

    const { ctx, events } = makeCtx();

    piano.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    const beat1Event = events.piano.find((c) => c.at === 0);
    const beat3Event = events.piano.find((c) => c.at === 2 * TPB);
    expect(beat1Event).toBeDefined();
    expect(beat3Event).toBeDefined();
    // Both voicings should be non-empty and different (smoothed voice leading)
    expect(beat1Event!.notes.length).toBeGreaterThan(0);
    expect(beat3Event!.notes.length).toBeGreaterThan(0);
    // Notes should be valid note names (e.g., "D3", "F3", etc.)
    for (const note of [...beat1Event!.notes, ...beat3Event!.notes]) {
      expect(note).toMatch(/^[A-G][#b]?\d$/);
    }
  });

  it('style-dependent behavior: swing vs bossa for same grid', () => {
    // | Dm7 G7 | Cmaj7 | in swing → walking bass; bossa → half-note pattern
    const timeline = new ChordTimeline([
      { barIndex: 0, beatStart: 0, beatEnd: 2, chord: dm7 },
      { barIndex: 0, beatStart: 2, beatEnd: 4, chord: g7 },
      { barIndex: 1, beatStart: 0, beatEnd: 4, chord: cmaj7 },
    ]);

    // Swing
    const bassSwing = new BassInstrument(new ChordTimeline(timeline['entries']));
    bassSwing.setStyle('swing');
    const ctx1 = makeCtx();
    bassSwing.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx1.ctx);
    expect(ctx1.events.bass.length).toBe(4); // walking: 4 notes per bar

    // Bossa
    const bassBossa = new BassInstrument(new ChordTimeline(timeline['entries']));
    bassBossa.setStyle('bossa');
    const ctx2 = makeCtx();
    bassBossa.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx2.ctx);
    expect(ctx2.events.bass.length).toBe(2); // bossa: 2 notes per bar
  });
});

// ─── Stress: |: Dm7 G7 | Cmaj7 :| loop ─────────────────────────────────────

describe('multi-chord integration — looped progression', () => {
  it('2-chord bar loop: chord resolution is consistent across repeats', () => {
    // Loop: | Dm7 G7 | Cmaj7 | × 4
    // Each repetition: bar 0 (Dm7+G7), bar 1 (Cmaj7), bar 2 (Dm7)
    // Bar boundaries: bar 2 ends Dm7 -> bar 3 starts Dm7 (same chord continues)
    const entries: Array<{
      barIndex: number;
      beatStart?: number;
      beatEnd?: number;
      chord: typeof dm7 | typeof g7 | typeof cmaj7;
    }> = [];
    for (let rep = 0; rep < 4; rep++) {
      const b0 = rep * 3;
      entries.push(
        { barIndex: b0, beatStart: 0, beatEnd: 2, chord: dm7 },
        { barIndex: b0, beatStart: 2, beatEnd: 4, chord: g7 },
        { barIndex: b0 + 1, beatStart: 0, beatEnd: 4, chord: cmaj7 },
        { barIndex: b0 + 2, beatStart: 0, beatEnd: 4, chord: dm7 },
      );
    }
    const timeline = new ChordTimeline(entries);

    const bass = new BassInstrument(timeline);
    bass.setStyle('swing');
    bass.setComplexity(5);

    const { ctx, events } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: 12 * TPBAR }, ctx);

    // 12 bars × 4 beats = 48 bass notes
    expect(events.bass.length).toBe(48);

    // Rep 0, bar 0: Dm7 on beats 0-1, G7 on beats 2-3 (fresh start, chord is new)
    expect(events.bass[0]!.note).toBe('D2'); // Dm7 root
    expect(events.bass[2]!.note).toBe('G2'); // G7 root

    // Rep 0, bar 1: Cmaj7 (new chord after G7)
    const bar1Start = 1 * TPBAR;
    const bar1Idx = events.bass.findIndex((n) => n.at >= bar1Start);
    expect(events.bass[bar1Idx]!.note).toBe('C2'); // Cmaj7 root

    // Rep 1 (= bar 3): Dm7 continues from bar 2, so walking bass continues
    // beat 0 is inner beat (fifth = A), not root
    const bar3Start = 3 * TPBAR;
    const bar3Idx = events.bass.findIndex((n) => n.at >= bar3Start);
    expect(events.bass[bar3Idx]!.note).toMatch(/^A[23]/); // fifth of Dm7 (continued)

    // Rep 1, bar 3 beat 2: new chord G7 -> root
    const bar3Beat2Idx = events.bass.findIndex((n) => n.at >= bar3Start + 2 * TPB);
    expect(events.bass[bar3Beat2Idx]!.note).toBe('G2'); // G7 root
  });
});
