// ---------------------------------------------------------------------------
// keyboardLayout.ts — piano key geometry
//
// Pure logic: no React, no DOM, no browser APIs.
// ---------------------------------------------------------------------------

/** Layout info for a single piano key. */
export interface KeyLayout {
  /** MIDI note number (0–127). */
  midiNote: number;
  /** Note name, e.g. "C4". */
  note: string;
  /** Whether this is a black key. */
  isBlack: boolean;
  /** Left position relative to the keyboard container (fraction 0–1). */
  x: number;
  /** Top position (0 for white, negative for black keys in compact mode). */
  y: number;
  /** Width relative to the keyboard container (fraction 0–1). */
  width: number;
  /** Height relative to the keyboard container (fraction 0–1). */
  height: number;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_ALIASES: Record<string, string> = {
  Db: 'C#',
  Eb: 'D#',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
};

/** Semitones from C within an octave to white key index. */
const WHITE_KEY_SEMITONES = [0, 2, 4, 5, 7, 9, 11];

/** Black key semitones and their position between white keys. */
const BLACK_KEY_SEMITONES = [1, 3, 6, 8, 10];
const BLACK_KEY_WHITE_INDEX: Record<number, number> = {
  1: 0, // C# between C (0) and D (1)
  3: 1, // D# between D (1) and E (2)
  6: 3, // F# between F (3) and G (4)
  8: 4, // G# between G (4) and A (5)
  10: 5, // A# between A (5) and B (6)
};

/** Default black key height ratio (relative to white key height). */
const BLACK_KEY_HEIGHT_RATIO = 0.6;
/** Default black key width ratio (relative to white key width). */
const BLACK_KEY_WIDTH_RATIO = 0.65;
/** Black key vertical offset (negative = above white key baseline in SVG). */
const BLACK_KEY_Y_OFFSET = 0;

export interface KeyboardLayoutOptions {
  /** Octave range [low, high] inclusive. Default: [3, 5] (C3–C5). */
  octaveRange?: [number, number];
  /** Compact mode: reduced overall height, smaller black keys. */
  compact?: boolean;
}

function midiToNoteName(midiNote: number): string {
  const octave = Math.floor(midiNote / 12) - 1;
  const semitone = midiNote % 12;
  return `${NOTE_NAMES[semitone]!}${octave}`;
}

function isBlackKey(midiNote: number): boolean {
  return BLACK_KEY_SEMITONES.includes(midiNote % 12);
}

/**
 * Generate key layout data for a piano keyboard.
 *
 * Returns an array of keys ordered left-to-right with position/size
 * relative to the container (fractions 0–1). Callers multiply by
 * pixel dimensions for final rendering.
 */
export function getKeyboardKeys(options: KeyboardLayoutOptions = {}): KeyLayout[] {
  const [lowOctave, highOctave] = options.octaveRange ?? [3, 5];
  const compact = options.compact ?? false;

  const lowMidi = (lowOctave + 1) * 12; // MIDI note of C in lowOctave
  const highMidi = (highOctave + 1) * 12 + 11; // MIDI note of B in highOctave

  // Count white keys in range
  let whiteKeyCount = 0;
  for (let midi = lowMidi; midi <= highMidi; midi++) {
    if (!isBlackKey(midi)) whiteKeyCount++;
  }

  const whiteKeyWidth = 1 / whiteKeyCount;
  const blackKeyWidth = whiteKeyWidth * (compact ? 0.55 : BLACK_KEY_WIDTH_RATIO);
  const whiteKeyHeight = 1;
  const blackKeyHeight = compact ? 0.55 : BLACK_KEY_HEIGHT_RATIO;
  const blackKeyY = compact ? -0.02 : BLACK_KEY_Y_OFFSET;

  // Track white key positions within the range
  const whiteKeyPositions = new Map<number, number>(); // midiNote → x position
  let whiteIndex = 0;
  for (let midi = lowMidi; midi <= highMidi; midi++) {
    if (!isBlackKey(midi)) {
      whiteKeyPositions.set(midi, whiteIndex * whiteKeyWidth);
      whiteIndex++;
    }
  }

  const keys: KeyLayout[] = [];

  for (let midi = lowMidi; midi <= highMidi; midi++) {
    const black = isBlackKey(midi);

    if (black) {
      const semitone = midi % 12;
      const leftWhiteIdx = BLACK_KEY_WHITE_INDEX[semitone];
      if (leftWhiteIdx === undefined) continue;

      // Find the left white key in the range
      const octave = Math.floor(midi / 12);
      const leftWhiteMidi = octave * 12 + WHITE_KEY_SEMITONES[leftWhiteIdx]!;
      const leftX = whiteKeyPositions.get(leftWhiteMidi);
      if (leftX === undefined) continue;

      // Black key centered at the right edge of the left white key
      const x = leftX + whiteKeyWidth - blackKeyWidth / 2;

      keys.push({
        midiNote: midi,
        note: midiToNoteName(midi),
        isBlack: true,
        x,
        y: blackKeyY,
        width: blackKeyWidth,
        height: blackKeyHeight,
      });
    } else {
      const x = whiteKeyPositions.get(midi);
      if (x === undefined) continue;

      keys.push({
        midiNote: midi,
        note: midiToNoteName(midi),
        isBlack: false,
        x,
        y: 0,
        width: whiteKeyWidth,
        height: whiteKeyHeight,
      });
    }
  }

  return keys;
}

/** Get MIDI note from a note name like "C4" or "Eb4". */
export function noteNameToMidi(noteName: string): number {
  const match = /^([A-G][#b]?)(-?\d+)$/.exec(noteName);
  if (!match) throw new Error(`Invalid note name: ${noteName}`);
  const [, rawName, octaveStr] = match;
  const canonical = NOTE_ALIASES[rawName!] ?? rawName;
  const semitone = NOTE_NAMES.indexOf(canonical!);
  if (semitone === -1) throw new Error(`Invalid note name: ${noteName}`);
  return (parseInt(octaveStr!, 10) + 1) * 12 + semitone;
}
