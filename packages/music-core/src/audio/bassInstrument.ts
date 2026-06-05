import type { ChordSymbol } from '@jazz/shared';
import { ticksPerBar, ticksPerBeat } from '../time/timeSignature.js';
import type { Instrument, ScheduleContext, ScheduleWindow } from './instrument.js';
import type { ChordTimeline } from './chordTimeline.js';

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
    // Note lasts 80% of a beat — decays before the next beat hits
    const durationTicks = Math.floor(tpBeat * 0.8);

    const firstBar = Math.ceil(window.fromTicks / tpBar);

    for (let bar = firstBar; bar * tpBar < window.toTicks; bar++) {
      const barStartTicks = bar * tpBar;
      const chord = this.timeline.getChordAtTick(barStartTicks, sig);
      if (!chord) continue;

      // Complexity 1: root on beat 1 only
      const rootNote = resolveRootNote(chord);
      ctx.scheduleNote(barStartTicks, rootNote, 0.78, durationTicks, 'finger');
    }
  }
}

/** Convert ChordSymbol root to a scientific pitch string in octave 2. */
function resolveRootNote(chord: ChordSymbol): string {
  // chord.root = 'C'|'D'|...'B', chord.rootAccidental = '#'|'b'|''
  return `${chord.root}${chord.rootAccidental}2`;
}
