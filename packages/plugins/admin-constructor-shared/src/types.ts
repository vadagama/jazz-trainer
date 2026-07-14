/**
 * Контракты единого конструктора: стратегия инструмента + пропсы generic-компонентов.
 *
 * Strategy-паттерн разделяет общую базу (страница, CellEditor, OrganismViewer, store)
 * от инструмент-специфичных аспектов (редактор молекул, звук, превью).
 */
import type { ComponentType, FC } from 'react';
import type {
  Atom,
  Cell,
  Hit,
  Molecule,
  PatternOrganism,
  PatternDynamicsType,
} from '@jazz/music-core';

// re-export aliases чтобы consumer-пакеты могли импортировать из shared
export type { Cell, Molecule, Atom, Hit, MoleculeCategory } from '@jazz/music-core';
export type { PatternOrganism } from '@jazz/music-core';

// ─── Preview ──────────────────────────────────────────────────────────────────

/** Хост-предоставляемая способность прослушивания плоских hits. Инструмент-агностична. */
export interface PreviewControls<TSound extends string = string> {
  /** `true` когда сэмплы загружены. */
  ready: boolean;
  /** Текущий проигрываемый такт цикла (0-based); -1 когда остановлено. */
  currentBar: number;
  /** Текущий tick внутри цикла для playhead-подсветки (опционально, для piano-roll). */
  currentTick?: number;
  /** Играть плоский список hits. Останавливает предыдущее воспроизведение. */
  play: (hits: Hit<TSound>[], opts: PreviewPlayOptions) => Promise<void> | void;
  /** Остановить воспроизведение. */
  stop: () => void;
}

export interface PreviewPlayOptions {
  bpm: number;
  loopBars: number;
  loop?: boolean;
  /** Active constructor style — bass preview uses it to pick a step-engine pattern. */
  style?: string;
}

// ─── Generic editor prop bundles ──────────────────────────────────────────────

export interface MoleculeEditorProps<TStyle extends string, TSound extends string = string> {
  molecule: Molecule<TStyle, TSound>;
  onChange: (next: Molecule<TStyle, TSound>) => void;
  onDelete: () => void;
  isPlaying: boolean;
  /** Tick внутри цикла для playhead; -1 когда не играет (опционально). */
  currentTick?: number;
  onPlay: (hits: Hit<TSound>[], loopBars: number) => void;
  onStop: () => void;
  /** Метка звука для UI (для drum — SOUND_LABELS, для piano — midiToName). */
  soundLabel: (sound: TSound) => string;
  /** Фабрика нового атома с дефолтной velocity/duration. */
  makeAtom: (sound: TSound, atTick: number) => Atom<TSound>;
  /** Дефолтная velocity при добавлении нового удара/ноты (для инспектора). */
  defaultVelocity: number;
}

export interface CellEditorProps<TStyle extends string, TSound extends string = string> {
  cell: Cell<TStyle>;
  onChange: (next: Cell<TStyle>) => void;
  onDelete: () => void;
  /** Молекулы текущего стиля для дропдауна пула клипов. */
  styleMolecules: Molecule<TStyle, TSound>[];
  /** Все молекулы (overrides) для резолва меток и assembly. */
  moleculeOverrides: Record<string, Molecule<TStyle, TSound>>;
  isPlaying: boolean;
  currentBar: number;
  onPlay: (hits: Hit<TSound>[], loopBars: number) => void;
  onStop: () => void;
  bpm: number;
  /** Swing-ratio стиля (0.5 = ровно). Применяется при сборке тактов. */
  swing: number;
  /** Резолв молекулы по ID — инструмент-специфичный lookup. */
  resolveMolecule: (id: string) => Molecule<TStyle, TSound> | undefined;
  /** Метка молекулы по ID для UI клипов. */
  moleculeLabel: (id: string) => string;
  /** Валидатор клетки (опционально — drum имеет validateCell, piano может не иметь). */
  validateCell?: (cell: Cell<TStyle>) => CellValidationError[];
}

export interface OrganismViewerProps<TStyle extends string, TSound extends string = string> {
  organism: PatternOrganism<TStyle>;
  onChange: (next: PatternOrganism<TStyle>) => void;
  onDelete: () => void;
  cells: Record<string, Cell<TStyle>>;
  moleculeOverrides: Record<string, Molecule<TStyle, TSound>>;
  isPlaying: boolean;
  currentBar: number;
  onPlay: (hits: Hit<TSound>[], loopBars: number) => void;
  onStop: () => void;
  bpm: number;
  swing: number;
  /** Сборка организма в плоский hit-лист — делегируется стратегией. */
  assembleOrganism: (
    organism: PatternOrganism<TStyle>,
    cells: Record<string, Cell<TStyle>>,
    mols: Record<string, Molecule<TStyle, TSound>>,
    swing: number,
  ) => { hits: Hit<TSound>[]; totalBars: number };
}

export interface CellValidationError {
  code: string;
  lane?: string;
  detail: string;
}

/** re-export DynamicsType alias (music-core экспортирует как PatternDynamicsType). */
export type DynamicsType = PatternDynamicsType;

// ─── Strategy ─────────────────────────────────────────────────────────────────

/**
 * Описание инструмента для конструктора. Тонкие плагины (drum/piano) создают
 * стратегию и передают её в `ConstructorPage`.
 */
export interface ConstructorStrategy<TStyle extends string, TSound extends string = string> {
  /** Семейство инструмента — влияет на UI-нюансы (step-grid vs piano-roll). */
  family: 'unpitched' | 'pitched';
  title: string;
  description: string;
  /** localStorage-ключ для autosave черновиков. */
  storageKey: string;
  /** Dev-API эндпоинт для публикации в код. */
  saveEndpoint: string;
  /**
   * Стили, доступные в конструкторе. Если не задано — используются все 5 стилей
   * из gridMath (swing/bossa/funk/latin/ballad). Percussion, например, задаёт
   * только latin/bossa/funk.
   */
  styles?: { value: TStyle; label: string }[];

  // ── data loaders (из реестров music-core) ──
  loadMolecules(): Record<string, Molecule<TStyle, TSound>>;
  loadCells(): Record<string, Cell<TStyle>>;
  loadOrganisms(): Record<string, PatternOrganism<TStyle>>;

  // ── sound ──
  soundLabel: (sound: TSound) => string;
  makeAtom: (sound: TSound, atTick: number) => Atom<TSound>;
  defaultVelocity: number;

  // ── assembly callbacks ──
  resolveMolecule: (id: string, overrides: Record<string, Molecule<TStyle, TSound>>) => Molecule<TStyle, TSound> | undefined;
  moleculeLabel: (id: string, overrides: Record<string, Molecule<TStyle, TSound>>) => string;
  assembleOrganism: (
    organism: PatternOrganism<TStyle>,
    cells: Record<string, Cell<TStyle>>,
    mols: Record<string, Molecule<TStyle, TSound>>,
    swing: number,
  ) => { hits: Hit<TSound>[]; totalBars: number };
  validateCell?: (cell: Cell<TStyle>) => CellValidationError[];

  // ── UI ──
  /** Редактор молекулы — step-grid для drum, piano-roll для piano. */
  MoleculeEditor: ComponentType<MoleculeEditorProps<TStyle, TSound>>;
  /** Доп. контролы тулбара (kit-selector для drum, piano-variant для piano). */
  ToolbarExtras?: FC;
}
