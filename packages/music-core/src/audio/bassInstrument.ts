import type { ChordSymbol } from '@jazz/shared';
import { ticksPerBar, ticksPerBeat } from '../time/timeSignature.js';
import type { Instrument, ScheduleContext, ScheduleWindow } from './instrument.js';
import type { ChordTimeline } from './chordTimeline.js';

/** How many notes this complexity level places per bar. */
const NOTES_PER_BAR: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 1, // root on beat 1 → whole-note slot
  2: 4, // root on every beat → quarter-note slots
  3: 4, // root + fifth → quarter-note slots
  4: 4, // chord tones → quarter-note slots
  5: 4, // walking + approach → quarter-note slots
};

const NOTE_SEMITONES: Record<string, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
};

const SEMITONE_NAMES = [
  'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
] as const;

/** Fraction of the slot actually sounded — leaves a natural gap before the next note. */
const GATE_RATIO = 0.92;

/** Velocity per beat index (0-based). Source: BASS.md §Velocity и акценты. */
const BEAT_VELOCITY = [0.82, 0.68, 0.76, 0.70] as const;

export class BassInstrument implements Instrument {
  private timeline: ChordTimeline;
  private complexity: 1 | 2 | 3 | 4 | 5 = 1;

  constructor(timeline: ChordTimeline) {
    this.timeline = timeline;
  }

  setTimeline(timeline: ChordTimeline): void {
    this.timeline = timeline;
  }

  setComplexity(level: 1 | 2 | 3 | 4 | 5): void {
    this.complexity = level;
  }

  schedule(window: ScheduleWindow, ctx: ScheduleContext): void {
    if (!ctx.scheduleNote) return;

    const sig = ctx.timeSignature;
    const tpBar = ticksPerBar(sig);
    const tpBeat = ticksPerBeat(sig);

    const slotTicks = Math.floor(tpBar / NOTES_PER_BAR[this.complexity]);
    const durationTicks = Math.floor(slotTicks * GATE_RATIO);

    if (this.complexity === 1) {
      // Root on beat 1 only — whole-note slot
      const firstBar = Math.ceil(window.fromTicks / tpBar);
      for (let bar = firstBar; bar * tpBar < window.toTicks; bar++) {
        const barStartTicks = bar * tpBar;
        const chord = this.timeline.getChordAtTick(barStartTicks, sig);
        if (!chord) continue;
        ctx.scheduleNote(barStartTicks, resolveRootNote(chord, 2), BEAT_VELOCITY[0], durationTicks, 'finger');
      }
    } else if (this.complexity === 2) {
      // Root on every beat, alternating octaves 2/3 (odd beats low, even beats high)
      const firstBeat = Math.ceil(window.fromTicks / tpBeat);
      for (let beat = firstBeat; beat * tpBeat < window.toTicks; beat++) {
        const atTicks = beat * tpBeat;
        const beatInBar = beat % sig.beatsPerBar;
        const chord = this.timeline.getChordAtTick(atTicks, sig);
        if (!chord) continue;
        const octave = beatInBar % 2 === 0 ? 2 : 3;
        const velocity = BEAT_VELOCITY[beatInBar] ?? BEAT_VELOCITY[0];
        ctx.scheduleNote(atTicks, resolveRootNote(chord, octave), velocity, durationTicks, 'finger');
      }
    } else if (this.complexity === 3) {
      // Root + fifth alternating: beats 1,3 = root (pluck), beats 2,4 = fifth (finger)
      // Beat 3 root octave alternates between bars (even bar → oct 2, odd bar → oct 3)
      const firstBeat = Math.ceil(window.fromTicks / tpBeat);
      for (let beat = firstBeat; beat * tpBeat < window.toTicks; beat++) {
        const atTicks = beat * tpBeat;
        const beatInBar = beat % sig.beatsPerBar;
        const barIndex = Math.floor(beat / sig.beatsPerBar);
        const chord = this.timeline.getChordAtTick(atTicks, sig);
        if (!chord) continue;
        const velocity = BEAT_VELOCITY[beatInBar] ?? BEAT_VELOCITY[0];
        if (beatInBar % 2 === 0) {
          const octave = beatInBar === 2 && barIndex % 2 === 1 ? 3 : 2;
          ctx.scheduleNote(atTicks, resolveRootNote(chord, octave), velocity, durationTicks, 'pluck');
        } else {
          ctx.scheduleNote(atTicks, resolveFifthNote(chord, 2), velocity, durationTicks, 'finger');
        }
      }
    }
  }
}

/** Convert ChordSymbol root to a scientific pitch string at the given octave. */
function resolveRootNote(chord: ChordSymbol, octave: number): string {
  return `${chord.root}${chord.rootAccidental}${octave}`;
}

/** Interval in semitones from root to fifth based on chord quality/alterations. */
function fifthInterval(chord: ChordSymbol): number {
  if (chord.quality === 'diminished' || chord.quality === 'halfDiminished') return 6;
  if (chord.quality === 'augmented') return 8;
  if (chord.alterations.includes('b5')) return 6;
  return 7;
}

/**
 * Resolve the fifth of a chord as a scientific pitch string.
 * The fifth is always placed above the root: if the interval wraps the
 * octave boundary the octave number is incremented automatically.
 */
function resolveFifthNote(chord: ChordSymbol, rootOctave: number): string {
  const accOffset = chord.rootAccidental === '#' ? 1 : chord.rootAccidental === 'b' ? -1 : 0;
  const rootSemitone = (NOTE_SEMITONES[chord.root] ?? 0) + accOffset;
  const fifthSemitone = (rootSemitone + fifthInterval(chord)) % 12;
  const octave = rootOctave + (fifthSemitone <= rootSemitone ? 1 : 0);
  return `${SEMITONE_NAMES[fifthSemitone]}${octave}`;
}
