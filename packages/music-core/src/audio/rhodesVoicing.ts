import type { ChordSymbol } from '@jazz/shared';

export type RhodesVoicingDensity = 'shell2' | 'rootless3' | 'rootless4';
export type CompChordRef = 'current' | 'next';

export type RhodesCompingMode =
  | 'wholeNotes'
  | 'halfNotes'
  | 'quarterNotes'
  | 'charleston'
  | 'reverse-charleston'
  | 'basie-2-4'
  | 'offbeat-2-4'
  | 'anticipation-4and'
  | 'one-twoand-four'
  | 'oneand-three'
  | 'twoand-only'
  | 'four-and-sparse'
  | 'two-threeand';

/** Complementary layer mode — Rhodes sits behind/around Piano, not competing. */
export type RhodesLayerMode =
  | 'pads'
  | 'subtle-offbeats'
  | 'high-comping'
  | 'ambient-swells'
  | 'stab-accents'
  | 'none';

export interface CompEvent {
  readonly beat: 1 | 2 | 3 | 4;
  readonly subdivision?: 0 | 0.5;
  readonly durationBeats: number;
  readonly velocity: number;
  readonly chordRef?: CompChordRef;
}

export interface RhodesRhythmPattern {
  readonly id: RhodesCompingMode;
  readonly name: string;
  readonly complexity: 1 | 2 | 3;
  readonly hits: readonly CompEvent[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Comping register bounds (MIDI note numbers). */
const RANGE_MIN = 48; // C3
const RANGE_MAX = 84; // C6

const SEMITONE: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

/** Maximum span (semitones) between lowest and highest voice in one voicing. */
const MAX_SPAN = 24;

// ─── Pitch helpers ───────────────────────────────────────────────────────────

export function noteToMidi(note: string): number {
  const m = /^([A-G])(#|b)?(-?\d+)$/.exec(note);
  if (!m) throw new Error(`Invalid note: ${note}`);
  const pc = (SEMITONE[m[1]!]! + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
  return (parseInt(m[3]!, 10) + 1) * 12 + pc;
}

export function midiToNote(midi: number): string {
  const pc = ((midi % 12) + 12) % 12;
  return `${NOTE_NAMES[pc]}${Math.floor(midi / 12) - 1}`;
}

function chordRootPc(chord: ChordSymbol): number {
  const base = SEMITONE[chord.root]!;
  const acc = chord.rootAccidental === '#' ? 1 : chord.rootAccidental === 'b' ? -1 : 0;
  return (base + acc + 12) % 12;
}

// ─── Interval tables (semitones from root) ───────────────────────────────────
//
// Intervals define the ORDERED stack used for default voicing placement.
// Voicings avoid the root (rootless), keeping 3rd + 7th as guide tones.
//
// Key:  19 = 5th + octave (12+7),  21 = 13th + octave (12+9),
//       13 = b9,  18 = b5 + octave (12+6),  12 = root + octave (dim7 symmetric).

function voicingIntervals(chord: ChordSymbol, density: RhodesVoicingDensity): readonly number[] {
  switch (chord.quality) {
    case 'major':
      return density === 'shell2'
        ? [4, 11]
        : density === 'rootless3'
          ? [4, 11, 14]
          : [4, 11, 14, 19];
    case 'minor':
      return density === 'shell2'
        ? [3, 10]
        : density === 'rootless3'
          ? [3, 10, 14]
          : [3, 10, 14, 19];
    case 'dominant':
      return density === 'shell2'
        ? [4, 10]
        : density === 'rootless3'
          ? [4, 10, 14]
          : [4, 10, 14, 21];
    case 'halfDiminished':
      return density === 'shell2'
        ? [3, 10]
        : density === 'rootless3'
          ? [3, 10, 13]
          : [3, 10, 13, 18];
    case 'diminished':
      // bb7 = 9 semitones; shell2 uses b3+bb7, rootless3/4 include b5
      return density === 'shell2' ? [3, 9] : density === 'rootless3' ? [3, 6, 9] : [3, 6, 9, 12]; // symmetric: adds root+oct
    default:
      // suspended, augmented, power — fallback to dominant intervals
      return density === 'shell2'
        ? [4, 10]
        : density === 'rootless3'
          ? [4, 10, 14]
          : [4, 10, 14, 21];
  }
}

// ─── Stack helpers ────────────────────────────────────────────────────────────

/**
 * Place each pitch class above `baseMidi` in order, choosing the nearest
 * octave above the current top note. Returns null if any note exceeds RANGE_MAX.
 */
function stackAbove(baseMidi: number, pcs: readonly number[]): number[] | null {
  const result: number[] = [];
  let current = baseMidi;
  for (const pc of pcs) {
    const delta = (pc - (current % 12) + 12) % 12 || 12;
    current = current + delta;
    if (current > RANGE_MAX) return null;
    result.push(current);
  }
  return result;
}

/** All permutations of an array. */
function permute<T>(arr: readonly T[]): T[][] {
  if (arr.length <= 1) return [[...arr]];
  return arr.flatMap((item, i) =>
    permute([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [item, ...p]),
  );
}

// ─── Default voicing ─────────────────────────────────────────────────────────

/**
 * Build root-position voicing (first interval as bass) at the lowest
 * fitting octave starting from C3. Used when no previous voicing is available.
 */
function buildDefaultVoicing(chord: ChordSymbol, density: RhodesVoicingDensity): number[] {
  const intervals = voicingIntervals(chord, density);
  const rootPc = chordRootPc(chord);
  const bassPc = (rootPc + intervals[0]!) % 12;
  const restPcs = intervals.slice(1).map((i) => (rootPc + i) % 12);

  for (let bassMidi = RANGE_MIN; bassMidi <= RANGE_MAX; bassMidi++) {
    if (((bassMidi % 12) + 12) % 12 !== bassPc) continue;
    const upper = stackAbove(bassMidi, restPcs);
    if (!upper) continue;
    const voicing = [bassMidi, ...upper];
    if (voicing[voicing.length - 1]! <= RANGE_MAX) return voicing;
  }

  // Absolute fallback: root + first interval in mid range
  return [(4 + 1) * 12 + bassPc];
}

// ─── Candidate generation ─────────────────────────────────────────────────────

/**
 * Generate all unique ascending voicings for the chord + density in [C3, C6].
 * Tries every unique pitch class as the bass note and every permutation of
 * the remaining pitch classes stacked above it.
 */
function generateCandidates(chord: ChordSymbol, density: RhodesVoicingDensity): number[][] {
  const intervals = voicingIntervals(chord, density);
  const rootPc = chordRootPc(chord);
  const allPcs = [...new Set(intervals.map((i) => (rootPc + i) % 12))];
  const n = allPcs.length;

  const candidates: number[][] = [];
  const seen = new Set<string>();

  for (const bassPc of allPcs) {
    const restPcs = allPcs.filter((pc) => pc !== bassPc);
    const restPerms = permute(restPcs);

    for (let bassMidi = RANGE_MIN; bassMidi <= RANGE_MAX; bassMidi++) {
      if (((bassMidi % 12) + 12) % 12 !== bassPc) continue;

      for (const perm of restPerms) {
        const upper = stackAbove(bassMidi, perm);
        if (!upper || upper.length !== n - 1) continue;

        const voicing = [bassMidi, ...upper];
        if (voicing[n - 1]! - bassMidi > MAX_SPAN) continue;

        const key = voicing.join(',');
        if (!seen.has(key)) {
          seen.add(key);
          candidates.push(voicing);
        }
      }
    }
  }

  return candidates;
}

// ─── Voice leading ─────────────────────────────────────────────────────────────

/** Sum of per-voice semitone movements between two voicings. */
function totalDistance(a: readonly number[], b: readonly number[]): number {
  const len = Math.min(a.length, b.length);
  let dist = 0;
  for (let i = 0; i < len; i++) dist += Math.abs(a[i]! - b[i]!);
  return dist;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Build a Rhodes voicing for the given chord and density.
 *
 * - When `prevVoicing` is null: returns root-position voicing at lowest valid octave.
 * - When `prevVoicing` is provided: returns the candidate with minimum total
 *   voice movement; ties broken by choosing the narrower (smaller span) voicing.
 */
export function buildVoicing(
  chord: ChordSymbol,
  density: RhodesVoicingDensity,
  prevVoicing: readonly string[] | null,
): string[] {
  if (!prevVoicing) {
    return buildDefaultVoicing(chord, density).map(midiToNote);
  }

  const candidates = generateCandidates(chord, density);
  if (candidates.length === 0) {
    return buildDefaultVoicing(chord, density).map(midiToNote);
  }

  const prevMidi = prevVoicing.map(noteToMidi);
  let best = candidates[0]!;
  let bestDist = totalDistance(best, prevMidi);
  let bestSpan = best[best.length - 1]! - best[0]!;

  for (const c of candidates.slice(1)) {
    const d = totalDistance(c, prevMidi);
    const span = c[c.length - 1]! - c[0]!;
    if (d < bestDist || (d === bestDist && span < bestSpan)) {
      best = c;
      bestDist = d;
      bestSpan = span;
    }
  }

  return best.map(midiToNote);
}

// ─── Swing patterns ───────────────────────────────────────────────────────────

export const SWING_PATTERNS: readonly RhodesRhythmPattern[] = [
  {
    id: 'charleston',
    name: 'Charleston',
    complexity: 1,
    hits: [
      { beat: 1, subdivision: 0, durationBeats: 0.75, velocity: 0.55 },
      { beat: 2, subdivision: 0.5, durationBeats: 1.1, velocity: 0.48 },
    ],
  },
  {
    id: 'reverse-charleston',
    name: 'Reverse Charleston',
    complexity: 1,
    hits: [
      { beat: 1, subdivision: 0.5, durationBeats: 0.75, velocity: 0.48 },
      { beat: 3, subdivision: 0, durationBeats: 1.0, velocity: 0.54 },
    ],
  },
  {
    id: 'basie-2-4',
    name: 'Basie 2 и 4',
    complexity: 1,
    hits: [
      { beat: 2, subdivision: 0, durationBeats: 0.45, velocity: 0.45 },
      { beat: 4, subdivision: 0, durationBeats: 0.45, velocity: 0.48 },
    ],
  },
  {
    id: 'offbeat-2-4',
    name: 'Offbeat 2& / 4&',
    complexity: 2,
    hits: [
      { beat: 2, subdivision: 0.5, durationBeats: 0.55, velocity: 0.47 },
      { beat: 4, subdivision: 0.5, durationBeats: 0.55, velocity: 0.44 },
    ],
  },
  {
    id: 'anticipation-4and',
    name: 'Антиципация 4&',
    complexity: 2,
    hits: [{ beat: 4, subdivision: 0.5, durationBeats: 0.6, velocity: 0.46, chordRef: 'next' }],
  },
  {
    id: 'one-twoand-four',
    name: '1 + 2& + 4',
    complexity: 2,
    hits: [
      { beat: 1, subdivision: 0, durationBeats: 0.6, velocity: 0.52 },
      { beat: 2, subdivision: 0.5, durationBeats: 0.55, velocity: 0.45 },
      { beat: 4, subdivision: 0, durationBeats: 0.45, velocity: 0.46 },
    ],
  },
  {
    id: 'oneand-three',
    name: '1& + 3',
    complexity: 1,
    hits: [
      { beat: 1, subdivision: 0.5, durationBeats: 0.55, velocity: 0.45 },
      { beat: 3, subdivision: 0, durationBeats: 0.75, velocity: 0.52 },
    ],
  },
  {
    id: 'twoand-only',
    name: '2& only',
    complexity: 1,
    hits: [{ beat: 2, subdivision: 0.5, durationBeats: 0.65, velocity: 0.45 }],
  },
  {
    id: 'four-and-sparse',
    name: '4& (редкий)',
    complexity: 1,
    hits: [{ beat: 4, subdivision: 0.5, durationBeats: 0.55, velocity: 0.43, chordRef: 'next' }],
  },
  {
    id: 'two-threeand',
    name: '2 + 3&',
    complexity: 2,
    hits: [
      { beat: 2, subdivision: 0, durationBeats: 0.45, velocity: 0.46 },
      { beat: 3, subdivision: 0.5, durationBeats: 0.6, velocity: 0.44 },
    ],
  },
];

// ─── Rhythmic patterns ─────────────────────────────────────────────────────────

/** Per-mode comping pattern. Basic modes use whole/half/quarter notes; swing modes look up SWING_PATTERNS. */
export function getCompPattern(mode: RhodesCompingMode): readonly CompEvent[] {
  switch (mode) {
    case 'wholeNotes':
      return [{ beat: 1, durationBeats: 3.6, velocity: 0.54 }];
    case 'halfNotes':
      return [
        { beat: 1, durationBeats: 1.65, velocity: 0.55 },
        { beat: 3, durationBeats: 1.45, velocity: 0.49 },
      ];
    case 'quarterNotes':
      return [
        { beat: 1, durationBeats: 0.65, velocity: 0.53 },
        { beat: 2, durationBeats: 0.5, velocity: 0.42 },
        { beat: 3, durationBeats: 0.65, velocity: 0.5 },
        { beat: 4, durationBeats: 0.5, velocity: 0.44 },
      ];
    default:
      return (
        SWING_PATTERNS.find((p) => p.id === mode)?.hits ?? [
          { beat: 1, durationBeats: 3.6, velocity: 0.54 },
        ]
      );
  }
}

// ─── Complementary layer patterns ──────────────────────────────────────────────

/**
 * Complementary patterns for Rhodes as a background layer behind Piano.
 * Lower velocities, sparser rhythms, and octave shifts prevent conflicts.
 */
export const LAYER_PATTERNS: Record<RhodesLayerMode, readonly CompEvent[]> = {
  pads: [{ beat: 1, durationBeats: 3.6, velocity: 0.35 }],
  'subtle-offbeats': [
    { beat: 2, subdivision: 0.5, durationBeats: 0.55, velocity: 0.35 },
    { beat: 4, subdivision: 0.5, durationBeats: 0.55, velocity: 0.32 },
  ],
  'high-comping': [
    { beat: 1, durationBeats: 1.65, velocity: 0.34 },
    { beat: 3, durationBeats: 1.45, velocity: 0.3 },
  ],
  'ambient-swells': [{ beat: 1, durationBeats: 7.6, velocity: 0.3, chordRef: 'current' }],
  'stab-accents': [
    { beat: 2, durationBeats: 0.3, velocity: 0.65 },
    { beat: 4, durationBeats: 0.3, velocity: 0.6 },
  ],
  none: [],
};

/** Look up the complementary layer pattern. */
export function getLayerPattern(mode: RhodesLayerMode): readonly CompEvent[] {
  return LAYER_PATTERNS[mode] ?? [];
}
