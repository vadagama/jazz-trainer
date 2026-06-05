import type { ChordSymbol } from '@jazz/shared';
import { ticksPerBar, ticksPerBeat, defaultStrongBeats, defaultSecondStrongBeats } from '../time/timeSignature.js';
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
      // Root on beat 1 only — pluck for clean attack on the downbeat
      const firstBar = Math.ceil(window.fromTicks / tpBar);
      for (let bar = firstBar; bar * tpBar < window.toTicks; bar++) {
        const barStartTicks = bar * tpBar;
        const chord = this.timeline.getChordAtTick(barStartTicks, sig);
        if (!chord) continue;
        ctx.scheduleNote(barStartTicks, resolveRootNote(chord, 2), BEAT_VELOCITY[0], durationTicks, 'pluck');
      }
    } else if (this.complexity === 2) {
      // Root on every beat, alternating octaves 2/3; strong beats = pluck, weak = finger
      const strongBeats = new Set([...defaultStrongBeats(sig), ...defaultSecondStrongBeats(sig)]);
      const firstBeat = Math.ceil(window.fromTicks / tpBeat);
      for (let beat = firstBeat; beat * tpBeat < window.toTicks; beat++) {
        const atTicks = beat * tpBeat;
        const beatInBar = beat % sig.beatsPerBar;
        const chord = this.timeline.getChordAtTick(atTicks, sig);
        if (!chord) continue;
        const isStrong = strongBeats.has(beatInBar);
        const octave = isStrong ? 2 : 3;
        const velocity = BEAT_VELOCITY[beatInBar] ?? BEAT_VELOCITY[0];
        ctx.scheduleNote(atTicks, resolveRootNote(chord, octave), velocity, durationTicks, isStrong ? 'pluck' : 'finger');
      }
    } else if (this.complexity === 3) {
      // Root on strong beats (pluck), fifth on weak beats (finger)
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
          const octave = beatInBar !== 0 && barIndex % 2 === 1 ? 3 : 2;
          ctx.scheduleNote(atTicks, resolveRootNote(chord, octave), velocity, durationTicks, 'pluck');
        } else {
          ctx.scheduleNote(atTicks, resolveFifthNote(chord, 2), velocity, durationTicks, 'finger');
        }
      }
    } else if (this.complexity === 4) {
      // Chord tones in ascending order: beat 1=root, 2=third, 3=fifth, 4=seventh
      const strongBeats = new Set([...defaultStrongBeats(sig), ...defaultSecondStrongBeats(sig)]);
      const firstBeat = Math.ceil(window.fromTicks / tpBeat);
      for (let beat = firstBeat; beat * tpBeat < window.toTicks; beat++) {
        const atTicks = beat * tpBeat;
        const beatInBar = beat % sig.beatsPerBar;
        const chord = this.timeline.getChordAtTick(atTicks, sig);
        if (!chord) continue;
        const isStrong = strongBeats.has(beatInBar);
        const velocity = BEAT_VELOCITY[beatInBar] ?? BEAT_VELOCITY[0];
        const articulation = isStrong ? 'pluck' : 'finger';
        let note: string;
        switch (beatInBar) {
          case 0:  note = resolveRootNote(chord, 2); break;
          case 1:  note = resolveThirdNote(chord, 2); break;
          case 2:  note = resolveFifthNote(chord, 2); break;
          default: note = resolveSeventhNote(chord, 2); break;
        }
        ctx.scheduleNote(atTicks, note, velocity, durationTicks, articulation);
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
 * wraps the chromatic boundary. Notes above G3 are clamped down one octave to
 * stay within the practical walking bass range (E1–G3).
 */
function resolveIntervalNote(chord: ChordSymbol, rootOctave: number, intervalSemitones: number): string {
  const accOffset = chord.rootAccidental === '#' ? 1 : chord.rootAccidental === 'b' ? -1 : 0;
  const rootSemitone = ((NOTE_SEMITONES[chord.root] ?? 0) + accOffset + 12) % 12;
  const targetSemitone = (rootSemitone + intervalSemitones) % 12;
  let octave = rootOctave + (targetSemitone < rootSemitone ? 1 : 0);
  // Clamp notes above G3 (index 7) to one octave lower — walking bass ceiling
  if (octave > 3 || (octave === 3 && targetSemitone > 7)) octave -= 1;
  return `${SEMITONE_NAMES[targetSemitone]}${octave}`;
}

function resolveFifthNote(chord: ChordSymbol, rootOctave: number): string {
  return resolveIntervalNote(chord, rootOctave, fifthInterval(chord));
}

function resolveThirdNote(chord: ChordSymbol, rootOctave: number): string {
  return resolveIntervalNote(chord, rootOctave, thirdInterval(chord));
}

function resolveSeventhNote(chord: ChordSymbol, rootOctave: number): string {
  return resolveIntervalNote(chord, rootOctave, seventhInterval(chord));
}
