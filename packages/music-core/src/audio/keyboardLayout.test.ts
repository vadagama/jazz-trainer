import { describe, it, expect } from 'vitest';
import { getKeyboardKeys, noteNameToMidi } from './keyboardLayout';

describe('getKeyboardKeys', () => {
  it('returns the correct number of keys for 2 octaves (C3–C4)', () => {
    const keys = getKeyboardKeys({ octaveRange: [3, 4] });
    // 2 octaves = 24 keys (14 white + 10 black)
    expect(keys.length).toBe(24);
  });

  it('returns the correct number of keys for 3 octaves (C3–C5)', () => {
    const keys = getKeyboardKeys({ octaveRange: [3, 5] });
    // 3 octaves = 36 keys (21 white + 15 black)
    expect(keys.length).toBe(36);
  });

  it('returns white keys first, then black keys', () => {
    const keys = getKeyboardKeys({ octaveRange: [3, 4] });
    const whiteKeys = keys.filter((k) => !k.isBlack);
    const blackKeys = keys.filter((k) => k.isBlack);
    expect(whiteKeys.length).toBe(14);
    expect(blackKeys.length).toBe(10);

    // White keys are in order
    for (let i = 1; i < whiteKeys.length; i++) {
      expect(whiteKeys[i]!.midiNote).toBeGreaterThan(whiteKeys[i - 1]!.midiNote);
    }

    // Black keys are in order
    for (let i = 1; i < blackKeys.length; i++) {
      expect(blackKeys[i]!.midiNote).toBeGreaterThan(blackKeys[i - 1]!.midiNote);
    }
  });

  it('starts with C of the low octave', () => {
    const keys = getKeyboardKeys({ octaveRange: [3, 4] });
    const whiteKeys = keys.filter((k) => !k.isBlack);
    expect(whiteKeys[0]!.note).toBe('C3');
    expect(whiteKeys[0]!.midiNote).toBe(48);
  });

  it('ends with B of the high octave', () => {
    const keys = getKeyboardKeys({ octaveRange: [3, 4] });
    const whiteKeys = keys.filter((k) => !k.isBlack);
    const lastWhite = whiteKeys[whiteKeys.length - 1];
    expect(lastWhite!.note).toBe('B4');
    expect(lastWhite!.midiNote).toBe(71);
  });

  it('correctly identifies black keys', () => {
    const keys = getKeyboardKeys({ octaveRange: [3, 4] });
    const blackNotes = keys.filter((k) => k.isBlack).map((k) => k.note.replace(/\d/, ''));
    expect(blackNotes).toContain('C#');
    expect(blackNotes).toContain('D#');
    expect(blackNotes).toContain('F#');
    expect(blackNotes).toContain('G#');
    expect(blackNotes).toContain('A#');
    // No E# or B# in standard layout
    expect(blackNotes).not.toContain('E#');
    expect(blackNotes).not.toContain('B#');
  });

  it('positions keys correctly within 0–1 bounds', () => {
    const keys = getKeyboardKeys({ octaveRange: [3, 5] });
    for (const key of keys) {
      expect(key.x).toBeGreaterThanOrEqual(0);
      expect(key.x + key.width).toBeLessThanOrEqual(1.01); // small float tolerance
      expect(key.y).toBeGreaterThanOrEqual(-0.05);
      expect(key.height).toBeGreaterThan(0);
      expect(key.height).toBeLessThanOrEqual(1);
      expect(key.width).toBeGreaterThan(0);
    }
  });

  it('black keys are shorter than white keys', () => {
    const keys = getKeyboardKeys({ octaveRange: [3, 4] });
    const whiteKey = keys.find((k) => !k.isBlack);
    const blackKey = keys.find((k) => k.isBlack);
    expect(whiteKey).toBeTruthy();
    expect(blackKey).toBeTruthy();
    expect(blackKey!.height).toBeLessThan(whiteKey!.height);
  });

  it('compact mode reduces black key size', () => {
    const normal = getKeyboardKeys({ octaveRange: [3, 4], compact: false });
    const compact = getKeyboardKeys({ octaveRange: [3, 4], compact: true });

    const normalBlack = normal.find((k) => k.isBlack);
    const compactBlack = compact.find((k) => k.isBlack);

    expect(normalBlack).toBeTruthy();
    expect(compactBlack).toBeTruthy();
    expect(compactBlack!.height).toBeLessThan(normalBlack!.height);
    expect(compactBlack!.width).toBeLessThan(normalBlack!.width);
  });

  it('black keys are positioned between correct white keys', () => {
    const keys = getKeyboardKeys({ octaveRange: [3, 3] });
    const whiteKeys = keys.filter((k) => !k.isBlack);
    const blackKeys = keys.filter((k) => k.isBlack);

    // C# should be between C and D
    const cSharp = blackKeys.find((k) => k.note === 'C#3');
    const c = whiteKeys.find((k) => k.note === 'C3');
    const d = whiteKeys.find((k) => k.note === 'D3');
    expect(cSharp).toBeTruthy();
    expect(c).toBeTruthy();
    expect(d).toBeTruthy();
    // C# center should be to the right of C's left edge
    expect(cSharp!.x + cSharp!.width / 2).toBeGreaterThan(c!.x);
    // C# center should be left of D's right edge
    expect(cSharp!.x + cSharp!.width / 2).toBeLessThan(d!.x + d!.width);
  });
});

describe('noteNameToMidi', () => {
  it('converts C4 to 60', () => {
    expect(noteNameToMidi('C4')).toBe(60);
  });

  it('converts A4 to 69', () => {
    expect(noteNameToMidi('A4')).toBe(69);
  });

  it('converts C3 to 48', () => {
    expect(noteNameToMidi('C3')).toBe(48);
  });

  it('converts G#4 to 68', () => {
    expect(noteNameToMidi('G#4')).toBe(68);
  });

  it('converts Eb4 to 63', () => {
    expect(noteNameToMidi('Eb4')).toBe(63);
  });

  it('throws on invalid note name', () => {
    expect(() => noteNameToMidi('H4')).toThrow();
    expect(() => noteNameToMidi('')).toThrow();
    expect(() => noteNameToMidi('C#')).toThrow(); // missing octave
  });
});
