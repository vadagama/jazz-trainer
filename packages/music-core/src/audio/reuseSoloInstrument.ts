import type { SoloInstrument, SamplerLike } from './soloInstrument.js';
import { midiToNote } from './rhodesVoicing.js';

// ---------------------------------------------------------------------------
// ReuseSoloInstrument
// ---------------------------------------------------------------------------

/**
 * Solo instrument that reuses an existing sampler from an accompaniment instrument.
 *
 * Useful for Piano (Salamander) and Rhodes — the same Tone.Sampler used for
 * accompaniment can be played live via MIDI.
 *
 * Does NOT connect to SoloBus — the shared sampler is already in the audio graph
 * via the accompaniment chain. Solo volume is applied as velocity scaling
 * by the host.
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

  /** No-op: shared sampler is already in the accompaniment audio graph. */
   
  connect(_destination: unknown): void {
    // Shared sampler stays in the accompaniment chain only.
    // Solo volume is applied as velocity scaling by the host.
  }

  /** No-op: we never connected to anything. */
  disconnect(): void {
    // Nothing to disconnect.
  }

  /** Dispose without destroying the shared sampler. */
  dispose(): void {
    this.disposed = true;
  }
}
