import {
  ticksPerBeat,
  ticksPerBar,
  defaultStrongBeats,
  defaultSecondStrongBeats,
  type TimeSignature,
} from '../time/timeSignature.js';
import type { Instrument, ScheduleContext, ScheduleWindow } from './instrument.js';

const PPQ = 480;

export type DrumRidePattern = 'quarters' | 'swingRide';

/** Swing ride offsets within a beat (0-indexed). swing triplet ≈ 2/3 of a beat. */
const SWING_RIDE_OFFSETS: Array<{ beatIdx: number; subdivision: number; velocity: number }> = [
  { beatIdx: 0, subdivision: 0,    velocity: 0.75 }, // beat 1
  { beatIdx: 1, subdivision: 0,    velocity: 0.65 }, // beat 2
  { beatIdx: 1, subdivision: 0.67, velocity: 0.50 }, // &-beat 2
  { beatIdx: 2, subdivision: 0,    velocity: 0.70 }, // beat 3
  { beatIdx: 3, subdivision: 0,    velocity: 0.65 }, // beat 4
  { beatIdx: 3, subdivision: 0.67, velocity: 0.50 }, // &-beat 4
];

/**
 * Derive which beat indices (0-based) should receive a hi-hat foot hit.
 * - 6/8 compound: only the second group downbeat
 * - All /4 meters: all beats that are neither strong nor second-strong
 */
function hihatBeats(sig: TimeSignature): Set<number> {
  if (sig.beatUnit === 8) {
    return new Set(defaultSecondStrongBeats(sig));
  }
  const accented = new Set([...defaultStrongBeats(sig), ...defaultSecondStrongBeats(sig)]);
  const result = new Set<number>();
  for (let i = 0; i < sig.beatsPerBar; i++) {
    if (!accented.has(i)) result.add(i);
  }
  return result;
}

/** In 6/8, stir only on even beat indices (eighth notes 1, 3, 5). */
function isStirBeat(beatIdx: number, sig: TimeSignature): boolean {
  if (sig.beatUnit === 8) return beatIdx % 2 === 0;
  return true;
}

export class DrumInstrument implements Instrument {
  private ridePattern: DrumRidePattern = 'swingRide';
  private humanize = true;
  private lastScheduledTick = -1;

  setRidePattern(pattern: DrumRidePattern): void {
    this.ridePattern = pattern;
  }

  setHumanize(enabled: boolean): void {
    this.humanize = enabled;
  }

  reset(): void {
    this.lastScheduledTick = -1;
  }

  schedule(window: ScheduleWindow, ctx: ScheduleContext): void {
    if (!ctx.scheduleDrum) return;

    const sig = ctx.timeSignature;
    const tpBeat = ticksPerBeat(sig);
    const tpBar = ticksPerBar(sig);
    const backbeats = hihatBeats(sig);
    const useSwingRide = this.ridePattern === 'swingRide'
      && sig.beatsPerBar === 4
      && sig.beatUnit === 4;

    // Max jitter in ticks at current tempo (±5 ms)
    const maxJitter = this.humanize
      ? Math.round(0.005 * (ctx.bpm / 60) * PPQ)
      : 0;

    const firstBeat = Math.ceil(window.fromTicks / tpBeat);
    for (let beat = firstBeat; beat * tpBeat < window.toTicks; beat++) {
      const atTicks = beat * tpBeat;
      const beatIdx = ((beat % sig.beatsPerBar) + sig.beatsPerBar) % sig.beatsPerBar;

      // Stir — on all beats (6/8: only even indices)
      if (isStirBeat(beatIdx, sig)) {
        const jitter = this.humanize ? (Math.random() - 0.5) * 2 * maxJitter : 0;
        const t = Math.max(window.fromTicks, atTicks + jitter);
        const velocity = this.humanize ? 0.6 + (Math.random() - 0.5) * 0.1 : 0.6;
        ctx.scheduleDrum(t, 'stir', velocity, tpBeat);
        this.lastScheduledTick = atTicks;
      }

      // Hi-hat foot — on backbeats only
      if (backbeats.has(beatIdx)) {
        const jitter = this.humanize ? (Math.random() - 0.5) * 2 * maxJitter : 0;
        const t = Math.max(window.fromTicks, atTicks + jitter);
        const velocity = this.humanize ? 0.72 + (Math.random() - 0.5) * 0.1 : 0.72;
        ctx.scheduleDrum(t, 'hihatFoot', velocity, tpBeat);
        this.lastScheduledTick = atTicks;
      }

      // Ride — quarters (non-swing or non-4/4)
      if (!useSwingRide) {
        const jitter = this.humanize ? (Math.random() - 0.5) * 2 * maxJitter : 0;
        const t = Math.max(window.fromTicks, atTicks + jitter);
        const velocity = this.humanize ? 0.65 + (Math.random() - 0.5) * 0.1 : 0.65;
        ctx.scheduleDrum(t, 'ride', velocity, 20);
        this.lastScheduledTick = atTicks;
      }
    }

    // Swing ride: separate pass over bars, only for 4/4
    if (useSwingRide) {
      const firstBar = Math.floor(window.fromTicks / tpBar);
      const lastBar = Math.floor((window.toTicks - 1) / tpBar);
      for (let bar = firstBar; bar <= lastBar; bar++) {
        const barStart = bar * tpBar;
        for (const hit of SWING_RIDE_OFFSETS) {
          const atTicks = barStart + hit.beatIdx * tpBeat + Math.round(hit.subdivision * tpBeat);
          if (atTicks < window.fromTicks || atTicks >= window.toTicks) continue;
          const jitter = this.humanize ? (Math.random() - 0.5) * 2 * maxJitter : 0;
          const t = Math.max(window.fromTicks, atTicks + jitter);
          const velocity = this.humanize ? hit.velocity + (Math.random() - 0.5) * 0.05 : hit.velocity;
          ctx.scheduleDrum(t, 'ride', velocity, 20);
          this.lastScheduledTick = atTicks;
        }
      }
    }
  }

  dispose(): void {
    this.lastScheduledTick = -1;
  }
}
