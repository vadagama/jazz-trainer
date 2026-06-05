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

    // Note duration = its time slot × GATE_RATIO:
    //   complexity 1 → whole bar (whole note in 4/4)
    //   complexity 2+ → one beat (quarter note in 4/4)
    const slotTicks = Math.floor(tpBar / NOTES_PER_BAR[this.complexity]);
    const durationTicks = Math.floor(slotTicks * GATE_RATIO);

    const firstBar = Math.ceil(window.fromTicks / tpBar);

    for (let bar = firstBar; bar * tpBar < window.toTicks; bar++) {
      const barStartTicks = bar * tpBar;
      const chord = this.timeline.getChordAtTick(barStartTicks, sig);
      if (!chord) continue;

      // Complexity 1: root on beat 1 only
      const rootNote = resolveRootNote(chord);
      ctx.scheduleNote(barStartTicks, rootNote, 0.78, durationTicks, 'finger');
    }

    void tpBeat; // referenced by future complexities
  }
}

/** Convert ChordSymbol root to a scientific pitch string in octave 2. */
function resolveRootNote(chord: ChordSymbol): string {
  // chord.root = 'C'|'D'|...'B', chord.rootAccidental = '#'|'b'|''
  return `${chord.root}${chord.rootAccidental}2`;
}
