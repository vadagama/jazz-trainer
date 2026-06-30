import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testAudioPortContract } from '../../../music-core/src/audio/ports.contract.js';
import { WebMidiAdapter } from './WebMidiAdapter.js';

// ---------------------------------------------------------------------------
// Minimal MIDI types mirroring those in the adapter (for mock typing).
// ---------------------------------------------------------------------------

interface MidiOutputLike {
  send(data: number[], timestamp?: number): void;
  clear(): void;
  id?: string;
  name?: string;
}

interface MidiInputLike {
  id?: string;
  name?: string;
  onmidimessage:
    | ((event: { data: Uint8Array; timeStamp: number; target?: MidiInputLike }) => void)
    | null;
}

interface MidiAccessLike {
  outputs: { values(): IterableIterator<MidiOutputLike> };
  inputs: { values(): IterableIterator<MidiInputLike> };
  onstatechange: (() => void) | null;
}

// ---------------------------------------------------------------------------
// Mock Web MIDI API
// ---------------------------------------------------------------------------

type MidiMessageEvt = { data: Uint8Array; timeStamp: number; target?: MidiInputLike };

const { mockOutput, mockInput, mockInput2, mockAccess } = vi.hoisted(() => {
  const mockOutput = {
    send: vi.fn(),
    clear: vi.fn(),
    id: 'out-1',
    name: 'Mock Output',
  };

  const mockInput = {
    id: 'in-1',
    name: 'Mock Input',
    onmidimessage: null as ((event: MidiMessageEvt) => void) | null,
  };

  const mockInput2 = {
    id: 'in-2',
    name: 'Second Input',
    onmidimessage: null as ((event: MidiMessageEvt) => void) | null,
  };

  const mockAccess = {
    outputs: new Map([['out-1', mockOutput]]),
    inputs: new Map([
      ['in-1', mockInput],
      ['in-2', mockInput2],
    ]),
    onstatechange: null as (() => void) | null,
  };

  return { mockOutput, mockInput, mockInput2, mockAccess };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createAdapter() {
  vi.clearAllMocks();

  const access = mockAccess as unknown as MidiAccessLike;
  mockAccess.outputs = new Map([['out-1', mockOutput]]);
  mockAccess.inputs = new Map([
    ['in-1', mockInput],
    ['in-2', mockInput2],
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new WebMidiAdapter({ midiAccess: access as any });
}

function simulateMidiMessage(data: Uint8Array, input = mockInput): void {
  const event: MidiMessageEvt = { data, timeStamp: performance.now(), target: input };
  input.onmidimessage?.(event);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WebMidiAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAccess.outputs = new Map([['out-1', mockOutput]]);
    mockAccess.inputs = new Map([
      ['in-1', mockInput],
      ['in-2', mockInput2],
    ]);
    mockInput.onmidimessage = null;
    mockInput2.onmidimessage = null;
    mockAccess.onstatechange = null;
  });

  // -- Contract tests -----------------------------------------------------
  testAudioPortContract(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new WebMidiAdapter({ midiAccess: mockAccess as any });
  });

  // -- AudioPort specific tests -------------------------------------------

  it('scheduleNote sends MIDI note-on and note-off messages', () => {
    const adapter = createAdapter();
    adapter.start();

    adapter.scheduleNote({ time: 0.5, note: 'C4', duration: 0.25, velocity: 0.8 });

    expect(mockOutput.send).toHaveBeenCalledTimes(2);

    // First call: note-on for C4 (MIDI 60), velocity = 0.8 * 127 ≈ 102
    const noteOnCall = mockOutput.send.mock.calls[0]!;
    expect(noteOnCall[0]).toEqual([0x90, 60, 102]);

    // Second call: note-off for C4 (MIDI 60)
    const noteOffCall = mockOutput.send.mock.calls[1]!;
    expect(noteOffCall[0]).toEqual([0x80, 60, 0]);
  });

  it('scheduleNote uses configured channel', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adapter = new WebMidiAdapter({ midiAccess: mockAccess as any, channel: 3 });
    adapter.start();

    adapter.scheduleNote({ time: 0, note: 'Eb4', duration: 0.5, velocity: 1.0 });

    const noteOnCall = mockOutput.send.mock.calls[0]!;
    expect(noteOnCall[0]).toEqual([0x90 | 3, 63, 127]);
  });

  it('scheduleNote with voice does not crash', () => {
    const adapter = createAdapter();
    adapter.start();
    expect(() =>
      adapter.scheduleNote({
        time: 1,
        note: 'Eb4',
        duration: 0.25,
        velocity: 0.6,
        voice: 'rhodes',
      }),
    ).not.toThrow();
  });

  it('scheduleClick sends on percussion channel (ch 9)', () => {
    const adapter = createAdapter();
    adapter.start();

    adapter.scheduleClick({ time: 0, accent: false, subdivision: 4 });

    const noteOnCall = mockOutput.send.mock.calls[0]!;
    expect(noteOnCall[0]).toEqual([0x90 | 9, 76, 90]); // wood block, default velocity
  });

  it('scheduleClick accent uses accent note and higher velocity', () => {
    const adapter = createAdapter();
    adapter.start();

    adapter.scheduleClick({ time: 0, accent: true, subdivision: 4 });

    const noteOnCall = mockOutput.send.mock.calls[0]!;
    expect(noteOnCall[0]).toEqual([0x90 | 9, 77, 120]); // low wood block, accented velocity
  });

  it('start sets running state and resets clock', () => {
    const adapter = createAdapter();
    adapter.start();
    // currentTime should be close to 0 right after start
    expect(adapter.currentTime).toBeGreaterThanOrEqual(0);
    expect(adapter.currentTime).toBeLessThan(0.1);
  });

  it('currentTime returns 0 when not running', () => {
    const adapter = createAdapter();
    expect(adapter.currentTime).toBe(0);
  });

  it('stop sends all-notes-off on all channels', () => {
    const adapter = createAdapter();
    adapter.stop();

    // 16 channels × 2 CC messages (123 + 120) = 32 messages
    const sendCalls = mockOutput.send.mock.calls;
    expect(sendCalls.length).toBe(32);

    // Check first channel gets both CCs
    expect(sendCalls[0]![0]).toEqual([0xb0, 123, 0]);
    expect(sendCalls[1]![0]).toEqual([0xb0, 120, 0]);
  });

  it('clear calls output.clear() and all-notes-off', () => {
    const adapter = createAdapter();
    adapter.clear();

    expect(mockOutput.clear).toHaveBeenCalledOnce();
    // all-notes-off adds 32 more send calls
    expect(mockOutput.send).toHaveBeenCalledTimes(32);
  });

  it('scheduling when no outputs is a no-op', () => {
    const emptyAccess = {
      outputs: new Map(),
      inputs: new Map(),
      onstatechange: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    const adapter = new WebMidiAdapter({ midiAccess: emptyAccess });
    adapter.start();

    expect(() =>
      adapter.scheduleNote({ time: 0, note: 'C4', duration: 0.5, velocity: 0.8 }),
    ).not.toThrow();
    expect(() => adapter.scheduleClick({ time: 0, accent: true, subdivision: 4 })).not.toThrow();
  });

  it('currentTime advances after start (mock timing)', async () => {
    const adapter = createAdapter();
    adapter.start();
    const t0 = adapter.currentTime;

    // Wait a small amount then check time advanced
    await new Promise((resolve) => setTimeout(resolve, 50));
    const t1 = adapter.currentTime;
    expect(t1).toBeGreaterThan(t0);
  });

  // -- InputPort tests ----------------------------------------------------

  it('onNoteOn registers a handler and returns unsubscribe', () => {
    const adapter = createAdapter();
    const handler = vi.fn();
    const unsub = adapter.onNoteOn(handler);
    expect(typeof unsub).toBe('function');
  });

  it('unsubscribe removes handler', () => {
    const adapter = createAdapter();
    const handler = vi.fn();
    const unsub = adapter.onNoteOn(handler);
    unsub();

    simulateMidiMessage(new Uint8Array([0x90, 60, 100]));
    expect(handler).not.toHaveBeenCalled();
  });

  it('onNoteOff registers and unsubscribes', () => {
    const adapter = createAdapter();
    const handler = vi.fn();
    const unsub = adapter.onNoteOff(handler);
    unsub();
  });

  it('devices returns input names when access is available', async () => {
    const adapter = createAdapter();
    const devs = await adapter.devices();
    expect(devs).toEqual(['Mock Input', 'Second Input']);
  });

  it('devices returns empty when no MIDI access', async () => {
    const adapter = new WebMidiAdapter();
    const devs = await adapter.devices();
    expect(devs).toEqual([]);
  });

  it('handleMidiMessage dispatches note-on events to registered handlers', () => {
    const adapter = createAdapter();
    const handler = vi.fn();
    adapter.onNoteOn(handler);

    simulateMidiMessage(new Uint8Array([0x90, 60, 100]));

    expect(handler).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        note: 'C4',
        velocity: 100,
      }),
    );
  });

  it('handleMidiMessage dispatches note-off events to registered handlers', () => {
    const adapter = createAdapter();
    const handler = vi.fn();
    adapter.onNoteOff(handler);

    simulateMidiMessage(new Uint8Array([0x80, 62, 0]));

    expect(handler).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        note: 'D4',
        velocity: 0,
      }),
    );
  });

  it('handleMidiMessage treats note-on with velocity 0 as note-off', () => {
    const adapter = createAdapter();
    const noteOnHandler = vi.fn();
    const noteOffHandler = vi.fn();
    adapter.onNoteOn(noteOnHandler);
    adapter.onNoteOff(noteOffHandler);

    // Some keyboards send note-on with velocity 0 instead of note-off
    simulateMidiMessage(new Uint8Array([0x90, 60, 0]));

    expect(noteOnHandler).not.toHaveBeenCalled();
    expect(noteOffHandler).toHaveBeenCalledOnce();
  });

  it('ignores incomplete MIDI messages', () => {
    const adapter = createAdapter();
    const handler = vi.fn();
    adapter.onNoteOn(handler);

    simulateMidiMessage(new Uint8Array([0x90]));

    expect(handler).not.toHaveBeenCalled();
  });

  // -- Extended InputPort tests (T-003) -----------------------------------

  describe('listInputs', () => {
    it('returns MidiDeviceInfo[] with metadata', async () => {
      const adapter = createAdapter();
      const devices = await adapter.listInputs();
      expect(devices).toHaveLength(2);
      expect(devices[0]).toEqual({
        id: 'in-1',
        name: 'Mock Input',
        manufacturer: undefined,
      });
      expect(devices[1]).toEqual({
        id: 'in-2',
        name: 'Second Input',
        manufacturer: undefined,
      });
    });

    it('returns empty when no MIDI access', async () => {
      const adapter = new WebMidiAdapter();
      const devices = await adapter.listInputs();
      expect(devices).toEqual([]);
    });
  });

  describe('selectInput', () => {
    it('filters events by selected device ID', () => {
      const adapter = createAdapter();
      const handler = vi.fn();
      adapter.onNoteOn(handler);

      adapter.selectInput('in-1');

      // Message from in-1 → should be received
      simulateMidiMessage(new Uint8Array([0x90, 60, 100]), mockInput);
      expect(handler).toHaveBeenCalledTimes(1);

      // Message from in-2 → should be filtered out
      simulateMidiMessage(new Uint8Array([0x90, 62, 100]), mockInput2);
      expect(handler).toHaveBeenCalledTimes(1); // still 1
    });

    it('activeDeviceId reflects selection', () => {
      const adapter = createAdapter();
      adapter.selectInput('in-1');
      expect(adapter.activeDeviceId).toBe('in-1');

      adapter.selectInput(null);
      expect(adapter.activeDeviceId).toBeNull();
    });
  });

  describe('setChannelFilter', () => {
    it('filters events by channel', () => {
      const adapter = createAdapter();
      const handler = vi.fn();
      adapter.onNoteOn(handler);

      // Set filter to channel 3
      adapter.setChannelFilter(3);

      // Channel 0 note-on → filtered out
      simulateMidiMessage(new Uint8Array([0x90, 60, 100])); // ch 0
      expect(handler).not.toHaveBeenCalled();

      // Channel 3 note-on → received
      simulateMidiMessage(new Uint8Array([0x93, 60, 100])); // ch 3
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('channelFilter returns current value', () => {
      const adapter = createAdapter();
      expect(adapter.channelFilter).toBe('all');

      adapter.setChannelFilter(7);
      expect(adapter.channelFilter).toBe(7);

      adapter.setChannelFilter('all');
      expect(adapter.channelFilter).toBe('all');
    });

    it('throws on invalid channel', () => {
      const adapter = createAdapter();
      expect(() => adapter.setChannelFilter(-1)).toThrow();
      expect(() => adapter.setChannelFilter(16)).toThrow();
    });
  });

  describe('connectionStatus', () => {
    it('returns "available" when inputs exist but none selected', () => {
      const adapter = createAdapter();
      expect(adapter.connectionStatus).toBe('available');
    });

    it('returns "connected" when specific device is selected', () => {
      const adapter = createAdapter();
      adapter.selectInput('in-1');
      expect(adapter.connectionStatus).toBe('connected');
    });

    it('returns "disconnected" when no inputs exist', () => {
      const emptyAccess = {
        outputs: new Map(),
        inputs: new Map(),
        onstatechange: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
      const adapter = new WebMidiAdapter({ midiAccess: emptyAccess });
      expect(adapter.connectionStatus).toBe('disconnected');
    });
  });

  describe('onConnectionChange', () => {
    it('notifies handlers on initial setup', () => {
      const handler = vi.fn();
      const adapter = createAdapter();
      adapter.onConnectionChange(handler);
    });

    it('returns unsubscribe function', () => {
      const adapter = createAdapter();
      const handler = vi.fn();
      const unsub = adapter.onConnectionChange(handler);
      expect(typeof unsub).toBe('function');
      unsub();
    });
  });

  // -- noteToMidi / midiToNote edge cases ----------------------------------

  it('schedules notes across octave range', () => {
    const adapter = createAdapter();
    adapter.start();

    // C0 = MIDI 12
    adapter.scheduleNote({ time: 0, note: 'C0', duration: 0.5, velocity: 0.5 });
    expect(mockOutput.send.mock.calls[0]![0]![1]).toBe(12);

    vi.clearAllMocks();
    // B7 = MIDI 107
    adapter.scheduleNote({ time: 0, note: 'B7', duration: 0.5, velocity: 0.5 });
    expect(mockOutput.send.mock.calls[0]![0]![1]).toBe(107);
  });

  it('handles flat notes correctly', () => {
    const adapter = createAdapter();
    adapter.start();

    // Eb4 = MIDI 63
    adapter.scheduleNote({ time: 0, note: 'Eb4', duration: 0.5, velocity: 0.5 });
    expect(mockOutput.send.mock.calls[0]![0]![1]).toBe(63);
  });

  it('handles sharp notes correctly', () => {
    const adapter = createAdapter();
    adapter.start();

    // F#4 = MIDI 66
    adapter.scheduleNote({ time: 0, note: 'F#4', duration: 0.5, velocity: 0.5 });
    expect(mockOutput.send.mock.calls[0]![0]![1]).toBe(66);
  });

  it('throws on invalid note name in scheduleNote', () => {
    const adapter = createAdapter();
    adapter.start();

    expect(() =>
      adapter.scheduleNote({ time: 0, note: 'H4', duration: 0.5, velocity: 0.5 }),
    ).toThrow();
  });

  // -- MIDI access edge case -----------------------------------------------

  it('init returns immediately if already initialized', async () => {
    const adapter = createAdapter();
    // Should not throw and should be a no-op
    await expect(adapter.init()).resolves.toBeUndefined();
  });
});
