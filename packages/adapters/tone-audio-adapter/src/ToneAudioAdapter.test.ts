import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testAudioPortContract } from '../../../music-core/src/audio/ports.contract.js';
import { ToneAudioAdapter } from './ToneAudioAdapter.js';

// Mock Tone.js — the adapter uses Tone.Transport for scheduling.
// In Node environment there is no Web Audio API, so we replace the
// transport with a lightweight stub.
// Use vi.hoisted() so mock objects are available when vi.mock is hoisted.
const { mockTransport, mockTone } = vi.hoisted(() => {
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

  const mockTone = {
    Transport: mockTransport,
    start: vi.fn().mockResolvedValue(undefined),
  };

  return { mockTransport, mockTone };
});

vi.mock('tone', () => ({
  default: mockTone,
  ...mockTone,
}));

describe('ToneAudioAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
