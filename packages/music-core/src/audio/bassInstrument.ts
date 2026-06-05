import type { ChordSymbol } from '@jazz/shared';
import { ticksPerBar, ticksPerBeat } from '../time/timeSignature.js';
import type { Instrument, ScheduleContext, ScheduleWindow } from './instrument.js';
import type { ChordTimeline } from './chordTimeline.js';

/** How many notes this complexity level places per bar. */
const NOTES_PER_BAR: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 1, // root on beat 1 → whole-note slot
  2: 4, // root on every beat → quarter-note slots
  3: 4, // chord tones → quarter-note slots
  4: 4, // walking + approach → quarter-note slots
  5: 4, // full walking → quarter-note slots
};

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
    }
  }
}

/** Convert ChordSymbol root to a scientific pitch string at the given octave. */
function resolveRootNote(chord: ChordSymbol, octave: number): string {
  return `${chord.root}${chord.rootAccidental}${octave}`;
}
