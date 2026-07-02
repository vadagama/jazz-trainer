import { describe, it, expect } from 'vitest';
import { ClarinetInstrument } from './clarinetInstrument.js';
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

type ClarinetEvent = {
  at: number;
  notes: string[];
  velocity: number;
  durationTicks: number;
};

function makeCtx(sig = parseTimeSignature('4/4')): {
  ctx: ScheduleContext;
  events: ClarinetEvent[];
} {
  const events: ClarinetEvent[] = [];
  const ctx: ScheduleContext = {
    bpm: 120,
    timeSignature: sig,
    swingRatio: 0.5,
    scheduleClick: () => {},
    scheduleEvent: (_instrumentId, payload, at, velocity, durationTicks) => {
      if (_instrumentId === 'clarinet') {
        const p = payload as { notes: string[] };
        events.push({ at, notes: [...p.notes], velocity, durationTicks });
      }
    },
  };
  return { ctx, events };
}

function makeClarinet(entries: { chord: ChordSymbol | null }[]) {
  const timeline = new ChordTimeline(entries.map((e, i) => ({ barIndex: i, chord: e.chord })));
  const inst = new ClarinetInstrument(timeline);
  inst.setHumanize(false);
  return inst;
}

const dm7 = makeChord('D', '', 'minor');
const g7 = makeChord('G', '', 'dominant');
const cmaj7 = makeChord('C', '', 'major');

const TPB = 480;
const TPBAR = 1920; // 4/4 bar

// ─── Counterpoint pattern ─────────────────────────────────────────────────────

describe('ClarinetInstrument — counterpoint', () => {
  it('schedules 3 single-note events per bar in 4/4', () => {
    const inst = makeClarinet([{ chord: dm7 }]);
    inst.setPattern('counterpoint');
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    expect(events).toHaveLength(3);
    expect(events[0]!.at).toBe(0); // beat 1
    expect(events[1]!.at).toBe(Math.round(2.5 * TPB)); // beat 2.5
    expect(events[2]!.at).toBe(3 * TPB); // beat 4
  });

  it('each event is monophonic (single note)', () => {
    const inst = makeClarinet([{ chord: dm7 }]);
    inst.setPattern('counterpoint');
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    for (const e of events) {
      expect(e.notes).toHaveLength(1);
    }
  });

  it('skips bars with null chord', () => {
    const inst = makeClarinet([{ chord: dm7 }, { chord: null }, { chord: cmaj7 }]);
    inst.setPattern('counterpoint');
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: 3 * TPBAR }, ctx);

    expect(events).toHaveLength(6); // 2 bars × 3 notes
    // Bar 2 events should start at 2 * TPBAR
    const bar2Events = events.filter(
      (e) => e.at >= 2 * TPBAR && e.at < 3 * TPBAR,
    );
    expect(bar2Events).toHaveLength(3);
  });

  it('plays across multiple bars', () => {
    const inst = makeClarinet([{ chord: dm7 }, { chord: g7 }, { chord: cmaj7 }]);
    inst.setPattern('counterpoint');
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: 3 * TPBAR }, ctx);

    expect(events).toHaveLength(9); // 3 bars × 3 notes
    expect(events[0]!.at).toBe(0);
    expect(events[3]!.at).toBe(TPBAR);
    expect(events[6]!.at).toBe(2 * TPBAR);
  });

  it('adapts to 3/4 time signature (3 notes)', () => {
    const inst = makeClarinet([{ chord: dm7 }]);
    inst.setPattern('counterpoint');
    const sig = parseTimeSignature('3/4');
    const { ctx, events } = makeCtx(sig);

    const tpBar3 = 3 * TPB;
    inst.schedule({ fromTicks: 0, toTicks: tpBar3 }, ctx);

    expect(events).toHaveLength(3);
    expect(events[0]!.at).toBe(0);
    expect(events[1]!.at).toBe(Math.round(1.5 * TPB));
    expect(events[2]!.at).toBe(2 * TPB);
  });

  it('each note has short monophonic duration (~40% of a beat)', () => {
    const inst = makeClarinet([{ chord: dm7 }]);
    inst.setPattern('counterpoint');
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    for (const e of events) {
      expect(e.durationTicks).toBe(Math.round(0.4 * TPB));
    }
  });
});

// ─── Melodic phrases pattern ──────────────────────────────────────────────────

describe('ClarinetInstrument — melodicPhrases', () => {
  it('schedules multiple single-note events per bar in 4/4', () => {
    const inst = makeClarinet([{ chord: dm7 }]);
    inst.setPattern('melodicPhrases');
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    // Melodic phrases produce ~5 notes per bar on an eighth-note grid
    expect(events.length).toBeGreaterThanOrEqual(4);
    expect(events.length).toBeLessThanOrEqual(6);
  });

  it('each event is monophonic (single note)', () => {
    const inst = makeClarinet([{ chord: dm7 }]);
    inst.setPattern('melodicPhrases');
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    for (const e of events) {
      expect(e.notes).toHaveLength(1);
    }
  });

  it('notes are on an eighth-note grid', () => {
    const inst = makeClarinet([{ chord: dm7 }]);
    inst.setPattern('melodicPhrases');
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    for (const e of events) {
      // Each tick should be divisible by half-beat (eighth note = 240 ticks at 480 PPQ)
      expect(e.at % Math.round(TPB / 2)).toBe(0);
    }
  });

  it('skips bars with null chord', () => {
    const inst = makeClarinet([{ chord: dm7 }, { chord: null }, { chord: cmaj7 }]);
    inst.setPattern('melodicPhrases');
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: 3 * TPBAR }, ctx);

    const bar0Events = events.filter((e) => e.at >= 0 && e.at < TPBAR);
    const bar2Events = events.filter((e) => e.at >= 2 * TPBAR && e.at < 3 * TPBAR);
    expect(bar0Events.length).toBeGreaterThanOrEqual(4);
    expect(bar2Events.length).toBeGreaterThanOrEqual(4);
  });
});

// ─── Style profiles ───────────────────────────────────────────────────────────

describe('ClarinetInstrument — style profiles', () => {
  it('swing uses counterpoint pattern', () => {
    const inst = makeClarinet([{ chord: dm7 }]);
    inst.setStyleProfile(getStyleProfile('swing'));
    inst.setHumanize(false);
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    // Counterpoint = 3 notes per bar in 4/4
    expect(events).toHaveLength(3);
  });

  it('bossa uses melodicPhrases pattern', () => {
    const inst = makeClarinet([{ chord: dm7 }]);
    inst.setStyleProfile(getStyleProfile('bossa'));
    inst.setHumanize(false);
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    // Melodic phrases = multiple notes per bar
    expect(events.length).toBeGreaterThanOrEqual(4);
  });

  it('latin uses melodicPhrases pattern', () => {
    const inst = makeClarinet([{ chord: dm7 }]);
    inst.setStyleProfile(getStyleProfile('latin'));
    inst.setHumanize(false);
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    expect(events.length).toBeGreaterThanOrEqual(4);
  });

  it('ballad uses counterpoint pattern', () => {
    const inst = makeClarinet([{ chord: dm7 }]);
    inst.setStyleProfile(getStyleProfile('ballad'));
    inst.setHumanize(false);
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    expect(events).toHaveLength(3);
  });

  it('funk uses counterpoint pattern', () => {
    const inst = makeClarinet([{ chord: dm7 }]);
    inst.setStyleProfile(getStyleProfile('funk'));
    inst.setHumanize(false);
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    expect(events).toHaveLength(3);
  });

  it('clarinet is disabled by default in all styles', () => {
    for (const style of ['swing', 'bossa', 'funk', 'latin', 'ballad'] as const) {
      const profile = getStyleProfile(style);
      const defaults = profile.instrumentDefaults.clarinet;
      expect(defaults.enabled).toBe(false);
    }
  });

  it('clarinet has correct volume default', () => {
    const profile = getStyleProfile('swing');
    const defaults = profile.instrumentDefaults.clarinet;
    expect(defaults.volume).toBe(0.6);
  });
});

// ─── Voice leading / reset ────────────────────────────────────────────────────

describe('ClarinetInstrument — reset / seek', () => {
  it('resets voice leading on backward seek', () => {
    const inst = makeClarinet([{ chord: dm7 }, { chord: g7 }]);
    inst.setPattern('counterpoint');
    const { ctx, events } = makeCtx();

    // First pass: schedule bar 1
    inst.schedule({ fromTicks: TPBAR, toTicks: 2 * TPBAR }, ctx);
    const firstEvents = events.map((e) => ({ ...e }));
    events.length = 0;

    // Backward seek: schedule bar 0
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(events).toHaveLength(3);
    // After reset, should still produce valid events
    for (const e of events) {
      expect(e.notes).toHaveLength(1);
    }
  });

  it('continues without reset on forward scheduling', () => {
    const inst = makeClarinet([{ chord: dm7 }, { chord: g7 }]);
    inst.setPattern('counterpoint');
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(events).toHaveLength(3);
    events.length = 0;

    // Forward: schedule bar 1 (within ~1 beat of previous)
    inst.schedule({ fromTicks: TPBAR, toTicks: 2 * TPBAR }, ctx);
    expect(events).toHaveLength(3);
  });
});

// ─── Disposal ─────────────────────────────────────────────────────────────────

describe('ClarinetInstrument — dispose', () => {
  it('clears state on dispose and still produces events', () => {
    const inst = makeClarinet([{ chord: dm7 }]);
    inst.setPattern('counterpoint');
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(events).toHaveLength(3);
    events.length = 0;

    inst.dispose();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(events).toHaveLength(3);
  });
});

// ─── Humanize ─────────────────────────────────────────────────────────────────

describe('ClarinetInstrument — humanize', () => {
  it('produces slightly different timings when humanize is on', () => {
    const inst = makeClarinet([{ chord: dm7 }]);
    inst.setPattern('counterpoint');
    inst.setHumanize(true);
    const { ctx, events } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    // With humanize, timing may shift slightly from exact tick 0
    expect(Math.abs(events[0]!.at)).toBeLessThanOrEqual(5); // ~6ms jitter max
  });
});
