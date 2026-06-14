import type { Accidental, Key, NoteName, Section } from '@jazz/shared';
import { parseChord } from '../chords/parseChord.js';
import { serializeChord } from '../chords/serializeChord.js';

/** Pitch-class spellings (0 = C). Flat keys use the flat table, others the sharp table. */
const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const BASE_PITCH: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Pitch class (0–11) of a key's tonic, e.g. `Eb` → 3. */
export function keyToPitchClass(key: Key | string): number {
  const letter = key[0]!;
  let pc = BASE_PITCH[letter];
  if (pc === undefined) throw new Error(`Invalid key: "${key}"`);
  if (key[1] === '#') pc += 1;
  else if (key[1] === 'b') pc -= 1;
  return ((pc % 12) + 12) % 12;
}

/** Choose the note-name table: flats for flat keys (and F), sharps otherwise. */
export function spellingTable(key: Key | string): string[] {
  return key.includes('b') || key === 'F' ? FLAT_NAMES : SHARP_NAMES;
}

/** Spell a pitch class in the chosen key's table, e.g. (3, Eb) → "Eb". */
export function spellPitchClass(pc: number, key: Key | string): string {
  const table = spellingTable(key);
  return table[((pc % 12) + 12) % 12]!;
}

/** Transpose a single chord symbol string by the interval between fromKey and toKey. */
export function transposeChord(symbol: string, fromKey: Key | string, toKey: Key | string): string {
  const result = parseChord(symbol);
  if (!result.ok || !result.value) return symbol;

  const chord = result.value;
  const shift = (((keyToPitchClass(toKey) - keyToPitchClass(fromKey)) % 12) + 12) % 12;
  if (shift === 0) return serializeChord(chord);

  const newRootStr = spellPitchClass(
    (keyToPitchClass(chord.root + chord.rootAccidental) + shift) % 12,
    toKey,
  );
  const newRoot = newRootStr[0] as NoteName;
  const newRootAccidental = (newRootStr.length > 1 ? newRootStr[1] : '') as Accidental;

  let newBass = chord.bass ?? null;
  if (chord.bass) {
    const newBassStr = spellPitchClass(
      (keyToPitchClass(chord.bass.note + chord.bass.accidental) + shift) % 12,
      toKey,
    );
    newBass = {
      note: newBassStr[0] as NoteName,
      accidental: (newBassStr.length > 1 ? newBassStr[1] : '') as Accidental,
    };
  }

  return serializeChord({
    ...chord,
    root: newRoot,
    rootAccidental: newRootAccidental,
    bass: newBass,
  });
}

/** Transpose all chord symbols in sections from fromKey to toKey (immutable). */
export function transposeSections(sections: Section[], fromKey: Key, toKey: Key): Section[] {
  if (fromKey === toKey) return sections;
  return sections.map((section) => ({
    ...section,
    bars: section.bars.map((bar) => ({
      ...bar,
      chords: bar.chords.map((slot) => ({
        ...slot,
        symbol: transposeChord(slot.symbol, fromKey, toKey),
        parsed: null,
      })),
    })),
  }));
}
