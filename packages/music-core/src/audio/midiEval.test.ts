import { describe, it, expect } from 'vitest';
import {
  evaluateNote,
  evaluateNoteSequence,
  evaluateRhythm,
  scoreNoteEval,
  scoreRhythmEval,
} from './midiEval.js';
import type { MidiInputEvent, ScheduledNote } from './ports.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function noteEvent(note: string, velocity: number, timestampMs: number): MidiInputEvent {
  return { note, velocity, timestamp: timestampMs };
}

function scheduledNote(note: string, timeSec: number, duration = 0.5, velocity = 0.8): ScheduledNote {
  return { time: timeSec, note, duration, velocity };
}

// ---------------------------------------------------------------------------
// evaluateNote
// ---------------------------------------------------------------------------

describe('evaluateNote', () => {
  it('matches exact note at exact time', () => {
    const result = evaluateNote(noteEvent('C4', 100, 1000), scheduledNote('C4', 1.0));
    expect(result.hit).toBe(true);
    expect(result.semitoneDelta).toBe(0);
    expect(result.timingDelta).toBeCloseTo(0, 1);
  });

  it('rejects wrong note', () => {
    const result = evaluateNote(noteEvent('D4', 100, 1000), scheduledNote('C4', 1.0));
    expect(result.hit).toBe(false);
    expect(result.semitoneDelta).toBe(2);
  });

  it('rejects note outside timing window', () => {
    const result = evaluateNote(
      noteEvent('C4', 100, 1500),
      scheduledNote('C4', 1.0),
      { timingTolerance: 0.2 },
    );
    expect(result.hit).toBe(false);
  });

  it('accepts note within timing window (early)', () => {
    const result = evaluateNote(
      noteEvent('C4', 100, 900),
      scheduledNote('C4', 1.0),
      { timingTolerance: 0.2 },
    );
    expect(result.hit).toBe(true);
    expect(result.timingDelta).toBeCloseTo(-0.1, 1);
  });

  it('accepts note within timing window (late)', () => {
    const result = evaluateNote(
      noteEvent('C4', 100, 1100),
      scheduledNote('C4', 1.0),
      { timingTolerance: 0.2 },
    );
    expect(result.hit).toBe(true);
    expect(result.timingDelta).toBeCloseTo(0.1, 1);
  });

  it('rejects note below velocity threshold', () => {
    const result = evaluateNote(
      noteEvent('C4', 5, 1000),
      scheduledNote('C4', 1.0),
      { velocityThreshold: 10 },
    );
    expect(result.hit).toBe(false);
  });

  it('handles flat notes', () => {
    const result = evaluateNote(noteEvent('Eb4', 100, 1000), scheduledNote('Eb4', 1.0));
    expect(result.hit).toBe(true);
  });

  it('handles sharp notes', () => {
    const result = evaluateNote(noteEvent('F#4', 100, 1000), scheduledNote('F#4', 1.0));
    expect(result.hit).toBe(true);
  });

  it('throws on invalid note name', () => {
    expect(() => evaluateNote(noteEvent('H4', 100, 1000), scheduledNote('C4', 1.0))).toThrow();
  });
});

// ---------------------------------------------------------------------------
// scoreNoteEval
// ---------------------------------------------------------------------------

describe('scoreNoteEval', () => {
  it('returns 0 for a miss', () => {
    const result = evaluateNote(noteEvent('D4', 100, 1000), scheduledNote('C4', 1.0));
    expect(scoreNoteEval(result)).toBe(0);
  });

  it('returns positive score for perfect hit', () => {
    const result = evaluateNote(noteEvent('C4', 100, 1000), scheduledNote('C4', 1.0));
    const score = scoreNoteEval(result);
    expect(score).toBeGreaterThan(0.9);
    expect(score).toBeLessThanOrEqual(1.0);
  });

  it('penalizes timing error linearly', () => {
    const perfect = evaluateNote(noteEvent('C4', 100, 1000), scheduledNote('C4', 1.0), {
      timingTolerance: 0.2,
      timingWeight: 1,
      pitchWeight: 0,
    });
    const off = evaluateNote(noteEvent('C4', 100, 1100), scheduledNote('C4', 1.0), {
      timingTolerance: 0.2,
      timingWeight: 1,
      pitchWeight: 0,
    });

    expect(scoreNoteEval(perfect, { timingWeight: 1, pitchWeight: 0 })).toBe(1);
    expect(scoreNoteEval(off, { timingWeight: 1, pitchWeight: 0 })).toBeCloseTo(0.5, 1);
  });
});

// ---------------------------------------------------------------------------
// evaluateNoteSequence
// ---------------------------------------------------------------------------

describe('evaluateNoteSequence', () => {
  it('returns zero for empty sequence', () => {
    const result = evaluateNoteSequence([]);
    expect(result.score).toBe(0);
    expect(result.maxScore).toBe(1);
  });

  it('scores perfect sequence as max', () => {
    const evals = [
      evaluateNote(noteEvent('C4', 100, 1000), scheduledNote('C4', 1.0)),
      evaluateNote(noteEvent('E4', 100, 2000), scheduledNote('E4', 2.0)),
      evaluateNote(noteEvent('G4', 100, 3000), scheduledNote('G4', 3.0)),
    ];
    const result = evaluateNoteSequence(evals);
    expect(result.score).toBeGreaterThan(0.9);
    expect(result.details?.hits).toBe(3);
    expect(result.details?.total).toBe(3);
  });

  it('reports partial accuracy', () => {
    const evals = [
      evaluateNote(noteEvent('C4', 100, 1000), scheduledNote('C4', 1.0)),
      evaluateNote(noteEvent('D4', 100, 2000), scheduledNote('E4', 2.0)), // wrong note
      evaluateNote(noteEvent('G4', 100, 3000), scheduledNote('G4', 3.0)),
    ];
    const result = evaluateNoteSequence(evals);
    expect(result.details?.hits).toBe(2);
    expect(result.details?.accuracy).toBeCloseTo(2 / 3, 1);
  });
});

// ---------------------------------------------------------------------------
// evaluateRhythm
// ---------------------------------------------------------------------------

describe('evaluateRhythm', () => {
  it('perfect rhythm match', () => {
    const events = [
      noteEvent('C4', 100, 1000),
      noteEvent('C4', 100, 2000),
      noteEvent('C4', 100, 3000),
      noteEvent('C4', 100, 4000),
    ];
    const expected = [1.0, 2.0, 3.0, 4.0];
    const result = evaluateRhythm(events, expected, 0.2);
    expect(result.accuracy).toBe(1);
    expect(result.beats.every((b) => b.hit)).toBe(true);
  });

  it('detects missed beats', () => {
    const events = [
      noteEvent('C4', 100, 1000),
      // missing beat at 2.0
      noteEvent('C4', 100, 3000),
      noteEvent('C4', 100, 4000),
    ];
    const expected = [1.0, 2.0, 3.0, 4.0];
    const result = evaluateRhythm(events, expected, 0.2);
    expect(result.accuracy).toBe(0.75);
    expect(result.beats[1]!.hit).toBe(false);
  });

  it('handles extra events gracefully', () => {
    const events = [
      noteEvent('C4', 100, 500), // extra early
      noteEvent('C4', 100, 1000),
      noteEvent('C4', 100, 2000),
      noteEvent('C4', 100, 4500), // extra late
    ];
    const expected = [1.0, 2.0];
    const result = evaluateRhythm(events, expected, 0.2);
    expect(result.accuracy).toBe(1);
  });

  it('handles early/late within tolerance', () => {
    const events = [
      noteEvent('C4', 100, 900), // 100ms early
      noteEvent('C4', 100, 2150), // 150ms late
    ];
    const expected = [1.0, 2.0];
    const result = evaluateRhythm(events, expected, 0.2);
    expect(result.accuracy).toBe(1);
    expect(result.beats[0]!.timingDelta).toBeCloseTo(-0.1, 1);
    expect(result.beats[1]!.timingDelta).toBeCloseTo(0.15, 1);
  });

  it('returns zero accuracy for empty events', () => {
    const result = evaluateRhythm([], [1.0, 2.0], 0.2);
    expect(result.accuracy).toBe(0);
  });

  it('returns zero accuracy for empty expected', () => {
    const result = evaluateRhythm([noteEvent('C4', 100, 1000)], [], 0.2);
    expect(result.accuracy).toBe(0);
  });

  it('matches nearest event within tolerance (greedy)', () => {
    // Two events, two beats — should match correctly
    const events = [
      noteEvent('C4', 100, 1050),
      noteEvent('C4', 100, 1950),
    ];
    const expected = [1.0, 2.0];
    const result = evaluateRhythm(events, expected, 0.2);
    expect(result.accuracy).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// scoreRhythmEval
// ---------------------------------------------------------------------------

describe('scoreRhythmEval', () => {
  it('returns zero for empty result', () => {
    const score = scoreRhythmEval({ accuracy: 0, beats: [] });
    expect(score.score).toBe(0);
  });

  it('returns max score for perfect rhythm', () => {
    const events = [
      noteEvent('C4', 100, 1000),
      noteEvent('C4', 100, 2000),
    ];
    const evalResult = evaluateRhythm(events, [1.0, 2.0], 0.2);
    const score = scoreRhythmEval(evalResult);

    // accuracy 1.0 * 0.6 + timing 1.0 * 0.4 = 1.0
    expect(score.score).toBe(1);
    expect(score.maxScore).toBe(1);
  });

  it('penalizes missed beats', () => {
    const events = [noteEvent('C4', 100, 1000)];
    const evalResult = evaluateRhythm(events, [1.0, 2.0], 0.2);
    const score = scoreRhythmEval(evalResult);

    // accuracy 0.5, timing 1.0 => 0.5*0.6 + 1.0*0.4 = 0.7
    expect(score.score).toBeCloseTo(0.7, 1);
    expect(score.details?.accuracy).toBe(0.5);
  });
});
