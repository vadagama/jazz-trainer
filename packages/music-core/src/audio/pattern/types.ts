/**
 * Generic pattern-engine types — instrument-agnostic model for the
 * atom → molecule → cell → organism authoring hierarchy.
 *
 * Drum/percussion-specific type aliases live in `drum/types.ts`.
 * Future instruments (e.g. percussion) reuse this core model directly.
 */
import type { SectionType } from '@jazz/shared';

// ─── Atom (Level 0) ───────────────────────────────────────────────────────────

/** A single strike/event: a sound + tick offset + velocity + duration. */
export interface Atom<TSound extends string = string> {
  sound: TSound;
  /** Tick offset from start of the molecule (straight, not swing-adjusted). */
  atTick: number;
  velocity: number;
  durationTicks: number;
}

// ─── Hit (output of assembleBar) ──────────────────────────────────────────────

/** A resolved, bar-relative hit produced by the engine and handed to the
 *  scheduler. Same shape as {@link Atom} but semantically "output". */
export interface Hit<TSound extends string = string> {
  sound: TSound;
  /** Tick offset from bar start. */
  atTick: number;
  velocity: number;
  durationTicks: number;
}

// ─── Molecule (Level 1) ───────────────────────────────────────────────────────

export type MoleculeCategory =
  | 'groove'
  | 'fill'
  | 'texture'
  | 'accent'
  | 'intro'
  | 'ending'
  | 'upper';

export interface MoleculeConditions {
  requireRide?: boolean;
  requireHihat?: boolean;
  requireSnare?: boolean;
  requireCrash?: boolean;
  requireToms?: boolean;
  requireStir?: boolean;
  barModulo?: number;
  barRange?: { first?: number; last?: number };
}

export interface Molecule<TStyle extends string = string, TSound extends string = string> {
  id: string;
  label: string;
  style: TStyle;
  bars: 1 | 2;
  atoms: Atom<TSound>[];
  category: MoleculeCategory;
  tags: string[];
  complexity: { min: 1 | 2 | 3; max: 1 | 2 | 3 };
  conditions?: MoleculeConditions;
}

// ─── Dynamics ─────────────────────────────────────────────────────────────────

export type DynamicsType =
  | 'steady'
  | 'crescendo'
  | 'decrescendo'
  | 'arch'
  | 'valley'
  | 'wave'
  | 'pulse';

export interface Dynamics {
  /** Тип кривой velocity внутри клетки. */
  type: DynamicsType;
  /** Глубина изменения velocity, 0..1. */
  amount: number;
}

// ─── Clip + Lane (Level 2 building blocks) ────────────────────────────────────

/**
 * Клип — молекулярный пул, размещённый на диапазоне тактов лейна.
 * Движок циклически перебирает молекулы из `pool` потактово внутри спана.
 */
export interface Clip {
  /** 0-based, 0 ≤ startBar < cell.length */
  startBar: number;
  /** ≥ 1, startBar + lengthBars ≤ cell.length */
  lengthBars: number;
  /** ≥ 1 элемент */
  pool: string[];
}

/**
 * Лейн — роль (ride/hihat/kick/snare/fill/accent/…) с собственной вероятностью
 * звучать в такте («иногда»). Клипы лейна не пересекаются по тактам.
 */
export interface Lane {
  name: string;
  /** 0..1 — шанс, что лейн звучит в данном такте. */
  probability: number;
  clips: Clip[];
}

// ─── Cell (Level 2) ───────────────────────────────────────────────────────────

/**
 * Клетка — таймлайн длиной 8/16/32 такта из лейнов с клипами.
 * Молекулы размещаются явно по тактам (спаны). Пустой такт лейна = тишина.
 */
export interface Cell<TStyle extends string = string> {
  id: string;
  style: TStyle;
  length: 4 | 8 | 12 | 16 | 32;
  timeSignature: [4, 4] | [3, 4] | [5, 4];

  /** Мастер musical velocity 0..1 — масштабирует velocity молекул. */
  velocity: number;
  /** Динамическая кривая velocity внутри клетки. */
  dynamics: Dynamics;

  /** Лейны (1..15). */
  lanes: Lane[];
}

// ─── Organism (Level 3) — section-driven form ─────────────────────────────────

export interface OrganismSection {
  label: string;
  type: SectionType;
  /** Пул ID клеток, из которых выбирается (с весами). */
  cellPool: string[];
  /** Количество повторений клетки (по умолчанию 1). */
  repeats?: number;
  /** Внутренний счётчик повторений (не конфигурация). */
  repeatsCompleted?: number;
}

/**
 * Section-driven organism: section-type → cell-pool map, enabling
 * grid-section-driven scheduling.
 *
 * - `sectionMap[verseA]` → cell pool for verseA sections.
 * - `timeSignatureOverrides['3/4'][verseA]` → alternative pool when the
 *   section has a 3/4 time signature (takes priority over `sectionMap`).
 * - `defaultForm` — fallback linear sequence when no grid sections available.
 */
export interface Organism<TStyle extends string = string> {
  id: string;
  style: TStyle;
  label: string;

  /** Section type → ordered list of cell IDs (cycling pool). */
  sectionMap: Partial<Record<SectionType, string[]>>;

  /** Per-time-signature overrides: '3/4' → { verseA: ['waltz-12-verse'] }. */
  timeSignatureOverrides?: Record<string, Partial<Record<SectionType, string[]>>>;

  /** Flat form fallback — used when grid sections are unavailable. */
  defaultForm?: OrganismSection[];
}
