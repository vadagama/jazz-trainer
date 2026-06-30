import type { SoloInstrument, PolySynthLike } from './soloInstrument.js';
import { midiToNote } from './rhodesVoicing.js';

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface SynthSoloInstrumentOptions {
  /** Maximum polyphony (default: 16). */
  maxVoices?: number;
  /** Basic envelope parameters. */
  envelope?: {
    attack?: number; // seconds, default 0.01
    decay?: number; // seconds, default 0.1
    sustain?: number; // 0–1, default 0.7
    release?: number; // seconds, default 0.2
  };
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_MAX_VOICES = 16;
const DEFAULT_ENVELOPE = {
  attack: 0.01,
  decay: 0.1,
  sustain: 0.7,
  release: 0.2,
} as const;

// ---------------------------------------------------------------------------
// SynthSoloInstrument
// ---------------------------------------------------------------------------

/**
 * Default polyphonic synthesizer for live MIDI input.
 *
 * Pure DI wrapper around `Tone.PolySynth` (or compatible).
 * Does not import Tone.js directly — the synth is injected via constructor.
 */
export class SynthSoloInstrument implements SoloInstrument {
  readonly id = 'synth-default';
  readonly name = 'Synth (Default)';
  readonly category = 'synth' as const;

  private synth: PolySynthLike;
  private disposed = false;

  constructor(synth: PolySynthLike, options?: SynthSoloInstrumentOptions) {
    this.synth = synth;

    const maxVoices = options?.maxVoices ?? DEFAULT_MAX_VOICES;
    const envelope = { ...DEFAULT_ENVELOPE, ...options?.envelope };

    this.synth.set({
      maxPolyphony: maxVoices,
      envelope,
    });
  }

  noteOn(midiNote: number, velocity: number, time?: number): void {
    if (this.disposed) return;
    const noteName = midiToNote(midiNote);
    const vel = Math.max(0, Math.min(1, velocity / 127));
    this.synth.triggerAttack(noteName, time, vel);
  }

  noteOff(midiNote: number, time?: number): void {
    if (this.disposed) return;
    const noteName = midiToNote(midiNote);
    this.synth.triggerRelease(noteName, time);
  }

  connect(destination: unknown): void {
    if (this.disposed) return;
    this.synth.connect(destination);
  }

  disconnect(): void {
    if (this.disposed) return;
    this.synth.disconnect();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.synth.dispose();
  }
}
