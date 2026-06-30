import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testSoloInstrumentContract } from './soloInstrument.contract.js';
import { SamplerSoloInstrument } from './samplerSoloInstrument.js';
import type { SamplerLike } from './soloInstrument.js';

// ---------------------------------------------------------------------------
// Mock SamplerLike
// ---------------------------------------------------------------------------

function createMockSampler(): SamplerLike {
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

describe('SamplerSoloInstrument', () => {
  let mockSampler: SamplerLike;

  beforeEach(() => {
    mockSampler = createMockSampler();
  });

  // -- Contract tests -------------------------------------------------------
  testSoloInstrumentContract(
    () => new SamplerSoloInstrument('test-sampled', 'Test Sampled', mockSampler),
  );

  // -- Specific tests -------------------------------------------------------

  it('noteOn calls triggerAttack with note name from MIDI number', () => {
    const inst = new SamplerSoloInstrument('clarinet', 'Clarinet', mockSampler);
    inst.noteOn(60, 100); // C4

    expect(mockSampler.triggerAttack).toHaveBeenCalledTimes(1);
    const args = vi.mocked(mockSampler.triggerAttack).mock.calls[0]!;
    expect(args[0]).toBe('C4');
    expect(args[2]).toBeCloseTo(100 / 127, 2);
  });

  it('noteOff calls triggerRelease with note name', () => {
    const inst = new SamplerSoloInstrument('clarinet', 'Clarinet', mockSampler);
    inst.noteOn(60, 80);
    inst.noteOff(60);

    expect(mockSampler.triggerRelease).toHaveBeenCalledTimes(1);
    expect(vi.mocked(mockSampler.triggerRelease).mock.calls[0]![0]).toBe('C4');
  });

  it('velocity is clamped to 0..127', () => {
    const inst = new SamplerSoloInstrument('clarinet', 'Clarinet', mockSampler);

    inst.noteOn(64, -10);
    expect(vi.mocked(mockSampler.triggerAttack).mock.calls[0]![2]).toBe(0);

    vi.clearAllMocks();
    inst.noteOn(64, 200);
    expect(vi.mocked(mockSampler.triggerAttack).mock.calls[0]![2]).toBe(1);
  });

  it('connect and disconnect delegate to sampler', () => {
    const inst = new SamplerSoloInstrument('clarinet', 'Clarinet', mockSampler);
    const dest = {} as unknown;

    inst.connect(dest);
    expect(mockSampler.connect).toHaveBeenCalledWith(dest);

    inst.disconnect();
    expect(mockSampler.disconnect).toHaveBeenCalled();
  });

  it('dispose disposes the sampler', () => {
    const inst = new SamplerSoloInstrument('clarinet', 'Clarinet', mockSampler);
    inst.dispose();
    expect(mockSampler.dispose).toHaveBeenCalled();
  });

  it('has correct id, name, category', () => {
    const inst = new SamplerSoloInstrument('vibraphone', 'Vibraphone', mockSampler);
    expect(inst.id).toBe('vibraphone');
    expect(inst.name).toBe('Vibraphone');
    expect(inst.category).toBe('sampled');
  });

  it('after dispose, noteOn/noteOff are no-ops', () => {
    const inst = new SamplerSoloInstrument('clarinet', 'Clarinet', mockSampler);
    inst.dispose();
    vi.clearAllMocks();

    inst.noteOn(60, 100);
    expect(mockSampler.triggerAttack).not.toHaveBeenCalled();

    inst.noteOff(60);
    expect(mockSampler.triggerRelease).not.toHaveBeenCalled();
  });
});
