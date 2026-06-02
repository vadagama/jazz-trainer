import { ticksPerBeat, defaultStrongBeats, type TimeSignature } from '../time/timeSignature.js';

/** A half-open tick window `[fromTicks, toTicks)` to schedule events into. */
export interface ScheduleWindow {
  fromTicks: number;
  toTicks: number;
}

/** Context passed to instruments while scheduling a look-ahead window. */
export interface ScheduleContext {
  bpm: number;
  timeSignature: TimeSignature;
  /** Schedule a metronome click at an absolute tick from the start of the form. */
  scheduleClick(atTicks: number, strong: boolean): void;
}

/**
 * An instrument schedules its events into a time window. The metronome is the
 * first implementation; bass/comp/drums will add more without touching the
 * transport (docs/01-architecture.md §5, docs/02-audio-engine.md §4).
 */
export interface Instrument {
  schedule(window: ScheduleWindow, ctx: ScheduleContext): void;
  dispose?(): void;
}

export interface MetronomeOptions {
  /** Per-beat mask; index = beat-in-bar. Missing/undefined entries default to active. */
  activeBeats?: boolean[];
  /** Beat indices that get the accented (strong) click; default from the meter. */
  strongBeats?: number[];
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

    // First beat on or after the window start, aligned to the beat grid.
    const firstBeat = Math.ceil(window.fromTicks / tpBeat);
    for (let beat = firstBeat; beat * tpBeat < window.toTicks; beat++) {
      const atTicks = beat * tpBeat;
      const beatInBar = ((beat % sig.beatsPerBar) + sig.beatsPerBar) % sig.beatsPerBar;
      const active = this.opts.activeBeats ? (this.opts.activeBeats[beatInBar] ?? true) : true;
      if (!active) continue;
      ctx.scheduleClick(atTicks, strongBeats.includes(beatInBar));
    }
  }
}
