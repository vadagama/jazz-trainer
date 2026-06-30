import type { SoloInstrument, SamplerLike } from './soloInstrument.js';
import { midiToNote } from './rhodesVoicing.js';

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface SamplerSoloInstrumentOptions {
  /** Base URL for samples (when not already configured on the sampler). */
  baseUrl?: string;
  /** Volume layer in dB (default: 0). */
  volumeDb?: number;
}

// ---------------------------------------------------------------------------
// SamplerSoloInstrument
// ---------------------------------------------------------------------------

/**
 * Solo instrument backed by a sampler (Tone.Sampler or compatible).
 *
 * Pure DI wrapper — the sampler is injected via constructor.
 * Does not import Tone.js directly.
 */
export class SamplerSoloInstrument implements SoloInstrument {
  readonly id: string;
  readonly name: string;
  readonly category = 'sampled' as const;

  private sampler: SamplerLike;
  private disposed = false;

  constructor(
    id: string,
    name: string,
    sampler: SamplerLike,
    _options?: SamplerSoloInstrumentOptions,
  ) {
    this.id = id;
    this.name = name;
    this.sampler = sampler;
  }

  noteOn(midiNote: number, velocity: number, time?: number): void {
    if (this.disposed) return;
    const noteName = midiToNote(midiNote);
    const vel = Math.max(0, Math.min(1, velocity / 127));
    this.sampler.triggerAttack(noteName, time, vel);
  }

  noteOff(midiNote: number, time?: number): void {
    if (this.disposed) return;
    const noteName = midiToNote(midiNote);
    this.sampler.triggerRelease(noteName, time);
  }

  connect(destination: unknown): void {
    if (this.disposed) return;
    this.sampler.connect(destination);
  }

  disconnect(): void {
    if (this.disposed) return;
    this.sampler.disconnect();
  }

  /** Release sampler resources. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.sampler.dispose();
  }
}
