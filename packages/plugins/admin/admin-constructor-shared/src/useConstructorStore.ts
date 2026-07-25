/**
 * Autosave-store конструктора: zustand + persist в localStorage.
 *
 * Модель:
 * - Все правки (CRUD) немедленно пишутся в localStorage через persist-middleware.
 * - `publishedSnapshot` хранит снимок данных на момент последней публикации в код.
 * - `isDirty` = текущие данные ≠ опубликованный снимок.
 * - `markPublished()` делает снимок текущего состояния после успешной записи в код.
 * - `resetToBase()` перечитывает базовые данные из реестров и очищает черновик.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Cell, Molecule, PatternOrganism } from '@jazz/music-core';
import type { ConstructorStrategy } from './types.js';
import { cloneCell, cloneMolecule, cloneOrganism } from './clone.js';

interface ConstructorSnapshot<TStyle extends string, TSound extends string> {
  molecules: Record<string, Molecule<TStyle, TSound>>;
  cells: Record<string, Cell<TStyle>>;
  organisms: Record<string, PatternOrganism<TStyle>>;
}

interface ConstructorState<
  TStyle extends string,
  TSound extends string,
> extends ConstructorSnapshot<TStyle, TSound> {
  /** Снимок на момент последней публикации (null = ещё не публиковали). */
  publishedSnapshot: ConstructorSnapshot<TStyle, TSound> | null;
  lastPublishedAt: number | null;
  /** Флаг: store загружен из persist (или инициализирован базой). */
  hydrated: boolean;

  // molecule actions
  updateMolecule: (id: string, mol: Molecule<TStyle, TSound>) => void;
  deleteMolecule: (id: string) => void;
  createMolecule: (mol: Molecule<TStyle, TSound>) => void;

  // cell actions
  updateCell: (id: string, cell: Cell<TStyle>) => void;
  deleteCell: (id: string) => void;
  createCell: (cell: Cell<TStyle>) => void;

  // organism actions
  updateOrganism: (id: string, org: PatternOrganism<TStyle>) => void;
  deleteOrganism: (id: string) => void;
  createOrganism: (org: PatternOrganism<TStyle>) => void;

  // lifecycle
  markPublished: () => void;
  resetToBase: (strategy: ConstructorStrategy<TStyle, TSound>) => void;
}

/**
 * Создаёт store для конкретного инструмента.
 * Вызывается в плагине-обёртке один раз; key уникален per-instrument.
 */
export function createConstructorStore<TStyle extends string, TSound extends string>(
  storageKey: string,
  strategy: ConstructorStrategy<TStyle, TSound>,
) {
  const baseData: ConstructorSnapshot<TStyle, TSound> = {
    molecules: strategy.loadMolecules(),
    cells: strategy.loadCells(),
    organisms: strategy.loadOrganisms(),
  };

  return create<ConstructorState<TStyle, TSound>>()(
    persist(
      (set, get) => ({
        ...baseData,
        publishedSnapshot: null,
        lastPublishedAt: null,
        hydrated: false,

        updateMolecule: (id, mol) => set((s) => ({ molecules: { ...s.molecules, [id]: mol } })),
        deleteMolecule: (id) =>
          set((s) => {
            const next = { ...s.molecules };
            delete next[id];
            return { molecules: next };
          }),
        createMolecule: (mol) => set((s) => ({ molecules: { ...s.molecules, [mol.id]: mol } })),

        updateCell: (id, cell) => set((s) => ({ cells: { ...s.cells, [id]: cell } })),
        deleteCell: (id) =>
          set((s) => {
            const next = { ...s.cells };
            delete next[id];
            return { cells: next };
          }),
        createCell: (cell) => set((s) => ({ cells: { ...s.cells, [cell.id]: cell } })),

        updateOrganism: (id, org) => set((s) => ({ organisms: { ...s.organisms, [id]: org } })),
        deleteOrganism: (id) =>
          set((s) => {
            const next = { ...s.organisms };
            delete next[id];
            return { organisms: next };
          }),
        createOrganism: (org) => set((s) => ({ organisms: { ...s.organisms, [org.id]: org } })),

        markPublished: () =>
          set(() => {
            const { molecules, cells, organisms } = get();
            return {
              publishedSnapshot: {
                molecules: deepCloneAll(molecules, cells, organisms).molecules,
                cells: deepCloneAll(molecules, cells, organisms).cells,
                organisms: deepCloneAll(molecules, cells, organisms).organisms,
              },
              lastPublishedAt: Date.now(),
            };
          }),

        resetToBase: (strat) =>
          set(() => ({
            molecules: strat.loadMolecules(),
            cells: strat.loadCells(),
            organisms: strat.loadOrganisms(),
            publishedSnapshot: null,
            lastPublishedAt: null,
          })),
      }),
      {
        name: storageKey,
        // Бампать при любом breaking-изменении формата Molecule/Cell/Organism
        // (например: смена модели atom.sound, добавление/удаление VoiceRole).
        // Иначе черновик из localStorage, сохранённый под старую схему,
        // молча не пройдёт валидацию на публикации (400) и может давать
        // задвоенные id при рендере.
        version: 2,
        migrate: (persisted, version) => {
          if (version < 2) {
            // Несовместимая схема — не пытаемся мигрировать поле-в-поле,
            // просто перечитываем актуальные базовые данные (как «Сбросить»).
            return baseData as unknown as ConstructorState<TStyle, TSound>;
          }
          return persisted as ConstructorState<TStyle, TSound>;
        },
        // Сохраняем только данные, не actions и не служебные флаги.
        partialize: (state) => ({
          molecules: state.molecules,
          cells: state.cells,
          organisms: state.organisms,
          publishedSnapshot: state.publishedSnapshot,
          lastPublishedAt: state.lastPublishedAt,
        }),
        onRehydrateStorage: () => (state) => {
          if (state) state.hydrated = true;
        },
      },
    ),
  );
}

export type { ConstructorState, ConstructorSnapshot };

// ─── helpers ──────────────────────────────────────────────────────────────────

function deepCloneAll<TStyle extends string, TSound extends string>(
  molecules: Record<string, Molecule<TStyle, TSound>>,
  cells: Record<string, Cell<TStyle>>,
  organisms: Record<string, PatternOrganism<TStyle>>,
): ConstructorSnapshot<TStyle, TSound> {
  const mols: Record<string, Molecule<TStyle, TSound>> = {};
  for (const [id, mol] of Object.entries(molecules)) mols[id] = cloneMolecule(mol);
  const cs: Record<string, Cell<TStyle>> = {};
  for (const [id, cell] of Object.entries(cells)) cs[id] = cloneCell(cell);
  const orgs: Record<string, PatternOrganism<TStyle>> = {};
  for (const [id, org] of Object.entries(organisms)) orgs[id] = cloneOrganism(org);
  return { molecules: mols, cells: cs, organisms: orgs };
}

/** Вычисляет dirty-статус: текущие данные ≠ опубликованный снимок. */
export function isStoreDirty<TStyle extends string, TSound extends string>(
  state: ConstructorState<TStyle, TSound>,
): boolean {
  if (!state.publishedSnapshot) return true; // ни разу не публиковали → есть что публиковать
  return (
    JSON.stringify(state.molecules) !== JSON.stringify(state.publishedSnapshot.molecules) ||
    JSON.stringify(state.cells) !== JSON.stringify(state.publishedSnapshot.cells) ||
    JSON.stringify(state.organisms) !== JSON.stringify(state.publishedSnapshot.organisms)
  );
}
