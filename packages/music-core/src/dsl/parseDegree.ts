import type { ParseError, ParseResult } from '@jazz/shared';
import { parseChord } from '../chords/parseChord.js';

/**
 * One harmonic-degree token of the degree DSL: a scale degree (semitones above
 * the key tonic) plus a quality suffix. Key-independent — the generator spells
 * it into a concrete chord per key (`spellPitchClass(keyPc + degree) + quality`).
 */
export interface DegreeStep {
  /** original text as typed, e.g. "IIm7", "bII", "V7/V" */
  symbol: string;
  /** 0–11 semitones from the major-key tonic */
  degree: number;
  /** chord quality suffix, e.g. "m7", "maj7", "7", "m7b5", "6" ('' = bare triad) */
  quality: string;
}

/** Roman numeral → diatonic major-key degree (semitones), longest-first for matching. */
const ROMAN_DEGREES: ReadonlyArray<readonly [string, number]> = [
  ['VII', 11],
  ['VI', 9],
  ['IV', 5],
  ['V', 7],
  ['III', 4],
  ['II', 2],
  ['I', 0],
];

interface BaseStep {
  degree: number;
  quality: string;
}

/**
 * Parse a single degree token without secondary-dominant slash: optional
 * accidental prefix (`b`/`♭` = −1, `#`/`♯` = +1), Roman numeral (case-insensitive),
 * then a quality suffix validated against {@link parseChord}.
 * Errors carry a position relative to `raw`.
 */
function parseBase(raw: string, errors: ParseError[]): BaseStep | null {
  if (raw === '') {
    errors.push({ message: 'Пустая ступень', position: 0, token: raw });
    return null;
  }

  // 1. accidental prefix
  let i = 0;
  let shift = 0;
  const first = raw[0];
  if (first === 'b' || first === '♭') {
    shift = -1;
    i = 1;
  } else if (first === '#' || first === '♯') {
    shift = 1;
    i = 1;
  }

  // 2. Roman numeral (case-insensitive)
  const rest = raw.slice(i);
  const upper = rest.toUpperCase();
  const match = ROMAN_DEGREES.find(([r]) => upper.startsWith(r));
  if (!match) {
    errors.push({
      message: `Неверная ступень "${raw}" — ожидается римская цифра I–VII`,
      position: 0,
      token: raw,
    });
    return null;
  }
  const [roman, base] = match;

  // 3. quality suffix (original case preserved — "m7" ≠ "M7")
  const quality = rest.slice(roman.length);
  if (quality !== '') {
    const probe = parseChord(`C${quality}`);
    if (!probe.ok) {
      errors.push({
        message: `Неизвестное качество аккорда "${quality}"`,
        position: i + roman.length,
        token: quality,
      });
      return null;
    }
  }

  const degree = (((base + shift) % 12) + 12) % 12;
  return { degree, quality };
}

/**
 * Parse a single degree token into a {@link DegreeStep}.
 *
 * Supports diatonic and chromatic degrees (`I`, `IIm7`, `bII`, `#IVm7b5`) and
 * secondary dominants via slash (`V7/V`, `ii/IV`): the right side's degree
 * re-roots the left side — `degree = (degreeLeft + degreeRight) % 12`, quality
 * is taken from the left side. One level of nesting.
 */
export function parseDegree(text: string): ParseResult<DegreeStep> {
  const symbol = text.trim();
  const errors: ParseError[] = [];

  const slashIdx = symbol.indexOf('/');
  if (slashIdx >= 0) {
    const leftRaw = symbol.slice(0, slashIdx);
    const rightRaw = symbol.slice(slashIdx + 1);
    const left = parseBase(leftRaw, errors);
    const rightErrors: ParseError[] = [];
    const right = parseBase(rightRaw, rightErrors);
    for (const e of rightErrors) {
      errors.push({ ...e, position: slashIdx + 1 + e.position });
    }
    if (!left || !right) {
      return { ok: false, errors };
    }
    const degree = (left.degree + right.degree) % 12;
    return { ok: true, value: { symbol, degree, quality: left.quality }, errors };
  }

  const base = parseBase(symbol, errors);
  if (!base) {
    return { ok: false, errors };
  }
  return { ok: true, value: { symbol, degree: base.degree, quality: base.quality }, errors };
}
