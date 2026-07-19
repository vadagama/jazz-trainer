import { SCALE_INTERVALS, type ScaleType } from './modes.js';
import { keyToPitchClass, spellPitchClass } from '../generator/transpose.js';
import { parseChord } from './parseChord.js';
import type { Key } from '@jazz/shared';

/** Тип опевания. 'all' означает случайный выбор на каждый такт. */
export type EnclosureType =
  | 'diatonic-upper'
  | 'diatonic-lower'
  | 'chromatic-upper'
  | 'chromatic-lower'
  | 'full-diatonic'
  | 'full-chromatic'
  | 'diatonic-upper-chromatic-lower'
  | 'four-note-top-down'
  | 'four-note-bottom-up'
  | 'all';

/** Конкретный тип опевания (без 'all'). */
export type ConcreteEnclosureType = Exclude<EnclosureType, 'all'>;

/** Целевая ступень для опевания (1–11). */
export type TargetDegree = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

/** Роль ноты в обороте. */
export type EnclosureNoteRole = 'approach' | 'target';

/** Одна нота оборота. */
export interface EnclosureNote {
  /** Имя ноты для отображения (например "Eb"). */
  name: string;
  /** Pitch class 0–11. */
  pc: number;
  /** Роль ноты в обороте. */
  role: EnclosureNoteRole;
}

/** Генератор случайных чисел. */
export type Rng = () => number;

export const CONCRETE_TYPES: ConcreteEnclosureType[] = [
  'diatonic-upper',
  'diatonic-lower',
  'chromatic-upper',
  'chromatic-lower',
  'full-diatonic',
  'full-chromatic',
  'diatonic-upper-chromatic-lower',
  'four-note-top-down',
  'four-note-bottom-up',
];

/** Выбрать случайный ConcreteEnclosureType. */
export function randomEnclosureType(rng: Rng): ConcreteEnclosureType {
  const idx = Math.floor(rng() * CONCRETE_TYPES.length);
  return CONCRETE_TYPES[idx] ?? 'full-chromatic';
}

/** Pitch classes лада от заданной тоники. */
export function scalePitchClasses(tonicPc: number, scaleType: ScaleType): number[] {
  return SCALE_INTERVALS[scaleType].map((interval) => (tonicPc + interval) % 12);
}

function normalizePc(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

/**
 * Найти ближайшую диатоническую ступень выше целевой.
 * Если target входит в лад — берём следующую ступень сверху.
 */
function diatonicUpper(targetPc: number, scalePcs: readonly number[]): number {
  const normalized = normalizePc(targetPc);
  const above = scalePcs
    .map(normalizePc)
    .filter((pc) => pc > normalized)
    .sort((a, b) => a - b);
  if (above.length > 0) return above[0]!;
  return Math.min(...scalePcs.map(normalizePc));
}

/**
 * Найти ближайшую диатоническую ступень ниже целевой.
 * Если target входит в лад — берём следующую ступень снизу.
 */
function diatonicLower(targetPc: number, scalePcs: readonly number[]): number {
  const normalized = normalizePc(targetPc);
  const below = scalePcs
    .map(normalizePc)
    .filter((pc) => pc < normalized)
    .sort((a, b) => b - a);
  if (below.length > 0) return below[0]!;
  return Math.max(...scalePcs.map(normalizePc));
}

/** Разобрать имя ноты на букву и альтерацию. */
function parseNoteName(name: string): { letter: string; accidental: string } {
  const letter = name[0] ?? 'C';
  const accidental = name.slice(1);
  return { letter, accidental };
}

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
const NATURAL_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/** Имя хроматического соседа с разумной записью. */
function chromaticNeighborName(targetName: string, direction: 'upper' | 'lower'): string {
  const { letter, accidental } = parseNoteName(targetName);
  const idx = LETTERS.indexOf(letter as (typeof LETTERS)[number]);
  const targetPc = keyToPitchClass(targetName);
  const neighborPc = normalizePc(direction === 'upper' ? targetPc + 1 : targetPc - 1);

  let neighborLetter: string;
  if (direction === 'upper') {
    if (accidental.startsWith('b')) {
      neighborLetter = letter; // Gb -> G, Bbb -> Bb
    } else if (letter === 'B' || letter === 'E') {
      neighborLetter = LETTERS[(idx + 1) % 7]!;
    } else {
      neighborLetter = accidental ? LETTERS[(idx + 1) % 7]! : letter;
    }
  } else {
    if (accidental.startsWith('#')) {
      neighborLetter = letter; // F# -> F, C## -> C#
    } else if (letter === 'C' || letter === 'F') {
      neighborLetter = LETTERS[(idx - 1 + 7) % 7]!;
    } else {
      neighborLetter = accidental ? LETTERS[(idx - 1 + 7) % 7]! : letter;
    }
  }

  let diff = (neighborPc - NATURAL_PC[neighborLetter]! + 12) % 12;
  if (diff > 6) diff -= 12;
  const acc = diff === 0 ? '' : diff > 0 ? '#'.repeat(diff) : 'b'.repeat(-diff);
  return neighborLetter + acc;
}

function targetNote(targetPc: number, key: Key): EnclosureNote {
  return { name: spellPitchClass(normalizePc(targetPc), key), pc: normalizePc(targetPc), role: 'target' };
}

/** Запись хроматической ноты бемольным написанием (C# → Db и т.д.). */
function flatName(pc: number): string {
  return FLAT_NAMES[normalizePc(pc)]!;
}

function namedNote(name: string, pc: number): EnclosureNote {
  return { name, pc: normalizePc(pc), role: 'approach' };
}

/**
 * Построить оборот вокруг целевой pitch class.
 *
 * @param targetPc — pitch class целевой ноты.
 * @param type — тип опевания.
 * @param key — тональность для выбора бемольной/диезной записи.
 * @param scaleType — лад для расчёта диатонических соседей.
 */
export function resolveEnclosure(
  targetPc: number,
  type: ConcreteEnclosureType,
  key: Key,
  scaleType: ScaleType = 'major',
): EnclosureNote[] {
  const target = normalizePc(targetPc);
  const scalePcs = scalePitchClasses(keyToPitchClass(key), scaleType);
  const targetName = spellPitchClass(target, key);

  switch (type) {
    case 'diatonic-upper':
      return [namedNote(spellPitchClass(diatonicUpper(target, scalePcs), key), diatonicUpper(target, scalePcs)), targetNote(target, key)];
    case 'diatonic-lower':
      return [namedNote(spellPitchClass(diatonicLower(target, scalePcs), key), diatonicLower(target, scalePcs)), targetNote(target, key)];
    case 'chromatic-upper': {
      const name = chromaticNeighborName(targetName, 'upper');
      return [namedNote(name, target + 1), targetNote(target, key)];
    }
    case 'chromatic-lower': {
      const name = chromaticNeighborName(targetName, 'lower');
      return [namedNote(name, target - 1), targetNote(target, key)];
    }
    case 'full-diatonic':
      return [
        namedNote(spellPitchClass(diatonicUpper(target, scalePcs), key), diatonicUpper(target, scalePcs)),
        namedNote(spellPitchClass(diatonicLower(target, scalePcs), key), diatonicLower(target, scalePcs)),
        targetNote(target, key),
      ];
    case 'full-chromatic': {
      const upperName = chromaticNeighborName(targetName, 'upper');
      const lowerName = chromaticNeighborName(targetName, 'lower');
      return [namedNote(upperName, target + 1), namedNote(lowerName, target - 1), targetNote(target, key)];
    }
    case 'diatonic-upper-chromatic-lower':
      return [
        namedNote(spellPitchClass(diatonicUpper(target, scalePcs), key), diatonicUpper(target, scalePcs)),
        namedNote(chromaticNeighborName(targetName, 'lower'), target - 1),
        targetNote(target, key),
      ];
    case 'four-note-bottom-up': {
      const upper = diatonicUpper(target, scalePcs);
      const upperInterval = (upper - target + 12) % 12;
      if (upperInterval === 1) {
        return [
          namedNote(spellPitchClass(upper, key), upper),
          namedNote(spellPitchClass(diatonicLower(target, scalePcs), key), diatonicLower(target, scalePcs)),
          namedNote(flatName(target - 1), target - 1),
          targetNote(target, key),
        ];
      }
      return [
        namedNote(spellPitchClass(upper, key), upper),
        namedNote(flatName(target + 1), target + 1),
        namedNote(flatName(target - 1), target - 1),
        targetNote(target, key),
      ];
    }
    case 'four-note-top-down': {
      const lower = diatonicLower(target, scalePcs);
      const upper = diatonicUpper(target, scalePcs);
      const lowerInterval = (target - lower + 12) % 12;
      const upInterval = (upper - target + 12) % 12;
      if (lowerInterval === 1) {
        return [
          namedNote(spellPitchClass(lower, key), lower),
          namedNote(spellPitchClass(upper, key), upper),
          namedNote(flatName(target + 1), target + 1),
          targetNote(target, key),
        ];
      }
      if (upInterval === 1) {
        return [
          namedNote(spellPitchClass(lower, key), lower),
          namedNote(flatName(target - 1), target - 1),
          namedNote(spellPitchClass(upper, key), upper),
          targetNote(target, key),
        ];
      }
      return [
        namedNote(spellPitchClass(lower, key), lower),
        namedNote(flatName(target - 1), target - 1),
        namedNote(flatName(target + 1), target + 1),
        targetNote(target, key),
      ];
    }
  }
}

/**
 * Вычислить pitch class заданной ступени относительно аккорда.
 *
 * - 1, 3, 5, 7 учитывают качество аккорда.
 * - 2, 4, 6, 8, 9, 10, 11 берутся из выбранного лада (или мажора по умолчанию).
 *
 * @param scaleType — лад, в котором считать ступени (например, 'dorian' для ii7).
 */
export function resolveChordTonePitchClass(
  symbol: string,
  degree: TargetDegree,
  scaleType: ScaleType = 'major',
): number {
  const parsed = parseChord(symbol);
  if (!parsed.ok || !parsed.value) {
    throw new Error(`Invalid chord symbol: ${symbol}`);
  }

  const root = keyToPitchClass(parsed.value.root + parsed.value.rootAccidental);
  const quality = parsed.value.quality;
  const extensions = parsed.value.extensions;
  const alterations = parsed.value.alterations;
  const has7 = extensions.includes('7');
  const has6 = extensions.includes('6');

  // Для ступеней 2,4,6,8,9,10,11 используем лад, заданный контекстом.
  const scalePcs = scalePitchClasses(root, scaleType);
  const scaleOffset = (idx: number) => normalizePc(scalePcs[idx]! - root);

  const offsets: Record<TargetDegree, number> = {
    1: 0,
    2: scaleOffset(1),
    3:
      quality === 'minor' || quality === 'diminished' || quality === 'halfDiminished'
        ? 3
        : 4,
    4: scaleOffset(3),
    5:
      quality === 'diminished' || quality === 'halfDiminished'
        ? 6
        : quality === 'augmented'
          ? 8
          : 7,
    6: scaleOffset(5),
    7: has6
      ? 9
      : quality === 'major' && has7
        ? 11
        : quality === 'diminished' && has7
          ? 9
          : 10,
    8: scaleOffset(0),
    9: alterations.includes('b9') ? 1 : alterations.includes('#9') ? 3 : scaleOffset(1),
    10: scaleOffset(2),
    11: alterations.includes('#11') ? 6 : scaleOffset(3),
  };

  return normalizePc(root + offsets[degree]);
}
