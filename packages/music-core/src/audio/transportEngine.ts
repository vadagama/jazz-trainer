import {
  ticksPerBar,
  type TimeSignature,
  parseTimeSignature,
} from '../time/timeSignature.js';
import { ticksToPosition, ticksToSeconds, type MusicalPosition } from '../time/position.js';
import type { PlaybackStatus } from '../playback/stateMachine.js';
import type { BassArticulation, Instrument, ScheduleWindow } from './instrument.js';

/** Three-level beat accent: first downbeat, secondary accent, or ordinary weak beat. */
export type BeatType = 'strong' | 'strong2' | 'weak';

/** Sink that actually renders a scheduled click (real impl triggers a Tone synth). */
export type ClickSink = (atTicks: number, beatType: BeatType) => void;

/** Sink that renders a scheduled bass note via Tone.Sampler. */
export type NoteSink = (
  atTicks: number,
  note: string,
  velocity: number,
  durationTicks: number,
  articulation: BassArticulation,
) => void;

/** Sink that renders a scheduled Rhodes chord via Tone.Sampler. */
export type ChordSink = (
  atTicks: number,
  notes: string[],
  velocity: number,
  durationTicks: number,
) => void;

export interface TransportEngineOptions {
  bpm?: number;
  timeSignature?: TimeSignature | string;
  sink: ClickSink;
  /** Optional — wire a Tone.Sampler-backed sink to enable bass scheduling. */
  noteSink?: NoteSink;
  /** Optional — wire a Tone.Sampler-backed sink to enable Rhodes chord scheduling. */
  chordSink?: ChordSink;
}

/**
 * Owner of musical time: bpm, time signature, position and the set of
 * instruments. Drives look-ahead scheduling by handing a tick window to each
 * instrument; the injected {@link ClickSink} turns scheduled clicks into sound.
 *
 * This class is deliberately free of Tone.js so it stays Node-testable. The web
 * app (F8) wires a real `Tone.Transport`-backed loop that calls
 * {@link scheduleWindow} ahead of the playhead and a sink that triggers a synth.
 */
export class TransportEngine {
  bpm: number;
  timeSignature: TimeSignature;
  status: PlaybackStatus = 'idle';
  positionTicks = 0;

  private readonly sink: ClickSink;
  private readonly noteSink?: NoteSink;
  private readonly chordSink?: ChordSink;
  private readonly instruments: Instrument[] = [];
  private readonly tickListeners = new Set<(pos: MusicalPosition) => void>();

  constructor(opts: TransportEngineOptions) {
    this.bpm = opts.bpm ?? 120;
    this.timeSignature =
      typeof opts.timeSignature === 'string'
        ? parseTimeSignature(opts.timeSignature)
        : (opts.timeSignature ?? { beatsPerBar: 4, beatUnit: 4 });
    this.sink = opts.sink;
    this.noteSink = opts.noteSink;
    this.chordSink = opts.chordSink;
  }

  addInstrument(instrument: Instrument): void {
    this.instruments.push(instrument);
  }

  setBpm(bpm: number): void {
    this.bpm = bpm;
  }

  setTimeSignature(sig: TimeSignature | string): void {
    this.timeSignature = typeof sig === 'string' ? parseTimeSignature(sig) : sig;
  }

  onTick(listener: (pos: MusicalPosition) => void): () => void {
    this.tickListeners.add(listener);
    return () => this.tickListeners.delete(listener);
  }

  /** Emit the current playhead position to subscribers (called by the driver). */
  emitTick(ticks: number): void {
    this.positionTicks = ticks;
    const pos = ticksToPosition(ticks, this.timeSignature);
    for (const listener of this.tickListeners) listener(pos);
  }

  /** Ask every instrument to schedule its events into the given tick window. */
  scheduleWindow(window: ScheduleWindow): void {
    const noteSink = this.noteSink;
    const chordSink = this.chordSink;
    const ctx = {
      bpm: this.bpm,
      timeSignature: this.timeSignature,
      scheduleClick: (atTicks: number, beatType: BeatType) => this.sink(atTicks, beatType),
      scheduleNote: noteSink
        ? (atTicks: number, note: string, velocity: number, durationTicks: number, articulation: BassArticulation) =>
            noteSink(atTicks, note, velocity, durationTicks, articulation)
        : undefined,
      scheduleChord: chordSink
        ? (atTicks: number, notes: string[], velocity: number, durationTicks: number) =>
            chordSink(atTicks, notes, velocity, durationTicks)
        : undefined,
    };
    for (const instrument of this.instruments) {
      instrument.schedule(window, ctx);
    }
  }

  play(): void {
    this.status = 'playing';
  }

  pause(): void {
    if (this.status === 'playing') this.status = 'paused';
  }

  stop(): void {
    this.status = 'idle';
    this.positionTicks = 0;
  }

  seekToBar(bar: number): void {
    this.positionTicks = Math.max(0, bar) * ticksPerBar(this.timeSignature);
  }

  /** Convert a tick offset to seconds at the current tempo (for the Tone driver). */
  ticksToSeconds(ticks: number): number {
    return ticksToSeconds(ticks, this.bpm);
  }
}
