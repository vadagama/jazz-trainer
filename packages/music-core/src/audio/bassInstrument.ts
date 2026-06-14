import type { ChordSymbol, Style } from '@jazz/shared';
import {
  ticksPerBar,
  ticksPerBeat,
  defaultStrongBeats,
  defaultSecondStrongBeats,
} from '../time/timeSignature.js';
import type { Instrument, ScheduleContext, ScheduleWindow } from './instrument.js';
import type { ChordTimeline } from './chordTimeline.js';

const NOTE_SEMITONES: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

const SEMITONE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

/** Fraction of the slot actually sounded — leaves a natural gap before the next note. */
const GATE_RATIO = 0.92;

/** Velocity per beat index (0-based). Source: BASS.md §Velocity и акценты. */
const BEAT_VELOCITY = [0.82, 0.68, 0.76, 0.7] as const;

/** Style → default complexity level. */
const STYLE_DEFAULT_COMPLEXITY: Record<Style, 1 | 2 | 3 | 4 | 5 | 6 | 7> = {
  swing: 5, // walking bass
  bossa: 3, // root-5th half notes
  funk: 5, // syncopated eighth-notes
  latin: 3, // montuno
  ballad: 7, // two-feel
};

export class BassInstrument implements Instrument {
  private timeline: ChordTimeline;
  private complexity: 1 | 2 | 3 | 4 | 5 | 6 | 7 = 5;
  private octaveShift = 0;
  private style: Style = 'swing';

  constructor(timeline: ChordTimeline) {
    this.timeline = timeline;
  }

  setTimeline(timeline: ChordTimeline): void {
    this.timeline = timeline;
  }

  setStyle(style: Style): void {
    this.style = style;
    this.complexity = STYLE_DEFAULT_COMPLEXITY[style] ?? 5;
  }

  setComplexity(level: 1 | 2 | 3 | 4 | 5 | 6 | 7): void {
    this.complexity = level;
  }

  setOctaveShift(shift: number): void {
    this.octaveShift = shift;
  }

  /* ── Scheduling ──────────────────────────────────────────────────────────── */

  schedule(window: ScheduleWindow, ctx: ScheduleContext): void {
    switch (this.style) {
      case 'swing':
        this.scheduleSwing(window, ctx);
        break;
      case 'bossa':
        this.scheduleBossa(window, ctx);
        break;
      case 'funk':
        this.scheduleFunk(window, ctx);
        break;
      case 'latin':
        this.scheduleLatin(window, ctx);
        break;
      case 'ballad':
        this.scheduleBallad(window, ctx);
        break;
    }
  }

  /* ── Swing: walking bass ─────────────────────────────────────────────────── */

  private scheduleSwing(window: ScheduleWindow, ctx: ScheduleContext): void {
    const sig = ctx.timeSignature;
    const tpBeat = ticksPerBeat(sig);
    const tpBar = ticksPerBar(sig);
    const os = this.octaveShift;

    if (this.complexity <= 2) {
      // Roots on quarters, alternating octaves
      const strongBeats = new Set([...defaultStrongBeats(sig), ...defaultSecondStrongBeats(sig)]);
      const slotTicks = Math.floor(tpBar / 4);
      const durationTicks = Math.floor(slotTicks * GATE_RATIO);
      const firstBeat = Math.ceil(window.fromTicks / tpBeat);
      for (let beat = firstBeat; beat * tpBeat < window.toTicks; beat++) {
        const atTicks = beat * tpBeat;
        const beatInBar = beat % sig.beatsPerBar;
        const chord = this.timeline.getChordAtTick(atTicks, sig);
        if (!chord) continue;
        const isStrong = strongBeats.has(beatInBar);
        const octave = (isStrong ? 2 : 3) + os;
        const velocity = BEAT_VELOCITY[beatInBar] ?? BEAT_VELOCITY[0];
        ctx.scheduleEvent(
          'bass',
          { note: resolveRootNote(chord, octave), articulation: 'pluck' },
          atTicks,
          velocity,
          durationTicks,
        );
      }
    } else if (this.complexity <= 4) {
      // Root on strong beats, fifth on weak beats; octave alternates between bars
      const strongBeats = new Set([...defaultStrongBeats(sig), ...defaultSecondStrongBeats(sig)]);
      const slotTicks = Math.floor(tpBar / 4);
      const durationTicks = Math.floor(slotTicks * GATE_RATIO);
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
          ctx.scheduleEvent(
            'bass',
            { note: resolveRootNote(chord, octave), articulation: 'pluck' },
            atTicks,
            velocity,
            durationTicks,
          );
        } else {
          ctx.scheduleEvent(
            'bass',
            { note: resolveFifthNote(chord, 2 + os, os), articulation: 'pluck' },
            atTicks,
            velocity,
            durationTicks,
          );
        }
      }
    } else if (this.complexity <= 6) {
      // Walking bass: root-3rd-5th on inner beats, chromatic approach on last beat
      const slotTicks = Math.floor(tpBar / 4);
      const durationTicks = Math.floor(slotTicks * GATE_RATIO);
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
            case 0:
              note = resolveRootNote(chord, 2 + os);
              break;
            case 1:
              note = resolveThirdNote(chord, 2 + os, os);
              break;
            default:
              note = resolveFifthNote(chord, 2 + os, os);
              break;
          }
        }
        ctx.scheduleEvent(
          'bass',
          { note, articulation: 'pluck' },
          atTicks,
          velocity,
          durationTicks,
        );
      }
    } else {
      // Complexity 7: dense chord tones on all beats
      const slotTicks = Math.floor(tpBar / 4);
      const durationTicks = Math.floor(slotTicks * GATE_RATIO);
      const firstBeat = Math.ceil(window.fromTicks / tpBeat);
      for (let beat = firstBeat; beat * tpBeat < window.toTicks; beat++) {
        const atTicks = beat * tpBeat;
        const beatInBar = beat % sig.beatsPerBar;
        const chord = this.timeline.getChordAtTick(atTicks, sig);
        if (!chord) continue;
        const velocity = BEAT_VELOCITY[beatInBar] ?? BEAT_VELOCITY[0];
        let note: string;
        switch (beatInBar) {
          case 0:
            note = resolveRootNote(chord, 2 + os);
            break;
          case 1:
            note = resolveThirdNote(chord, 2 + os, os);
            break;
          case 2:
            note = resolveFifthNote(chord, 2 + os, os);
            break;
          default:
            note = resolveSeventhNote(chord, 2 + os, os);
            break;
        }
        ctx.scheduleEvent(
          'bass',
          { note, articulation: 'pluck' },
          atTicks,
          velocity,
          durationTicks,
        );
      }
    }
  }

  /* ── Bossa: root-5th half notes ──────────────────────────────────────────── */

  private scheduleBossa(window: ScheduleWindow, ctx: ScheduleContext): void {
    // Root on beat 1, fifth on beat 3 — half-note duration per event (1 5 | 1 5)
    // Higher complexity adds octave jumps and alternating direction
    const sig = ctx.timeSignature;
    const tpBeat = ticksPerBeat(sig);
    const tpBar = ticksPerBar(sig);
    const os = this.octaveShift;

    // Two slots per bar: beat 0 and beat 2 (1-indexed: 1 and 3)
    const slotTicks = tpBar / 2; // half-note duration
    const durationTicks = Math.floor(slotTicks * GATE_RATIO);

    const firstBeat = Math.ceil(window.fromTicks / tpBeat);
    for (let beat = firstBeat; beat * tpBeat < window.toTicks; beat++) {
      const beatInBar = beat % sig.beatsPerBar;
      // Only beats 0 and 2 (downbeats 1 and 3) for half-note pattern
      // In 3/4: only beat 0
      if (sig.beatsPerBar >= 4) {
        if (beatInBar !== 0 && beatInBar !== 2) continue;
      } else {
        if (beatInBar !== 0) continue;
      }
      const atTicks = beat * tpBeat;
      const chord = this.timeline.getChordAtTick(atTicks, sig);
      if (!chord) continue;

      const barIndex = Math.floor(beat / sig.beatsPerBar);
      const velocity = BEAT_VELOCITY[beatInBar] ?? BEAT_VELOCITY[0];

      let note: string;
      if (beatInBar === 0) {
        // Beat 1: root
        // Higher complexity alternates octave 2/3 between bars
        const octave = this.complexity >= 4 && barIndex % 2 === 1 ? 3 : 2;
        note = resolveRootNote(chord, octave + os);
      } else {
        // Beat 3: fifth
        note = resolveFifthNote(chord, 2 + os, os);
      }
      ctx.scheduleEvent('bass', { note, articulation: 'pluck' }, atTicks, velocity, durationTicks);
    }
  }

  /* ── Funk: syncopated eighth-notes with rests ────────────────────────────── */

  private scheduleFunk(window: ScheduleWindow, ctx: ScheduleContext): void {
    // Syncopated line: emphasis on offbeat eighths, classic funk bass
    // Complexity 1-2: sparse (root on 1, 5th on 3)
    // Complexity 3-4: medium (root on 1, 5th on 2&, octave on 4)
    // Complexity 5-6: dense (root, 5th, octave with syncopation)
    // Complexity 7: very syncopated (approach notes on offbeats)
    const sig = ctx.timeSignature;
    const tpBeat = ticksPerBeat(sig);
    const tpBar = ticksPerBar(sig);
    const os = this.octaveShift;

    // Eighth-note grid: 8 slots per 4/4 bar
    const eighthTicks = tpBeat / 2;
    const slotTicks = tpBar / (sig.beatsPerBar * 2);
    const durationTicks = Math.floor(slotTicks * GATE_RATIO);

    const firstEighth = Math.ceil(window.fromTicks / eighthTicks);
    for (let e = firstEighth; e * eighthTicks < window.toTicks; e++) {
      const atTicks = e * eighthTicks;
      const beatInBar = Math.floor((e % (sig.beatsPerBar * 2)) / 2);
      const subIndex = e % 2; // 0 = downbeat, 1 = upbeat (the "&")
      const barIndex = Math.floor(e / (sig.beatsPerBar * 2));
      const chord = this.timeline.getChordAtTick(atTicks, sig);
      if (!chord) continue;

      const velocity = BEAT_VELOCITY[beatInBar] ?? BEAT_VELOCITY[0];

      // Decide which eighth-notes to fire based on complexity
      let note: string | null = null;

      if (this.complexity <= 2) {
        // Sparse: root on beat 1, fifth on beat 3 (quarter-note feel)
        if (beatInBar === 0 && subIndex === 0) {
          note = resolveRootNote(chord, 2 + os);
        } else if (beatInBar === 2 && subIndex === 0) {
          note = resolveFifthNote(chord, 2 + os, os);
        }
      } else if (this.complexity <= 4) {
        // Medium: root on 1, root on 1&, fifth on 2&, root on 4, root on 4&
        if (beatInBar === 0 && subIndex === 0) {
          note = resolveRootNote(chord, 2 + os);
        } else if (beatInBar === 0 && subIndex === 1) {
          note = resolveRootNote(chord, 3 + os);
        } else if (beatInBar === 1 && subIndex === 1) {
          note = resolveFifthNote(chord, 2 + os, os);
        } else if (beatInBar === 2 && subIndex === 1) {
          note = resolveRootNote(chord, 3 + os);
        } else if (beatInBar === 3 && subIndex === 0) {
          note = resolveRootNote(chord, 2 + os);
        } else if (beatInBar === 3 && subIndex === 1) {
          note = resolveRootNote(chord, 3 + os);
        }
      } else if (this.complexity <= 6) {
        // Dense syncopated: hits on 1, 1&, 2&, 3, 3&, 4&
        if (beatInBar === 0 && subIndex === 0) {
          note = resolveRootNote(chord, 2 + os);
        } else if (beatInBar === 0 && subIndex === 1) {
          note = resolveFifthNote(chord, 2 + os, os);
        } else if (beatInBar === 1 && subIndex === 1) {
          note = resolveRootNote(chord, 3 + os);
        } else if (beatInBar === 2 && subIndex === 0) {
          note = resolveFifthNote(chord, 2 + os, os);
        } else if (beatInBar === 2 && subIndex === 1) {
          note = resolveRootNote(chord, 3 + os);
        } else if (beatInBar === 3 && subIndex === 1) {
          note = resolveSeventhNote(chord, 2 + os, os);
        }
      } else {
        // Complexity 7: highly syncopated with approach notes
        if (beatInBar === 0 && subIndex === 0) {
          note = resolveFifthNote(chord, 2 + os, os);
        } else if (beatInBar === 0 && subIndex === 1) {
          note = resolveRootNote(chord, 2 + os);
        } else if (beatInBar === 1 && subIndex === 1) {
          note = resolveFifthNote(chord, 2 + os, os);
        } else if (beatInBar === 2 && subIndex === 0) {
          note = resolveRootNote(chord, 3 + os);
        } else if (beatInBar === 2 && subIndex === 1) {
          note = resolveSeventhNote(chord, 2 + os, os);
        } else if (beatInBar === 3 && subIndex === 0) {
          const nextChord = this.timeline.getChordAtTick((barIndex + 1) * tpBar, sig);
          note = nextChord
            ? resolveApproachNote(nextChord, barIndex % 2 === 0, 2 + os, os)
            : resolveFifthNote(chord, 2 + os, os);
        } else if (beatInBar === 3 && subIndex === 1) {
          note = resolveRootNote(chord, 3 + os);
        }
      }

      if (note) {
        ctx.scheduleEvent(
          'bass',
          { note, articulation: 'pluck' },
          atTicks,
          velocity,
          durationTicks,
        );
      }
    }
  }

  /* ── Latin: montuno ──────────────────────────────────────────────────────── */

  private scheduleLatin(window: ScheduleWindow, ctx: ScheduleContext): void {
    // Montuno-style: root on beat 1, fifth on beat 2&, octave on beat 4
    // Complexity adds fills: 1-2 = sparse, 3-4 = medium, 5-7 = dense with passing tones
    const sig = ctx.timeSignature;
    const tpBeat = ticksPerBeat(sig);
    const tpBar = ticksPerBar(sig);
    const os = this.octaveShift;

    const slotTicks = Math.floor(tpBar / 4);
    const durationTicks = Math.floor(slotTicks * GATE_RATIO);

    const firstBeat = Math.ceil(window.fromTicks / tpBeat);
    for (let beat = firstBeat; beat * tpBeat < window.toTicks; beat++) {
      const atTicks = beat * tpBeat;
      const beatInBar = beat % sig.beatsPerBar;
      const barIndex = Math.floor(beat / sig.beatsPerBar);
      const chord = this.timeline.getChordAtTick(atTicks, sig);
      if (!chord) continue;

      const velocity = BEAT_VELOCITY[beatInBar] ?? BEAT_VELOCITY[0];

      // Beat 1: root
      if (beatInBar === 0) {
        const octave = this.complexity >= 5 && barIndex % 2 === 1 ? 3 : 2;
        ctx.scheduleEvent(
          'bass',
          { note: resolveRootNote(chord, octave + os), articulation: 'pluck' },
          atTicks,
          velocity,
          durationTicks,
        );
      }

      // Beat 2& (offbeat after beat 2): fifth — schedule at beat 2 tick + half beat
      if (beatInBar === 1 && sig.beatsPerBar >= 3) {
        const atOff = atTicks + tpBeat / 2;
        if (atOff >= window.fromTicks && atOff < window.toTicks) {
          ctx.scheduleEvent(
            'bass',
            { note: resolveFifthNote(chord, 2 + os, os), articulation: 'pluck' },
            atOff,
            velocity * 0.9,
            Math.floor((tpBeat / 2) * GATE_RATIO),
          );
        }
      }

      // Beat 4: octave (or seventh in higher complexity)
      if (beatInBar === sig.beatsPerBar - 1 && sig.beatsPerBar >= 3) {
        const note =
          this.complexity >= 6
            ? resolveSeventhNote(chord, 2 + os, os)
            : resolveRootNote(chord, 3 + os);
        ctx.scheduleEvent(
          'bass',
          { note, articulation: 'pluck' },
          atTicks,
          velocity,
          durationTicks,
        );
      }
    }
  }

  /* ── Ballad: two-feel ────────────────────────────────────────────────────── */

  private scheduleBallad(window: ScheduleWindow, ctx: ScheduleContext): void {
    // Two-feel: notes on beats 1 and 3 only, half-bar duration
    // Complexity 1-3: root on 1, root on 3
    // Complexity 4-6: root on 1, fifth on 3
    // Complexity 7: root on 1, fifth on 3 with octave jumps on bar changes
    const sig = ctx.timeSignature;
    const tpBeat = ticksPerBeat(sig);
    const tpBar = ticksPerBar(sig);
    const os = this.octaveShift;

    const slotTicks = tpBar / 2; // only 2 slots per bar
    const durationTicks = Math.floor(slotTicks * GATE_RATIO);

    const firstBeat = Math.ceil(window.fromTicks / tpBeat);
    for (let beat = firstBeat; beat * tpBeat < window.toTicks; beat++) {
      const beatInBar = beat % sig.beatsPerBar;
      // Only beats 0 and 2 (beats 1 and 3) for 4/4; only beat 0 for 3/4
      if (sig.beatsPerBar >= 4) {
        if (beatInBar !== 0 && beatInBar !== 2) continue;
      } else {
        if (beatInBar !== 0) continue;
      }
      const atTicks = beat * tpBeat;
      const chord = this.timeline.getChordAtTick(atTicks, sig);
      if (!chord) continue;

      const barIndex = Math.floor(beat / sig.beatsPerBar);
      const velocity = BEAT_VELOCITY[beatInBar] ?? BEAT_VELOCITY[0];

      let note: string;
      if (beatInBar === 0) {
        // Beat 1: root; higher complexity alternates octaves
        const octave = this.complexity >= 7 && barIndex % 2 === 1 ? 3 : 2;
        note = resolveRootNote(chord, octave + os);
      } else {
        // Beat 3: fifth (medium+) or root (low complexity)
        note =
          this.complexity <= 3
            ? resolveRootNote(chord, 2 + os)
            : resolveFifthNote(chord, 2 + os, os);
      }
      ctx.scheduleEvent('bass', { note, articulation: 'pluck' }, atTicks, velocity, durationTicks);
    }
  }
}

/* ── Note resolution helpers ───────────────────────────────────────────────── */

/** Convert ChordSymbol root to a scientific pitch string at the given octave. */
function resolveRootNote(chord: ChordSymbol, octave: number): string {
  return `${chord.root}${chord.rootAccidental}${octave}`;
}

/** Interval in semitones from root to third based on chord quality. */
function thirdInterval(chord: ChordSymbol): number {
  switch (chord.quality) {
    case 'major':
      return 4;
    case 'dominant':
      return 4;
    case 'augmented':
      return 4;
    default:
      return 3; // minor, halfDiminished, diminished
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
  if (chord.quality === 'major') return 11; // major 7th
  if (chord.quality === 'diminished') return 9; // diminished 7th (bb7)
  return 10; // minor 7th (dominant, minor, halfDiminished, augmented)
}

/**
 * Resolve a chord interval (semitones above root) to a scientific pitch string.
 * Placed above the root in rootOctave; octave is incremented when the interval
 * wraps the chromatic boundary. Notes above the walking bass ceiling (G3 + octaveShift)
 * are clamped down one octave.
 */
function resolveIntervalNote(
  chord: ChordSymbol,
  rootOctave: number,
  intervalSemitones: number,
  octaveShift = 0,
): string {
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
function resolveApproachNote(
  nextChord: ChordSymbol,
  fromAbove: boolean,
  targetOctave: number,
  octaveShift = 0,
): string {
  const accOffset =
    nextChord.rootAccidental === '#' ? 1 : nextChord.rootAccidental === 'b' ? -1 : 0;
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
  if (approachOctave > ceilOct || (approachOctave === ceilOct && approachSemitone > 7))
    approachOctave -= 1;
  return `${SEMITONE_NAMES[approachSemitone]}${approachOctave}`;
}
