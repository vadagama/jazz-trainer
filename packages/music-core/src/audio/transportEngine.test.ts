import { describe, it, expect, vi } from 'vitest';
import { TransportEngine } from './transportEngine.js';
import { MetronomeInstrument } from './instrument.js';

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
});
