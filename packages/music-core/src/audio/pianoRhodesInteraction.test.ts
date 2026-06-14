import { describe, it, expect } from 'vitest';
import { avoidConflicts } from './pianoRhodesInteraction.js';
import type { CompEvent } from './rhodesVoicing.js';

const TPB = 480; // ticks per beat (4/4 at PPQ 480)

function makeCompEvent(beat: 1 | 2 | 3 | 4, sub?: 0 | 0.5): CompEvent {
  return { beat, subdivision: sub, durationBeats: 0.5, velocity: 0.5 };
}

function makePianoEvent(beat: number, sub?: number) {
  return { beat, subdivision: sub };
}

describe('avoidConflicts', () => {
  it('returns rhodesEvents unchanged when pianoEvents is empty', () => {
    const re = [makeCompEvent(1), makeCompEvent(3)];
    const result = avoidConflicts(re, [], TPB);
    expect(result).toBe(re);
    expect(result[0]!.subdivision).toBeUndefined();
  });

  it('shifts Rhodes off the beat when it conflicts with Piano on the same beat', () => {
    // Rhodes on beat 1, Piano also on beat 1 → conflict
    const re = [makeCompEvent(1)];
    const pe = [makePianoEvent(1)];
    const result = avoidConflicts(re, pe, TPB);
    // Should shift to beat 1& (subdivision 0.5)
    expect(result[0]!.subdivision).toBe(0.5);
    expect(result[0]!.velocity).toBeLessThan(0.5); // reduced
  });

  it('does NOT shift Rhodes when it is already on an offbeat and Piano is on the beat', () => {
    // Rhodes on beat 2&, Piano on beat 2 → distance = 240 ticks > 120 (1/16)
    const re = [makeCompEvent(2, 0.5)];
    const pe = [makePianoEvent(2)];
    const result = avoidConflicts(re, pe, TPB);
    // Beat 2 at tick 480, beat 2& at tick 720, distance = 240 > SIXTEENTH_TICKS
    expect(result[0]!.subdivision).toBe(0.5); // unchanged
    expect(result[0]!.velocity).toBe(0.5); // unchanged
  });

  it('keeps Rhodes unchanged when already at max subdivision and conflicts', () => {
    // Both on beat 2& → conflict, but can't shift 0.5 further
    const re = [makeCompEvent(2, 0.5)];
    const pe = [makePianoEvent(2, 0.5)];
    const result = avoidConflicts(re, pe, TPB);
    // subdivision already at max → keep original (minor overlap acceptable)
    expect(result[0]!.subdivision).toBe(0.5);
    expect(result[0]!.velocity).toBe(0.5);
  });

  it('handles multiple Rhodes events with partial conflicts', () => {
    const re = [makeCompEvent(1), makeCompEvent(2), makeCompEvent(4)];
    const pe = [makePianoEvent(2)]; // only conflicts with beat 2
    const result = avoidConflicts(re, pe, TPB);
    expect(result[0]!.subdivision).toBeUndefined(); // beat 1 untouched
    expect(result[1]!.subdivision).toBe(0.5); // beat 2 shifted
    expect(result[2]!.subdivision).toBeUndefined(); // beat 4 untouched
  });
});
