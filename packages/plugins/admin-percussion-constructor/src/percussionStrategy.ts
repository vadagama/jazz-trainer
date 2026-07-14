/**
 * Стратегия конструктора перкуссии (unpitched family).
 *
 * Связывает generic-базу @jazz/plugin-admin-constructor-shared с перкуссионными
 * реестрами music-core: step-grid редактор молекул, 16 звуков, 3 стиля.
 */
import type {
  ConstructorStrategy,
  CellValidationError,
} from '@jazz/plugin-admin-constructor-shared';
import {
  cloneCell,
  cloneMolecule,
  cloneOrganism,
  BAR_TICKS,
} from '@jazz/plugin-admin-constructor-shared';
import {
  PERCUSSION_MOLECULE_LIST,
  PERCUSSION_CELL_LIST,
  PERCUSSION_ORGANISM_LIST,
  PERCUSSION_MOLECULES,
  resolvePatternSectionCells,
  assemblePatternBar,
  type PercussionAtom,
  type PercussionCell,
  type PercussionHit,
  type PercussionMolecule,
  type PercussionOrganism,
  type PercussionPatternStyle,
  type PercussionSound,
  type PatternOrganismSection,
} from '@jazz/music-core';
import { SECTION_TYPE_LABELS, type SectionType } from '@jazz/shared';
import { PercussionMoleculeTable } from './PercussionMoleculeTable.js';

// ─── Звуковые метки и порядок ─────────────────────────────────────────────────

const SOUND_LABELS: Record<PercussionSound, string> = {
  timbales: 'Timbales',
  cowbell: 'Cowbell',
  clave: 'Clave',
  congaHigh: 'Conga High',
  congaLow: 'Conga Low',
  bongoHigh: 'Bongo High',
  bongoLow: 'Bongo Low',
  tumba: 'Tumba',
  shaker: 'Shaker',
  cabasa: 'Cabasa',
  guiro: 'Guiro',
  tambourine: 'Tambourine',
  triangle: 'Triangle',
  vibraslap: 'Vibraslap',
  belltree: 'Belltree',
  whistle: 'Whistle',
  sleighBells: 'Sleigh Bells',
};

export const DEFAULT_PERCUSSION_VELOCITY = 0.6;
const DEFAULT_PERCUSSION_DURATION = 120; // PPQ

export function soundLabel(sound: string): string {
  return (SOUND_LABELS as Record<string, string>)[sound] ?? sound;
}

/** Порядок строк сверху вниз: timbales → cowbell → clave → конги → бонго → тумба → шейкеры → эффекты. */
function soundOrder(sound: string): number {
  switch (sound) {
    case 'timbales':
      return 0;
    case 'cowbell':
      return 1;
    case 'clave':
      return 2;
    case 'congaHigh':
      return 3;
    case 'congaLow':
      return 4;
    case 'bongoHigh':
      return 5;
    case 'bongoLow':
      return 6;
    case 'tumba':
      return 7;
    case 'shaker':
      return 8;
    case 'cabasa':
      return 9;
    case 'guiro':
      return 10;
    case 'tambourine':
      return 11;
    case 'triangle':
      return 12;
    case 'vibraslap':
      return 13;
    case 'belltree':
      return 14;
    case 'whistle':
      return 15;
    case 'sleighBells':
      return 16;
    default:
      return 17;
  }
}

/** Строки таблицы для конкретной молекулы: по фактически используемым звукам. */
export interface SoundRow {
  sound: PercussionSound;
  label: string;
}

export function moleculeRows(sounds: Iterable<PercussionSound>): SoundRow[] {
  const uniq = Array.from(new Set(sounds));
  return uniq
    .map((sound) => ({ sound, label: soundLabel(sound) }))
    .sort((a, b) => soundOrder(a.sound) - soundOrder(b.sound));
}

export function makeAtom(sound: PercussionSound, atTick: number): PercussionAtom {
  return {
    sound,
    atTick,
    velocity: DEFAULT_PERCUSSION_VELOCITY,
    durationTicks: DEFAULT_PERCUSSION_DURATION,
  };
}

// ─── Data loaders ────────────────────────────────────────────────────────────

function loadMolecules(): Record<string, PercussionMolecule> {
  const m: Record<string, PercussionMolecule> = {};
  for (const mol of PERCUSSION_MOLECULE_LIST) m[mol.id] = cloneMolecule(mol);
  return m;
}

function loadCells(): Record<string, PercussionCell> {
  const c: Record<string, PercussionCell> = {};
  for (const cell of PERCUSSION_CELL_LIST) c[cell.id] = cloneCell(cell);
  return c;
}

function loadOrganisms(): Record<string, PercussionOrganism> {
  const o: Record<string, PercussionOrganism> = {};
  for (const org of PERCUSSION_ORGANISM_LIST) o[org.id] = cloneOrganism(org);
  return o;
}

// ─── Assembly: организм → плоский PercussionHit[] ─────────────────────────────

function assembleOrganism(
  organism: PercussionOrganism,
  cells: Record<string, PercussionCell>,
  mols: Record<string, PercussionMolecule>,
  swing: number,
): { hits: PercussionHit[]; totalBars: number } {
  const hits: PercussionHit[] = [];
  let barOffset = 0;

  const sections: PatternOrganismSection[] =
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

    for (let r = 0; r < repeats; r++) {
      const cellId = poolIds[r % poolIds.length]!;
      const cell = cells[cellId];
      if (!cell) continue;

      for (let bar = 0; bar < cell.length; bar++) {
        const barHits = assemblePatternBar(
          cell,
          bar,
          swing,
          (id) => mols[id] ?? (PERCUSSION_MOLECULES[id] as PercussionMolecule | undefined),
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

export function createPercussionStrategy(): ConstructorStrategy<
  PercussionPatternStyle,
  PercussionSound
> {
  return {
    family: 'unpitched',
    title: 'Конструктор перкуссии',
    description:
      'Изучение молекул и клеток, сборка и прослушивание паттернов. Правки сохраняются в localStorage и публикуются в код (dev-режим).',
    storageKey: 'jazz-constructor-percussion',
    saveEndpoint: '/api/dev/percussion-source',
    styles: [
      { value: 'latin', label: 'Latin' },
      { value: 'bossa', label: 'Bossa' },
      { value: 'funk', label: 'Funk' },
    ],

    loadMolecules,
    loadCells,
    loadOrganisms,

    soundLabel,
    makeAtom,
    defaultVelocity: DEFAULT_PERCUSSION_VELOCITY,

    resolveMolecule: (id, overrides) =>
      overrides[id] ?? (PERCUSSION_MOLECULES[id] as PercussionMolecule | undefined),
    moleculeLabel: (id) => id,
    assembleOrganism,

    MoleculeEditor: PercussionMoleculeTable,
  };
}
