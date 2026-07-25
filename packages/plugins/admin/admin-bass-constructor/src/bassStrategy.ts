/**
 * Стратегия конструктора баса (pitched family).
 *
 * Связывает generic-базу с басовыми реестрами music-core. Бас имеет ДВА
 * варианта (upright / electric), поэтому реестры molecules/cells/organisms
 * загружаются merged — из обоих вариантов одновременно — чтобы редактор
 * показывал весь контент. Assembly использует generic assemblePatternBar
 * (как и piano/drum стратегии), никаких бас-специфичных шагов сборки нет.
 */
import type { ConstructorStrategy } from '@jazz/plugin-admin-constructor-shared';
import {
  cloneCell,
  cloneMolecule,
  cloneOrganism,
  BAR_TICKS,
} from '@jazz/plugin-admin-constructor-shared';
import {
  UPRIGHT_BASS_MOLECULES,
  ELECTRIC_BASS_MOLECULES,
  UPRIGHT_BASS_MOLECULE_LIST,
  ELECTRIC_BASS_MOLECULE_LIST,
  UPRIGHT_BASS_CELLS,
  ELECTRIC_BASS_CELLS,
  UPRIGHT_BASS_ORGANISMS,
  ELECTRIC_BASS_ORGANISMS,
  resolvePatternSectionCells,
  assemblePatternBar,
  type BassArticulation,
  type BassAtom,
  type BassCell,
  type BassHit,
  type BassMolecule,
  type BassOrganism,
  type BassPatternStyle,
  type OrganismSection,
} from '@jazz/music-core';
import { SECTION_TYPE_LABELS, type SectionType } from '@jazz/shared';
import { BassMoleculeTable } from './BassMoleculeTable.js';
import { BassVariantSelector } from './BassVariantSelector.js';
import { articulationLabel } from './bassSampler.js';

// ─── Звуковые метки и фабрика атомов (bass-специфичные) ──────────────────────

export const DEFAULT_BASS_VELOCITY = 0.8;
const DEFAULT_BASS_DURATION = 480; // PPQ

/** `sound` is a {@link BassArticulation} (вид звукоизвлечения). */
export function soundLabel(sound: string): string {
  return articulationLabel(sound);
}

export function makeAtom(artic: string, atTick: number): BassAtom {
  return {
    sound: artic as BassAtom['sound'],
    atTick,
    velocity: DEFAULT_BASS_VELOCITY,
    durationTicks: DEFAULT_BASS_DURATION,
  };
}

// ─── Data loaders (merged upright + electric) ────────────────────────────────

function loadMolecules(): Record<string, BassMolecule> {
  const m: Record<string, BassMolecule> = {};
  for (const mol of [...UPRIGHT_BASS_MOLECULE_LIST, ...ELECTRIC_BASS_MOLECULE_LIST]) {
    m[mol.id] = cloneMolecule(mol);
  }
  return m;
}

function loadCells(): Record<string, BassCell> {
  const c: Record<string, BassCell> = {};
  for (const cell of [...Object.values(UPRIGHT_BASS_CELLS), ...Object.values(ELECTRIC_BASS_CELLS)]) {
    c[cell.id] = cloneCell(cell);
  }
  return c;
}

function loadOrganisms(): Record<string, BassOrganism> {
  const o: Record<string, BassOrganism> = {};
  for (const org of [
    ...Object.values(UPRIGHT_BASS_ORGANISMS),
    ...Object.values(ELECTRIC_BASS_ORGANISMS),
  ]) {
    o[org.id] = cloneOrganism(org);
  }
  return o;
}

// ─── Merged lookup maps (для resolveMolecule/moleculeLabel) ──────────────────

const ALL_MOLECULES: Record<string, BassMolecule> = {
  ...UPRIGHT_BASS_MOLECULES,
  ...ELECTRIC_BASS_MOLECULES,
};

// ─── Assembly: организм → плоский BassHit[] (generic engine) ─────────────────

function assembleOrganism(
  organism: BassOrganism,
  cells: Record<string, BassCell>,
  mols: Record<string, BassMolecule>,
  swing: number,
): { hits: BassHit[]; totalBars: number } {
  const hits: BassHit[] = [];
  let barOffset = 0;

  const sections: OrganismSection[] =
    organism.defaultForm && organism.defaultForm.length > 0
      ? organism.defaultForm
      : Object.entries(organism.sectionMap).map(([type, pool]) => ({
          label: SECTION_TYPE_LABELS[type as SectionType] ?? type,
          type: type as SectionType,
          cellPool: pool,
        }));

  for (const section of sections) {
    const repeats = section.repeats ?? 1;
    const resolved = resolvePatternSectionCells(organism, section.type, '4/4');
    const poolIds = resolved.length > 0 ? resolved : section.cellPool;
    if (poolIds.length === 0) continue;

    // Каждый повтор берёт следующую клетку из пула (та же формула, что и в
    // реальном движке), а не всегда первую: иначе ×N врёт про идентичное
    // дублирование, когда пул циклится.
    for (let r = 0; r < repeats; r++) {
      const cellId = poolIds[r % poolIds.length]!;
      const cell = cells[cellId];
      if (!cell) continue;

      for (let bar = 0; bar < cell.length; bar++) {
        const barHits = assemblePatternBar(
          cell,
          bar,
          swing,
          (id) => mols[id] ?? (ALL_MOLECULES[id] as BassMolecule | undefined),
        );
        for (const h of barHits) {
          hits.push({ ...h, atTick: h.atTick + (barOffset + bar) * BAR_TICKS });
        }
      }
      barOffset += cell.length;
    }
  }

  return { hits, totalBars: barOffset };
}

// ─── Стратегия ───────────────────────────────────────────────────────────────

export function createBassStrategy(): ConstructorStrategy<BassPatternStyle, BassArticulation> {
  return {
    family: 'pitched',
    title: 'Конструктор баса',
    description:
      'Изучение молекул и клеток баса. Молекулы хранят только артикуляцию (вид звукоизвлечения: regular/muted/rel/stac) — ступени (root/fifth/third…) движок выбирает сам по стилю и tension. Сетка — 32-е ноты, как у барабанов. Правки сохраняются в localStorage и публикуются в код (dev-режим).',
    storageKey: 'jazz-constructor-bass',
    saveEndpoint: '/api/dev/bass-source',

    loadMolecules,
    loadCells,
    loadOrganisms,

    soundLabel,
    makeAtom,
    defaultVelocity: DEFAULT_BASS_VELOCITY,

    resolveMolecule: (id, overrides) =>
      overrides[id] ?? (ALL_MOLECULES[id] as BassMolecule | undefined),
    moleculeLabel: (id, overrides) => {
      const m = overrides[id];
      return m ? m.label : id;
    },
    assembleOrganism,
    validateCell: undefined,

    MoleculeEditor: BassMoleculeTable,
    ToolbarExtras: BassVariantSelector,
  };
}
