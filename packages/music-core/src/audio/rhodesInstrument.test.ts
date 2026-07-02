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
  events: { notes: string[] }[];
} {
  const events: { notes: string[] }[] = [];
  const ctx: ScheduleContext = {
    bpm: 120,
    timeSignature: parseTimeSignature('4/4'),
    swingRatio: 0.5,
    scheduleClick: () => {},
    scheduleEvent: (_id: string, payload: unknown, _at: number, _vel: number, _dur: number) => {
      const p = payload as { notes: string[] };
      events.push({ notes: [...p.notes] });
    },
    ...overrides,
  };
  return { ctx, events };
}

const TPBAR = 480 * 4;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RhodesInstrument', () => {
  describe('setStyleProfile', () => {
    it('applies latin style profile with high-comping mode', () => {
      const inst = new RhodesInstrument(new ChordTimeline([]));
      inst.setStyleProfile(getStyleProfile('latin'));

      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('C', 'major') }]);
      inst.setTimeline(timeline);
      inst.setHumanize(false);
      inst.setLayerVolume(1.0);

      const { ctx, events } = makeCtx();
      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

      // high-comping = 2 events per bar (beats 1 and 3)
      expect(events).toHaveLength(2);
    });

    it('swing style uses subtle-offbeats layer mode', () => {
      const inst = new RhodesInstrument(new ChordTimeline([]));
      inst.setStyleProfile(getStyleProfile('swing'));

      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('C', 'major') }]);
      inst.setTimeline(timeline);
      inst.setHumanize(false);
      inst.setLayerVolume(1.0);

      const { ctx, events } = makeCtx();
      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

      // subtle-offbeats = 2 events per bar (beats 2& and 4&)
      expect(events).toHaveLength(2);
    });

    it('bossa style uses ambient-swells layer mode', () => {
      const inst = new RhodesInstrument(new ChordTimeline([]));
      inst.setStyleProfile(getStyleProfile('bossa'));

      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('C', 'major') }]);
      inst.setTimeline(timeline);
      inst.setHumanize(false);
      inst.setLayerVolume(1.0);

      const { ctx, events } = makeCtx();
      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

      // ambient-swells = 1 event per 2 bars → 1 in first bar
      expect(events).toHaveLength(1);
    });

    it('funk style uses stab-accents layer mode', () => {
      const inst = new RhodesInstrument(new ChordTimeline([]));
      inst.setStyleProfile(getStyleProfile('funk'));

      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('C', 'major') }]);
      inst.setTimeline(timeline);
      inst.setHumanize(false);
      inst.setLayerVolume(1.0);

      const { ctx, events } = makeCtx();
      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

      // stab-accents = 2 events per bar (beats 2 and 4)
      expect(events).toHaveLength(2);
    });

    it('ballad style uses pads layer mode', () => {
      const inst = new RhodesInstrument(new ChordTimeline([]));
      inst.setStyleProfile(getStyleProfile('ballad'));

      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('C', 'major') }]);
      inst.setTimeline(timeline);
      inst.setHumanize(false);
      inst.setLayerVolume(1.0);

      const { ctx, events } = makeCtx();
      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

      // pads = 1 event per bar
      expect(events).toHaveLength(1);
    });
  });

  describe('high-comping (latin style)', () => {
    it('shifts notes up by +12 semitones', () => {
      const inst = new RhodesInstrument(new ChordTimeline([]));
      inst.setStyleProfile(getStyleProfile('latin'));

      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('C', 'major') }]);
      inst.setTimeline(timeline);
      inst.setHumanize(false);
      inst.setLayerVolume(1.0);

      const { ctx, events } = makeCtx();
      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

      expect(events.length).toBeGreaterThan(0);

      // All notes should be MIDI >= 72 (C5) since rangeMin=C4 + shift=+12 gives ≥C5
      for (const event of events) {
        for (const note of event.notes) {
          const midi = noteToMidi(note);
          expect(midi).toBeGreaterThanOrEqual(60); // C4 minimum after shift
        }
      }
    });

    it('all notes are in C5–C7 range for latin style', () => {
      const inst = new RhodesInstrument(new ChordTimeline([]));
      inst.setStyleProfile(getStyleProfile('latin'));

      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('C', 'major') }]);
      inst.setTimeline(timeline);
      inst.setHumanize(false);
      inst.setLayerVolume(1.0);

      const { ctx, events } = makeCtx();
      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

      for (const event of events) {
        for (const note of event.notes) {
          const midi = noteToMidi(note);
          // rangeMin C4(60) + 12 shift = C5(72) minimum
          // rangeMax C6(84) + 12 shift = C7(96) maximum
          expect(midi).toBeGreaterThanOrEqual(72);
          expect(midi).toBeLessThanOrEqual(96);
        }
      }
    });

    it('produces higher notes than swing (subtle-offbeats) mode', () => {
      const instLatin = new RhodesInstrument(new ChordTimeline([]));
      instLatin.setStyleProfile(getStyleProfile('latin'));
      const timelineLatin = new ChordTimeline([{ barIndex: 0, chord: makeChord('C', 'major') }]);
      instLatin.setTimeline(timelineLatin);
      instLatin.setHumanize(false);
      instLatin.setLayerVolume(1.0);

      const { ctx: ctx1, events: latinEvents } = makeCtx();
      instLatin.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx1);

      const instSwing = new RhodesInstrument(new ChordTimeline([]));
      instSwing.setStyleProfile(getStyleProfile('swing'));
      const timelineSwing = new ChordTimeline([{ barIndex: 0, chord: makeChord('C', 'major') }]);
      instSwing.setTimeline(timelineSwing);
      instSwing.setHumanize(false);
      instSwing.setLayerVolume(1.0);

      const { ctx: ctx2, events: swingEvents } = makeCtx();
      instSwing.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx2);

      // Compare average MIDI note pitch
      const avgMidi = (notes: string[]) =>
        notes.reduce((sum, n) => sum + noteToMidi(n), 0) / notes.length;

      const latinAvg =
        latinEvents.reduce((sum, e) => sum + avgMidi(e.notes), 0) / latinEvents.length;
      const swingAvg =
        swingEvents.reduce((sum, e) => sum + avgMidi(e.notes), 0) / swingEvents.length;

      // Latin high-comping is shifted +12, so notes should be higher
      expect(latinAvg).toBeGreaterThan(swingAvg + 9); // at least ~9 semitones higher
    });

    it('latin rhodes uses rootless3 voicing density', () => {
      const inst = new RhodesInstrument(new ChordTimeline([]));
      inst.setStyleProfile(getStyleProfile('latin'));

      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('C', 'major') }]);
      inst.setTimeline(timeline);
      inst.setHumanize(false);
      inst.setLayerVolume(1.0);

      const { ctx, events } = makeCtx();
      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

      // rootless3 = 3 notes per voicing
      for (const event of events) {
        expect(event.notes).toHaveLength(3);
      }
    });

    it('applies lower velocity for complementary layer', () => {
      const inst = new RhodesInstrument(new ChordTimeline([]));
      inst.setStyleProfile(getStyleProfile('latin'));

      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('C', 'major') }]);
      inst.setTimeline(timeline);
      inst.setHumanize(false);
      inst.setLayerVolume(1.0);

      const capturedVelocities: number[] = [];
      const { ctx, events } = makeCtx({
        scheduleEvent: (_id, _payload, _at, vel, _dur) => {
          capturedVelocities.push(vel);
          const p = _payload as { notes: string[] };
          events.push({ notes: [...p.notes] });
        },
      });
      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

      // high-comping pattern velocities: 0.34 and 0.3 → scaled by layerVolume(1.0)=0.34, 0.3
      for (const vel of capturedVelocities) {
        expect(vel).toBeLessThanOrEqual(0.4);
      }
    });

    it('rhodes is not enabled by default in any style', () => {
      for (const style of ['swing', 'bossa', 'funk', 'latin', 'ballad'] as const) {
        const profile = getStyleProfile(style);
        expect(profile.instrumentDefaults.rhodes.enabled).toBe(false);
      }
    });
  });

  describe('style rosters', () => {
    it('rhodes is recommended in swing', () => {
      const profile = getStyleProfile('swing');
      expect(profile.instrumentRoster.recommended).toContain('rhodes');
    });

    it('rhodes is optional in bossa', () => {
      const profile = getStyleProfile('bossa');
      expect(profile.instrumentRoster.optional).toContain('rhodes');
    });

    it('rhodes is recommended in funk', () => {
      const profile = getStyleProfile('funk');
      expect(profile.instrumentRoster.recommended).toContain('rhodes');
    });

    it('rhodes is optional in latin', () => {
      const profile = getStyleProfile('latin');
      expect(profile.instrumentRoster.optional).toContain('rhodes');
    });

    it('rhodes is recommended in ballad', () => {
      const profile = getStyleProfile('ballad');
      expect(profile.instrumentRoster.recommended).toContain('rhodes');
    });
  });

  describe('setStyle (deprecated)', () => {
    it('setStyle(latin) delegates to setStyleProfile', () => {
      const inst = new RhodesInstrument(new ChordTimeline([]));
      inst.setStyle('latin');

      const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('C', 'major') }]);
      inst.setTimeline(timeline);
      inst.setHumanize(false);
      inst.setLayerVolume(1.0);

      const { ctx, events } = makeCtx();
      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

      // Should produce 2 events (high-comping half notes)
      expect(events).toHaveLength(2);
    });
  });
});
