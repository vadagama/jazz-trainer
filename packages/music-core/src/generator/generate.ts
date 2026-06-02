import type { GenerateInput, GridContent, PatternInfo } from '@jazz/shared';
import { parseChord } from '../chords/parseChord.js';
import { keyToPitchClass, spellPitchClass } from './transpose.js';
import { PATTERNS, PATTERNS_BY_ID, type PatternStep } from './patterns.js';

/** Deterministic 32-bit PRNG (mulberry32) — same seed yields the same sequence. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable fallback seed from pattern + key when the caller does not provide one. */
function fallbackSeed(input: GenerateInput): number {
  const str = `${input.patternId}:${input.key}`;
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Repeat/truncate a fixed step sequence to exactly `bars` chords. */
function tile(steps: PatternStep[], bars: number): PatternStep[] {
  if (steps.length === 0) return [];
  return Array.from({ length: bars }, (_, i) => steps[i % steps.length]!);
}

/**
 * Generate a {@link GridContent} from a built-in pattern, transposed to `key`.
 * Output is one chord per bar; the result validates against `GridContentSchema`.
 */
export function generate(input: GenerateInput): GridContent {
  const def = PATTERNS_BY_ID.get(input.patternId);
  if (!def) {
    throw new Error(`Unknown pattern: "${input.patternId}"`);
  }

  const keyPc = keyToPitchClass(input.key);
  const bars = input.lengthBars ?? def.defaultBars;

  const steps = def.build
    ? def.build({ bars, random: mulberry32(input.options?.seed ?? fallbackSeed(input)) })
    : tile(def.steps ?? [], bars);

  const gridBars = steps.map((step, i) => {
    const pc = (keyPc + step.degree) % 12;
    const symbol = spellPitchClass(pc, input.key) + step.quality;
    const parsed = parseChord(symbol).value ?? null;
    return { id: `b${i + 1}`, chords: [{ symbol, parsed }] };
  });

  return { version: 1, bars: gridBars };
}

/** List the built-in patterns for the catalog (`GET /api/patterns`). */
export function listPatterns(): PatternInfo[] {
  return PATTERNS.map(({ id, name, description, defaultBars, variableLength }) => ({
    id,
    name,
    description,
    defaultBars,
    variableLength,
  }));
}
