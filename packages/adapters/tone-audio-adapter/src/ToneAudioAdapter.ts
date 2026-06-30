import * as Tone from 'tone';
import type { AudioPort, ScheduledNote, ScheduledClick } from '@jazz/music-core/audio';
import { DuckingCompressor } from '@jazz/music-core/audio';

/**
 * Options for configuring the ToneAudioAdapter.
 */
export interface ToneAudioAdapterOptions {
  /** Initial tempo in BPM (default: 120). */
  bpm?: number;
  /** Whether to start the Tone.Transport immediately on construction. */
  autoStart?: boolean;
}

/**
 * {@link AudioPort} implementation backed by Tone.js.
 *
 * Wraps `Tone.Transport` for scheduling and playback control.
 * Instrument-specific logic (synths, samplers, effects) is
 * configured externally and wired through `scheduleNote` / `scheduleClick`.
 *
 * Provides a `SoloBus` for live MIDI-triggered instruments
 * and a separate accompaniment bus for scheduled playback.
 */
export class ToneAudioAdapter implements AudioPort {
  private events: Map<number, (time: number) => void> = new Map();
  private nextEventId = 0;

  // -- Solo and accompaniment buses (T-008) --------------------------------
  private soloBus: Tone.Gain;
  private accompBus: Tone.Gain;
  private duckingGain: Tone.Gain;

  // -- Ducking (T-030 / T-031) ---------------------------------------------
  private duckingCompressor: DuckingCompressor;
  private duckingEnabled = false;
  private duckingRafId: number | null = null;

  constructor(options: ToneAudioAdapterOptions = {}) {
    if (options.bpm !== undefined) {
      Tone.Transport.bpm.value = options.bpm;
    }
    if (options.autoStart) {
      Tone.start().catch(() => {
        // AudioContext may require user gesture in some browsers;
        // the app should call start() after a user interaction.
      });
    }

    // Create solo and accompaniment buses
    this.soloBus = new Tone.Gain(0.8);
    this.accompBus = new Tone.Gain(0.9);
    this.duckingGain = new Tone.Gain(1);
    this.duckingCompressor = new DuckingCompressor();

    // Routing: soloBus → Destination, accompBus → duckingGain → Destination
    this.soloBus.toDestination();
    this.accompBus.connect(this.duckingGain);
    this.duckingGain.toDestination();
  }

  /** @inheritdoc */
  scheduleNote(note: ScheduledNote): void {
    const id = this.nextEventId++;
    const cb = (_time: number) => {
      this.events.delete(id);
    };
    this.events.set(id, cb);
    Tone.Transport.schedule(cb, note.time);
  }

  /** @inheritdoc */
  scheduleClick(click: ScheduledClick): void {
    const id = this.nextEventId++;
    const cb = (_time: number) => {
      this.events.delete(id);
    };
    this.events.set(id, cb);
    Tone.Transport.schedule(cb, click.time);
  }

  /**
   * Start or resume playback.
   * @param delaySeconds Optional delay in seconds before transport starts.
   */
  start(delaySeconds?: number): void {
    if (delaySeconds !== undefined) {
      Tone.Transport.start(`+${delaySeconds.toFixed(3)}`);
    } else {
      Tone.Transport.start();
    }
  }

  /** Pause playback without resetting position. */
  pause(): void {
    Tone.Transport.pause();
  }

  /** @inheritdoc */
  stop(): void {
    Tone.Transport.stop();
    Tone.Transport.cancel();
    this.events.clear();
    this.nextEventId = 0;
    this.duckingCompressor.reset();
  }

  /** @inheritdoc */
  get currentTime(): number {
    return Tone.Transport.seconds;
  }

  /** Get or set transport position in ticks (PPQ-based). */
  get ticks(): number {
    return Tone.Transport.ticks;
  }

  set ticks(value: number) {
    Tone.Transport.ticks = value;
  }

  /** Set playback tempo in BPM. */
  setBpm(bpm: number): void {
    Tone.Transport.bpm.value = bpm;
  }

  /** Configure loop region on the transport. */
  setLoop(loop: boolean, loopStart?: string, loopEnd?: string): void {
    Tone.Transport.loop = loop;
    if (loopStart !== undefined) Tone.Transport.loopStart = loopStart;
    if (loopEnd !== undefined) Tone.Transport.loopEnd = loopEnd;
  }

  /** @inheritdoc */
  clear(): void {
    Tone.Transport.cancel();
    this.events.clear();
    this.nextEventId = 0;
    this.duckingCompressor.reset();
  }

  // -- Solo bus (T-008) ----------------------------------------------------

  /** Get the SoloBus gain node for connecting live instruments. */
  getSoloBus(): Tone.Gain {
    return this.soloBus;
  }

  /** Get the accompaniment bus for connecting scheduled instruments. */
  getAccompBus(): Tone.Gain {
    return this.accompBus;
  }

  /** Set solo instrument volume (0–1). Uses ramp for smooth transitions. */
  setSoloVolume(value: number): void {
    this.soloBus.gain.rampTo(value, 0.05);
  }

  /** Get current AudioContext time in seconds (same as Tone.now()). */
  now(): number {
    return Tone.now();
  }

  // -- Ducking (T-030 / T-031) ---------------------------------------------

  /**
   * Enable or disable auto-ducking.
   * When active, accompaniment volume is reduced when solo notes are played.
   */
  setDucking(enabled: boolean, depthDb?: number): void {
    this.duckingEnabled = enabled;

    if (enabled) {
      this.duckingCompressor = new DuckingCompressor(
        depthDb !== undefined ? { depthDb } : undefined,
      );
      this.startDuckingLoop();
    } else {
      this.stopDuckingLoop();
      this.duckingGain.gain.rampTo(1, 0.02);
      this.duckingCompressor.reset();
    }
  }

  /**
   * Notify the ducking compressor of a MIDI note-on event.
   * Call this from the InputPort note-on handler.
   */
  noteOnDucking(nowSeconds: number): void {
    if (!this.duckingEnabled) return;
    this.duckingCompressor.noteOn(nowSeconds);
  }

  /**
   * Notify the ducking compressor of a MIDI note-off event.
   * Call this from the InputPort note-off handler.
   */
  noteOffDucking(nowSeconds: number): void {
    if (!this.duckingEnabled) return;
    this.duckingCompressor.noteOff(nowSeconds);
  }

  /**
   * Apply ducking (reduce accompaniment gain).
   * Direct control — bypasses the compressor.
   */
  applyDucking(depthDb = -6): void {
    const linearDb = Tone.gainToDb(depthDb);
    // Convert back to linear for rampTo (Tone.Gain uses linear gain)
    this.duckingGain.gain.rampTo(Math.pow(10, linearDb / 20), 0.02);
  }

  /**
   * Release ducking (restore accompaniment gain).
   * Direct control — bypasses the compressor.
   */
  releaseDucking(): void {
    this.duckingGain.gain.rampTo(1, 0.3);
  }

  // -- Internal ducking loop -----------------------------------------------

  private startDuckingLoop(): void {
    if (this.duckingRafId !== null) return;

    const loop = () => {
      if (!this.duckingEnabled) return;
      const now = Tone.now();
      const targetGain = this.duckingCompressor.getDuckingGain(now);
      this.duckingGain.gain.rampTo(targetGain, 0.02);
      this.duckingRafId = requestAnimationFrame(loop);
    };

    this.duckingRafId = requestAnimationFrame(loop);
  }

  private stopDuckingLoop(): void {
    if (this.duckingRafId !== null) {
      cancelAnimationFrame(this.duckingRafId);
      this.duckingRafId = null;
    }
  }
}
