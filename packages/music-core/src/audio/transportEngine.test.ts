import { describe, it, expect, vi } from 'vitest';
import { TransportEngine } from './transportEngine.js';
import { MetronomeInstrument } from './instrument.js';
import type { InstrumentEventPayload } from './instrument.js';
import { ChordTimeline } from './chordTimeline.js';
import { BassInstrument } from './bassInstrument.js';
import { DrumInstrument } from './drumInstrument.js';
import { PianoInstrument } from './pianoInstrument.js';
import { RhodesInstrument } from './rhodesInstrument.js';
import { GuitarInstrument } from './guitarInstrument.js';
import { getStyleProfile } from '../styleProfile.js';

describe('TransportEngine', () => {
  it('drives instruments to schedule clicks into the sink', () => {
    const sink = vi.fn();
    const engine = new TransportEngine({ bpm: 120, timeSignature: '4/4', sink });
    engine.addInstrument(new MetronomeInstrument());

    engine.scheduleWindow({ fromTicks: 0, toTicks: 1920 });

    expect(sink).toHaveBeenCalledTimes(4);
    expect(sink).toHaveBeenNthCalledWith(1, 0, 'strong');
    expect(sink).toHaveBeenNthCalledWith(2, 480, 'weak');
  });

  it('honors the metronome mask through the engine', () => {
    const sink = vi.fn();
    const engine = new TransportEngine({ timeSignature: '4/4', sink });
    engine.addInstrument(new MetronomeInstrument({ activeBeats: [true, false, false, false] }));
    engine.scheduleWindow({ fromTicks: 0, toTicks: 1920 });
    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink).toHaveBeenCalledWith(0, 'strong');
  });

  it('transitions play / pause / stop and resets position on stop', () => {
    const engine = new TransportEngine({ sink: vi.fn() });
    engine.play();
    expect(engine.status).toBe('playing');
    engine.pause();
    expect(engine.status).toBe('paused');
    engine.seekToBar(2);
    expect(engine.positionTicks).toBe(2 * 1920);
    engine.stop();
    expect(engine.status).toBe('idle');
    expect(engine.positionTicks).toBe(0);
  });

  it('emits tick positions to subscribers', () => {
    const engine = new TransportEngine({ timeSignature: '4/4', sink: vi.fn() });
    const positions: Array<{ bar: number; beat: number }> = [];
    engine.onTick((pos) => positions.push({ bar: pos.bar, beat: pos.beat }));
    engine.emitTick(960);
    expect(positions).toEqual([{ bar: 0, beat: 2 }]);
    expect(engine.positionTicks).toBe(960);
  });

  it('reflects tempo and time-signature changes', () => {
    const engine = new TransportEngine({ bpm: 120, timeSignature: '4/4', sink: vi.fn() });
    expect(engine.ticksToSeconds(480)).toBeCloseTo(0.5);
    engine.setBpm(60);
    expect(engine.ticksToSeconds(480)).toBeCloseTo(1.0);
    engine.setTimeSignature('6/8');
    engine.seekToBar(1);
    expect(engine.positionTicks).toBe(1440);
  });

  describe('setStyleProfile', () => {
    it('applies tempo and swing from the profile', () => {
      const engine = new TransportEngine({ bpm: 120, swingRatio: 0.5, sink: vi.fn() });
      const profile = getStyleProfile('swing');
      engine.setStyleProfile(profile);
      expect(engine.bpm).toBe(140);
      expect(engine.ticksToSeconds(480)).toBeCloseTo(480 / (140 / 60) / 480, 0);
    });

    it('propagates profile to instruments that implement setStyleProfile', () => {
      const engine = new TransportEngine({ sink: vi.fn() });
      const received: string[] = [];
      const mockInstrument = {
        schedule: vi.fn(),
        setStyleProfile: (p: { id: string }) => {
          received.push(p.id);
        },
      };
      engine.addInstrument(mockInstrument);
      engine.setStyleProfile(getStyleProfile('bossa'));
      expect(received).toEqual(['bossa']);
    });

    it('does not break instruments without setStyleProfile', () => {
      const engine = new TransportEngine({ sink: vi.fn() });
      const metronome = new MetronomeInstrument();
      engine.addInstrument(metronome);
      // Should not throw
      expect(() => engine.setStyleProfile(getStyleProfile('ballad'))).not.toThrow();
      expect(engine.bpm).toBe(60);
    });

    it('changing style updates all attached instruments', () => {
      const engine = new TransportEngine({ bpm: 120, swingRatio: 0.5, sink: vi.fn() });
      const receivedA: string[] = [];
      const receivedB: string[] = [];
      engine.addInstrument({
        schedule: vi.fn(),
        setStyleProfile: (p: { id: string }) => {
          receivedA.push(p.id);
        },
      });
      engine.addInstrument({
        schedule: vi.fn(),
        setStyleProfile: (p: { id: string }) => {
          receivedB.push(p.id);
        },
      });
      engine.setStyleProfile(getStyleProfile('funk'));
      expect(receivedA).toEqual(['funk']);
      expect(receivedB).toEqual(['funk']);
      expect(engine.bpm).toBe(100);
    });

    it('switching Swing → Funk changes all instrument outputs (integration)', () => {
      const cmaj7 = {
        raw: 'Cmaj7',
        root: 'C',
        quality: 'major' as const,
        extensions: [],
        alterations: [],
        rootAccidental: '' as const,
        alt: false,
      };
      const fmaj7 = {
        raw: 'Fmaj7',
        root: 'F',
        quality: 'major' as const,
        extensions: [],
        alterations: [],
        rootAccidental: '' as const,
        alt: false,
      };
      const timeline = new ChordTimeline([
        { barIndex: 0, chord: cmaj7 },
        { barIndex: 1, chord: fmaj7 },
      ]);

      const engine = new TransportEngine({ sink: vi.fn() });
      const bass = new BassInstrument(timeline);
      const drums = new DrumInstrument();
      const piano = new PianoInstrument(timeline);
      const rhodes = new RhodesInstrument(timeline);
      const guitar = new GuitarInstrument(timeline);

      engine.addInstrument(bass);
      engine.addInstrument(drums);
      engine.addInstrument(piano);
      engine.addInstrument(rhodes);
      engine.addInstrument(guitar);

      // Use a recording sink that captures all events
      const recordedEvents: Array<{
        instrumentId: string;
        payload: InstrumentEventPayload;
        atTicks: number;
        velocity: number;
      }> = [];

      engine.registerSink('bass', (p, atTicks, vel) =>
        recordedEvents.push({ instrumentId: 'bass', payload: p, atTicks, velocity: vel }),
      );
      engine.registerSink('drums', (p, atTicks, vel) =>
        recordedEvents.push({ instrumentId: 'drums', payload: p, atTicks, velocity: vel }),
      );
      engine.registerSink('piano', (p, atTicks, vel) =>
        recordedEvents.push({ instrumentId: 'piano', payload: p, atTicks, velocity: vel }),
      );
      engine.registerSink('rhodes', (p, atTicks, vel) =>
        recordedEvents.push({ instrumentId: 'rhodes', payload: p, atTicks, velocity: vel }),
      );
      engine.registerSink('guitar', (p, atTicks, vel) =>
        recordedEvents.push({ instrumentId: 'guitar', payload: p, atTicks, velocity: vel }),
      );

      // Schedule with Swing
      engine.setStyleProfile(getStyleProfile('swing'));
      engine.scheduleWindow({ fromTicks: 0, toTicks: 1920 });
      const swingEventsByInstrument = groupByInstrument(recordedEvents.splice(0));

      // Schedule with Funk
      engine.setStyleProfile(getStyleProfile('funk'));
      engine.scheduleWindow({ fromTicks: 0, toTicks: 1920 });
      const funkEventsByInstrument = groupByInstrument(recordedEvents.splice(0));

      // Verify tempo changed
      expect(engine.bpm).toBe(100); // funk default

      // All instruments produced events in both styles
      for (const id of ['bass', 'drums', 'piano', 'rhodes', 'guitar']) {
        expect(swingEventsByInstrument.get(id)?.length).toBeGreaterThan(0);
        expect(funkEventsByInstrument.get(id)?.length).toBeGreaterThan(0);
      }

      // Bass: swing produces walking bass events (many notes), funk produces syncopated
      expect(swingEventsByInstrument.get('bass')!.length).not.toBe(
        funkEventsByInstrument.get('bass')!.length,
      );

      // Drums: swing ride-heavy vs funk kick-heavy patterns differ
      expect(swingEventsByInstrument.get('drums')!.length).not.toBe(
        funkEventsByInstrument.get('drums')!.length,
      );
    });
  });
});

function groupByInstrument(
  events: Array<{
    instrumentId: string;
    payload: InstrumentEventPayload;
    atTicks: number;
    velocity: number;
  }>,
): Map<string, InstrumentEventPayload[]> {
  const map = new Map<string, InstrumentEventPayload[]>();
  for (const e of events) {
    const arr = map.get(e.instrumentId) ?? [];
    arr.push(e.payload);
    map.set(e.instrumentId, arr);
  }
  return map;
}
