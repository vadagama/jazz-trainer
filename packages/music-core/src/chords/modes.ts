/**
 * Scale types, intervals, and chord-to-scale mapping.
 * Pure music theory — no platform dependencies.
 */

export const SCALE_TYPES = [
  'major',
  'natural-minor',
  'harmonic-minor',
  'melodic-minor',
  'dorian',
  'mixolydian',
  'phrygian',
  'lydian',
  'locrian',
] as const;
export type ScaleType = (typeof SCALE_TYPES)[number];

/** Intervals (semitones from tonic) for each scale type. */
export const SCALE_INTERVALS: Record<ScaleType, readonly number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  'natural-minor': [0, 2, 3, 5, 7, 8, 10],
  'harmonic-minor': [0, 2, 3, 5, 7, 8, 11],
  'melodic-minor': [0, 2, 3, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  locrian: [0, 1, 3, 5, 6, 8, 10],
};

/** Russian display labels for each scale type. */
export const SCALE_LABELS: Record<ScaleType, string> = {
  major: 'мажор',
  'natural-minor': 'натуральный минор',
  'harmonic-minor': 'гармонический минор',
  'melodic-minor': 'мелодический минор',
  dorian: 'дорийский',
  mixolydian: 'миксолидийский',
  phrygian: 'фригийский',
  lydian: 'лидийский',
  locrian: 'локрийский',
};

/** Tonic 7th chord quality for each scale type. */
const TONIC_QUALITIES: Record<ScaleType, string> = {
  major: 'maj7',
  'natural-minor': 'm7',
  'harmonic-minor': 'm(maj7)',
  'melodic-minor': 'm(maj7)',
  dorian: 'm7',
  mixolydian: '7',
  phrygian: 'm7',
  lydian: 'maj7',
  locrian: 'm7b5',
};

/**
 * Build the tonic 7th chord symbol for a given root and scale type.
 * "C" + "dorian" → "Cm7", "Eb" + "mixolydian" → "Eb7".
 */
export function buildTonicChord(root: string, type: ScaleType): string {
  return `${root}${TONIC_QUALITIES[type]}`;
}

/** Map of (degree × quality-suffix) → scale type for diatonic major-key chords. */
const DIATONIC_MAP: Record<string, ScaleType> = {
  '0,maj7': 'major',
  '0,maj9': 'major',
  '0,maj': 'major',
  '2,m7': 'dorian',
  '4,m7': 'phrygian',
  '5,maj7': 'lydian',
  '5,maj9': 'lydian',
  '5,maj': 'lydian',
  '7,7': 'mixolydian',
  '7,9': 'mixolydian',
  '7,13': 'mixolydian',
  '9,m7': 'natural-minor',
  '11,m7b5': 'locrian',
};

/** Alteration-bearing dominant chords on degree 7 → harmonic minor. */
const ALT_DOMINANT_SUFFIXES = new Set(['7b9', '7#9', '7b13', '7#11', '7alt', '7b9b13']);

/**
 * Map a chord's scale-degree (semitones above tonic) and quality suffix
 * to the corresponding diatonic mode / scale.
 *
 * @param degree 0–11 semitones from the key tonic to the chord root.
 * @param quality The chord suffix, e.g. `"maj7"`, `"m7"`, `"7"`, `"m7b5"`.
 * @returns The scale type that this chord implies in a major-key context.
 */
export function chordDegreeToScale(degree: number, quality: string): ScaleType {
  const normDegree = ((degree % 12) + 12) % 12;
  const key = `${normDegree},${quality}`;
  const exact = DIATONIC_MAP[key];
  if (exact) return exact;

  // Altered dominants on V → harmonic minor
  if (normDegree === 7 && ALT_DOMINANT_SUFFIXES.has(quality)) {
    return 'harmonic-minor';
  }

  // Fallback by chord quality family
  if (quality.includes('maj')) return 'major';
  if (quality.startsWith('m') || quality.includes('min')) return 'dorian';
  if (quality.startsWith('dim') || quality.includes('dim')) return 'locrian';
  // Dominant (7, 9, 13, or bare) — default mixolydian
  if (/^[0-9]/.test(quality)) return 'mixolydian';

  return 'major';
}

/**
 * Extract the quality suffix from a chord symbol string.
 * "Dm7" → "m7", "F#m7b5" → "m7b5", "C7" → "7", "G7alt" → "7alt".
 */
export function getChordQualitySuffix(symbol: string): string {
  let i = 1;
  if (symbol.length > 1 && (symbol[1] === '#' || symbol[1] === 'b')) {
    i = 2;
  }
  let suffix = symbol.slice(i);
  const slashIdx = suffix.indexOf('/');
  if (slashIdx >= 0) {
    suffix = suffix.slice(0, slashIdx);
  }
  return suffix;
}

/**
 * Build a human-readable scale label: root note + scale name.
 * "C" + "major" → "C мажор", "D" + "dorian" → "D дорийский".
 */
export function scaleLabel(root: string, type: ScaleType): string {
  return `${root} ${SCALE_LABELS[type]}`;
}
