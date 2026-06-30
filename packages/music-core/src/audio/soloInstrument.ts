// ---------------------------------------------------------------------------
// DI interfaces — decouple music-core from Tone.js
// ---------------------------------------------------------------------------

/**
 * Minimal interface for a polyphonic synthesizer (DI).
 * Implementations: `Tone.PolySynth` (in tone-audio-adapter), mocks for tests.
 */
export interface PolySynthLike {
  triggerAttackRelease(
    notes: string | string[],
    duration: number | string,
    time?: number,
    velocity?: number,
  ): void;
  triggerAttack(note: string, time?: number, velocity?: number): void;
  triggerRelease(note: string, time?: number): void;
  connect(destination: unknown): void;
  disconnect(): void;
  dispose(): void;
  set(params: Record<string, unknown>): void;
  readonly volume: { value: number };
}

/**
 * Minimal interface for a sampler (DI).
 * Implementations: `Tone.Sampler` (in tone-audio-adapter), mocks for tests.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SamplerLike extends PolySynthLike {}

// ---------------------------------------------------------------------------
// SoloInstrument
// ---------------------------------------------------------------------------

/**
 * A live solo instrument driven by MIDI input.
 *
 * Unlike {@link Instrument} (which schedules notes into the future
 * via `TransportEngine`), `SoloInstrument` reacts to live MIDI events.
 *
 * Each instance is one timbre. Switching timbre = dispose old + create new.
 */
export interface SoloInstrument {
  /** Unique timbre ID, e.g. 'synth-default', 'piano-salamander'. */
  readonly id: string;

  /** Human-readable timbre name. */
  readonly name: string;

  /** Category: 'synth' | 'sampled' | 'reuse'. */
  readonly category: 'synth' | 'sampled' | 'reuse';

  /** Called on MIDI note-on. */
  noteOn(midiNote: number, velocity: number, time?: number): void;

  /** Called on MIDI note-off. */
  noteOff(midiNote: number, time?: number): void;

  /**
   * Connect the instrument's output to an audio node (usually SoloBus).
   * Called once during initialisation.
   */
  connect(destination: unknown): void;

  /** Disconnect from the audio node. */
  disconnect(): void;

  /** Release resources (samples, oscillators). */
  dispose(): void;
}
