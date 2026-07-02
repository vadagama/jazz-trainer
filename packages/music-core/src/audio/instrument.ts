import {
  ticksPerBeat,
  defaultStrongBeats,
  defaultSecondStrongBeats,
  type TimeSignature,
} from '../time/timeSignature.js';
import type { BeatType } from './transportEngine.js';
import type { DrumSound } from './drumSampleRegistry.js';
import type { PercussionSound } from './percussionSampleRegistry.js';

/** A half-open tick window `[fromTicks, toTicks)` to schedule events into. */
export interface ScheduleWindow {
  fromTicks: number;
  toTicks: number;
}

/** Articulation types available in the bass sample library. */
export type BassArticulation = 'pluck' | 'mute';

// ─── Instrument event payloads ────────────────────────────────────────────────

/** Payload emitted by {@link BassInstrument} via {@link ScheduleContext.scheduleEvent}. */
export interface BassEvent {
  note: string;
  articulation: BassArticulation;
}

/** Payload emitted by {@link RhodesInstrument} via {@link ScheduleContext.scheduleEvent}. */
export interface RhodesEvent {
  notes: string[];
}

/** Payload emitted by {@link PianoInstrument} via {@link ScheduleContext.scheduleEvent}. */
export interface PianoEvent {
  notes: string[];
}

/** Payload emitted by {@link DrumInstrument} via {@link ScheduleContext.scheduleEvent}. */
export interface DrumEvent {
  sound: DrumSound;
}

/** Strum direction for guitar events. */
export type GuitarStrum = 'down' | 'up';

/** Payload emitted by {@link GuitarInstrument} via {@link ScheduleContext.scheduleEvent}. */
export interface GuitarEvent {
  notes: string[];
  strum: GuitarStrum;
}

/** Payload emitted by {@link VibraphoneInstrument} via {@link ScheduleContext.scheduleEvent}. */
export interface VibraphoneEvent {
  notes: string[];
}

/** Payload emitted by {@link OrganInstrument} via {@link ScheduleContext.scheduleEvent}. */
export interface OrganEvent {
  notes: string[];
}

/** Payload emitted by {@link PercussionInstrument} via {@link ScheduleContext.scheduleEvent}. */
export interface PercussionEvent {
  sound: PercussionSound;
}

/** Payload emitted by {@link ClarinetInstrument} via {@link ScheduleContext.scheduleEvent}. */
export interface ClarinetEvent {
  notes: string[];
}

/** Union of all known instrument event payloads. Extend when adding a new instrument. */
export type InstrumentEventPayload =
  | BassEvent
  | RhodesEvent
  | DrumEvent
  | GuitarEvent
  | PianoEvent
  | VibraphoneEvent
  | OrganEvent
  | PercussionEvent
  | ClarinetEvent;

// ─── ScheduleContext ──────────────────────────────────────────────────────────

/** Context passed to instruments while scheduling a look-ahead window. */
export interface ScheduleContext {
  bpm: number;
  timeSignature: TimeSignature;
  /** Swing ratio for offbeat eighth notes: 0.50 = straight, 0.66 = classic swing, 0.75 = heavy shuffle. */
  swingRatio: number;
  /** Schedule a metronome click at an absolute tick from the start of the form. */
  scheduleClick(atTicks: number, beatType: BeatType): void;
  /**
   * Generic instrument event dispatch.
   * Each instrument emits its own typed payload; the transport dispatches
   * to the matching sink registered via {@link TransportEngine.registerSink}.
   */
  scheduleEvent(
    instrumentId: string,
    payload: InstrumentEventPayload,
    atTicks: number,
    velocity: number,
    durationTicks: number,
  ): void;
  /** @deprecated Use `scheduleEvent('bass', { note, articulation }, ...)` instead. */
  scheduleNote?(
    atTicks: number,
    note: string,
    velocity: number,
    durationTicks: number,
    articulation: BassArticulation,
  ): void;
  /** @deprecated Use `scheduleEvent('rhodes', { notes }, ...)` instead. */
  scheduleChord?(atTicks: number, notes: string[], velocity: number, durationTicks: number): void;
  /** @deprecated Use `scheduleEvent('drums', { sound }, ...)` instead. */
  scheduleDrum?(atTicks: number, sound: DrumSound, velocity: number, durationTicks: number): void;
}

/**
 * An instrument schedules its events into a time window. The metronome is the
 * first implementation; bass/comp/drums will add more without touching the
 * transport (docs/01-architecture.md §5, docs/02-audio-engine.md §4).
 */
export interface Instrument {
  schedule(window: ScheduleWindow, ctx: ScheduleContext): void;
  dispose?(): void;
  /** Apply a full style profile — tempo, swing, instrument defaults. Optional for utilities like metronome. */
  setStyleProfile?(profile: import('../styleProfile.js').StyleProfile): void;
}

export interface MetronomeOptions {
  /** Per-beat mask; index = beat-in-bar. Missing/undefined entries default to active. */
  activeBeats?: boolean[];
  /** Beat indices that get the first strong click; default from the meter. */
  strongBeats?: number[];
  /** Beat indices that get the secondary strong click; default from the meter. */
  secondStrongBeats?: number[];
}

/**
 * Metronome: clicks the active beats of each bar, accenting strong beats.
 * Pure scheduling logic — the actual sound is produced by the injected sink
 * (see {@link TransportEngine}), so this is fully testable without Tone.js.
 */
export class MetronomeInstrument implements Instrument {
  constructor(private opts: MetronomeOptions = {}) {}

  setOptions(opts: MetronomeOptions): void {
    this.opts = opts;
  }

  schedule(window: ScheduleWindow, ctx: ScheduleContext): void {
    const sig = ctx.timeSignature;
    const tpBeat = ticksPerBeat(sig);
    const strongBeats = this.opts.strongBeats ?? defaultStrongBeats(sig);
    const secondStrongBeats = this.opts.secondStrongBeats ?? defaultSecondStrongBeats(sig);

    // First beat on or after the window start, aligned to the beat grid.
    const firstBeat = Math.ceil(window.fromTicks / tpBeat);
    for (let beat = firstBeat; beat * tpBeat < window.toTicks; beat++) {
      const atTicks = beat * tpBeat;
      const beatInBar = ((beat % sig.beatsPerBar) + sig.beatsPerBar) % sig.beatsPerBar;
      const active = this.opts.activeBeats ? (this.opts.activeBeats[beatInBar] ?? true) : true;
      if (!active) continue;
      let beatType: BeatType = 'weak';
      if (strongBeats.includes(beatInBar)) beatType = 'strong';
      else if (secondStrongBeats.includes(beatInBar)) beatType = 'strong2';
      ctx.scheduleClick(atTicks, beatType);
    }
  }
}
