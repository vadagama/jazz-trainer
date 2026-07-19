import { type ScaleType } from './modes.js';
import { keyToPitchClass, spellPitchClass } from '../generator/transpose.js';
import { scalePitchClasses } from './enclosures.js';
import type { Key } from '@jazz/shared';

/** Тип паттерна секвенции. 'all' означает случайный выбор на каждый такт. */
export type SequenceType =
  | '1235'
  | '1234'
  | '1357'
  | '1531'
  | 'pentatonic'
  | '5321'
  | '8765'
  | '1324'
  | '1345'
  | '1356'
  | '1231'
  | '3212'
  | '3579'
  | 'all';

/** Конкретный тип паттерна (без 'all'). */
export type ConcreteSequenceType = Exclude<SequenceType, 'all'>;

/** Роль ноты в паттерне. */
export type SequenceNoteRole = 'pattern' | 'root';

/** Одна нота паттерна. */
export interface SequenceNote {
  /** Имя ноты для отображения (например "Eb"). */
  name: string;
  /** Pitch class 0–11. */
  pc: number;
  /** Роль: 'root' — стартовая ступень, 'pattern' — нота паттерна. */
  role: SequenceNoteRole;
}

/** Генератор случайных чисел. */
export type Rng = () => number;

/**
 * Индексы ступеней лада (0-based) для каждого паттерна.
 * Используются для извлечения pitch class из SCALE_INTERVALS.
 */
export const SEQUENCE_PATTERNS: Record<ConcreteSequenceType, readonly number[]> = {
  // Восходящие
  '1235': [0, 1, 2, 4],
  '1234': [0, 1, 2, 3],
  '1357': [0, 2, 4, 6],
  '1531': [0, 4, 2, 0],
  pentatonic: [0, 1, 2, 4, 5],
  // Нисходящие
  '5321': [4, 2, 1, 0],
  '8765': [7, 6, 5, 4],
  // Терцовые и skip-step
  '1324': [0, 2, 1, 3],
  '1345': [0, 2, 3, 4],
  '1356': [0, 2, 4, 5],
  // Повороты и расширенные арпеджио
  '1231': [0, 1, 2, 0],
  '3212': [2, 1, 0, 1],
  '3579': [2, 4, 6, 8],
};

/** Стартовая ступень лада (1–7). */
export type SequenceStartDegree = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const CONCRETE_SEQUENCE_TYPES: ConcreteSequenceType[] = [
  '1235',
  '1234',
  '1357',
  '1531',
  'pentatonic',
  '5321',
  '8765',
  '1324',
  '1345',
  '1356',
  '1231',
  '3212',
  '3579',
];

/** Выбрать случайный ConcreteSequenceType. */
export function randomSequenceType(rng: Rng): ConcreteSequenceType {
  const idx = Math.floor(rng() * CONCRETE_SEQUENCE_TYPES.length);
  return CONCRETE_SEQUENCE_TYPES[idx] ?? '1235';
}

function normalizePc(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

/**
 * Найти индекс стартовой pitch class в ладу.
 * Если стартовая pc не входит в лад — fallback на ближайшую диатоническую снизу.
 */
function findStartIndex(startPc: number, scalePcs: readonly number[]): number {
  const normalized = normalizePc(startPc);
  const exact = scalePcs.findIndex((pc) => normalizePc(pc) === normalized);
  if (exact >= 0) return exact;

  // Fallback: ближайшая диатоническая снизу (по круговому расстоянию вверх).
  const distances = scalePcs.map((pc, idx) => ({
    idx,
    distance: normalizePc(normalized - pc),
  }));
  distances.sort((a, b) => a.distance - b.distance);
  return distances[0]?.idx ?? 0;
}

/**
 * Построить ноты паттерна от стартовой pitch class.
 *
 * @param startPc — pitch class стартовой ступени.
 * @param type — конкретный тип паттерна.
 * @param key — тональность для выбора диезной/бемольной записи.
 * @param scaleType — лад для расчёта диатонических ступеней.
 * @param tonicPc — pitch class тоники лада (по умолчанию выводится из key). Нужен
 *   для over-chords режима, где стартовая pc принадлежит не тонике, а аккорду.
 * @returns массив SequenceNote: первая по SEQUENCE_PATTERNS — 'root', остальные 'pattern'.
 */
export function resolveSequencePattern(
  startPc: number,
  type: ConcreteSequenceType,
  key: Key,
  scaleType: ScaleType = 'major',
  tonicPc?: number,
): SequenceNote[] {
  const tonic = tonicPc ?? keyToPitchClass(key);
  const scalePcs = scalePitchClasses(tonic, scaleType);
  const startIdx = findStartIndex(startPc, scalePcs);
  const indices = SEQUENCE_PATTERNS[type];

  return indices.map((offset, i) => {
    const absoluteIdx = startIdx + offset;
    const wrapsOctave = absoluteIdx >= scalePcs.length;
    const targetIdx = wrapsOctave ? absoluteIdx % scalePcs.length : absoluteIdx;
    const octaveShift = Math.floor(absoluteIdx / scalePcs.length) * 12;
    const pc = normalizePc(scalePcs[targetIdx]! + octaveShift);
    const name = spellPitchClass(pc, key);
    const role: SequenceNoteRole = i === 0 ? 'root' : 'pattern';
    return { name, pc, role };
  });
}

/**
 * Построить один цикл секвенции: для каждой стартовой ступени — свой паттерн.
 *
 * @param tonicPc — pitch class тоники лада.
 * @param type — конкретный тип паттерна.
 * @param key — тональность для записи нот.
 * @param scaleType — лад.
 * @param startDegrees — стартовые ступени (1-7).
 * @returns массив массивов нот (по одному на стартовую ступень).
 */
export function buildSequenceCycle(
  tonicPc: number,
  type: ConcreteSequenceType,
  key: Key,
  scaleType: ScaleType,
  startDegrees: SequenceStartDegree[],
): SequenceNote[][] {
  const scalePcs = scalePitchClasses(tonicPc, scaleType);
  return startDegrees.map((degree) => {
    const degreeIdx = Math.min(Math.max(degree - 1, 0), scalePcs.length - 1);
    const startPc = normalizePc(scalePcs[degreeIdx]!);
    return resolveSequencePattern(startPc, type, key, scaleType, tonicPc);
  });
}
