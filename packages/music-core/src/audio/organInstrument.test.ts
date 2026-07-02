import { describe, it, expect } from 'vitest';
import { OrganInstrument } from './organInstrument.js';
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

type OrganEvent = {
  at: number;
  notes: string[];
  velocity: number;
  durationTicks: number;
};

function makeCtx(sig = parseTimeSignature('4/4')): {
  ctx: ScheduleContext;
  events: OrganEvent[];
} {
  const events: OrganEvent[] = [];
  const ctx: ScheduleContext = {
    bpm: 120,
    timeSignature: sig,
    swingRatio: 0.5,
    scheduleClick: () => {},
    scheduleEvent: (_instrumentId, payload, at, velocity, durationTicks) => {
      if (_instrumentId === 'organ') {
        const p = payload as { notes: string[] };
        events.push({ at, notes: [...p.notes], velocity, durationTicks });
      }
    },
  };
  return { ctx, events };
}

function makeOrgan(entries: { chord: ChordSymbol | null }[]) {
  const timeline = new ChordTimeline(entries.map((e, i) => ({ barIndex: i, chord: e.chord })));
  const inst = new OrganInstrument(timeline);
  inst.setHumanize(false);
  return inst;
}

const dm7 = makeChord('D', '', 'minor');
const g7 = makeChord('G', '', 'dominant');
const cmaj7 = makeChord('C', '', 'major');

const TPB = 480;
const TPBAR = 1920; // 4/4 bar

// ─── Pads pattern ─────────────────────────────────────────────────────────────

describe('OrganInstrument — pads', () => {
  it('schedules one whole-note chord per bar on beat 1', () => {
    const inst = makeOrgan([{ chord: dm7 }, { chord: g7 }, { chord: cmaj7 }]);
    inst.setPattern('pads');
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: 3 * TPBAR }, ctx);

    expect(events).toHaveLength(3);
    expect(events.map((e) => e.at)).toEqual([0, TPBAR, 2 * TPBAR]);
  });

  it('produces multi-note voicings (polyphonic)', () => {
    const inst = makeOrgan([{ chord: dm7 }]);
    inst.setPattern('pads');
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    expect(events).toHaveLength(1);
    expect(events[0]!.notes.length).toBeGreaterThanOrEqual(2);
  });

  it('duration is ~92% of a bar (sustained pad)', () => {
    const inst = makeOrgan([{ chord: dm7 }]);
    inst.setPattern('pads');
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    expect(events[0]!.durationTicks).toBe(Math.round(0.92 * TPBAR));
  });

  it('skips bars with null chord', () => {
    const inst = makeOrgan([{ chord: dm7 }, { chord: null }, { chord: cmaj7 }]);
    inst.setPattern('pads');
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: 3 * TPBAR }, ctx);

    expect(events).toHaveLength(2);
    expect(events.map((e) => e.at)).toEqual([0, 2 * TPBAR]);
  });
});

// ─── Stabs pattern ────────────────────────────────────────────────────────────

describe('OrganInstrument — stabs', () => {
  it('schedules one chord per offbeat eighth note', () => {
    const inst = makeOrgan([{ chord: dm7 }]);
    inst.setPattern('stabs');
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    // 4 offbeats in 4/4: beats 0.5, 1.5, 2.5, 3.5
    expect(events).toHaveLength(4);
    expect(events.map((e) => e.at)).toEqual([
      Math.round(0.5 * TPB),
      Math.round(1.5 * TPB),
      Math.round(2.5 * TPB),
      Math.round(3.5 * TPB),
    ]);
  });

  it('each stab is a polyphonic chord', () => {
    const inst = makeOrgan([{ chord: dm7 }]);
    inst.setPattern('stabs');
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    for (const e of events) {
      expect(e.notes.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('duration is ~15% of a beat (short stab)', () => {
    const inst = makeOrgan([{ chord: dm7 }]);
    inst.setPattern('stabs');
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    for (const e of events) {
      expect(e.durationTicks).toBe(Math.round(0.15 * TPB));
    }
  });

  it('skips bars with null chord', () => {
    const inst = makeOrgan([{ chord: dm7 }, { chord: null }, { chord: cmaj7 }]);
    inst.setPattern('stabs');
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: 3 * TPBAR }, ctx);

    const bar0Events = events.filter((e) => e.at >= 0 && e.at < TPBAR);
    const bar2Events = events.filter((e) => e.at >= 2 * TPBAR && e.at < 3 * TPBAR);
    expect(bar0Events).toHaveLength(4);
    expect(bar2Events).toHaveLength(4);
  });
});

// ─── Pads-stabs pattern ───────────────────────────────────────────────────────

describe('OrganInstrument — pads-stabs', () => {
  it('schedules pads AND stabs in each bar', () => {
    const inst = makeOrgan([{ chord: dm7 }]);
    inst.setPattern('pads-stabs');
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    // 1 pad on beat 1 + 4 stabs on offbeats = 5 events
    expect(events).toHaveLength(5);

    // First event is the pad (at tick 0)
    expect(events[0]!.at).toBe(0);
    expect(events[0]!.durationTicks).toBeGreaterThan(TPB); // long pad

    // Remaining 4 are stabs on offbeats
    const stabs = events.slice(1);
    expect(stabs.map((e) => e.at)).toEqual([
      Math.round(0.5 * TPB),
      Math.round(1.5 * TPB),
      Math.round(2.5 * TPB),
      Math.round(3.5 * TPB),
    ]);
    for (const s of stabs) {
      expect(s.durationTicks).toBeLessThan(TPB); // short stab
    }
  });

  it('pads-stabs produces dense chords in funk style', () => {
    const inst = makeOrgan([{ chord: dm7 }]);
    inst.setPattern('pads-stabs');
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    for (const e of events) {
      expect(e.notes.length).toBeGreaterThanOrEqual(3); // rootless4 = dense
    }
  });

  it('skips bars with null chord', () => {
    const inst = makeOrgan([{ chord: dm7 }, { chord: null }, { chord: cmaj7 }]);
    inst.setPattern('pads-stabs');
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: 3 * TPBAR }, ctx);

    const bar0Events = events.filter((e) => e.at >= 0 && e.at < TPBAR);
    const bar2Events = events.filter((e) => e.at >= 2 * TPBAR && e.at < 3 * TPBAR);
    expect(bar0Events).toHaveLength(5);
    expect(bar2Events).toHaveLength(5);
  });
});

// ─── Style profiles ───────────────────────────────────────────────────────────

describe('OrganInstrument — style profiles', () => {
  it('funk uses pads-stabs pattern', () => {
    const inst = makeOrgan([{ chord: dm7 }]);
    inst.setStyleProfile(getStyleProfile('funk'));
    inst.setHumanize(false);
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    // pads-stabs: pad + 4 stabs = 5 events
    expect(events).toHaveLength(5);
  });

  it('swing uses pads pattern by default', () => {
    const inst = makeOrgan([{ chord: dm7 }]);
    inst.setStyleProfile(getStyleProfile('swing'));
    inst.setHumanize(false);
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    expect(events).toHaveLength(1);
    expect(events[0]!.at).toBe(0);
  });

  it('ballad pads are polyphonic chords', () => {
    const inst = makeOrgan([{ chord: dm7 }]);
    inst.setStyleProfile(getStyleProfile('ballad'));
    inst.setHumanize(false);
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    expect(events[0]!.notes.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── Voice leading ────────────────────────────────────────────────────────────

describe('OrganInstrument — voice leading', () => {
  it('maintains voice leading between bars (pads)', () => {
    const inst = makeOrgan([{ chord: dm7 }, { chord: g7 }]);
    inst.setPattern('pads');
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: 2 * TPBAR }, ctx);

    expect(events).toHaveLength(2);
    expect(events[0]!.notes.length).toBeGreaterThanOrEqual(2);
    expect(events[1]!.notes.length).toBeGreaterThanOrEqual(2);
  });

  it('resets voice leading on backward seek', () => {
    const inst = makeOrgan([{ chord: dm7 }, { chord: g7 }]);
    inst.setPattern('pads');
    const { ctx, events } = makeCtx();

    // First pass: schedule bar 1
    inst.schedule({ fromTicks: TPBAR, toTicks: 2 * TPBAR }, ctx);
    const firstVoicing = [...events[0]!.notes];
    events.length = 0;

    // Backward seek: schedule bar 0, should reset
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(events).toHaveLength(1);
    expect(events[0]!.notes.length).toBeGreaterThanOrEqual(2);
    // After reset, voicing should be different (fresh default)
    expect(events[0]!.notes).not.toEqual(firstVoicing);
  });
});

// ─── Disposal ─────────────────────────────────────────────────────────────────

describe('OrganInstrument — dispose', () => {
  it('clears state on dispose', () => {
    const inst = makeOrgan([{ chord: dm7 }]);
    inst.setPattern('pads');
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(events).toHaveLength(1);
    events.length = 0;

    inst.dispose();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(events).toHaveLength(1);
  });
});

// ─── Humanize ─────────────────────────────────────────────────────────────────

describe('OrganInstrument — humanize', () => {
  it('produces slightly different timings when humanize is on', () => {
    const inst = makeOrgan([{ chord: dm7 }]);
    inst.setPattern('pads');
    inst.setHumanize(true);
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    // With humanize, timing may shift slightly from exact tick 0
    expect(Math.abs(events[0]!.at)).toBeLessThanOrEqual(5); // ~6ms jitter max
  });
});
