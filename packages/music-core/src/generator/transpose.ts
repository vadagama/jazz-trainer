import type { Key } from '@jazz/shared';

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
  return table[(((pc % 12) + 12) % 12)]!;
}
