import type { TimeSignatureString } from '@jazz/shared';

/** Pulses per quarter note — internal tick resolution (docs/02-audio-engine.md §3). */
export const PPQ = 480;

/** A bar's time signature. `beatUnit` is the note value of one beat (4 = quarter, 8 = eighth). */
export interface TimeSignature {
  beatsPerBar: number;
  beatUnit: 4 | 8;
}

/** Parse a `"n/m"` string (e.g. `"4/4"`, `"6/8"`) into a {@link TimeSignature}. */
export function parseTimeSignature(str: TimeSignatureString | string): TimeSignature {
  const [beatsRaw, unitRaw] = str.split('/');
  const beatsPerBar = Number(beatsRaw);
  const beatUnit = Number(unitRaw);
  if (!Number.isInteger(beatsPerBar) || beatsPerBar <= 0) {
    throw new Error(`Invalid time signature: "${str}"`);
  }
  if (beatUnit !== 4 && beatUnit !== 8) {
    throw new Error(`Unsupported beat unit in "${str}" (only /4 and /8 are supported)`);
  }
  return { beatsPerBar, beatUnit };
}

/** Ticks per beat: a quarter-note beat is PPQ, an eighth-note beat is PPQ/2. */
export function ticksPerBeat(sig: TimeSignature): number {
  return sig.beatUnit === 4 ? PPQ : PPQ / 2;
}

/** Ticks in a full bar. */
export function ticksPerBar(sig: TimeSignature): number {
  return sig.beatsPerBar * ticksPerBeat(sig);
}

/**
 * Default first-strong (beat 1) beats — always just beat 0.
 */
export function defaultStrongBeats(_sig: TimeSignature): number[] {
  return [0];
}

/**
 * Default second-strong beats (mid-bar accent):
 * - 4/4 → beat 2
 * - 5/4 → beat 3
 * - 6/8 → beat 3
 * - 2/4, 3/4 → none
 */
export function defaultSecondStrongBeats(sig: TimeSignature): number[] {
  if (sig.beatUnit === 8 && sig.beatsPerBar === 6) return [3];
  if (sig.beatsPerBar === 4) return [2];
  if (sig.beatsPerBar === 5) return [3];
  return [];
}
