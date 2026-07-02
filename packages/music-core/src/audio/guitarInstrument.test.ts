import { describe, it, expect } from 'vitest';
import { GuitarInstrument } from './guitarInstrument.js';
import { ChordTimeline } from './chordTimeline.js';
import { parseTimeSignature } from '../time/timeSignature.js';
import type { ScheduleContext, GuitarEvent } from './instrument.js';
import type { ChordSymbol } from '@jazz/shared';
import { getStyleProfile } from '../styleProfile.js';

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

function makeCtx(
  sig = parseTimeSignature('4/4'),
  instrumentId = 'guitar',
): {
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
      if (_instrumentId === instrumentId) {
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

  describe('setStyleProfile', () => {
    it('applies bossa style profile', () => {
      const inst = new GuitarInstrument(new ChordTimeline([]));
      inst.setStyleProfile(getStyleProfile('bossa'));
      // style is private, but schedule will dispatch to bossa comping
      // Verify by checking schedule output
      const { ctx, events } = makeCtx();
      const timeline = new ChordTimeline([{ barIndex: 0, chord: cmaj7 }]);
      inst.setTimeline(timeline);
      inst.setHumanize(false);
      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
      // Bossa produces 8 events per bar (4 bass + 4 chords) in 4/4
      expect(events).toHaveLength(8);
    });

    it('deprecated setStyle also works', () => {
      const inst = new GuitarInstrument(new ChordTimeline([]));
      inst.setStyle('bossa');
      const { ctx, events } = makeCtx();
      const timeline = new ChordTimeline([{ barIndex: 0, chord: cmaj7 }]);
      inst.setTimeline(timeline);
      inst.setHumanize(false);
      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
      expect(events).toHaveLength(8);
    });

    it('swing style uses freddie-green pattern', () => {
      const inst = new GuitarInstrument(new ChordTimeline([]));
      inst.setStyleProfile(getStyleProfile('swing'));
      expect(inst.getPattern()).toBe('freddie-green');

      const { ctx, events } = makeCtx();
      const timeline = new ChordTimeline([{ barIndex: 0, chord: cmaj7 }]);
      inst.setTimeline(timeline);
      inst.setHumanize(false);
      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
      // Freddie Green: 4 quarter-note chords per bar, all down strums
      expect(events).toHaveLength(4);
      expect(events.map((e) => e.strum)).toEqual(['down', 'down', 'down', 'down']);
      // All notes in C3–C4 range
      for (const e of events) {
        for (const n of e.notes) {
          const octave = parseInt(n.slice(-1), 10);
          expect(octave).toBeGreaterThanOrEqual(3);
          expect(octave).toBeLessThanOrEqual(4);
        }
      }
    });

    it('fingerstyle mode ignores style dispatch', () => {
      const inst = new GuitarInstrument(new ChordTimeline([]));
      inst.setMode('fingerstyle');
      inst.setStyleProfile(getStyleProfile('bossa'));
      const { ctx, events } = makeCtx();
      const timeline = new ChordTimeline([{ barIndex: 0, chord: cmaj7 }]);
      inst.setTimeline(timeline);
      inst.setHumanize(false);
      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
      // Fingerstyle overrides style: 2 events per bar
      expect(events).toHaveLength(2);
    });
  });

  describe('boss comping', () => {
    function makeBossaInst(chord: ChordSymbol = cmaj7): GuitarInstrument {
      const inst = new GuitarInstrument(new ChordTimeline([{ barIndex: 0, chord }]));
      inst.setStyleProfile(getStyleProfile('bossa'));
      inst.setHumanize(false);
      return inst;
    }

    it('schedules 8 events per bar in 4/4 (4 bass + 4 chords)', () => {
      const inst = makeBossaInst();
      const { ctx, events } = makeCtx();
      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
      expect(events).toHaveLength(8);
    });

    it('bass notes are on downbeats 0, 480, 960, 1440', () => {
      const inst = makeBossaInst();
      const { ctx, events } = makeCtx();
      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

      const bassEvents = events.filter((e) => e.notes.length === 1);
      expect(bassEvents).toHaveLength(4);
      expect(bassEvents.map((e) => e.at)).toEqual([0, TPB, 2 * TPB, 3 * TPB]);
    });

    it('chords are on offbeats 240, 720, 1200, 1680', () => {
      const inst = makeBossaInst();
      const { ctx, events } = makeCtx();
      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

      const chordEvents = events.filter((e) => e.notes.length > 1);
      expect(chordEvents).toHaveLength(4);
      expect(chordEvents.map((e) => e.at)).toEqual([
        Math.round(TPB / 2),
        TPB + Math.round(TPB / 2),
        2 * TPB + Math.round(TPB / 2),
        3 * TPB + Math.round(TPB / 2),
      ]);
    });

    it('bass notes have down strum, chords have up strum', () => {
      const inst = makeBossaInst();
      const { ctx, events } = makeCtx();
      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

      const bassEvents = events.filter((e) => e.notes.length === 1);
      const chordEvents = events.filter((e) => e.notes.length > 1);

      for (const e of bassEvents) expect(e.strum).toBe('down');
      for (const e of chordEvents) expect(e.strum).toBe('up');
    });

    it('root on beats 1,3; fifth on beats 2,4', () => {
      const inst = makeBossaInst();
      const { ctx, events } = makeCtx();
      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

      const bassEvents = events.filter((e) => e.notes.length === 1);
      // Beat 1: root = C2, Beat 2: fifth = G2, Beat 3: root = C2, Beat 4: fifth = G2
      const expectedNotes = ['C2', 'G2', 'C2', 'G2'];
      for (let i = 0; i < 4; i++) {
        expect(bassEvents[i]!.notes[0]).toBe(expectedNotes[i]);
      }
    });

    it('chords use the full voicing (3+ notes)', () => {
      const inst = makeBossaInst();
      const { ctx, events } = makeCtx();
      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

      const chordEvents = events.filter((e) => e.notes.length > 1);
      for (const e of chordEvents) {
        expect(e.notes.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('only schedules within the given window', () => {
      const inst = makeBossaInst();
      const { ctx, events } = makeCtx();

      inst.schedule({ fromTicks: TPB - 100, toTicks: 3 * TPB }, ctx);

      // Beat 1 events at 0 are excluded (before fromTicks=380)
      // Offbeat of beat 1 at 240 is also before fromTicks
      for (const e of events) {
        expect(e.at).toBeGreaterThanOrEqual(TPB - 100);
        expect(e.at).toBeLessThan(3 * TPB);
      }
    });

    it('skips bars with null chord', () => {
      const inst = new GuitarInstrument(
        new ChordTimeline([
          { barIndex: 0, chord: cmaj7 },
          { barIndex: 1, chord: null },
          { barIndex: 2, chord: cmaj7 },
        ]),
      );
      inst.setStyleProfile(getStyleProfile('bossa'));
      inst.setHumanize(false);
      const { ctx, events } = makeCtx();

      inst.schedule({ fromTicks: 0, toTicks: TPBAR * 3 }, ctx);

      expect(events).toHaveLength(16); // 2 bars × 8 events
    });

    it('follows chord changes across bars', () => {
      const inst = new GuitarInstrument(
        new ChordTimeline([
          { barIndex: 0, chord: dm7 },
          { barIndex: 1, chord: g7 },
        ]),
      );
      inst.setStyleProfile(getStyleProfile('bossa'));
      inst.setHumanize(false);
      const { ctx, events } = makeCtx();

      inst.schedule({ fromTicks: 0, toTicks: TPBAR * 2 }, ctx);

      // Bar 0 bass notes: D2, A2, D2, A2 (root/fifth of Dm7)
      const bar0Bass = events.filter((e) => e.notes.length === 1).filter((_, i) => i < 4);
      expect(bar0Bass.map((e) => e.notes[0])).toEqual(['D2', 'A2', 'D2', 'A2']);
    });
  });

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

  describe('funk chops', () => {
    function makeFunkInst(id = 'electric-guitar'): GuitarInstrument {
      const inst = new GuitarInstrument(new ChordTimeline([{ barIndex: 0, chord: cmaj7 }]), id);
      inst.setStyleProfile(getStyleProfile('funk'));
      inst.setHumanize(false);
      return inst;
    }

    it('schedules 4 offbeat chords per bar in 4/4', () => {
      const inst = makeFunkInst();
      const { ctx, events } = makeCtx(parseTimeSignature('4/4'), 'electric-guitar');
      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
      expect(events).toHaveLength(4);
    });

    it('chords are on offbeats: 240, 720, 1200, 1680', () => {
      const inst = makeFunkInst();
      const { ctx, events } = makeCtx(parseTimeSignature('4/4'), 'electric-guitar');
      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

      expect(events.map((e) => e.at)).toEqual([
        Math.round(TPB / 2),
        TPB + Math.round(TPB / 2),
        2 * TPB + Math.round(TPB / 2),
        3 * TPB + Math.round(TPB / 2),
      ]);
    });

    it('all chords use down strum', () => {
      const inst = makeFunkInst();
      const { ctx, events } = makeCtx(parseTimeSignature('4/4'), 'electric-guitar');
      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

      for (const e of events) {
        expect(e.strum).toBe('down');
      }
    });

    it('chords have velocity 0.7', () => {
      const inst = makeFunkInst();
      const { ctx, events } = makeCtx(parseTimeSignature('4/4'), 'electric-guitar');
      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

      for (const e of events) {
        expect(e.velocity).toBe(0.7);
      }
    });

    it('only schedules within the given window', () => {
      const inst = makeFunkInst();
      const { ctx, events } = makeCtx(parseTimeSignature('4/4'), 'electric-guitar');

      inst.schedule({ fromTicks: TPB, toTicks: 3 * TPB }, ctx);

      for (const e of events) {
        expect(e.at).toBeGreaterThanOrEqual(TPB);
        expect(e.at).toBeLessThan(3 * TPB);
      }
    });

    it('skips bars with null chord', () => {
      const inst = new GuitarInstrument(
        new ChordTimeline([
          { barIndex: 0, chord: cmaj7 },
          { barIndex: 1, chord: null },
          { barIndex: 2, chord: cmaj7 },
        ]),
        'electric-guitar',
      );
      inst.setStyleProfile(getStyleProfile('funk'));
      inst.setHumanize(false);
      const { ctx, events } = makeCtx(parseTimeSignature('4/4'), 'electric-guitar');

      inst.schedule({ fromTicks: 0, toTicks: TPBAR * 3 }, ctx);

      expect(events).toHaveLength(8); // 2 bars x 4 offbeats
    });

    it('fingerstyle mode ignores funk dispatch', () => {
      const inst = new GuitarInstrument(
        new ChordTimeline([{ barIndex: 0, chord: cmaj7 }]),
        'electric-guitar',
      );
      inst.setMode('fingerstyle');
      inst.setStyleProfile(getStyleProfile('funk'));
      inst.setHumanize(false);
      const { ctx, events } = makeCtx(parseTimeSignature('4/4'), 'electric-guitar');

      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

      // Fingerstyle overrides style dispatch: 2 events per bar
      expect(events).toHaveLength(2);
    });
  });

  describe('freddie green', () => {
    function makeFreddieInst(chord: ChordSymbol = cmaj7): GuitarInstrument {
      const inst = new GuitarInstrument(new ChordTimeline([{ barIndex: 0, chord }]));
      inst.setStyleProfile(getStyleProfile('swing'));
      inst.setHumanize(false);
      return inst;
    }

    it('schedules 4 quarter-note chords per bar in 4/4', () => {
      const inst = makeFreddieInst();
      const { ctx, events } = makeCtx();
      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
      expect(events).toHaveLength(4);
    });

    it('chords are on downbeats 0, 480, 960, 1440', () => {
      const inst = makeFreddieInst();
      const { ctx, events } = makeCtx();
      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
      expect(events.map((e) => e.at)).toEqual([0, TPB, 2 * TPB, 3 * TPB]);
    });

    it('all chords use down strum', () => {
      const inst = makeFreddieInst();
      const { ctx, events } = makeCtx();
      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
      for (const e of events) {
        expect(e.strum).toBe('down');
      }
    });

    it('notes are in C3-C4 range', () => {
      const inst = makeFreddieInst();
      const { ctx, events } = makeCtx();
      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
      const lowNotes = events.flatMap((e) => e.notes);
      for (const n of lowNotes) {
        const octave = parseInt(n.slice(-1), 10);
        expect(octave).toBeGreaterThanOrEqual(3);
        expect(octave).toBeLessThanOrEqual(4);
      }
    });

    it('chords have velocity 0.55', () => {
      const inst = makeFreddieInst();
      const { ctx, events } = makeCtx();
      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
      for (const e of events) {
        expect(e.velocity).toBe(0.55);
      }
    });

    it('only schedules within the given window', () => {
      const inst = makeFreddieInst();
      const { ctx, events } = makeCtx();
      inst.schedule({ fromTicks: TPB - 100, toTicks: 3 * TPB }, ctx);
      for (const e of events) {
        expect(e.at).toBeGreaterThanOrEqual(TPB - 100);
        expect(e.at).toBeLessThan(3 * TPB);
      }
    });

    it('skips bars with null chord', () => {
      const inst = new GuitarInstrument(
        new ChordTimeline([
          { barIndex: 0, chord: cmaj7 },
          { barIndex: 1, chord: null },
          { barIndex: 2, chord: cmaj7 },
        ]),
      );
      inst.setStyleProfile(getStyleProfile('swing'));
      inst.setHumanize(false);
      const { ctx, events } = makeCtx();
      inst.schedule({ fromTicks: 0, toTicks: TPBAR * 3 }, ctx);
      expect(events).toHaveLength(8);
    });

    it('fingerstyle mode ignores freddie-green dispatch', () => {
      const inst = new GuitarInstrument(new ChordTimeline([{ barIndex: 0, chord: cmaj7 }]));
      inst.setMode('fingerstyle');
      inst.setStyleProfile(getStyleProfile('swing'));
      inst.setHumanize(false);
      const { ctx, events } = makeCtx();
      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
      expect(events).toHaveLength(2);
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
