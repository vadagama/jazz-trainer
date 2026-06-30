import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testAudioPortContract } from '../../../music-core/src/audio/ports.contract.js';
import { ToneAudioAdapter } from './ToneAudioAdapter.js';

// Mock Tone.js — the adapter uses Tone.Transport for scheduling.
// vi.hoisted ensures mocks are available when vi.mock runs (both are hoisted).

const { mockTransport, MockGain, mockGainInstances } = vi.hoisted(() => {
  const mockTransport = {
    bpm: { value: 120 },
    seconds: 0,
    ticks: 0,
    loop: false,
    loopStart: '0i',
    loopEnd: '0i',
    schedule: vi.fn((_cb: (...args: unknown[]) => void, _time: number) => 0),
    start: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    cancel: vi.fn(),
  };

  const mockGainInstances: Array<{
    gain: { value: number; rampTo: ReturnType<typeof vi.fn> };
    toDestination: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
  }> = [];

  // Must be a real class (not vi.fn) so `new` works.
  class MockGain {
    gain: { value: number; rampTo: ReturnType<typeof vi.fn> };
    toDestination: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;

    constructor(value = 1) {
      this.gain = { value, rampTo: vi.fn() };
      this.toDestination = vi.fn();
      this.connect = vi.fn();
      mockGainInstances.push(this);
    }
  }

  return { mockTransport, MockGain, mockGainInstances };
});

vi.mock('tone', () => ({
  default: {
    Transport: mockTransport,
    Gain: MockGain,
    start: vi.fn().mockResolvedValue(undefined),
    gainToDb: vi.fn((db: number) => db),
  },
  Transport: mockTransport,
  Gain: MockGain,
  start: vi.fn().mockResolvedValue(undefined),
  gainToDb: vi.fn((db: number) => db),
}));

describe('ToneAudioAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGainInstances.length = 0;
    mockTransport.bpm.value = 120;
    mockTransport.seconds = 0;
    mockTransport.ticks = 0;
    mockTransport.loop = false;
    mockTransport.loopStart = '0i';
    mockTransport.loopEnd = '0i';
  });

  // Run the standard AudioPort contract suite
  testAudioPortContract(() => new ToneAudioAdapter());

  it('sets bpm from constructor options', () => {
    new ToneAudioAdapter({ bpm: 140 });
    expect(mockTransport.bpm.value).toBe(140);
  });

  it('defaults bpm to 120 when not specified', () => {
    new ToneAudioAdapter();
    expect(mockTransport.bpm.value).toBe(120);
  });

  it('calls Transport.start() on start()', () => {
    const adapter = new ToneAudioAdapter();
    adapter.start();
    expect(mockTransport.start).toHaveBeenCalledOnce();
  });

  it('calls Transport.stop() and Transport.cancel() on stop()', () => {
    const adapter = new ToneAudioAdapter();
    adapter.stop();
    expect(mockTransport.stop).toHaveBeenCalledOnce();
    expect(mockTransport.cancel).toHaveBeenCalledOnce();
  });

  it('returns Transport.seconds from currentTime', () => {
    const adapter = new ToneAudioAdapter();
    mockTransport.seconds = 42;
    expect(adapter.currentTime).toBe(42);
  });

  it('calls Transport.cancel() on clear()', () => {
    const adapter = new ToneAudioAdapter();
    adapter.clear();
    expect(mockTransport.cancel).toHaveBeenCalledOnce();
  });

  it('schedules a note via Transport.schedule', () => {
    const adapter = new ToneAudioAdapter();
    adapter.scheduleNote({ time: 1.5, note: 'C4', duration: 0.5, velocity: 0.8 });
    expect(mockTransport.schedule).toHaveBeenCalledWith(expect.any(Function), 1.5);
  });

  it('schedules a click via Transport.schedule', () => {
    const adapter = new ToneAudioAdapter();
    adapter.scheduleClick({ time: 0, accent: true, subdivision: 4 });
    expect(mockTransport.schedule).toHaveBeenCalledWith(expect.any(Function), 0);
  });

  it('start with delay passes formatted string to Transport.start', () => {
    const adapter = new ToneAudioAdapter();
    adapter.start(0.5);
    expect(mockTransport.start).toHaveBeenCalledWith('+0.500');
  });

  it('calls Transport.pause() on pause()', () => {
    const adapter = new ToneAudioAdapter();
    adapter.pause();
    expect(mockTransport.pause).toHaveBeenCalledOnce();
  });

  it('ticks getter returns Transport.ticks', () => {
    const adapter = new ToneAudioAdapter();
    mockTransport.ticks = 960;
    expect(adapter.ticks).toBe(960);
  });

  it('ticks setter sets Transport.ticks', () => {
    const adapter = new ToneAudioAdapter();
    adapter.ticks = 1920;
    expect(mockTransport.ticks).toBe(1920);
  });

  it('setBpm sets Transport.bpm.value', () => {
    const adapter = new ToneAudioAdapter();
    adapter.setBpm(140);
    expect(mockTransport.bpm.value).toBe(140);
  });

  it('setLoop configures Transport loop properties', () => {
    const adapter = new ToneAudioAdapter();
    adapter.setLoop(true, '32i', '64i');
    expect(mockTransport.loop).toBe(true);
    expect(mockTransport.loopStart).toBe('32i');
    expect(mockTransport.loopEnd).toBe('64i');
  });

  it('setLoop with false disables loop', () => {
    mockTransport.loop = true;
    const adapter = new ToneAudioAdapter();
    adapter.setLoop(false);
    expect(mockTransport.loop).toBe(false);
  });

  // -- Solo bus tests (T-009) ----------------------------------------------

  it('creates solo, accomp, and ducking buses on construction', () => {
    new ToneAudioAdapter();
    expect(mockGainInstances.length).toBe(3);
  });

  it('getSoloBus returns the solo bus gain node', () => {
    const adapter = new ToneAudioAdapter();
    const bus = adapter.getSoloBus();
    expect(bus).toBeDefined();
    expect(bus.gain).toBeDefined();
  });

  it('getAccompBus returns the accompaniment bus', () => {
    const adapter = new ToneAudioAdapter();
    const bus = adapter.getAccompBus();
    expect(bus).toBeDefined();
    expect(bus.gain).toBeDefined();
  });

  it('setSoloVolume ramps solo bus gain', () => {
    const adapter = new ToneAudioAdapter();
    adapter.setSoloVolume(0.5);
    const soloBus = adapter.getSoloBus();
    expect(soloBus.gain.rampTo).toHaveBeenCalledWith(0.5, 0.05);
  });

  it('applyDucking reduces accompaniment gain', () => {
    const adapter = new ToneAudioAdapter();
    adapter.applyDucking(-8);
    const duckingGain = mockGainInstances[2]!;
    expect(duckingGain.gain.rampTo).toHaveBeenCalled();
  });

  it('releaseDucking restores accompaniment gain', () => {
    const adapter = new ToneAudioAdapter();
    adapter.releaseDucking();
    const duckingGain = mockGainInstances[2]!;
    expect(duckingGain.gain.rampTo).toHaveBeenCalledWith(1, 0.3);
  });
});
