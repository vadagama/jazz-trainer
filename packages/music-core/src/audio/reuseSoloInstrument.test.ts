import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testSoloInstrumentContract } from './soloInstrument.contract.js';
import { ReuseSoloInstrument } from './reuseSoloInstrument.js';
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

describe('ReuseSoloInstrument', () => {
  let mockSampler: SamplerLike;

  beforeEach(() => {
    mockSampler = createMockSampler();
  });

  // -- Contract tests -------------------------------------------------------
  testSoloInstrumentContract(
    () => new ReuseSoloInstrument('piano-salamander', 'Grand Piano', mockSampler),
  );

  // -- Specific tests -------------------------------------------------------

  it('noteOn calls triggerAttack with note name', () => {
    const inst = new ReuseSoloInstrument('piano-salamander', 'Grand Piano', mockSampler);
    inst.noteOn(60, 100);

    expect(mockSampler.triggerAttack).toHaveBeenCalledTimes(1);
    expect(vi.mocked(mockSampler.triggerAttack).mock.calls[0]![0]).toBe('C4');
  });

  it('noteOff calls triggerRelease with note name', () => {
    const inst = new ReuseSoloInstrument('piano-salamander', 'Grand Piano', mockSampler);
    inst.noteOn(60, 80);
    inst.noteOff(60);

    expect(mockSampler.triggerRelease).toHaveBeenCalledTimes(1);
    expect(vi.mocked(mockSampler.triggerRelease).mock.calls[0]![0]).toBe('C4');
  });

  it('connect is a no-op (shared sampler stays in accompaniment chain)', () => {
    const inst = new ReuseSoloInstrument('piano-salamander', 'Grand Piano', mockSampler);
    const dest = {} as unknown;
    inst.connect(dest);
    // Shared sampler should NOT be connected to soloBus — it stays in the accompaniment chain
    expect(mockSampler.connect).not.toHaveBeenCalled();
  });

  it('disconnect is a no-op', () => {
    const inst = new ReuseSoloInstrument('piano-salamander', 'Grand Piano', mockSampler);
    inst.disconnect();
    expect(mockSampler.disconnect).not.toHaveBeenCalled();
  });

  it('dispose does NOT destroy the shared sampler', () => {
    const inst = new ReuseSoloInstrument('piano-salamander', 'Grand Piano', mockSampler);
    inst.dispose();

    // The sampler should NOT be disposed — it's shared
    expect(mockSampler.dispose).not.toHaveBeenCalled();
  });

  it('after dispose, noteOn/noteOff are no-ops', () => {
    const inst = new ReuseSoloInstrument('piano-salamander', 'Grand Piano', mockSampler);
    inst.dispose();
    vi.clearAllMocks();

    inst.noteOn(60, 100);
    expect(mockSampler.triggerAttack).not.toHaveBeenCalled();

    inst.noteOff(60);
    expect(mockSampler.triggerRelease).not.toHaveBeenCalled();
  });

  it('has correct id, name, category', () => {
    const inst = new ReuseSoloInstrument('rhodes-jrhodes3c', 'Rhodes', mockSampler);
    expect(inst.id).toBe('rhodes-jrhodes3c');
    expect(inst.name).toBe('Rhodes');
    expect(inst.category).toBe('reuse');
  });

  it('multiple reuse instruments share the same sampler without destroying it', () => {
    const inst1 = new ReuseSoloInstrument('piano-salamander', 'Grand Piano', mockSampler);
    const inst2 = new ReuseSoloInstrument('rhodes-jrhodes3c', 'Rhodes', mockSampler);

    inst1.noteOn(60, 100);
    inst2.noteOn(64, 80);

    expect(mockSampler.triggerAttack).toHaveBeenCalledTimes(2);

    inst1.dispose();
    expect(mockSampler.dispose).not.toHaveBeenCalled();

    inst2.dispose();
    expect(mockSampler.dispose).not.toHaveBeenCalled();
  });
});
