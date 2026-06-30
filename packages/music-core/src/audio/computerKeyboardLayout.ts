// ---------------------------------------------------------------------------
// computerKeyboardLayout.ts — laptop keyboard → MIDI note mapping
//
// Pure logic: no React, no DOM, no browser APIs.
// ---------------------------------------------------------------------------

/** Maps keyboard key (lowercase, e.g. 'a') to MIDI note number (0–127). */
export type ComputerKeyMap = Record<string, number>;

/** Default white key bindings: a s d f g h j k → C D E F G A B C */
export const DEFAULT_WHITE_KEYS = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k'] as const;

/** Default black key bindings: w e t y u → C# D# F# G# A# */
export const DEFAULT_BLACK_KEYS = ['w', 'e', 't', 'y', 'u'] as const;

// Semitone offsets within an octave
const WHITE_SEMITONES = [0, 2, 4, 5, 7, 9, 11] as const; // C D E F G A B
const BLACK_SEMITONES = [1, 3, 6, 8, 10] as const; // C# D# F# G# A#

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

function midiToName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[midi % 12]!}${octave}`;
}

/**
 * Build a key → MIDI note number map.
 *
 * White keys span C{octave} to C{octave+1} (8 positions: C D E F G A B C).
 * Black keys are C# D# F# G# A# within {octave}.
 *
 * @param octave - Base octave (1–7, default 4 → C4–C5).
 * @param whiteKeys - 8 key codes for white keys (default: a s d f g h j k).
 * @param blackKeys - 5 key codes for black keys (default: w e t y u).
 */
export function buildKeyMap(
  octave = 4,
  whiteKeys: readonly string[] = DEFAULT_WHITE_KEYS,
  blackKeys: readonly string[] = DEFAULT_BLACK_KEYS,
): ComputerKeyMap {
  const map: ComputerKeyMap = {};
  const base = (octave + 1) * 12; // MIDI note for C{octave}

  for (let i = 0; i < 8 && i < whiteKeys.length; i++) {
    const key = whiteKeys[i];
    if (!key) continue;
    // Position 7 (8th key) is C of the next octave
    map[key] = i < 7 ? base + WHITE_SEMITONES[i]! : base + 12;
  }

  for (let i = 0; i < 5 && i < blackKeys.length; i++) {
    const key = blackKeys[i];
    if (!key) continue;
    map[key] = base + BLACK_SEMITONES[i]!;
  }

  return map;
}

/**
 * Human-readable description of a key map, sorted by MIDI note.
 */
export function describeKeyMap(
  keyMap: ComputerKeyMap,
): Array<{ key: string; midiNote: number; note: string }> {
  return Object.entries(keyMap)
    .map(([key, midiNote]) => ({ key, midiNote, note: midiToName(midiNote) }))
    .sort((a, b) => a.midiNote - b.midiNote);
}
