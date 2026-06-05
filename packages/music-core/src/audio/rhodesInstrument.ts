import { ticksPerBar, ticksPerBeat } from '../time/timeSignature.js';
import type { Instrument, ScheduleContext, ScheduleWindow } from './instrument.js';
import type { ChordTimeline } from './chordTimeline.js';
import {
  buildVoicing,
  getCompPattern,
  type RhodesVoicingDensity,
  type RhodesCompingMode,
} from './rhodesVoicing.js';

const PPQ = 480;

export class RhodesInstrument implements Instrument {
  private timeline: ChordTimeline;
  private mode: RhodesCompingMode = 'halfNotes';
  private density: RhodesVoicingDensity = 'rootless3';
  private baseVelocity = 1.0;
  private humanize = true;
  private prevVoicing: readonly string[] | null = null;
  private lastScheduledTick = -1;

  constructor(timeline: ChordTimeline) {
    this.timeline = timeline;
  }

  setTimeline(timeline: ChordTimeline): void {
    this.timeline = timeline;
  }

  setMode(mode: RhodesCompingMode): void {
    this.mode = mode;
  }

  setVoicingDensity(density: RhodesVoicingDensity): void {
    this.density = density;
  }

  setBaseVelocity(velocity: number): void {
    this.baseVelocity = Math.max(0, Math.min(2, velocity));
  }

  setHumanize(enabled: boolean): void {
    this.humanize = enabled;
  }

  reset(): void {
    this.prevVoicing = null;
    this.lastScheduledTick = -1;
  }

  schedule(window: ScheduleWindow, ctx: ScheduleContext): void {
    if (!ctx.scheduleChord) return;

    const sig = ctx.timeSignature;
    const tpBar = ticksPerBar(sig);
    const tpBeat = ticksPerBeat(sig);

    // Backward seek: reset voice leading state
    if (this.lastScheduledTick >= 0 && window.fromTicks < this.lastScheduledTick - tpBeat) {
      this.prevVoicing = null;
    }

    const pattern = getCompPattern(this.mode);
    // Max jitter in ticks at the current tempo (±6 ms)
    const maxJitterTicks = this.humanize
      ? Math.round(0.006 * (ctx.bpm / 60) * PPQ)
      : 0;

    const firstBar = Math.floor(window.fromTicks / tpBar);
    const lastBar = Math.floor((window.toTicks - 1) / tpBar);

    for (let bar = firstBar; bar <= lastBar; bar++) {
      const barStartTicks = bar * tpBar;
      const currentChord = this.timeline.getChordAtTick(barStartTicks, sig);
      if (!currentChord) continue;

      for (const event of pattern) {
        const eventTicks = barStartTicks + (event.beat - 1) * tpBeat + Math.round((event.subdivision ?? 0) * tpBeat);
        if (eventTicks < window.fromTicks || eventTicks >= window.toTicks) continue;

        const chord = event.chordRef === 'next'
          ? this.timeline.getChordAtTick((bar + 1) * tpBar, sig)
          : currentChord;
        if (!chord) continue;

        const voicing = buildVoicing(chord, this.density, this.prevVoicing);
        this.prevVoicing = voicing;

        const durationTicks = Math.round(event.durationBeats * tpBeat);

        let atTicks = eventTicks;
        let velocity = event.velocity * this.baseVelocity;

        if (this.humanize) {
          atTicks = Math.max(window.fromTicks, atTicks + Math.round((Math.random() * 2 - 1) * maxJitterTicks));
          velocity = Math.max(0.01, Math.min(1, velocity + (Math.random() * 2 - 1) * 0.05));
        }

        ctx.scheduleChord(atTicks, voicing, velocity, durationTicks);
        this.lastScheduledTick = eventTicks;
      }
    }
  }

  dispose(): void {
    this.prevVoicing = null;
    this.lastScheduledTick = -1;
  }
}
