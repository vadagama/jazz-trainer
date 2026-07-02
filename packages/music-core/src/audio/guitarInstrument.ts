import { ticksPerBar, ticksPerBeat } from '../time/timeSignature.js';
import type { Instrument, ScheduleContext, ScheduleWindow, GuitarStrum } from './instrument.js';
import type { ChordTimeline } from './chordTimeline.js';
import type { ChordSymbol, Style } from '@jazz/shared';
import { getStyleProfile, type StyleProfile } from '../styleProfile.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type GuitarMode = 'comp' | 'fingerstyle';
export type GuitarVoicing = 'open' | 'jazz';

/** Style-specific guitar pattern from {@link StyleProfile.instrumentDefaults.guitar.pattern}. */
export type GuitarPattern = 'bossa-comping' | 'funk-chops' | 'freddie-green';

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

// ─── Bass note helpers ────────────────────────────────────────────────────────

/** Resolve chord root as a note name at the given octave. */
function rootNote(chord: ChordSymbol, octave = 2): string {
  return midiToNote(chordRootMidi(chord, octave));
}

/** Resolve chord fifth as a note name at the given octave. */
function fifthNote(chord: ChordSymbol, octave = 2): string {
  const rootMidi = chordRootMidi(chord, octave);
  return midiToNote(rootMidi + 7);
}

// ─── Instrument ───────────────────────────────────────────────────────────────

export class GuitarInstrument implements Instrument {
  private timeline: ChordTimeline;
  private mode: GuitarMode = 'comp';
  private voicing: GuitarVoicing = 'jazz';
  private humanize = true;
  private style: Style = 'swing';
  /** Active guitar pattern from {@link StyleProfile.instrumentDefaults.guitar.pattern}. */
  private pattern: GuitarPattern | undefined;
  private readonly instrumentId: string;

  constructor(timeline: ChordTimeline, instrumentId = 'guitar') {
    this.timeline = timeline;
    this.instrumentId = instrumentId;
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

  setStyleProfile(profile: StyleProfile): void {
    this.style = profile.id;
    const pat = profile.instrumentDefaults.guitar.pattern as GuitarPattern | undefined;
    this.pattern = pat ?? this.styleToPattern(profile.id);

    if (this.mode === 'comp') {
      if (this.pattern === 'bossa-comping' || this.pattern === 'funk-chops') {
        this.voicing = 'jazz';
      } else if (this.pattern === 'freddie-green') {
        this.voicing = 'jazz';
      }
    }
  }

  /** Fallback: resolve pattern from style when profile doesn't specify one. */
  private styleToPattern(style: Style): GuitarPattern | undefined {
    switch (style) {
      case 'swing':
        return 'freddie-green';
      case 'bossa':
        return 'bossa-comping';
      case 'funk':
        return 'funk-chops';
      default:
        return undefined;
    }
  }

  /** Expose current pattern for testing. */
  getPattern(): GuitarPattern | undefined {
    return this.pattern;
  }

  /** @deprecated Use {@link setStyleProfile}(getStyleProfile(style)) instead. */
  setStyle(style: Style): void {
    this.setStyleProfile(getStyleProfile(style));
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

      // Dispatch to style-specific scheduling when in standard comp mode
      if (this.mode === 'comp') {
        switch (this.pattern) {
          case 'bossa-comping':
            this.scheduleBossaComping(window, ctx, bar, barStartTicks, chord, maxJitter);
            continue;
          case 'funk-chops':
            this.scheduleFunkChops(window, ctx, bar, barStartTicks, chord, maxJitter);
            continue;
          case 'freddie-green':
            this.scheduleFreddieGreen(window, ctx, bar, barStartTicks, chord, maxJitter);
            continue;
          default:
            break;
        }
      }

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
            this.instrumentId,
            { notes: [voicingNotes[noteIdx]!], strum: event.strum },
            atTicks,
            velocity,
            durationTicks,
          );
        } else {
          ctx.scheduleEvent(
            this.instrumentId,
            { notes: voicingNotes, strum: event.strum },
            atTicks,
            velocity,
            durationTicks,
          );
        }
      }
    }
  }

  /** Bossa nova comping: bass note (root/5th) on downbeats, chord on offbeats. */
  private scheduleBossaComping(
    window: ScheduleWindow,
    ctx: ScheduleContext,
    bar: number,
    barStartTicks: number,
    chord: ChordSymbol,
    maxJitter: number,
  ): void {
    const sig = ctx.timeSignature;
    const tpBeat = ticksPerBeat(sig);

    const voicingNotes = buildGuitarVoicing(chord, this.voicing);

    for (let beatIdx = 0; beatIdx < sig.beatsPerBar; beatIdx++) {
      const beatNum = beatIdx + 1;

      // Bass note on downbeat (root on odd beats, fifth on even beats)
      const bassTicks = barStartTicks + beatIdx * tpBeat;
      if (bassTicks >= window.fromTicks && bassTicks < window.toTicks) {
        const isFifth = beatNum % 2 === 0;
        const note = isFifth ? fifthNote(chord, 2) : rootNote(chord, 2);
        const durationTicks = Math.round(0.45 * tpBeat * GATE_RATIO);

        let atTicks = bassTicks;
        let velocity = isFifth ? 0.6 : 0.7;

        if (this.humanize) {
          atTicks = Math.max(
            window.fromTicks,
            atTicks + Math.round((Math.random() * 2 - 1) * maxJitter),
          );
          velocity = Math.max(0.02, Math.min(1, velocity + (Math.random() * 2 - 1) * 0.04));
        }

        ctx.scheduleEvent(
          this.instrumentId,
          { notes: [note], strum: 'down' },
          atTicks,
          velocity,
          durationTicks,
        );
      }

      // Chord on offbeat (the "and" of each beat)
      const offbeatTicks = barStartTicks + beatIdx * tpBeat + Math.round(tpBeat / 2);
      if (offbeatTicks >= window.fromTicks && offbeatTicks < window.toTicks) {
        const durationTicks = Math.round(0.3 * tpBeat * GATE_RATIO);

        let atTicks = offbeatTicks;
        let velocity = beatNum % 2 === 1 ? 0.55 : 0.5;

        if (this.humanize) {
          atTicks = Math.max(
            window.fromTicks,
            atTicks + Math.round((Math.random() * 2 - 1) * maxJitter),
          );
          velocity = Math.max(0.02, Math.min(1, velocity + (Math.random() * 2 - 1) * 0.04));
        }

        ctx.scheduleEvent(
          this.instrumentId,
          { notes: voicingNotes, strum: 'up' },
          atTicks,
          velocity,
          durationTicks,
        );
      }
    }
  }

  /**
   * Freddie Green comping: quarter-note chords on every beat.
   * Typical of Count Basie's rhythm guitarist — tight 3-note voicings
   * in the C3–C4 range with muted, even attack. All down strokes.
   */
  private scheduleFreddieGreen(
    window: ScheduleWindow,
    ctx: ScheduleContext,
    bar: number,
    barStartTicks: number,
    chord: ChordSymbol,
    maxJitter: number,
  ): void {
    const sig = ctx.timeSignature;
    const tpBeat = ticksPerBeat(sig);

    // Build a tight voicing clamped to C3–C4 (MIDI 48–60)
    const rootMidi = chordRootMidi(chord, 2);
    const intervals = chordIntervals(chord, this.voicing);
    const voicingNotes: number[] = [];

    for (const interval of intervals) {
      let midi = rootMidi + interval;
      while (midi < 48) midi += 12;
      while (midi > 60) midi -= 12;
      if (!voicingNotes.includes(midi)) {
        voicingNotes.push(midi);
      }
    }
    voicingNotes.sort((a, b) => a - b);

    const noteNames = voicingNotes.map(midiToNote);

    for (let beatIdx = 0; beatIdx < sig.beatsPerBar; beatIdx++) {
      const eventTicks = barStartTicks + beatIdx * tpBeat;
      if (eventTicks < window.fromTicks || eventTicks >= window.toTicks) continue;

      let atTicks = eventTicks;
      let velocity = 0.55;

      if (this.humanize) {
        atTicks = Math.max(
          window.fromTicks,
          atTicks + Math.round((Math.random() * 2 - 1) * maxJitter),
        );
        velocity = Math.max(0.02, Math.min(1, velocity + (Math.random() * 2 - 1) * 0.04));
      }

      const durationTicks = Math.round(0.35 * tpBeat * GATE_RATIO);

      ctx.scheduleEvent(
        this.instrumentId,
        { notes: noteNames, strum: 'down' },
        atTicks,
        velocity,
        durationTicks,
      );
    }
  }

  /** Funk chops: sharp offbeat chords on every eighth-note offbeat (1&, 2&, 3&, 4&). */
  private scheduleFunkChops(
    window: ScheduleWindow,
    ctx: ScheduleContext,
    bar: number,
    barStartTicks: number,
    chord: ChordSymbol,
    maxJitter: number,
  ): void {
    const sig = ctx.timeSignature;
    const tpBeat = ticksPerBeat(sig);

    const voicingNotes = buildGuitarVoicing(chord, this.voicing);

    for (let beatIdx = 0; beatIdx < sig.beatsPerBar; beatIdx++) {
      // Short accented chord on the offbeat (the "and" of each beat)
      const offbeatTicks = barStartTicks + beatIdx * tpBeat + Math.round(tpBeat / 2);
      if (offbeatTicks < window.fromTicks || offbeatTicks >= window.toTicks) continue;

      const durationTicks = Math.round(0.15 * tpBeat * GATE_RATIO);

      let atTicks = offbeatTicks;
      let velocity = 0.7;

      if (this.humanize) {
        atTicks = Math.max(
          window.fromTicks,
          atTicks + Math.round((Math.random() * 2 - 1) * maxJitter),
        );
        velocity = Math.max(0.02, Math.min(1, velocity + (Math.random() * 2 - 1) * 0.04));
      }

      ctx.scheduleEvent(
        this.instrumentId,
        { notes: voicingNotes, strum: 'down' },
        atTicks,
        velocity,
        durationTicks,
      );
    }
  }

  dispose(): void {
    // No resources to release (pure scheduling logic).
  }
}
