import { PPQ, ticksPerBar, ticksPerBeat, type TimeSignature } from './timeSignature.js';

/**
 * A position in musical time. All fields are 0-based: bar 0 / beat 0 / tick 0 is
 * the very start of the form. `tick` is the offset within the current beat
 * (0 .. ticksPerBeat-1).
 */
export interface MusicalPosition {
  bar: number;
  beat: number;
  tick: number;
}

/** Convert a musical position to absolute ticks from the start of the form. */
export function positionToTicks(pos: MusicalPosition, sig: TimeSignature): number {
  return pos.bar * ticksPerBar(sig) + pos.beat * ticksPerBeat(sig) + pos.tick;
}

/** Convert absolute ticks back into a normalized {@link MusicalPosition}. */
export function ticksToPosition(ticks: number, sig: TimeSignature): MusicalPosition {
  const tpBar = ticksPerBar(sig);
  const tpBeat = ticksPerBeat(sig);
  const bar = Math.floor(ticks / tpBar);
  const withinBar = ticks - bar * tpBar;
  const beat = Math.floor(withinBar / tpBeat);
  const tick = withinBar - beat * tpBeat;
  return { bar, beat, tick };
}

/** Seconds for a tick span. Independent of beat unit: PPQ is always per quarter. */
export function ticksToSeconds(ticks: number, bpm: number): number {
  return (ticks * (60 / bpm)) / PPQ;
}

/** Inverse of {@link ticksToSeconds} (rounded to the nearest whole tick). */
export function secondsToTicks(seconds: number, bpm: number): number {
  return Math.round((seconds * bpm * PPQ) / 60);
}
