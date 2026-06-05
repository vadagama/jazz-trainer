import { describe, it, expect } from 'vitest';
import { buildVoicing, getCompPattern, noteToMidi, midiToNote } from './rhodesVoicing.js';
import type { ChordSymbol } from '@jazz/shared';

// ─── Test chord factories ─────────────────────────────────────────────────────

function chord(
  root: ChordSymbol['root'],
  rootAccidental: ChordSymbol['rootAccidental'],
  quality: ChordSymbol['quality'],
): ChordSymbol {
  return {
    raw: `${root}${rootAccidental}`,
    root,
    rootAccidental,
    quality,
    extensions: ['7'],
    alterations: [],
    alt: false,
    bass: null,
  };
}

const dm7    = chord('D', '', 'minor');
const g7     = chord('G', '', 'dominant');
const cmaj7  = chord('C', '', 'major');
const bm7b5  = chord('B', '', 'halfDiminished');
const bdim7  = chord('B', '', 'diminished');

// ─── Pitch helpers ────────────────────────────────────────────────────────────

describe('noteToMidi / midiToNote', () => {
  it('round-trips standard notes', () => {
    for (const note of ['C3', 'F3', 'A3', 'B3', 'C4', 'E4', 'Bb4', 'Ab3']) {
      expect(midiToNote(noteToMidi(note))).toBe(note);
    }
  });

  it('F3 = MIDI 53', () => expect(noteToMidi('F3')).toBe(53));
  it('C4 = MIDI 60', () => expect(noteToMidi('C4')).toBe(60));
  it('E4 = MIDI 64', () => expect(noteToMidi('E4')).toBe(64));
});

// ─── Default voicings (no previous) ──────────────────────────────────────────

describe('buildVoicing — default (no prevVoicing)', () => {
  it('Dm7 rootless3 = F3 C4 E4', () => {
    expect(buildVoicing(dm7, 'rootless3', null)).toEqual(['F3', 'C4', 'E4']);
  });

  it('G7 rootless3 = B3 F4 A4', () => {
    expect(buildVoicing(g7, 'rootless3', null)).toEqual(['B3', 'F4', 'A4']);
  });

  it('Cmaj7 rootless3 = E3 B3 D4', () => {
    expect(buildVoicing(cmaj7, 'rootless3', null)).toEqual(['E3', 'B3', 'D4']);
  });

  it('Bm7b5 rootless3 = D3 A3 C4', () => {
    expect(buildVoicing(bm7b5, 'rootless3', null)).toEqual(['D3', 'A3', 'C4']);
  });

  it('Bdim7 rootless3 = D3 F3 Ab3', () => {
    expect(buildVoicing(bdim7, 'rootless3', null)).toEqual(['D3', 'F3', 'Ab3']);
  });

  it('Dm7 shell2 = F3 C4', () => {
    expect(buildVoicing(dm7, 'shell2', null)).toEqual(['F3', 'C4']);
  });

  it('G7 shell2 = B3 F4', () => {
    expect(buildVoicing(g7, 'shell2', null)).toEqual(['B3', 'F4']);
  });

  it('Cmaj7 shell2 = E3 B3', () => {
    expect(buildVoicing(cmaj7, 'shell2', null)).toEqual(['E3', 'B3']);
  });

  it('Dm7 rootless4 = F3 C4 E4 A4', () => {
    expect(buildVoicing(dm7, 'rootless4', null)).toEqual(['F3', 'C4', 'E4', 'A4']);
  });

  it('G7 rootless4 = B3 F4 A4 E5', () => {
    expect(buildVoicing(g7, 'rootless4', null)).toEqual(['B3', 'F4', 'A4', 'E5']);
  });

  it('Cmaj7 rootless4 = E3 B3 D4 G4', () => {
    expect(buildVoicing(cmaj7, 'rootless4', null)).toEqual(['E3', 'B3', 'D4', 'G4']);
  });
});

// ─── All notes stay in [C3, C6] ───────────────────────────────────────────────

describe('buildVoicing — register constraint', () => {
  const chords = [dm7, g7, cmaj7, bm7b5, bdim7];
  const densities = ['shell2', 'rootless3', 'rootless4'] as const;

  for (const c of chords) {
    for (const d of densities) {
      it(`${c.raw} ${d} stays in [C3, C6]`, () => {
        const notes = buildVoicing(c, d, null);
        for (const note of notes) {
          const midi = noteToMidi(note);
          expect(midi).toBeGreaterThanOrEqual(48); // C3
          expect(midi).toBeLessThanOrEqual(84);    // C6
        }
      });
    }
  }
});

// ─── Voice leading: ii–V–I ────────────────────────────────────────────────────

describe('buildVoicing — voice leading ii–V–I', () => {
  it('voice-leads Dm7 → G7 with minimal movement', () => {
    const dm7v = buildVoicing(dm7, 'rootless3', null); // F3 C4 E4
    const g7v  = buildVoicing(g7, 'rootless3', dm7v);
    expect(dm7v).toEqual(['F3', 'C4', 'E4']);

    // All notes in range
    for (const n of g7v) {
      expect(noteToMidi(n)).toBeGreaterThanOrEqual(48);
      expect(noteToMidi(n)).toBeLessThanOrEqual(84);
    }
    // Total movement ≤ 10 semitones (smooth voice leading)
    const dist = dm7v.map((n, i) => Math.abs(noteToMidi(n) - noteToMidi(g7v[i]!))).reduce((a, b) => a + b, 0);
    expect(dist).toBeLessThanOrEqual(10);
  });

  it('voice-leads G7 → Cmaj7 with minimal movement', () => {
    const dm7v  = buildVoicing(dm7, 'rootless3', null);
    const g7v   = buildVoicing(g7, 'rootless3', dm7v);
    const cmaj7v = buildVoicing(cmaj7, 'rootless3', g7v);

    for (const n of cmaj7v) {
      expect(noteToMidi(n)).toBeGreaterThanOrEqual(48);
      expect(noteToMidi(n)).toBeLessThanOrEqual(84);
    }
    const dist = g7v.map((n, i) => Math.abs(noteToMidi(n) - noteToMidi(cmaj7v[i]!))).reduce((a, b) => a + b, 0);
    expect(dist).toBeLessThanOrEqual(10);
  });

  it('ii–V–I chain: G7 voicing moves closer than default position', () => {
    const dm7v  = buildVoicing(dm7, 'rootless3', null);     // F3 C4 E4
    const g7vl  = buildVoicing(g7, 'rootless3', dm7v);      // voice-led
    const g7def = buildVoicing(g7, 'rootless3', null);       // default B3 F4 A4

    const prevMidi = dm7v.map(noteToMidi);
    const distLed  = g7vl.map((n, i) => Math.abs(noteToMidi(n) - prevMidi[i]!)).reduce((a, b) => a + b, 0);
    const distDef  = g7def.map((n, i) => Math.abs(noteToMidi(n) - prevMidi[i]!)).reduce((a, b) => a + b, 0);
    expect(distLed).toBeLessThanOrEqual(distDef);
  });
});

// ─── Guide tones present ───────────────────────────────────────────────────────

describe('buildVoicing — guide tones', () => {
  it('Dm7 rootless3 contains b3 (F) and b7 (C)', () => {
    const notes = buildVoicing(dm7, 'rootless3', null);
    const pcs = notes.map(n => noteToMidi(n) % 12);
    expect(pcs).toContain(5);  // F
    expect(pcs).toContain(0);  // C
  });

  it('G7 rootless3 contains 3rd (B) and b7 (F)', () => {
    const notes = buildVoicing(g7, 'rootless3', null);
    const pcs = notes.map(n => noteToMidi(n) % 12);
    expect(pcs).toContain(11); // B
    expect(pcs).toContain(5);  // F
  });

  it('Cmaj7 rootless3 contains 3rd (E) and maj7 (B)', () => {
    const notes = buildVoicing(cmaj7, 'rootless3', null);
    const pcs = notes.map(n => noteToMidi(n) % 12);
    expect(pcs).toContain(4);  // E
    expect(pcs).toContain(11); // B
  });
});

// ─── Rhythmic patterns ─────────────────────────────────────────────────────────

describe('getCompPattern', () => {
  it('wholeNotes: 1 event on beat 1', () => {
    const p = getCompPattern('wholeNotes');
    expect(p).toHaveLength(1);
    expect(p[0]!.beat).toBe(1);
    expect(p[0]!.durationBeats).toBeCloseTo(3.6);
  });

  it('halfNotes: 2 events on beats 1 and 3', () => {
    const p = getCompPattern('halfNotes');
    expect(p).toHaveLength(2);
    expect(p[0]!.beat).toBe(1);
    expect(p[1]!.beat).toBe(3);
  });

  it('quarterNotes: 4 events on beats 1–4', () => {
    const p = getCompPattern('quarterNotes');
    expect(p).toHaveLength(4);
    expect(p.map(e => e.beat)).toEqual([1, 2, 3, 4]);
  });

  it('beat 1 louder than beat 2 in halfNotes', () => {
    const p = getCompPattern('halfNotes');
    expect(p[0]!.velocity).toBeGreaterThan(p[1]!.velocity);
  });
});
