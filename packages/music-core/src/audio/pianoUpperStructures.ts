import type { ChordSymbol } from '@jazz/shared';

/**
 * Tension level — the single user-facing control for how much harmonic
 * "color" (upper structures, alterations) the piano voicing engine applies.
 * Replaces per-feature toggles: the engine decides *where* to apply tension
 * based on the real chord quality; the user only dials *how much*.
 */
export type TensionLevel = 'clean' | 'moderate' | 'altered' | 'max';

/** Probability that an upper structure is applied at all when tension allows it. */
const TENSION_GATE: Record<TensionLevel, number> = {
  clean: 0,
  moderate: 0.35,
  altered: 0.7,
  max: 1,
};

/**
 * Upper Structure triad definition.
 * Each entry maps a chord quality to suggested upper structures
 * with intervals relative to the chord root.
 */
export interface UpperStructure {
  /** Human-readable label (e.g. "♭II over dominant") */
  label: string;
  /** Intervals of the upper structure triad relative to chord root */
  intervals: [string, string, string];
  /** Weight for random selection (higher = more likely) */
  weight: number;
  /** Marks a milder color; excluded from the `moderate` tension pool. */
  altered?: boolean;
}

/** Deterministic seeded pseudo-random, matching the LCG used elsewhere in the engine. */
function pseudoRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
}

/**
 * Upper structure table keyed by chord quality.
 */
const US_TABLE: Record<string, UpperStructure[]> = {
  dominant: [
    { label: '♭II triad (D♭ over C7)', intervals: ['b2', '4', 'b6'], weight: 3, altered: true },
    { label: '♭VI triad (A♭ over C7)', intervals: ['b6', '1', 'b3'], weight: 3, altered: true },
    { label: 'VI triad (A over C7)', intervals: ['6', '#1', '3'], weight: 2 },
    { label: 'dim triad (Ddim over C7)', intervals: ['2', '4', 'b6'], weight: 2, altered: true },
    { label: '♭V triad (G♭ over C7)', intervals: ['b5', 'b7', 'b2'], weight: 2, altered: true },
    { label: 'IV triad (F over C7)', intervals: ['4', '6', '1'], weight: 1 },
  ],
  major: [
    { label: 'II triad (D over Cmaj7)', intervals: ['2', '#4', '6'], weight: 3 },
    { label: 'V triad (G over Cmaj7)', intervals: ['5', '7', '2'], weight: 3 },
    { label: 'VI triad (A over Cmaj7)', intervals: ['6', '1', '3'], weight: 2 },
    { label: 'III triad (E over Cmaj7)', intervals: ['3', '#5', '7'], weight: 2, altered: true },
  ],
  minor: [
    { label: '♭III triad (E♭ over Cm7)', intervals: ['b3', '5', 'b7'], weight: 3 },
    { label: 'IV triad (F over Cm7)', intervals: ['4', '6', '1'], weight: 3 },
    { label: '♭VII triad (B♭ over Cm7)', intervals: ['b7', '2', '4'], weight: 2 },
  ],
  halfDiminished: [
    { label: '♭VI triad (A♭ over Cm7♭5)', intervals: ['b6', '1', 'b3'], weight: 3 },
    { label: '♭III triad (E♭ over Cm7♭5)', intervals: ['b3', '5', 'b7'], weight: 2 },
  ],
  diminished: [
    { label: 'dim triad up m3 (E♭dim over Cdim)', intervals: ['b3', 'b5', '6'], weight: 3 },
  ],
};

/**
 * Suggest an upper structure for a given chord, gated by tension level.
 *
 * Deterministic: identical (chord, functionHint, tension, seed) always
 * returns the same result — required for reproducible arrangements, matching
 * the seeded pool-selection used elsewhere in the pattern engine.
 *
 * @param chord  The chord symbol
 * @param functionHint  Optional harmonic function hint ('tonic', 'subdominant', 'dominant')
 * @param tension  How much harmonic color the user wants — 'clean' disables upper structures entirely
 * @param seed  Deterministic seed (e.g. derived from bar index + tick)
 * @returns An upper structure with intervals, or null if none should be applied
 */
export function suggestUpperStructure(
  chord: ChordSymbol,
  functionHint: string | undefined,
  tension: TensionLevel,
  seed: number,
): UpperStructure | null {
  if (tension === 'clean') return null;

  const rand = pseudoRandom(seed);
  if (rand() >= TENSION_GATE[tension]) return null;

  const quality = chord.quality;
  let options = US_TABLE[quality];

  if (!options || options.length === 0) {
    // Fallback: treat unknown qualities like dominant
    options = US_TABLE['dominant'];
  }

  if (!options || options.length === 0) return null;

  // 'moderate' tension: only the milder, non-altered colors
  if (tension === 'moderate') {
    const mild = options.filter((o) => !o.altered);
    if (mild.length > 0) options = mild;
  }

  // Weighted selection: boost certain structures based on function
  if (functionHint === 'dominant') {
    // Prefer altered-dominant colors for dominant function
    options = options.map((o) => (o.altered ? { ...o, weight: o.weight * 2 } : o));
  } else if (functionHint === 'subdominant') {
    // For subdominant, prefer less altered
    options = options.map((o) => (o.altered ? { ...o, weight: Math.max(1, o.weight - 1) } : o));
  }

  // Weighted random selection (reuses the same seeded stream as the gate above)
  const totalWeight = options.reduce((sum, o) => sum + o.weight, 0);
  let r = rand() * totalWeight;
  for (const opt of options) {
    r -= opt.weight;
    if (r <= 0) return opt;
  }

  return options[0]!;
}
