import * as Tone from 'tone';
import type { AudioPort, ScheduledNote, ScheduledClick } from '@jazz/music-core/audio';

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
 */
export class ToneAudioAdapter implements AudioPort {
  private events: Map<number, (time: number) => void> = new Map();
  private nextEventId = 0;

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
  }

  /** @inheritdoc */
  scheduleNote(note: ScheduledNote): void {
    const id = this.nextEventId++;
    const cb = (_time: number) => {
      // Instrument implementations register their own synths/samplers
      // via this callback. The default is a no-op — the app wires
      // actual Tone instruments externally through the event map.
      this.events.delete(id);
    };
    this.events.set(id, cb);
    Tone.Transport.schedule(cb, note.time);
  }

  /** @inheritdoc */
  scheduleClick(click: ScheduledClick): void {
    const id = this.nextEventId++;
    const cb = (_time: number) => {
      // Metronome implementations register their own click players
      // via this callback. The default is a no-op.
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
  }
}
