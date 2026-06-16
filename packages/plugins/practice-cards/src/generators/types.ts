import type { Key, TimeSignatureString } from '@jazz/shared';
import type { ScaleType } from '@jazz/music-core';

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

export type ExerciseConfig = ChordExerciseConfig | ScaleExerciseConfig;

// ---------------------------------------------------------------------------
// Такт практики
// ---------------------------------------------------------------------------

export interface PracticeBar {
  index: number;
  chords: string[];
  scaleLabel?: string;
  direction?: 'up' | 'down';
}

// ---------------------------------------------------------------------------
// Сессия упражнения
// ---------------------------------------------------------------------------

export interface ExerciseSession {
  type: 'chords' | 'scales';
  bars: PracticeBar[];
  config: ExerciseConfig;
}
