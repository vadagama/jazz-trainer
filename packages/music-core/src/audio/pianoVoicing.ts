import type { ChordSymbol } from '@jazz/shared';

export type PianoVoicingDensity = 'shell2' | 'rootless3' | 'rootless4' | 'quartal';

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

function noteToMidi(note: string): number {
  const m = /^([A-G])(#|b)?(-?\d+)$/.exec(note);
  if (!m) throw new Error(`Invalid note: ${note}`);
  const pc = (SEMITONE[m[1]!]! + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
  return (parseInt(m[3]!, 10) + 1) * 12 + pc;
}

function midiToNote(midi: number): string {
  const pc = ((midi % 12) + 12) % 12;
  return `${NOTE_NAMES[pc]}${Math.floor(midi / 12) - 1}`;
}

function chordRootPc(chord: ChordSymbol): number {
  const base = SEMITONE[chord.root]!;
  const acc = chord.rootAccidental === '#' ? 1 : chord.rootAccidental === 'b' ? -1 : 0;
  return (base + acc + 12) % 12;
}

// ─── Interval tables (semitones from root) ───────────────────────────────────

function voicingIntervals(chord: ChordSymbol, density: PianoVoicingDensity): readonly number[] {
  if (density === 'quartal') return quartalIntervals(chord);

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
      return density === 'shell2' ? [3, 9] : density === 'rootless3' ? [3, 6, 9] : [3, 6, 9, 12];
    default:
      return density === 'shell2'
        ? [4, 10]
        : density === 'rootless3'
          ? [4, 10, 14]
          : [4, 10, 14, 21];
  }
}

/**
 * Quartal voicing: stacks of perfect fourths (5 semitones) from the 3rd or 7th.
 * For maj7/m7/7: 4-note stack from the 3rd.
 * For m7b5/dim7: 3-note stack from the 7th.
 */
function quartalIntervals(chord: ChordSymbol): readonly number[] {
  const third = chord.quality === 'major' ? 4 : 3;
  const seventh = chord.quality === 'major' ? 11 : chord.quality === 'diminished' ? 9 : 10;

  switch (chord.quality) {
    case 'major':
      return [third, third + 5, third + 10, third + 15]; // 3, 7, 9, 5 — stack from 3rd
    case 'minor':
      return [third, third + 5, third + 10, third + 15]; // b3, b7, 9, 11
    case 'dominant':
      return [third, third + 5, third + 10, third + 15]; // 3, b7, 9, sus4
    case 'halfDiminished':
      return [seventh, seventh + 5, seventh + 10]; // b7, 11, b5 — stack from 7th
    case 'diminished':
      return [seventh, seventh + 5, seventh + 10, seventh + 15]; // bb7, 11, b5, 1 — symm
    default:
      return [third, third + 5, third + 10, third + 15];
  }
}

// ─── Stack helpers ───────────────────────────────────────────────────────────

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

function permute<T>(arr: readonly T[]): T[][] {
  if (arr.length <= 1) return [[...arr]];
  return arr.flatMap((item, i) =>
    permute([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [item, ...p]),
  );
}

// ─── Default voicing ─────────────────────────────────────────────────────────

function buildDefaultVoicing(chord: ChordSymbol, density: PianoVoicingDensity): number[] {
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

  return [(4 + 1) * 12 + bassPc];
}

// ─── Candidate generation ────────────────────────────────────────────────────

function generateCandidates(chord: ChordSymbol, density: PianoVoicingDensity): number[][] {
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

// ─── Voice leading ────────────────────────────────────────────────────────────

/**
 * Weighted voice-leading distance with directional bias and soft ceiling.
 *
 * - Upward movement (candidate higher than previous) costs 1.3×.
 * - Downward movement costs 0.7×.
 * - When the previous voicing's top note is above C5 (72), upward cost rises to 2.0×.
 *
 * This creates a gentle downward "gravitational pull" that prevents the
 * endless upward drift inherent in pure minimum-distance voice leading.
 */
function weightedDistance(prev: readonly number[], candidate: readonly number[]): number {
  const UP_WEIGHT = 1.3;
  const DOWN_WEIGHT = 0.7;
  const CEIL_SOFT = 72; // C5
  const UP_WEIGHT_CEIL = 2.0;

  const prevTop = prev[prev.length - 1]!;
  const upWeight = prevTop > CEIL_SOFT ? UP_WEIGHT_CEIL : UP_WEIGHT;

  const len = Math.min(prev.length, candidate.length);
  let dist = 0;
  for (let i = 0; i < len; i++) {
    const delta = prev[i]! - candidate[i]!;
    // delta > 0: previous note was higher → candidate moved DOWN (cheaper)
    // delta < 0: previous note was lower  → candidate moved UP   (costlier)
    dist += delta > 0 ? delta * DOWN_WEIGHT : -delta * upWeight;
  }
  return dist;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Build a piano voicing for the given chord and density.
 *
 * - When `prevVoicing` is null: returns root-position voicing at lowest valid octave.
 * - When `prevVoicing` is provided: returns the candidate with minimum total
 *   voice movement; ties broken by choosing the narrower (smaller span) voicing.
 *
 * Supports quartal voicings in addition to standard rootless voicings.
 */
export function buildPianoVoicing(
  chord: ChordSymbol,
  density: PianoVoicingDensity,
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
  let bestScore = weightedDistance(prevMidi, best);
  let bestSpan = best[best.length - 1]! - best[0]!;

  for (const c of candidates.slice(1)) {
    const score = weightedDistance(prevMidi, c);
    const span = c[c.length - 1]! - c[0]!;
    if (score < bestScore || (score === bestScore && span < bestSpan)) {
      best = c;
      bestScore = score;
      bestSpan = span;
    }
  }

  // Hard emergency brake: if voicing is pushed against the ceiling, reset to default
  const HARD_CEIL = RANGE_MAX - 4; // 80
  if (best[best.length - 1]! > HARD_CEIL) {
    return buildDefaultVoicing(chord, density).map(midiToNote);
  }

  return best.map(midiToNote);
}
