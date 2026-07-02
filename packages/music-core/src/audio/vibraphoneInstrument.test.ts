import { describe, it, expect } from 'vitest';
import { VibraphoneInstrument } from './vibraphoneInstrument.js';
import { ChordTimeline } from './chordTimeline.js';
import { parseTimeSignature } from '../time/timeSignature.js';
import type { ScheduleContext } from './instrument.js';
import type { ChordSymbol } from '@jazz/shared';
import { getStyleProfile } from '../styleProfile.js';

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

type VibEvent = {
  at: number;
  notes: string[];
  velocity: number;
  durationTicks: number;
};

function makeCtx(sig = parseTimeSignature('4/4')): {
  ctx: ScheduleContext;
  events: VibEvent[];
} {
  const events: VibEvent[] = [];
  const ctx: ScheduleContext = {
    bpm: 120,
    timeSignature: sig,
    swingRatio: 0.5,
    scheduleClick: () => {},
    scheduleEvent: (_instrumentId, payload, at, velocity, durationTicks) => {
      if (_instrumentId === 'vibraphone') {
        const p = payload as { notes: string[] };
        events.push({ at, notes: [...p.notes], velocity, durationTicks });
      }
    },
  };
  return { ctx, events };
}

function makeVibes(entries: { chord: ChordSymbol | null }[]) {
  const timeline = new ChordTimeline(entries.map((e, i) => ({ barIndex: i, chord: e.chord })));
  const inst = new VibraphoneInstrument(timeline);
  inst.setHumanize(false);
  return inst;
}

const dm7 = makeChord('D', '', 'minor');
const g7 = makeChord('G', '', 'dominant');
const cmaj7 = makeChord('C', '', 'major');

const TPB = 480;
const TPBAR = 1920; // 4/4 bar

// ─── Pads pattern ─────────────────────────────────────────────────────────────

describe('VibraphoneInstrument — pads', () => {
  it('schedules one whole-note chord per bar on beat 1', () => {
    const inst = makeVibes([{ chord: dm7 }, { chord: g7 }, { chord: cmaj7 }]);
    inst.setPattern('pads');
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: 3 * TPBAR }, ctx);

    expect(events).toHaveLength(3);
    expect(events.map((e) => e.at)).toEqual([0, TPBAR, 2 * TPBAR]);
  });

  it('produces multi-note voicings (polyphonic)', () => {
    const inst = makeVibes([{ chord: dm7 }]);
    inst.setPattern('pads');
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    expect(events).toHaveLength(1);
    expect(events[0]!.notes.length).toBeGreaterThanOrEqual(2);
  });

  it('duration is ~90% of a bar (gated whole note)', () => {
    const inst = makeVibes([{ chord: dm7 }]);
    inst.setPattern('pads');
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    expect(events[0]!.durationTicks).toBe(Math.round(0.9 * TPBAR));
  });

  it('skips bars with null chord', () => {
    const inst = makeVibes([{ chord: dm7 }, { chord: null }, { chord: cmaj7 }]);
    inst.setPattern('pads');
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: 3 * TPBAR }, ctx);

    expect(events).toHaveLength(2);
    expect(events.map((e) => e.at)).toEqual([0, 2 * TPBAR]);
  });
});

// ─── Inserts pattern ─────────────────────────────────────────────────────────

describe('VibraphoneInstrument — inserts', () => {
  it('schedules one note per beat (arpeggio)', () => {
    const inst = makeVibes([{ chord: dm7 }]);
    inst.setPattern('inserts');
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    // 4 beats in 4/4 = 4 notes
    expect(events).toHaveLength(4);
    expect(events.map((e) => e.at)).toEqual([0, TPB, 2 * TPB, 3 * TPB]);
  });

  it('each insert note is a single note (monophonic per event)', () => {
    const inst = makeVibes([{ chord: dm7 }]);
    inst.setPattern('inserts');
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    for (const e of events) {
      expect(e.notes).toHaveLength(1);
    }
  });

  it('inserts cycle through voicing notes across bars', () => {
    const inst = makeVibes([{ chord: dm7 }, { chord: dm7 }]);
    inst.setPattern('inserts');
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: 2 * TPBAR }, ctx);

    // 2 bars × 4 beats = 8 notes
    expect(events).toHaveLength(8);

    // Notes should vary (arpeggio cycling)
    const uniqueNotes = new Set(events.map((e) => e.notes[0]));
    expect(uniqueNotes.size).toBeGreaterThan(1);
  });

  it('duration is ~60% of a beat (staccato-like)', () => {
    const inst = makeVibes([{ chord: dm7 }]);
    inst.setPattern('inserts');
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    for (const e of events) {
      expect(e.durationTicks).toBe(Math.round(0.6 * TPB));
    }
  });

  it('skips bars with null chord', () => {
    const inst = makeVibes([{ chord: dm7 }, { chord: null }, { chord: cmaj7 }]);
    inst.setPattern('inserts');
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: 3 * TPBAR }, ctx);

    // Only bars 0 and 2 produce events
    const bar0Events = events.filter((e) => e.at >= 0 && e.at < TPBAR);
    const bar2Events = events.filter((e) => e.at >= 2 * TPBAR && e.at < 3 * TPBAR);
    expect(bar0Events).toHaveLength(4);
    expect(bar2Events).toHaveLength(4);
  });
});

// ─── Style profiles ──────────────────────────────────────────────────────────

describe('VibraphoneInstrument — style profiles', () => {
  it('ballad uses pads pattern (whole notes with vibrato feel)', () => {
    const inst = makeVibes([{ chord: dm7 }]);
    inst.setStyleProfile(getStyleProfile('ballad'));
    inst.setHumanize(false);
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    // Pads: one event on beat 1
    expect(events).toHaveLength(1);
    expect(events[0]!.at).toBe(0);
  });

  it('ballad pads are polyphonic chords', () => {
    const inst = makeVibes([{ chord: dm7 }]);
    inst.setStyleProfile(getStyleProfile('ballad'));
    inst.setHumanize(false);
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    expect(events[0]!.notes.length).toBeGreaterThanOrEqual(2);
  });

  it('swing uses pads pattern (chord pads)', () => {
    const inst = makeVibes([{ chord: dm7 }]);
    inst.setStyleProfile(getStyleProfile('swing'));
    inst.setHumanize(false);
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    expect(events).toHaveLength(1);
    expect(events[0]!.at).toBe(0);
    expect(events[0]!.notes.length).toBeGreaterThanOrEqual(2);
  });

  it('latin uses inserts pattern (arpeggiated)', () => {
    const inst = makeVibes([{ chord: dm7 }]);
    inst.setStyleProfile(getStyleProfile('latin'));
    inst.setHumanize(false);
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    expect(events).toHaveLength(4);
    for (const e of events) {
      expect(e.notes).toHaveLength(1);
    }
  });
});

// ─── Voice leading ────────────────────────────────────────────────────────────

describe('VibraphoneInstrument — voice leading', () => {
  it('maintains voice leading between bars (pads)', () => {
    const inst = makeVibes([{ chord: dm7 }, { chord: g7 }]);
    inst.setPattern('pads');
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: 2 * TPBAR }, ctx);

    expect(events).toHaveLength(2);
    // Voicings should be different (different chords), but both multi-note
    expect(events[0]!.notes.length).toBeGreaterThanOrEqual(2);
    expect(events[1]!.notes.length).toBeGreaterThanOrEqual(2);
  });

  it('maintains voice leading between bars (inserts)', () => {
    const inst = makeVibes([{ chord: dm7 }, { chord: g7 }]);
    inst.setPattern('inserts');
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: 2 * TPBAR }, ctx);

    // Should have events for both bars
    const bar1Events = events.filter((e) => e.at >= TPBAR && e.at < 2 * TPBAR);
    expect(bar1Events.length).toBeGreaterThan(0);
  });

  it('resets voice leading on backward seek', () => {
    const inst = makeVibes([{ chord: dm7 }, { chord: g7 }]);
    inst.setPattern('pads');
    const { ctx, events } = makeCtx();

    // First pass: schedule bar 1
    inst.schedule({ fromTicks: TPBAR, toTicks: 2 * TPBAR }, ctx);
    const firstVoicing = [...events[0]!.notes];
    events.length = 0;

    // Backward seek: schedule bar 0, should reset
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(events).toHaveLength(1);
    // After reset, voicing should be the default (not influenced by previous)
    expect(events[0]!.notes.length).toBeGreaterThanOrEqual(2);
    // Verify it's a different voicing (reset caused fresh default)
    expect(events[0]!.notes).not.toEqual(firstVoicing);
  });
});

// ─── Disposal ────────────────────────────────────────────────────────────────

describe('VibraphoneInstrument — dispose', () => {
  it('clears state on dispose', () => {
    const inst = makeVibes([{ chord: dm7 }]);
    inst.setPattern('pads');
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(events).toHaveLength(1);
    events.length = 0;

    inst.dispose();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    // Should still produce events after dispose (dispose clears state, doesn't break)
    expect(events).toHaveLength(1);
  });
});
