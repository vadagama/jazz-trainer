import type { ChordSymbol } from '@jazz/shared';
import { suggestUpperStructure, type TensionLevel } from './pianoUpperStructures.js';

export type PianoVoicingDensity = 'shell2' | 'rootless3' | 'rootless4' | 'quartal';
export type { TensionLevel } from './pianoUpperStructures.js';

/**
 * Voice role — which part of the current voicing a molecule atom should play.
 * Molecules describe rhythm + role; {@link buildPianoVoicing} + {@link selectVoicingRole}
 * resolve the actual pitches from the real chord + density + tension, so a
 * single rhythmic molecule works over any chord quality without baking in
 * intervals (see docs/PIANO-EXTENDED-ARRANGEMENT-2.md).
 */
export type VoiceRole = 'chord' | 'shell' | 'top' | 'bass' | 'upper';

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
 * Quartal voicing: stacks of perfect fourths (5 semitones) with idiomatic
 * starting points per chord quality (after McCoy Tyner / Herbie Hancock).
 *
 *  - maj7:   4-note stack from 3rd  → 3 13 9 5  (bright, open)
 *  - m7:     4-note stack from 5th  → 5 1 11 b7 (m11 — warm, consonant)
 *  - 7:      4-note stack from 3rd  → 3 13 9 5  (same as maj7; the 5 on top
 *             avoids the 11th/min9th clash with the 3rd)
 *  - m7b5:   3-note stack from b7   → b7 b3 b13 (sparse, rootless-compatible)
 *  - dim7:   4-note stack from bb7  → bb7 11 b5 1 (symmetrical — every note
 *             is a dim7 chord tone)
 *
 *  All stacks produce a contiguous run of perfect 4ths (5-semitone steps).
 */
function quartalIntervals(chord: ChordSymbol): readonly number[] {
  const third = chord.quality === 'major' ? 4 : 3;
  const seventh = chord.quality === 'major' ? 11 : chord.quality === 'diminished' ? 9 : 10;

  switch (chord.quality) {
    case 'major':
      return [third, third + 5, third + 10, third + 15]; // 3, 13, 9, 5
    case 'minor':
      return [7, 12, 17, 22]; // 5, 1(8ve), 11, b7 — m11, stack from 5th
    case 'dominant':
      return [third, third + 5, third + 10, third + 15]; // 3, 13, 9, 5
    case 'halfDiminished':
      return [seventh, seventh + 5, seventh + 10]; // b7, b3, b13
    case 'diminished':
      return [seventh, seventh + 5, seventh + 10, seventh + 15]; // bb7, 11, b5, 1
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

// ─── Interval → MIDI mapping ────────────────────────────────────────────────

/** Semitone offsets for diatonic degrees (from root). */
const DIATONIC_SEMITONES: Record<number, number> = {
  1: 0,
  2: 2,
  3: 4,
  4: 5,
  5: 7,
  6: 9,
  7: 11,
  8: 12,
  9: 14,
  10: 16,
  11: 17,
  12: 19,
  13: 21,
};

/**
 * Convert an interval string (relative to chord root) to a MIDI note number.
 *
 * Examples:
 * - `'3'`  → 4 semitones above root (major 3rd)
 * - `'b7'` → 10 semitones above root (minor 7th)
 * - `'#11'`→ 18 semitones above root (sharp 11th)
 */
export function intervalToMidi(root: string, interval: string): number {
  const rootMidi = noteToMidi(root);
  const m = /^([b#]?)(\d+)$/.exec(interval);
  if (!m) throw new Error(`Invalid interval: ${interval}`);
  const accidental = m[1] === 'b' ? -1 : m[1] === '#' ? 1 : 0;
  const degree = parseInt(m[2]!, 10);

  const base = DIATONIC_SEMITONES[degree] ?? (degree - 1) * 2;
  return rootMidi + base + accidental;
}

/**
 * Convenience wrapper: resolve an interval string to a MIDI note for a given
 * chord root.
 */
export function resolveInterval(sound: string, chordRoot: string): number {
  return intervalToMidi(chordRoot, sound);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Core density-based voicing selection, in MIDI space (bass→top ascending). */
function buildBaseVoicingMidi(
  chord: ChordSymbol,
  density: PianoVoicingDensity,
  prevVoicing: readonly string[] | null,
): number[] {
  if (!prevVoicing) {
    return buildDefaultVoicing(chord, density);
  }

  const candidates = generateCandidates(chord, density);
  if (candidates.length === 0) {
    return buildDefaultVoicing(chord, density);
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
    return buildDefaultVoicing(chord, density);
  }

  return best;
}

/** Pitch class (0-11) of an interval string relative to a root pitch class. */
function upperIntervalPc(rootPc: number, interval: string): number {
  const m = /^([b#]?)(\d+)$/.exec(interval);
  if (!m) throw new Error(`Invalid interval: ${interval}`);
  const accidental = m[1] === 'b' ? -1 : m[1] === '#' ? 1 : 0;
  const degree = parseInt(m[2]!, 10);
  const base = DIATONIC_SEMITONES[degree] ?? (degree - 1) * 2;
  return (((rootPc + base + accidental) % 12) + 12) % 12;
}

/**
 * Stack an upper-structure triad above the base voicing's top note.
 * Degrades gracefully to the base voicing alone if there's no room within
 * the comping register (mirrors the HARD_CEIL brake above).
 */
function mergeUpperStructure(
  baseMidi: readonly number[],
  rootPc: number,
  intervals: readonly string[],
): number[] {
  const pcs = intervals.map((iv) => upperIntervalPc(rootPc, iv));
  const top = baseMidi[baseMidi.length - 1]!;
  const upper = stackAbove(top, pcs);
  if (!upper) return [...baseMidi];

  const merged = [...baseMidi, ...upper];
  if (merged[merged.length - 1]! > RANGE_MAX) return [...baseMidi];
  return merged;
}

/** Harmonic-function hint derived from the chord itself (no song-position analysis needed yet). */
function harmonicFunctionHint(chord: ChordSymbol): string | undefined {
  return chord.quality === 'dominant' ? 'dominant' : undefined;
}

/**
 * Build a piano voicing for the given chord, density and tension level.
 *
 * - When `prevVoicing` is null: returns root-position voicing at lowest valid octave.
 * - When `prevVoicing` is provided: returns the candidate with minimum total
 *   voice movement; ties broken by choosing the narrower (smaller span) voicing.
 * - When `tension` is above `'clean'`, an upper-structure triad may be stacked
 *   on top of the base voicing (see {@link suggestUpperStructure}), gated by
 *   probability and chord quality — deterministic via `seed`.
 *
 * Supports quartal voicings in addition to standard rootless voicings.
 */
export function buildPianoVoicing(
  chord: ChordSymbol,
  density: PianoVoicingDensity,
  prevVoicing: readonly string[] | null,
  tension: TensionLevel = 'clean',
  seed = 0,
): string[] {
  const baseMidi = buildBaseVoicingMidi(chord, density, prevVoicing);
  if (tension === 'clean') return baseMidi.map(midiToNote);

  const us = suggestUpperStructure(chord, harmonicFunctionHint(chord), tension, seed);
  if (!us) return baseMidi.map(midiToNote);

  const merged = mergeUpperStructure(baseMidi, chordRootPc(chord), us.intervals);
  return merged.map(midiToNote);
}

/**
 * Resolve which notes of a fully-built voicing a molecule atom's {@link VoiceRole} should play.
 *
 * The voicing is always bass→top ascending (guaranteed by {@link buildPianoVoicing}), so
 * roles are resolved positionally: 'shell' = the two lowest (guide-tone) voices, 'upper'
 * = everything above them (the color tones — upper-structure notes when tension is engaged,
 * or just the density's own extensions otherwise), 'bass'/'top' = the extremes.
 */
export function selectVoicingRole(voicing: readonly string[], role: VoiceRole): string[] {
  if (voicing.length === 0) return [];
  switch (role) {
    case 'bass':
      return [voicing[0]!];
    case 'top':
      return [voicing[voicing.length - 1]!];
    case 'shell':
      return voicing.slice(0, Math.min(2, voicing.length));
    case 'upper':
      return voicing.length > 2 ? voicing.slice(2) : voicing.slice(0, Math.min(2, voicing.length));
    case 'chord':
    default:
      return [...voicing];
  }
}
