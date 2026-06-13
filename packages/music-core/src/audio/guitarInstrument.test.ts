import { describe, it, expect } from 'vitest';
import { GuitarInstrument } from './guitarInstrument.js';
import { ChordTimeline } from './chordTimeline.js';
import { parseTimeSignature } from '../time/timeSignature.js';
import type { ScheduleContext, GuitarEvent } from './instrument.js';
import type { ChordSymbol } from '@jazz/shared';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeChord(
  root: ChordSymbol['root'],
  accidental: ChordSymbol['rootAccidental'] = '',
  quality: ChordSymbol['quality'] = 'major',
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

function makeCtx(sig = parseTimeSignature('4/4')): {
  ctx: ScheduleContext;
  events: Array<{ notes: string[]; strum: string; at: number; velocity: number }>;
} {
  const events: Array<{ notes: string[]; strum: string; at: number; velocity: number }> = [];
  const ctx: ScheduleContext = {
    bpm: 120,
    timeSignature: sig,
    swingRatio: 0.5,
    scheduleClick: () => {},
    scheduleEvent: (_instrumentId, payload, at, velocity) => {
      if (_instrumentId === 'guitar') {
        const p = payload as GuitarEvent;
        events.push({ notes: [...p.notes], strum: p.strum, at, velocity });
      }
    },
  };
  return { ctx, events };
}

const TPB = 480;
const TPBAR = 1920;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GuitarInstrument', () => {
  const cmaj7 = makeChord('C', '', 'major');
  const dm7 = makeChord('D', '', 'minor');
  const g7 = makeChord('G', '', 'dominant');

  describe('comp mode', () => {
    it('schedules 4 strums per bar on beats 1–4', () => {
      const inst = new GuitarInstrument(new ChordTimeline([{ barIndex: 0, chord: cmaj7 }]));
      inst.setHumanize(false);
      const { ctx, events } = makeCtx();

      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

      expect(events).toHaveLength(4);
      expect(events.map((e) => e.at)).toEqual([0, TPB, 2 * TPB, 3 * TPB]);
    });

    it('alternates down-up-down-up strums', () => {
      const inst = new GuitarInstrument(new ChordTimeline([{ barIndex: 0, chord: cmaj7 }]));
      inst.setHumanize(false);
      const { ctx, events } = makeCtx();

      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

      expect(events.map((e) => e.strum)).toEqual(['down', 'up', 'down', 'up']);
    });

    it('produces 4+ notes per voicing for open voicing', () => {
      const inst = new GuitarInstrument(new ChordTimeline([{ barIndex: 0, chord: cmaj7 }]));
      inst.setVoicing('open');
      inst.setHumanize(false);
      const { ctx, events } = makeCtx();

      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

      for (const event of events) {
        expect(event.notes.length).toBeGreaterThanOrEqual(4);
      }
    });

    it('produces 3+ notes per voicing for jazz voicing', () => {
      const inst = new GuitarInstrument(new ChordTimeline([{ barIndex: 0, chord: dm7 }]));
      inst.setVoicing('jazz');
      inst.setHumanize(false);
      const { ctx, events } = makeCtx();

      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

      for (const event of events) {
        expect(event.notes.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('follows chord changes across bars', () => {
      const inst = new GuitarInstrument(
        new ChordTimeline([
          { barIndex: 0, chord: dm7 },
          { barIndex: 1, chord: g7 },
          { barIndex: 2, chord: cmaj7 },
        ]),
      );
      inst.setHumanize(false);
      const { ctx, events } = makeCtx();

      inst.schedule({ fromTicks: 0, toTicks: TPBAR * 3 }, ctx);

      expect(events).toHaveLength(12); // 3 bars × 4 strums
    });

    it('skips bars with null chord', () => {
      const inst = new GuitarInstrument(
        new ChordTimeline([
          { barIndex: 0, chord: dm7 },
          { barIndex: 1, chord: null },
          { barIndex: 2, chord: cmaj7 },
        ]),
      );
      inst.setHumanize(false);
      const { ctx, events } = makeCtx();

      inst.schedule({ fromTicks: 0, toTicks: TPBAR * 3 }, ctx);

      expect(events).toHaveLength(8); // 2 bars × 4 strums
    });

    it('only schedules within the given window', () => {
      const inst = new GuitarInstrument(new ChordTimeline([{ barIndex: 0, chord: cmaj7 }]));
      inst.setHumanize(false);
      const { ctx, events } = makeCtx();

      inst.schedule({ fromTicks: TPB - 100, toTicks: 3 * TPB }, ctx);

      // Beat 1 at 0 is excluded (before fromTicks=380), beats 2 and 3 are in range
      expect(events.map((e) => e.at)).toEqual([TPB, 2 * TPB]);
    });

    it('comp velocities follow pattern: 0.75, 0.55, 0.70, 0.50', () => {
      const inst = new GuitarInstrument(new ChordTimeline([{ barIndex: 0, chord: cmaj7 }]));
      inst.setHumanize(false);
      const { ctx, events } = makeCtx();

      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

      expect(events.map((e) => e.velocity)).toEqual([0.75, 0.55, 0.7, 0.5]);
    });
  });

  describe('fingerstyle mode', () => {
    it('schedules 2 events per bar on beats 1 and 3', () => {
      const inst = new GuitarInstrument(new ChordTimeline([{ barIndex: 0, chord: cmaj7 }]));
      inst.setMode('fingerstyle');
      inst.setHumanize(false);
      const { ctx, events } = makeCtx();

      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

      expect(events).toHaveLength(2);
      expect(events.map((e) => e.at)).toEqual([0, 2 * TPB]);
    });

    it('each event has exactly 1 note (arpeggio)', () => {
      const inst = new GuitarInstrument(new ChordTimeline([{ barIndex: 0, chord: cmaj7 }]));
      inst.setMode('fingerstyle');
      inst.setHumanize(false);
      const { ctx, events } = makeCtx();

      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

      for (const event of events) {
        expect(event.notes).toHaveLength(1);
      }
    });
  });

  describe('humanize', () => {
    it('does not throw with humanize enabled', () => {
      const inst = new GuitarInstrument(new ChordTimeline([{ barIndex: 0, chord: cmaj7 }]));
      const { ctx } = makeCtx();

      expect(() => inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx)).not.toThrow();
    });

    it('events stay within the window with humanize', () => {
      const inst = new GuitarInstrument(new ChordTimeline([{ barIndex: 0, chord: cmaj7 }]));
      // Multiple runs to cover jitter randomness
      for (let i = 0; i < 10; i++) {
        const { ctx, events } = makeCtx();
        inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
        for (const event of events) {
          expect(event.at).toBeGreaterThanOrEqual(0);
          expect(event.at).toBeLessThan(TPBAR);
        }
      }
    });
  });

  describe('edge cases', () => {
    it('does not throw with empty timeline', () => {
      const inst = new GuitarInstrument(new ChordTimeline([]));
      const { ctx } = makeCtx();

      expect(() => inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx)).not.toThrow();
    });

    it('does not throw when scheduleEvent is a no-op', () => {
      const inst = new GuitarInstrument(new ChordTimeline([{ barIndex: 0, chord: cmaj7 }]));
      const ctx: ScheduleContext = {
        bpm: 120,
        timeSignature: parseTimeSignature('4/4'),
        swingRatio: 0.5,
        scheduleClick: () => {},
        scheduleEvent: () => {},
      };

      expect(() => inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx)).not.toThrow();
    });

    it('dispose is a no-op', () => {
      const inst = new GuitarInstrument(new ChordTimeline([]));
      expect(() => inst.dispose()).not.toThrow();
    });

    it('setTimeline / setMode / setVoicing do not throw', () => {
      const inst = new GuitarInstrument(new ChordTimeline([]));
      expect(() => inst.setTimeline(new ChordTimeline([]))).not.toThrow();
      expect(() => inst.setMode('fingerstyle')).not.toThrow();
      expect(() => inst.setVoicing('open')).not.toThrow();
      expect(() => inst.setHumanize(false)).not.toThrow();
    });
  });
});
