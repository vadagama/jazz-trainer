import type { ChordSymbol } from '@jazz/shared';
import { ticksPerBar, ticksPerBeat, defaultStrongBeats, defaultSecondStrongBeats } from '../time/timeSignature.js';
import type { Instrument, ScheduleContext, ScheduleWindow } from './instrument.js';
import type { ChordTimeline } from './chordTimeline.js';

/** How many notes this complexity level places per bar. */
const NOTES_PER_BAR: Record<1 | 2 | 3 | 4 | 5 | 6 | 7, number> = {
  1: 1, // root on beat 1 → whole-note slot
  2: 4, // root on every beat → quarter-note slots
  3: 4, // root + fifth → quarter-note slots
  4: 4, // chord tones → quarter-note slots
  5: 4, // walking + approach → quarter-note slots
  6: 4, // chord tones all beats, all pluck → quarter-note slots
  7: 2, // chord tones beats 1 & 3 only → half-note slots ("two feel")
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
  private complexity: 1 | 2 | 3 | 4 | 5 | 6 | 7 = 1;
  private octaveShift = 0;

  constructor(timeline: ChordTimeline) {
    this.timeline = timeline;
  }

  setTimeline(timeline: ChordTimeline): void {
    this.timeline = timeline;
  }

  setComplexity(level: 1 | 2 | 3 | 4 | 5 | 6 | 7): void {
    this.complexity = level;
  }

  setOctaveShift(shift: number): void {
    this.octaveShift = shift;
  }

  schedule(window: ScheduleWindow, ctx: ScheduleContext): void {
    if (!ctx.scheduleNote) return;

    const sig = ctx.timeSignature;
    const tpBar = ticksPerBar(sig);
    const tpBeat = ticksPerBeat(sig);
    const os = this.octaveShift;

    const slotTicks = Math.floor(tpBar / NOTES_PER_BAR[this.complexity]);
    const durationTicks = Math.floor(slotTicks * GATE_RATIO);

    if (this.complexity === 1) {
      // Root on beat 1 only — pluck for clean attack on the downbeat
      const firstBar = Math.ceil(window.fromTicks / tpBar);
      for (let bar = firstBar; bar * tpBar < window.toTicks; bar++) {
        const barStartTicks = bar * tpBar;
        const chord = this.timeline.getChordAtTick(barStartTicks, sig);
        if (!chord) continue;
        ctx.scheduleNote(barStartTicks, resolveRootNote(chord, 2 + os), BEAT_VELOCITY[0], durationTicks, 'pluck');
      }
    } else if (this.complexity === 2) {
      // Root on every beat, alternating octaves 2/3; velocity varies by beat position
      const strongBeats = new Set([...defaultStrongBeats(sig), ...defaultSecondStrongBeats(sig)]);
      const firstBeat = Math.ceil(window.fromTicks / tpBeat);
      for (let beat = firstBeat; beat * tpBeat < window.toTicks; beat++) {
        const atTicks = beat * tpBeat;
        const beatInBar = beat % sig.beatsPerBar;
        const chord = this.timeline.getChordAtTick(atTicks, sig);
        if (!chord) continue;
        const isStrong = strongBeats.has(beatInBar);
        const octave = (isStrong ? 2 : 3) + os;
        const velocity = BEAT_VELOCITY[beatInBar] ?? BEAT_VELOCITY[0];
        ctx.scheduleNote(atTicks, resolveRootNote(chord, octave), velocity, durationTicks, 'pluck');
      }
    } else if (this.complexity === 3) {
      // Root on strong beats, fifth on weak beats; velocity varies by beat position
      // Strong beat root octave alternates between bars for subtle variation
      const strongBeats = new Set([...defaultStrongBeats(sig), ...defaultSecondStrongBeats(sig)]);
      const firstBeat = Math.ceil(window.fromTicks / tpBeat);
      for (let beat = firstBeat; beat * tpBeat < window.toTicks; beat++) {
        const atTicks = beat * tpBeat;
        const beatInBar = beat % sig.beatsPerBar;
        const barIndex = Math.floor(beat / sig.beatsPerBar);
        const chord = this.timeline.getChordAtTick(atTicks, sig);
        if (!chord) continue;
        const isStrong = strongBeats.has(beatInBar);
        const velocity = BEAT_VELOCITY[beatInBar] ?? BEAT_VELOCITY[0];
        if (isStrong) {
          const octave = (beatInBar !== 0 && barIndex % 2 === 1 ? 3 : 2) + os;
          ctx.scheduleNote(atTicks, resolveRootNote(chord, octave), velocity, durationTicks, 'pluck');
        } else {
          ctx.scheduleNote(atTicks, resolveFifthNote(chord, 2 + os, os), velocity, durationTicks, 'pluck');
        }
      }
    } else if (this.complexity === 4) {
      // Chord tones in ascending order: beat 1=root, 2=third, 3=fifth, 4=seventh
      const firstBeat = Math.ceil(window.fromTicks / tpBeat);
      for (let beat = firstBeat; beat * tpBeat < window.toTicks; beat++) {
        const atTicks = beat * tpBeat;
        const beatInBar = beat % sig.beatsPerBar;
        const chord = this.timeline.getChordAtTick(atTicks, sig);
        if (!chord) continue;
        const velocity = BEAT_VELOCITY[beatInBar] ?? BEAT_VELOCITY[0];
        let note: string;
        switch (beatInBar) {
          case 0:  note = resolveRootNote(chord, 2 + os); break;
          case 1:  note = resolveThirdNote(chord, 2 + os, os); break;
          case 2:  note = resolveFifthNote(chord, 2 + os, os); break;
          default: note = resolveSeventhNote(chord, 2 + os, os); break;
        }
        ctx.scheduleNote(atTicks, note, velocity, durationTicks, 'pluck');
      }
    } else if (this.complexity === 5) {
      // Walking bass: root-third-fifth on inner beats, chromatic approach on last beat of each bar.
      // Even bars approach from above (descend into downbeat), odd bars from below (ascend).
      const firstBeat = Math.ceil(window.fromTicks / tpBeat);
      for (let beat = firstBeat; beat * tpBeat < window.toTicks; beat++) {
        const atTicks = beat * tpBeat;
        const beatInBar = beat % sig.beatsPerBar;
        const barIndex = Math.floor(beat / sig.beatsPerBar);
        const chord = this.timeline.getChordAtTick(atTicks, sig);
        if (!chord) continue;
        const isLastBeat = beatInBar === sig.beatsPerBar - 1;
        const velocity = BEAT_VELOCITY[beatInBar] ?? BEAT_VELOCITY[0];
        let note: string;
        if (isLastBeat) {
          const nextChord = this.timeline.getChordAtTick((barIndex + 1) * tpBar, sig);
          note = nextChord
            ? resolveApproachNote(nextChord, barIndex % 2 === 0, 2 + os, os)
            : resolveSeventhNote(chord, 2 + os, os);
        } else {
          switch (beatInBar) {
            case 0:  note = resolveRootNote(chord, 2 + os); break;
            case 1:  note = resolveThirdNote(chord, 2 + os, os); break;
            default: note = resolveFifthNote(chord, 2 + os, os); break;
          }
        }
        ctx.scheduleNote(atTicks, note, velocity, durationTicks, 'pluck');
      }
    } else if (this.complexity === 6) {
      // Chord tones on all 4 beats — root/third/fifth/seventh
      const firstBeat = Math.ceil(window.fromTicks / tpBeat);
      for (let beat = firstBeat; beat * tpBeat < window.toTicks; beat++) {
        const atTicks = beat * tpBeat;
        const beatInBar = beat % sig.beatsPerBar;
        const chord = this.timeline.getChordAtTick(atTicks, sig);
        if (!chord) continue;
        const velocity = BEAT_VELOCITY[beatInBar] ?? BEAT_VELOCITY[0];
        let note: string;
        switch (beatInBar) {
          case 0:  note = resolveRootNote(chord, 2 + os); break;
          case 1:  note = resolveThirdNote(chord, 2 + os, os); break;
          case 2:  note = resolveFifthNote(chord, 2 + os, os); break;
          default: note = resolveSeventhNote(chord, 2 + os, os); break;
        }
        ctx.scheduleNote(atTicks, note, velocity, durationTicks, 'pluck');
      }
    } else if (this.complexity === 7) {
      // Chord tones on beats 1 and 3 only — root on beat 1, fifth on beat 3, both pluck ("two feel")
      // slotTicks = half-bar so notes sustain into the next downbeat
      const firstBeat = Math.ceil(window.fromTicks / tpBeat);
      for (let beat = firstBeat; beat * tpBeat < window.toTicks; beat++) {
        const beatInBar = beat % sig.beatsPerBar;
        if (beatInBar % 2 !== 0) continue; // only beats 0 and 2 (1-indexed: 1 and 3)
        const atTicks = beat * tpBeat;
        const chord = this.timeline.getChordAtTick(atTicks, sig);
        if (!chord) continue;
        const velocity = BEAT_VELOCITY[beatInBar] ?? BEAT_VELOCITY[0];
        const note = beatInBar === 0
          ? resolveRootNote(chord, 2 + os)
          : resolveFifthNote(chord, 2 + os, os);
        ctx.scheduleNote(atTicks, note, velocity, durationTicks, 'pluck');
      }
    }
  }
}

/** Convert ChordSymbol root to a scientific pitch string at the given octave. */
function resolveRootNote(chord: ChordSymbol, octave: number): string {
  return `${chord.root}${chord.rootAccidental}${octave}`;
}

/** Interval in semitones from root to third based on chord quality. */
function thirdInterval(chord: ChordSymbol): number {
  switch (chord.quality) {
    case 'major': return 4;
    case 'dominant': return 4;
    case 'augmented': return 4;
    default: return 3; // minor, halfDiminished, diminished
  }
}

/** Interval in semitones from root to fifth based on chord quality/alterations. */
function fifthInterval(chord: ChordSymbol): number {
  if (chord.quality === 'diminished' || chord.quality === 'halfDiminished') return 6;
  if (chord.quality === 'augmented') return 8;
  if (chord.alterations.includes('b5')) return 6;
  return 7;
}

/** Interval in semitones from root to seventh based on chord quality. */
function seventhInterval(chord: ChordSymbol): number {
  if (chord.quality === 'major') return 11;    // major 7th
  if (chord.quality === 'diminished') return 9; // diminished 7th (bb7)
  return 10;                                    // minor 7th (dominant, minor, halfDiminished, augmented)
}

/**
 * Resolve a chord interval (semitones above root) to a scientific pitch string.
 * Placed above the root in rootOctave; octave is incremented when the interval
 * wraps the chromatic boundary. Notes above the walking bass ceiling (G3 + octaveShift)
 * are clamped down one octave.
 */
function resolveIntervalNote(chord: ChordSymbol, rootOctave: number, intervalSemitones: number, octaveShift = 0): string {
  const accOffset = chord.rootAccidental === '#' ? 1 : chord.rootAccidental === 'b' ? -1 : 0;
  const rootSemitone = ((NOTE_SEMITONES[chord.root] ?? 0) + accOffset + 12) % 12;
  const targetSemitone = (rootSemitone + intervalSemitones) % 12;
  let octave = rootOctave + (targetSemitone < rootSemitone ? 1 : 0);
  const ceilOct = 3 + octaveShift;
  if (octave > ceilOct || (octave === ceilOct && targetSemitone > 7)) octave -= 1;
  return `${SEMITONE_NAMES[targetSemitone]}${octave}`;
}

function resolveFifthNote(chord: ChordSymbol, rootOctave: number, octaveShift = 0): string {
  return resolveIntervalNote(chord, rootOctave, fifthInterval(chord), octaveShift);
}

function resolveThirdNote(chord: ChordSymbol, rootOctave: number, octaveShift = 0): string {
  return resolveIntervalNote(chord, rootOctave, thirdInterval(chord), octaveShift);
}

function resolveSeventhNote(chord: ChordSymbol, rootOctave: number, octaveShift = 0): string {
  return resolveIntervalNote(chord, rootOctave, seventhInterval(chord), octaveShift);
}

/**
 * Chromatic approach to nextChord's root from one semitone above (fromAbove=true)
 * or below (fromAbove=false). Octave wraps are handled so the approach note is
 * always on the correct side of the target pitch. Walking bass ceiling applied.
 */
function resolveApproachNote(nextChord: ChordSymbol, fromAbove: boolean, targetOctave: number, octaveShift = 0): string {
  const accOffset = nextChord.rootAccidental === '#' ? 1 : nextChord.rootAccidental === 'b' ? -1 : 0;
  const nextRootSemitone = ((NOTE_SEMITONES[nextChord.root] ?? 0) + accOffset + 12) % 12;
  let approachSemitone: number;
  let approachOctave: number;
  if (fromAbove) {
    approachSemitone = (nextRootSemitone + 1) % 12;
    // Wrap means approach crossed 12→0 boundary: it lands one octave higher
    approachOctave = approachSemitone <= nextRootSemitone ? targetOctave + 1 : targetOctave;
  } else {
    approachSemitone = (nextRootSemitone + 11) % 12;
    // Wrap means approach crossed 0→11 boundary: it lands one octave lower
    approachOctave = approachSemitone >= nextRootSemitone ? targetOctave - 1 : targetOctave;
  }
  const ceilOct = 3 + octaveShift;
  if (approachOctave > ceilOct || (approachOctave === ceilOct && approachSemitone > 7)) approachOctave -= 1;
  return `${SEMITONE_NAMES[approachSemitone]}${approachOctave}`;
}
