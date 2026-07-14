import { describe, it, expect } from 'vitest';
import { RhodesInstrument } from './rhodesInstrument.js';
import { ChordTimeline } from './chordTimeline.js';
import { parseTimeSignature } from '../time/timeSignature.js';
import type { ScheduleContext } from './instrument.js';
import type { ChordSymbol } from '@jazz/shared';
import { getStyleProfile } from '../styleProfile.js';
import { noteToMidi } from './rhodesVoicing.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeChord(
  root: string,
  quality: ChordSymbol['quality'] = 'major',
  bass?: string,
): ChordSymbol {
  return {
    raw: root + (quality === 'major' ? 'maj7' : quality === 'minor' ? 'm7' : '7'),
    root: root as ChordSymbol['root'],
    rootAccidental: '',
    quality,
    extensions: [],
    alterations: [],
    alt: false,
    bass: bass ? { root: bass as ChordSymbol['root'], rootAccidental: '' } : undefined,
  };
}

function makeCtx(overrides?: Partial<ScheduleContext>): {
  ctx: ScheduleContext;
  events: { notes: string[]; velocity: number }[];
} {
  const events: { notes: string[]; velocity: number }[] = [];
  const ctx: ScheduleContext = {
    bpm: 120,
    timeSignature: parseTimeSignature('4/4'),
    swingRatio: 0.5,
    scheduleClick: () => {},
    scheduleEvent: (_id: string, payload: unknown, _at: number, vel: number, _dur: number) => {
      const p = payload as { notes: string[] };
      events.push({ notes: [...p.notes], velocity: vel });
    },
    ...overrides,
  };
  return { ctx, events };
}

const TPBAR = 480 * 4;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RhodesInstrument', () => {
  describe('pattern-engine scheduling (primary path)', () => {
    it('produces events for swing style via organism', () => {
      const inst = new RhodesInstrument(new ChordTimeline([]));
      inst.setStyleProfile(getStyleProfile('swing'));

      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('C', 'major') }]);
      inst.setTimeline(timeline);
      inst.setHumanize(false);

      const { ctx, events } = makeCtx();
      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

      // Pattern-engine pads lane is always-on (probability 1) → at least 1 event.
      expect(events.length).toBeGreaterThan(0);
    });

    it('produces events for all 5 styles', () => {
      for (const style of ['swing', 'bossa', 'funk', 'latin', 'ballad'] as const) {
        const inst = new RhodesInstrument(new ChordTimeline([]));
        inst.setStyleProfile(getStyleProfile(style));

        const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('C', 'major') }]);
        inst.setTimeline(timeline);
        inst.setHumanize(false);

        const { ctx, events } = makeCtx();
        inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

        expect(events.length).toBeGreaterThan(0);
      }
    });

    it('uses low velocity (complementary layer, sits behind piano)', () => {
      const inst = new RhodesInstrument(new ChordTimeline([]));
      inst.setStyleProfile(getStyleProfile('ballad'));

      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('C', 'major') }]);
      inst.setTimeline(timeline);
      inst.setHumanize(false);

      const { ctx, events } = makeCtx();
      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

      // Rhodes is a calm complementary layer — velocities should be modest (≤ 0.6).
      for (const event of events) {
        expect(event.velocity).toBeLessThanOrEqual(0.6);
      }
    });

    it('stays within the Rhodes register (C3–C6)', () => {
      const inst = new RhodesInstrument(new ChordTimeline([]));
      inst.setStyleProfile(getStyleProfile('swing'));

      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('C', 'major') }]);
      inst.setTimeline(timeline);
      inst.setHumanize(false);

      const { ctx, events } = makeCtx();
      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

      for (const event of events) {
        for (const note of event.notes) {
          const midi = noteToMidi(note);
          expect(midi).toBeGreaterThanOrEqual(48); // C3
          expect(midi).toBeLessThanOrEqual(84); // C6
        }
      }
    });

    it('produces different events across multiple bars (organism cycling)', () => {
      const inst = new RhodesInstrument(new ChordTimeline([]));
      inst.setStyleProfile(getStyleProfile('swing'));

      const timeline = new ChordTimeline([
        { barIndex: 0, chord: makeChord('C', 'major') },
        { barIndex: 2, chord: makeChord('F', 'dominant') },
      ]);
      inst.setTimeline(timeline);
      inst.setHumanize(false);

      const { ctx, events } = makeCtx();
      inst.schedule({ fromTicks: 0, toTicks: TPBAR * 4 }, ctx);

      expect(events.length).toBeGreaterThan(2);
    });
  });

  describe('voicing resolution', () => {
    it('resolves arp roles to single notes (not full voicings)', () => {
      const inst = new RhodesInstrument(new ChordTimeline([]));
      inst.setStyleProfile(getStyleProfile('latin'));

      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('C', 'major') }]);
      inst.setTimeline(timeline);
      inst.setHumanize(false);

      // Force the chorus section — it uses rhodes-latin-cascade whose primary
      // lane is arpeggio (arp1..arp4 → single notes per hit).
      const { ctx, events } = makeCtx({ gridSectionType: 'chorus', barInSection: 0 });
      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

      // Arp roles resolve to a single note; the cascade cell is arpeggio-heavy.
      const singleNoteEvents = events.filter((e) => e.notes.length === 1);
      expect(singleNoteEvents.length).toBeGreaterThan(0);
    });
  });

  describe('reset', () => {
    it('does not throw when called without scheduling', () => {
      const inst = new RhodesInstrument(new ChordTimeline([]));
      expect(() => inst.reset()).not.toThrow();
    });
  });

  describe('style rosters', () => {
    it('rhodes is not enabled by default in any style', () => {
      for (const style of ['swing', 'bossa', 'funk', 'latin', 'ballad'] as const) {
        const profile = getStyleProfile(style);
        expect(profile.instrumentDefaults.rhodes.enabled).toBe(false);
      }
    });
  });

  describe('setOrganismId', () => {
    it('explicitly selects an organism by id', () => {
      const inst = new RhodesInstrument(new ChordTimeline([]));
      inst.setStyleProfile(getStyleProfile('swing'));
      inst.setOrganismId('rhodes-swing-sparse-form');

      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('C', 'major') }]);
      inst.setTimeline(timeline);
      inst.setHumanize(false);

      const { ctx, events } = makeCtx();
      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

      expect(events.length).toBeGreaterThan(0);
    });

    it('clears organism when set to null and falls back to style default', () => {
      const inst = new RhodesInstrument(new ChordTimeline([]));
      inst.setStyleProfile(getStyleProfile('swing'));
      inst.setOrganismId(null);

      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('C', 'major') }]);
      inst.setTimeline(timeline);
      inst.setHumanize(false);

      const { ctx, events } = makeCtx();
      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

      expect(events.length).toBeGreaterThan(0);
    });
  });
});
