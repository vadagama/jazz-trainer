import type { Key, TimeSignatureString } from '@jazz/shared';
import type {
  ScaleType,
  EnclosureType,
  ConcreteEnclosureType,
  TargetDegree,
  EnclosureNote,
  SequenceType,
  ConcreteSequenceType,
  SequenceNote,
} from '@jazz/music-core';

// ---------------------------------------------------------------------------
// Источник контента для аккордовых прогрессий
// ---------------------------------------------------------------------------

export type ChordSource =
  | { type: 'pattern'; patternId: string }
  | { type: 'random'; key: Key; bars?: number }
  | { type: 'dsl'; dsl: string }
  /**
   * «Единый» — произвольный набор ступеней (IIm7, V7, Imaj7…), выбранных из
   * сгруппированного списка. Каждая ступень раскрывается в отдельный такт для
   * каждой выбранной тональности. `symbols` хранятся в порядке выбора.
   */
  | { type: 'unified'; symbols: string[] };

// ---------------------------------------------------------------------------
// Режим отображения карточек
// ---------------------------------------------------------------------------

export type CardMode = 'current' | 'prev-current' | 'prev-current-next';

// ---------------------------------------------------------------------------
// Общая конфигурация (для всех типов упражнений)
// ---------------------------------------------------------------------------

export interface BaseExerciseConfig {
  keys: Key[];
  repetitions: number;
  infinite: boolean;
  countInBars: number;
  cardMode: CardMode;
  backingBass: boolean;
  backingDrums: boolean;
  backingPiano: boolean;
  backingRhodes: boolean;
  metronomeEnabled: boolean;
  metronomeVolume: number;
  tempo: number;
  timeSignature: TimeSignatureString;
  /**
   * Ортогональный режим воспроизведения. При `true` буфер предгенерируется
   * как длинная перемешанная сетка: на каждый цикл прогрессии выбирается
   * случайная тональность из `keys`, а для unified-источника порядок ступеней
   * перемешивается. Не является source-типом.
   */
  playRandomly: boolean;
  /**
   * Сколько тактов занимает один элемент карточки (аккорд — для аккордовых
   * прогрессий, прогон гаммы — для гамм). Каждый сгенерированный такт
   * размножается `barsPerChord` раз. Общее для всех типов упражнений.
   */
  barsPerChord: number;
}

// ---------------------------------------------------------------------------
// Аккордовые прогрессии
// ---------------------------------------------------------------------------

export interface ChordExerciseConfig extends BaseExerciseConfig {
  type: 'chords';
  source: ChordSource;
}

// ---------------------------------------------------------------------------
// Гаммы
// ---------------------------------------------------------------------------

export type { ScaleType };

export type ScaleDirection = 'up' | 'down' | 'both';

export interface ScaleExerciseConfig extends BaseExerciseConfig {
  type: 'scales';
  /**
   * Источник определяет режим:
   * - `unified` — гаммы отдельно (standalone), symbols игнорируются.
   * - `pattern` — гаммы поверх паттерна.
   * - `dsl` — гаммы поверх DSL-сетки.
   * - `random` — гаммы поверх произвольной прогрессии.
   */
  source: ChordSource;
  scaleType: ScaleType;
  direction: ScaleDirection;
  octaves: 1 | 2;
}

// ---------------------------------------------------------------------------
// Опевания
// ---------------------------------------------------------------------------

export interface EnclosureExerciseConfig extends BaseExerciseConfig {
  type: 'enclosures';
  /**
   * Источник определяет режим:
   * - `unified` — опевания отдельно, на тонике выбранной тональности.
   * - `pattern` / `dsl` / `random` — опевания поверх каждого аккорда прогрессии.
   */
  source: ChordSource;
  /** Тип опевания. 'all' означает случайный выбор на каждый такт. */
  enclosureType: EnclosureType;
  /** Аккордовые ступени, которые будут опеваться. */
  targetDegrees: TargetDegree[];
  /** Лад для диатонических опеваний в standalone-режиме. */
  scaleType: ScaleType;
}

// ---------------------------------------------------------------------------
// Секвенции
// ---------------------------------------------------------------------------

export type { SequenceType };

export type SequenceDirection = 'up' | 'down' | 'both';

export interface SequenceExerciseConfig extends BaseExerciseConfig {
  type: 'sequences';
  /**
   * Источник определяет режим:
   * - `unified` — секвенции отдельно, на тонике выбранной тональности.
   * - `pattern` / `dsl` / `random` — секвенции поверх каждого аккорда прогрессии.
   */
  source: ChordSource;
  /** Тип паттерна. 'all' означает случайный выбор на каждый такт. */
  sequenceType: SequenceType;
  /** Стартовые ступени лада (1-7), с которых стартует паттерн. */
  startDegrees: TargetDegree[];
  /** Лад для расчёта диатонических ступеней. */
  scaleType: ScaleType;
  /** Направление обхода стартовых ступеней. */
  direction: SequenceDirection;
}

export type ExerciseConfig =
  | ChordExerciseConfig
  | ScaleExerciseConfig
  | EnclosureExerciseConfig
  | SequenceExerciseConfig;

// ---------------------------------------------------------------------------
// Такт практики
// ---------------------------------------------------------------------------

export interface PracticeBar {
  index: number;
  chords: string[];
  scaleLabel?: string;
  direction?: 'up' | 'down';
  /** Данные опевания (если упражнение типа 'enclosures'). */
  enclosure?: {
    type: ConcreteEnclosureType;
    targetDegree: TargetDegree;
    notes: EnclosureNote[];
  };
  /** Данные секвенции (если упражнение типа 'sequences'). */
  sequence?: {
    type: ConcreteSequenceType;
    startDegree: number;
    notes: SequenceNote[];
    direction: 'up' | 'down';
  };
}

// ---------------------------------------------------------------------------
// Сессия упражнения
// ---------------------------------------------------------------------------

export interface ExerciseSession {
  type: 'chords' | 'scales' | 'enclosures' | 'sequences';
  bars: PracticeBar[];
  config: ExerciseConfig;
}
