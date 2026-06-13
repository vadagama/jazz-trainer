import { ticksPerBar, ticksPerBeat } from '../time/timeSignature.js';
import type { Instrument, ScheduleContext, ScheduleWindow, GuitarStrum } from './instrument.js';
import type { ChordTimeline } from './chordTimeline.js';
import type { ChordSymbol } from '@jazz/shared';

// ─── Types ────────────────────────────────────────────────────────────────────

export type GuitarMode = 'comp' | 'fingerstyle';
export type GuitarVoicing = 'open' | 'jazz';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Scientific pitch names for the 12 chromatic notes. */
const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

const SEMITONE: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/** MIDI note range for guitar (E2 = 40, E5 = 76). */
const GUITAR_MIN_MIDI = 40; // E2
const GUITAR_MAX_MIDI = 76; // E5

/** Fraction of the slot actually sounded. */
const GATE_RATIO = 0.9;

// ─── Voicing generator ────────────────────────────────────────────────────────

function midiToNote(midi: number): string {
  const pc = ((midi % 12) + 12) % 12;
  return `${NOTE_NAMES[pc]}${Math.floor(midi / 12) - 1}`;
}

function chordRootMidi(chord: ChordSymbol, octave = 3): number {
  const base = SEMITONE[chord.root]!;
  const acc = chord.rootAccidental === '#' ? 1 : chord.rootAccidental === 'b' ? -1 : 0;
  return (octave + 1) * 12 + ((base + acc + 12) % 12);
}

/** Semitone intervals from root for each chord tone. */
function chordIntervals(chord: ChordSymbol, voicing: GuitarVoicing): number[] {
  const third =
    chord.quality === 'minor' ||
    chord.quality === 'halfDiminished' ||
    chord.quality === 'diminished'
      ? 3
      : 4;
  const fifth =
    chord.quality === 'diminished' || chord.quality === 'halfDiminished'
      ? 6
      : chord.quality === 'augmented'
        ? 8
        : 7;
  const seventh = chord.quality === 'major' ? 11 : chord.quality === 'diminished' ? 9 : 10;

  if (voicing === 'open') {
    // Rich 5–6 note voicing: root, 3rd, 5th, 7th, 9th, 5th+oct
    return [0, third, fifth, seventh, 14, 19];
  }
  // Jazz shell: root, 3rd, 7th, plus optional extensions
  if (chord.extensions.includes('9') || chord.extensions.includes('13')) {
    return [0, third, seventh, 14];
  }
  return [0, third, seventh];
}

/**
 * Build a guitar voicing within E2–E5 range.
 * Spreads chord tones across the guitar's natural string range,
 * preferring close-voiced stacks in the mid register.
 */
function buildGuitarVoicing(chord: ChordSymbol, voicing: GuitarVoicing): string[] {
  const rootMidi = chordRootMidi(chord, 2); // start at octave 2 for richer bass
  const intervals = chordIntervals(chord, voicing);
  const notes: number[] = [];

  for (const interval of intervals) {
    let midi = rootMidi + interval;
    // Clamp to guitar range
    while (midi < GUITAR_MIN_MIDI) midi += 12;
    while (midi > GUITAR_MAX_MIDI) midi -= 12;
    // Avoid duplicate pitches from octave wrapping
    if (!notes.includes(midi)) {
      notes.push(midi);
    }
  }

  // Sort low→high and remove duplicates
  notes.sort((a, b) => a - b);
  return notes.map(midiToNote);
}

// ─── Comp patterns ────────────────────────────────────────────────────────────

interface StrumEvent {
  beat: number; // 1-based beat in bar
  subdivision?: number; // 0–1 fraction of beat for offbeats
  strum: GuitarStrum;
  velocity: number;
  durationBeats: number;
}

/** Downstrokes on beats 1 & 3, upstrokes on 2 & 4. Classic comping. */
const COMP_PATTERN: StrumEvent[] = [
  { beat: 1, strum: 'down', velocity: 0.75, durationBeats: 0.85 },
  { beat: 2, strum: 'up', velocity: 0.55, durationBeats: 0.45 },
  { beat: 3, strum: 'down', velocity: 0.7, durationBeats: 0.85 },
  { beat: 4, strum: 'up', velocity: 0.5, durationBeats: 0.45 },
];

/** Fingerstyle arpeggio: one note per beat, cycling through the voicing. */
const FINGERSTYLE_PATTERN: StrumEvent[] = [
  { beat: 1, strum: 'down', velocity: 0.7, durationBeats: 1.8 },
  { beat: 3, strum: 'down', velocity: 0.65, durationBeats: 1.8 },
];

// ─── Instrument ───────────────────────────────────────────────────────────────

export class GuitarInstrument implements Instrument {
  private timeline: ChordTimeline;
  private mode: GuitarMode = 'comp';
  private voicing: GuitarVoicing = 'jazz';
  private humanize = true;

  constructor(timeline: ChordTimeline) {
    this.timeline = timeline;
  }

  setTimeline(timeline: ChordTimeline): void {
    this.timeline = timeline;
  }

  setMode(mode: GuitarMode): void {
    this.mode = mode;
  }

  setVoicing(voicing: GuitarVoicing): void {
    this.voicing = voicing;
  }

  setHumanize(enabled: boolean): void {
    this.humanize = enabled;
  }

  schedule(window: ScheduleWindow, ctx: ScheduleContext): void {
    const sig = ctx.timeSignature;
    const tpBar = ticksPerBar(sig);
    const tpBeat = ticksPerBeat(sig);

    const pattern = this.mode === 'comp' ? COMP_PATTERN : FINGERSTYLE_PATTERN;

    // Max jitter in ticks at current tempo (±8 ms)
    const PPQ = 480;
    const maxJitter = this.humanize ? Math.round(0.008 * (ctx.bpm / 60) * PPQ) : 0;

    const firstBar = Math.floor(window.fromTicks / tpBar);
    const lastBar = Math.floor((window.toTicks - 1) / tpBar);

    for (let bar = firstBar; bar <= lastBar; bar++) {
      const barStartTicks = bar * tpBar;
      const chord = this.timeline.getChordAtTick(barStartTicks, sig);
      if (!chord) continue;

      const voicingNotes = buildGuitarVoicing(chord, this.voicing);

      for (const event of pattern) {
        const beatIdx = event.beat - 1;
        let eventTicks = barStartTicks + beatIdx * tpBeat;

        if (event.subdivision !== undefined) {
          eventTicks += Math.round(event.subdivision * tpBeat);
        }

        if (eventTicks < window.fromTicks || eventTicks >= window.toTicks) continue;

        let atTicks = eventTicks;
        let velocity = event.velocity;

        if (this.humanize) {
          atTicks = Math.max(
            window.fromTicks,
            atTicks + Math.round((Math.random() * 2 - 1) * maxJitter),
          );
          velocity = Math.max(0.02, Math.min(1, velocity + (Math.random() * 2 - 1) * 0.04));
        }

        const durationTicks = Math.round(event.durationBeats * tpBeat * GATE_RATIO);

        // Fingerstyle: pick one note from the voicing per event, cycling through
        if (this.mode === 'fingerstyle') {
          const noteIdx = beatIdx % voicingNotes.length;
          ctx.scheduleEvent(
            'guitar',
            { notes: [voicingNotes[noteIdx]!], strum: event.strum },
            atTicks,
            velocity,
            durationTicks,
          );
        } else {
          ctx.scheduleEvent(
            'guitar',
            { notes: voicingNotes, strum: event.strum },
            atTicks,
            velocity,
            durationTicks,
          );
        }
      }
    }
  }

  dispose(): void {
    // No resources to release (pure scheduling logic).
  }
}
