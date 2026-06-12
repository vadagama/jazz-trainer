import type { ScheduledNote, MidiInputEvent } from './ports.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Result of a MIDI evaluation suitable for ActivityResult. */
export interface MidiEvalScore {
  score: number;
  maxScore: number;
  durationMs?: number;
  details?: Record<string, unknown>;
}

/** Configuration for MIDI input evaluation. */
export interface MidiEvalOptions {
  /** Allowed timing tolerance in seconds (default: 0.2). */
  timingTolerance?: number;
  /** Minimum velocity to register as intentional (0–127, default: 10). */
  velocityThreshold?: number;
  /** Score weight for timing accuracy (0–1, default: 0.5). */
  timingWeight?: number;
  /** Score weight for pitch accuracy (0–1, default: 0.5). */
  pitchWeight?: number;
}

export interface NoteEvalResult {
  /** Whether the note matches within tolerance. */
  hit: boolean;
  /** Timing delta in seconds (positive = late, negative = early). */
  timingDelta: number;
  /** MIDI semitone delta (0 = exact match). */
  semitoneDelta: number;
  /** The expected note. */
  expected: ScheduledNote;
}

export interface RhythmEvalResult {
  /** Overall accuracy 0–1. */
  accuracy: number;
  /** Per-beat evaluation. */
  beats: BeatEval[];
}

export interface BeatEval {
  /** Beat index in the sequence. */
  index: number;
  /** Whether the player hit within the timing window. */
  hit: boolean;
  /** Timing delta in seconds. */
  timingDelta: number;
  /** Expected beat time in seconds (relative). */
  expectedTime: number;
}

// ---------------------------------------------------------------------------
// Note evaluation
// ---------------------------------------------------------------------------

const DEFAULT_TIMING_TOLERANCE = 0.2; // 200ms
const DEFAULT_VELOCITY_THRESHOLD = 10;
const DEFAULT_TIMING_WEIGHT = 0.5;
const DEFAULT_PITCH_WEIGHT = 0.5;

const NOTE_SEMITONES: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

function parseNoteToMidi(note: string): number {
  const match = /^([A-G][#b]?)(\d+)$/.exec(note.trim());
  if (!match) throw new Error(`Invalid note: "${note}"`);
  const name = match[1]!;
  const octave = Number(match[2]);
  const semitone = NOTE_SEMITONES[name];
  if (semitone === undefined) throw new Error(`Unknown note name: "${name}"`);
  return 12 * (octave + 1) + semitone;
}

/**
 * Evaluate a single MIDI input event against an expected note.
 *
 * Returns a {@link NoteEvalResult} indicating whether the timing and pitch
 * fall within tolerance. Events with velocity below the threshold are
 * treated as non-hits (accidental touches).
 */
export function evaluateNote(
  event: MidiInputEvent,
  expected: ScheduledNote,
  opts: MidiEvalOptions = {},
): NoteEvalResult {
  const timingTol = opts.timingTolerance ?? DEFAULT_TIMING_TOLERANCE;
  const velThreshold = opts.velocityThreshold ?? DEFAULT_VELOCITY_THRESHOLD;

  if (event.velocity < velThreshold) {
    return { hit: false, timingDelta: 0, semitoneDelta: 0, expected };
  }

  const actualMidi = parseNoteToMidi(event.note);
  const expectedMidi = parseNoteToMidi(expected.note);

  const timingDelta = event.timestamp / 1000 - expected.time;
  const semitoneDelta = actualMidi - expectedMidi;
  const timingOk = Math.abs(timingDelta) <= timingTol;
  const pitchOk = semitoneDelta === 0;

  return {
    hit: timingOk && pitchOk,
    timingDelta,
    semitoneDelta,
    expected,
  };
}

/**
 * Compute a score (0–1) for a single note evaluation.
 *
 * Weighted combination of timing precision and pitch correctness.
 */
export function scoreNoteEval(result: NoteEvalResult, opts: MidiEvalOptions = {}): number {
  if (!result.hit) return 0;

  const timingWeight = opts.timingWeight ?? DEFAULT_TIMING_WEIGHT;
  const pitchWeight = opts.pitchWeight ?? DEFAULT_PITCH_WEIGHT;
  const timingTol = opts.timingTolerance ?? DEFAULT_TIMING_TOLERANCE;

  // Timing score: 1.0 at delta=0, linearly decreasing to 0 at tolerance boundary
  const timingScore = 1 - Math.min(Math.abs(result.timingDelta) / timingTol, 1);
  const pitchScore = result.semitoneDelta === 0 ? 1 : 0;

  return timingScore * timingWeight + pitchScore * pitchWeight;
}

/**
 * Aggregate note evaluations into a scored result.
 */
export function evaluateNoteSequence(
  evaluations: NoteEvalResult[],
  opts: MidiEvalOptions = {},
): MidiEvalScore {
  if (evaluations.length === 0) {
    return { score: 0, maxScore: 1 };
  }

  const timingWeight = opts.timingWeight ?? DEFAULT_TIMING_WEIGHT;
  const pitchWeight = opts.pitchWeight ?? DEFAULT_PITCH_WEIGHT;
  const total = evaluations.length;
  const hits = evaluations.filter((e) => e.hit).length;

  const totalScore = evaluations.reduce((sum, e) => sum + scoreNoteEval(e, opts), 0);
  const maxScore = total * (timingWeight + pitchWeight);

  return {
    score: totalScore,
    maxScore,
    durationMs: undefined,
    details: {
      hits,
      total,
      accuracy: total > 0 ? hits / total : 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Rhythm evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate a sequence of MIDI input events against expected beat times.
 *
 * Uses a greedy matching algorithm: each expected beat is paired with
 * the nearest unclaimed event within the timing tolerance window.
 */
export function evaluateRhythm(
  events: MidiInputEvent[],
  expectedTimes: number[],
  timingTolerance = DEFAULT_TIMING_TOLERANCE,
): RhythmEvalResult {
  const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const claimed = new Set<number>();
  const beats: BeatEval[] = [];

  for (let i = 0; i < expectedTimes.length; i++) {
    const expectedTimeSec = expectedTimes[i]!;

    // Find the closest unclaimed event within tolerance
    let bestIdx = -1;
    let bestDelta = Infinity;

    for (let j = 0; j < sortedEvents.length; j++) {
      if (claimed.has(j)) continue;
      const eventTimeSec = sortedEvents[j]!.timestamp / 1000;
      const delta = Math.abs(eventTimeSec - expectedTimeSec);
      if (delta <= timingTolerance && delta < bestDelta) {
        bestDelta = delta;
        bestIdx = j;
      }
    }

    const hit = bestIdx !== -1;
    if (hit) {
      claimed.add(bestIdx);
      const eventTimeSec = sortedEvents[bestIdx]!.timestamp / 1000;
      beats.push({
        index: i,
        hit: true,
        timingDelta: eventTimeSec - expectedTimeSec,
        expectedTime: expectedTimeSec,
      });
    } else {
      beats.push({
        index: i,
        hit: false,
        timingDelta: 0,
        expectedTime: expectedTimeSec,
      });
    }
  }

  const hitCount = beats.filter((b) => b.hit).length;
  const accuracy = expectedTimes.length > 0 ? hitCount / expectedTimes.length : 0;

  return { accuracy, beats };
}

/**
 * Convert rhythm evaluation to a scored result.
 */
export function scoreRhythmEval(
  result: RhythmEvalResult,
  timingTolerance = DEFAULT_TIMING_TOLERANCE,
): MidiEvalScore {
  if (result.beats.length === 0) {
    return { score: 0, maxScore: 1 };
  }

  // Score based on accuracy and timing precision
  const timingScores = result.beats
    .filter((b) => b.hit)
    .map((b) => 1 - Math.min(Math.abs(b.timingDelta) / timingTolerance, 1));

  const avgTiming =
    timingScores.length > 0 ? timingScores.reduce((a, b) => a + b, 0) / timingScores.length : 0;

  const score = result.accuracy * 0.6 + avgTiming * 0.4;
  const maxScore = 1;

  return {
    score,
    maxScore,
    details: {
      accuracy: result.accuracy,
      hits: result.beats.filter((b) => b.hit).length,
      total: result.beats.length,
      avgTimingPrecision: avgTiming,
    },
  };
}
