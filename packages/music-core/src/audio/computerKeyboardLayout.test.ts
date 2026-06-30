import { describe, it, expect } from 'vitest';
import { buildKeyMap, DEFAULT_WHITE_KEYS, DEFAULT_BLACK_KEYS } from './computerKeyboardLayout';

describe('buildKeyMap', () => {
  it('maps white keys a-k to C4-C5', () => {
    const map = buildKeyMap(4);

    // a → C4  (MIDI 60)
    expect(map['a']).toBe(60);
    // s → D4  (MIDI 62)
    expect(map['s']).toBe(62);
    // d → E4  (MIDI 64)
    expect(map['d']).toBe(64);
    // f → F4  (MIDI 65)
    expect(map['f']).toBe(65);
    // g → G4  (MIDI 67)
    expect(map['g']).toBe(67);
    // h → A4  (MIDI 69)
    expect(map['h']).toBe(69);
    // j → B4  (MIDI 71)
    expect(map['j']).toBe(71);
    // k → C5  (MIDI 72)
    expect(map['k']).toBe(72);
  });

  it('maps black keys w e t y u to C#4 D#4 F#4 G#4 A#4', () => {
    const map = buildKeyMap(4);

    expect(map['w']).toBe(61); // C#4
    expect(map['e']).toBe(63); // D#4
    expect(map['t']).toBe(66); // F#4
    expect(map['y']).toBe(68); // G#4
    expect(map['u']).toBe(70); // A#4
  });

  it('shifts octave correctly', () => {
    const map3 = buildKeyMap(3);
    expect(map3['a']).toBe(48); // C3
    expect(map3['k']).toBe(60); // C4

    const map5 = buildKeyMap(5);
    expect(map5['a']).toBe(72); // C5
    expect(map5['k']).toBe(84); // C6
  });

  it('returns 13 entries for default layout (8 white + 5 black)', () => {
    const map = buildKeyMap(4);
    expect(Object.keys(map).length).toBe(13);
  });

  it('accepts custom key bindings', () => {
    const customWhite = ['z', 'x', 'c', 'v', 'b', 'n', 'm', ','];
    const customBlack = ['s', 'd', 'g', 'h', 'j'];
    const map = buildKeyMap(4, customWhite, customBlack);

    expect(map['z']).toBe(60); // C4
    expect(map['x']).toBe(62); // D4
    expect(map['c']).toBe(64); // E4
    expect(map['s']).toBe(61); // C#4
    expect(map['d']).toBe(63); // D#4
  });

  it('has no entries for undefined keys when arrays are shorter', () => {
    const map = buildKeyMap(4, ['a', 's', 'd'], ['w']);
    // Only 3 white keys and 1 black key
    expect(Object.keys(map).length).toBe(4);
  });
});
