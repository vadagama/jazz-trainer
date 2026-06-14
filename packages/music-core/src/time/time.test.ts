import { describe, it, expect } from 'vitest';
import {
  PPQ,
  parseTimeSignature,
  ticksPerBeat,
  ticksPerBar,
  defaultStrongBeats,
} from './timeSignature.js';
import { positionToTicks, ticksToPosition, ticksToSeconds, secondsToTicks } from './position.js';

describe('parseTimeSignature', () => {
  it.each([
    ['4/4', { beatsPerBar: 4, beatUnit: 4 }],
    ['3/4', { beatsPerBar: 3, beatUnit: 4 }],
    ['2/4', { beatsPerBar: 2, beatUnit: 4 }],
    ['5/4', { beatsPerBar: 5, beatUnit: 4 }],
    ['6/8', { beatsPerBar: 6, beatUnit: 8 }],
  ])('parses %s', (str, expected) => {
    expect(parseTimeSignature(str)).toEqual(expected);
  });

  it('rejects unsupported beat units and bad input', () => {
    expect(() => parseTimeSignature('7/16')).toThrow();
    expect(() => parseTimeSignature('0/4')).toThrow();
  });
});

describe('tick resolution', () => {
  it('quarter beat = PPQ, eighth beat = PPQ/2', () => {
    expect(ticksPerBeat({ beatsPerBar: 4, beatUnit: 4 })).toBe(PPQ);
    expect(ticksPerBeat({ beatsPerBar: 6, beatUnit: 8 })).toBe(PPQ / 2);
  });

  it.each([
    ['4/4', 1920],
    ['3/4', 1440],
    ['5/4', 2400],
    ['6/8', 1440],
  ])('ticksPerBar(%s) = %i', (str, expected) => {
    expect(ticksPerBar(parseTimeSignature(str))).toBe(expected);
  });
});

describe('position ↔ ticks', () => {
  it('round-trips in 4/4', () => {
    const sig = parseTimeSignature('4/4');
    const pos = { bar: 2, beat: 3, tick: 100 };
    const ticks = positionToTicks(pos, sig);
    expect(ticks).toBe(5380);
    expect(ticksToPosition(ticks, sig)).toEqual(pos);
  });

  it('groups 6/8 as 3+3', () => {
    const sig = parseTimeSignature('6/8');
    // beat 3 is the start of the second group
    expect(positionToTicks({ bar: 1, beat: 3, tick: 0 }, sig)).toBe(2160);
    expect(ticksToPosition(2160, sig)).toEqual({ bar: 1, beat: 3, tick: 0 });
  });
});

describe('ticks ↔ seconds', () => {
  it('converts at a given tempo', () => {
    expect(ticksToSeconds(PPQ, 120)).toBeCloseTo(0.5); // a quarter at 120bpm = 0.5s
    expect(ticksToSeconds(PPQ, 60)).toBeCloseTo(1.0);
    expect(secondsToTicks(0.5, 120)).toBe(PPQ);
  });
});

describe('defaultStrongBeats', () => {
  it('accent 0 only (beat 3 is secondStrong in 6/8)', () => {
    expect(defaultStrongBeats(parseTimeSignature('6/8'))).toEqual([0]);
    expect(defaultStrongBeats(parseTimeSignature('4/4'))).toEqual([0]);
    expect(defaultStrongBeats(parseTimeSignature('5/4'))).toEqual([0]);
  });
});
