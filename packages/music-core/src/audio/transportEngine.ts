import { ticksPerBar, type TimeSignature, parseTimeSignature } from '../time/timeSignature.js';
import { ticksToPosition, ticksToSeconds, type MusicalPosition } from '../time/position.js';
import type { PlaybackStatus } from '../playback/stateMachine.js';
import type {
  BassArticulation,
  Instrument,
  ScheduleWindow,
  BassEvent,
  RhodesEvent,
  DrumEvent,
  InstrumentEventPayload,
} from './instrument.js';
import type { DrumSound } from './drumSampleRegistry.js';
import type { Section, SectionType } from '@jazz/shared';
import type { StyleProfile } from '../styleProfile.js';

/** Three-level beat accent: first downbeat, secondary accent, or ordinary weak beat. */
export type BeatType = 'strong' | 'strong2' | 'weak';

/** Sink that actually renders a scheduled click (real impl triggers a Tone synth). */
export type ClickSink = (atTicks: number, beatType: BeatType) => void;

/**
 * Generic event sink — receives an instrument event and renders it to audio.
 * Each instrument registers one via {@link TransportEngine.registerSink}.
 */
export type EventSink = (
  payload: InstrumentEventPayload,
  atTicks: number,
  velocity: number,
  durationTicks: number,
) => void;

/** @deprecated Use {@link EventSink} registered as `'bass'` instead. */
export type NoteSink = (
  atTicks: number,
  note: string,
  velocity: number,
  durationTicks: number,
  articulation: BassArticulation,
) => void;

/** @deprecated Use {@link EventSink} registered as `'rhodes'` instead. */
export type ChordSink = (
  atTicks: number,
  notes: string[],
  velocity: number,
  durationTicks: number,
) => void;

/** @deprecated Use {@link EventSink} registered as `'drums'` instead. */
export type DrumSink = (
  atTicks: number,
  sound: DrumSound,
  velocity: number,
  durationTicks: number,
) => void;

export interface TransportEngineOptions {
  bpm?: number;
  timeSignature?: TimeSignature | string;
  /** Swing ratio for offbeat eighth notes: 0.50 = straight, 0.66 = classic swing, 0.75 = heavy shuffle. Default 0.50. */
  swingRatio?: number;
  sink: ClickSink;
  /** @deprecated Use {@link TransportEngine.registerSink}('bass', ...) instead. */
  noteSink?: NoteSink;
  /** @deprecated Use {@link TransportEngine.registerSink}('rhodes', ...) instead. */
  chordSink?: ChordSink;
  /** @deprecated Use {@link TransportEngine.registerSink}('drums', ...) instead. */
  drumSink?: DrumSink;
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
  private swingRatio: number;

  private readonly sink: ClickSink;
  /** Generic event sinks registered by instrument ID. */
  private readonly eventSinks = new Map<string, EventSink>();
  private readonly instruments: Instrument[] = [];
  private readonly tickListeners = new Set<(pos: MusicalPosition) => void>();

  /** Grid sections for section-driven scheduling (null = no sections). */
  private sections: Section[] | null = null;
  /** Per-playthrough seed for molecule pool variation. Regenerated on each play(). */
  private playSeed = 0;

  constructor(opts: TransportEngineOptions) {
    this.bpm = Math.max(20, Math.min(400, opts.bpm ?? 120));
    this.swingRatio = Math.max(0.5, Math.min(0.75, opts.swingRatio ?? 0.5));
    this.timeSignature =
      typeof opts.timeSignature === 'string'
        ? parseTimeSignature(opts.timeSignature)
        : (opts.timeSignature ?? { beatsPerBar: 4, beatUnit: 4 });
    this.sink = opts.sink;

    // Auto-register legacy sinks for backward compatibility
    if (opts.noteSink) {
      this.registerSink('bass', (payload, atTicks, velocity, durationTicks) => {
        const p = payload as BassEvent;
        opts.noteSink!(atTicks, p.note, velocity, durationTicks, p.articulation);
      });
    }
    if (opts.chordSink) {
      this.registerSink('rhodes', (payload, atTicks, velocity, durationTicks) => {
        const p = payload as RhodesEvent;
        opts.chordSink!(atTicks, p.notes, velocity, durationTicks);
      });
    }
    if (opts.drumSink) {
      this.registerSink('drums', (payload, atTicks, velocity, durationTicks) => {
        const p = payload as DrumEvent;
        opts.drumSink!(atTicks, p.sound, velocity, durationTicks);
      });
    }
  }

  /**
   * Register an audio sink for an instrument.
   * When an instrument calls `ctx.scheduleEvent(id, payload, ...)`,
   * the matching sink is invoked to render the sound.
   */
  registerSink(instrumentId: string, sink: EventSink): void {
    this.eventSinks.set(instrumentId, sink);
  }

  addInstrument(instrument: Instrument): void {
    this.instruments.push(instrument);
  }

  setBpm(bpm: number): void {
    this.bpm = Math.max(20, Math.min(400, bpm));
  }

  setSwingRatio(ratio: number): void {
    this.swingRatio = Math.max(0.5, Math.min(0.75, ratio));
  }

  /**
   * Apply a full style profile: instrument defaults.
   * Does NOT override BPM or swing ratio — those are user-controlled settings.
   */
  setStyleProfile(profile: StyleProfile): void {
    for (const instrument of this.instruments) {
      instrument.setStyleProfile?.(profile);
    }
  }

  /**
   * Set grid sections for section-driven scheduling.
   * Pass `null` to clear (instruments fall back to flat/legacy mode).
   */
  setSections(sections: Section[] | null): void {
    this.sections = sections;
    for (const instrument of this.instruments) {
      // Notify drum instrument (and any other section-aware instrument)
      if ('setGridSections' in instrument) {
        (
          instrument as unknown as { setGridSections: (s: Section[] | null) => void }
        ).setGridSections(sections);
      }
    }
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
    const eventSinks = this.eventSinks;

    // Compute section context from grid sections at the window start
    let gridSectionType: SectionType | undefined;
    let barInSection: number | undefined;
    if (this.sections && this.sections.length > 0) {
      const tpBar = ticksPerBar(this.timeSignature);
      const absoluteBar = Math.floor(window.fromTicks / tpBar);
      let cursor = 0;
      for (const sec of this.sections) {
        const secLen = sec.bars.length;
        if (absoluteBar >= cursor && absoluteBar < cursor + secLen) {
          gridSectionType = sec.type as SectionType;
          barInSection = absoluteBar - cursor;
          break;
        }
        cursor += secLen;
      }
    }

    const ctx = {
      bpm: this.bpm,
      timeSignature: this.timeSignature,
      swingRatio: this.swingRatio,
      gridSectionType,
      barInSection,
      playSeed: this.playSeed,
      scheduleClick: (atTicks: number, beatType: BeatType) => this.sink(atTicks, beatType),
      // Canonical dispatch — each instrument calls this with its typed payload
      scheduleEvent: (
        instrumentId: string,
        payload: InstrumentEventPayload,
        atTicks: number,
        velocity: number,
        durationTicks: number,
      ) => {
        const sink = eventSinks.get(instrumentId);
        if (sink) sink(payload, atTicks, velocity, durationTicks);
      },
      // Deprecated aliases — delegate to scheduleEvent for backward compatibility
      scheduleNote: eventSinks.has('bass')
        ? (
            atTicks: number,
            note: string,
            velocity: number,
            durationTicks: number,
            articulation: BassArticulation,
          ) => eventSinks.get('bass')!({ note, articulation }, atTicks, velocity, durationTicks)
        : undefined,
      scheduleChord: eventSinks.has('rhodes')
        ? (atTicks: number, notes: string[], velocity: number, durationTicks: number) =>
            eventSinks.get('rhodes')!({ notes }, atTicks, velocity, durationTicks)
        : undefined,
      scheduleDrum: eventSinks.has('drums')
        ? (atTicks: number, sound: DrumSound, velocity: number, durationTicks: number) =>
            eventSinks.get('drums')!({ sound }, atTicks, velocity, durationTicks)
        : undefined,
    };
    for (const instrument of this.instruments) {
      instrument.schedule(window, ctx);
    }
  }

  play(): void {
    this.playSeed = (Date.now() * 2654435761) >>> 0;
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
