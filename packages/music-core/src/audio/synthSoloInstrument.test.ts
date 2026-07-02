import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testSoloInstrumentContract } from './soloInstrument.contract.js';
import { SynthSoloInstrument } from './synthSoloInstrument.js';
import type { PolySynthLike } from './soloInstrument.js';

// ---------------------------------------------------------------------------
// Mock PolySynthLike
// ---------------------------------------------------------------------------

function createMockSynth(): PolySynthLike {
  return {
    triggerAttackRelease: vi.fn(),
    triggerAttack: vi.fn(),
    triggerRelease: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn(),
    set: vi.fn(),
    volume: { value: 0.8 },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SynthSoloInstrument', () => {
  let mockSynth: PolySynthLike;

  beforeEach(() => {
    mockSynth = createMockSynth();
  });

  // -- Contract tests -------------------------------------------------------
  testSoloInstrumentContract(() => new SynthSoloInstrument('test', 'Test', mockSynth));

  // -- Specific tests -------------------------------------------------------

  it('sets maxPolyphony and envelope on construction', () => {
    void new SynthSoloInstrument('test', 'Test', mockSynth, {
      maxVoices: 8,
      envelope: { attack: 0.02, decay: 0.2, sustain: 0.5, release: 0.5 },
    });

    expect(mockSynth.set).toHaveBeenCalledWith({
      maxPolyphony: 8,
      envelope: { attack: 0.02, decay: 0.2, sustain: 0.5, release: 0.5 },
    });
  });

  it('uses default values when no options provided', () => {
    void new SynthSoloInstrument('test', 'Test', mockSynth);

    expect(mockSynth.set).toHaveBeenCalledWith({
      maxPolyphony: 16,
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.2 },
    });
  });

  it('noteOn calls triggerAttack with correct note name', () => {
    const inst = new SynthSoloInstrument('test', 'Test', mockSynth);
    inst.noteOn(69, 100); // A4 = 440 Hz

    expect(mockSynth.triggerAttack).toHaveBeenCalledTimes(1);
    const args = vi.mocked(mockSynth.triggerAttack).mock.calls[0]!;
    // First arg is note name (e.g. "A4"), velocity ≈ 0.787
    expect(args[0]).toBe('A4');
    expect(args[2]).toBeCloseTo(100 / 127, 2);
  });

  it('noteOff calls triggerRelease with correct note name', () => {
    const inst = new SynthSoloInstrument('test', 'Test', mockSynth);
    inst.noteOn(60, 80);
    inst.noteOff(60);

    expect(mockSynth.triggerRelease).toHaveBeenCalledTimes(1);
    expect(vi.mocked(mockSynth.triggerRelease).mock.calls[0]![0]).toBe('C4');
  });

  it('velocity is clamped to 0..127', () => {
    const inst = new SynthSoloInstrument('test', 'Test', mockSynth);

    inst.noteOn(60, -10);
    expect(vi.mocked(mockSynth.triggerAttack).mock.calls[0]![2]).toBe(0);

    vi.clearAllMocks();
    inst.noteOn(60, 200);
    expect(vi.mocked(mockSynth.triggerAttack).mock.calls[0]![2]).toBe(1);
  });

  it('connect delegates to synth', () => {
    const inst = new SynthSoloInstrument('test', 'Test', mockSynth);
    const dest = {} as unknown;
    inst.connect(dest);
    expect(mockSynth.connect).toHaveBeenCalledWith(dest);
  });

  it('disconnect delegates to synth with tracked destination', () => {
    const inst = new SynthSoloInstrument('test', 'Test', mockSynth);
    const dest = {} as unknown;
    inst.connect(dest);
    inst.disconnect();
    expect(mockSynth.disconnect).toHaveBeenCalledWith(dest);
  });

  it('disconnect without prior connect is a no-op', () => {
    const inst = new SynthSoloInstrument('test', 'Test', mockSynth);
    inst.disconnect();
    expect(mockSynth.disconnect).not.toHaveBeenCalled();
  });

  it('dispose calls synth.dispose and sets disposed flag', () => {
    const inst = new SynthSoloInstrument('test', 'Test', mockSynth);
    inst.dispose();
    expect(mockSynth.dispose).toHaveBeenCalled();

    // Subsequent calls are no-ops
    inst.noteOn(60, 100);
    expect(mockSynth.triggerAttack).not.toHaveBeenCalled();
  });

  it('has correct id, name, category', () => {
    const inst = new SynthSoloInstrument('my-id', 'My Name', mockSynth);
    expect(inst.id).toBe('my-id');
    expect(inst.name).toBe('My Name');
    expect(inst.category).toBe('synth');
  });
});
