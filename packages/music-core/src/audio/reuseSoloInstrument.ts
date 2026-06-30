import type { SoloInstrument, SamplerLike } from './soloInstrument.js';
import { midiToNote } from './rhodesVoicing.js';

// ---------------------------------------------------------------------------
// ReuseSoloInstrument
// ---------------------------------------------------------------------------

/**
 * Solo instrument that reuses an existing sampler from an accompaniment instrument.
 *
 * Useful for Piano (Salamander) and Rhodes — the same Tone.Sampler used for
 * accompaniment can be played live via MIDI, routed to SoloBus instead of
 * the Transport-scheduled bus.
 *
 * `dispose()` does NOT destroy the underlying sampler — it is shared.
 */
export class ReuseSoloInstrument implements SoloInstrument {
  readonly id: string;
  readonly name: string;
  readonly category = 'reuse' as const;

  private sampler: SamplerLike;
  private disposed = false;

  constructor(id: string, name: string, sampler: SamplerLike) {
    this.id = id;
    this.name = name;
    this.sampler = sampler;
  }

  noteOn(midiNote: number, velocity: number, time?: number): void {
    if (this.disposed) return;
    try {
      const noteName = midiToNote(midiNote);
      const vel = Math.max(0, Math.min(1, velocity / 127));
      this.sampler.triggerAttack(noteName, time, vel);
    } catch {
      // Sampler disposed externally (e.g. transport torn down)
    }
  }

  noteOff(midiNote: number, time?: number): void {
    if (this.disposed) return;
    try {
      const noteName = midiToNote(midiNote);
      this.sampler.triggerRelease(noteName, time);
    } catch {
      // Sampler disposed externally
    }
  }

  connect(destination: unknown): void {
    if (this.disposed) return;
    this.sampler.connect(destination);
  }

  disconnect(): void {
    if (this.disposed) return;
    this.sampler.disconnect();
  }

  /** Dispose without destroying the shared sampler. */
  dispose(): void {
    this.disposed = true;
  }
}
