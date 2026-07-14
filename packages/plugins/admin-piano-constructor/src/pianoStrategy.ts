/**
 * Стратегия конструктора фортепиано (pitched family).
 *
 * Связывает generic-базу с фортепианными реестрами music-core:
 * piano-roll редактор молекул, MIDI-note звуки, sampler-based preview.
 *
 * Assembly использует generic assemblePatternBar (добавляет swing к piano,
 * прежде делалось ручным обходом lanes без swing).
 */
import type { ConstructorStrategy } from '@jazz/plugin-admin-constructor-shared';
import {
  cloneCell,
  cloneMolecule,
  cloneOrganism,
  BAR_TICKS,
} from '@jazz/plugin-admin-constructor-shared';
import {
  PIANO_MOLECULE_LIST,
  PIANO_CELL_LIST,
  PIANO_ORGANISM_LIST,
  PIANO_MOLECULES,
  resolvePatternSectionCells,
  assemblePatternBar,
  type PianoAtom,
  type PianoCell,
  type PianoHit,
  type PianoMolecule,
  type PianoOrganism,
  type PianoPatternStyle,
  type OrganismSection,
  type VoiceRole,
} from '@jazz/music-core';
import { SECTION_TYPE_LABELS, type SectionType } from '@jazz/shared';
import { PianoMoleculeTable } from './PianoMoleculeTable.js';
import { PianoVariantSelector } from './PianoVariantSelector.js';
import { roleLabel } from './pianoSampler.js';

// ─── Звуковые метки и фабрика атомов (piano-специфичные) ──────────────────────

export const DEFAULT_PIANO_VELOCITY = 0.55;
const DEFAULT_PIANO_DURATION = 480; // PPQ

/** `sound` is a {@link VoiceRole} — see docs/PIANO-EXTENDED-ARRANGEMENT-2.md. */
export function soundLabel(sound: string): string {
  return roleLabel(sound);
}

export function makeAtom(role: string, atTick: number): PianoAtom {
  return {
    sound: role as PianoAtom['sound'],
    atTick,
    velocity: DEFAULT_PIANO_VELOCITY,
    durationTicks: DEFAULT_PIANO_DURATION,
  };
}

// ─── Data loaders ────────────────────────────────────────────────────────────

function loadMolecules(): Record<string, PianoMolecule> {
  const m: Record<string, PianoMolecule> = {};
  for (const mol of PIANO_MOLECULE_LIST) m[mol.id] = cloneMolecule(mol);
  return m;
}

function loadCells(): Record<string, PianoCell> {
  const c: Record<string, PianoCell> = {};
  for (const cell of PIANO_CELL_LIST) c[cell.id] = cloneCell(cell);
  return c;
}

function loadOrganisms(): Record<string, PianoOrganism> {
  const o: Record<string, PianoOrganism> = {};
  for (const org of PIANO_ORGANISM_LIST) o[org.id] = cloneOrganism(org);
  return o;
}

// ─── Assembly: организм → плоский PianoHit[] (generic engine) ────────────────

function assembleOrganism(
  organism: PianoOrganism,
  cells: Record<string, PianoCell>,
  mols: Record<string, PianoMolecule>,
  swing: number,
): { hits: PianoHit[]; totalBars: number } {
  const hits: PianoHit[] = [];
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
    // реальном движке — selectCellForSectionType), а не всегда первую: иначе
    // ×N в конструкторе врёт про идентичное дублирование, когда пул на самом
    // деле циклится.
    for (let r = 0; r < repeats; r++) {
      const cellId = poolIds[r % poolIds.length]!;
      const cell = cells[cellId];
      if (!cell) continue;

      for (let bar = 0; bar < cell.length; bar++) {
        const barHits = assemblePatternBar(
          cell,
          bar,
          swing,
          (id) => mols[id] ?? (PIANO_MOLECULES[id] as PianoMolecule | undefined),
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

export function createPianoStrategy(): ConstructorStrategy<PianoPatternStyle, VoiceRole> {
  return {
    family: 'pitched',
    title: 'Конструктор фортепиано',
    description:
      'Изучение молекул и клеток фортепиано, сборка и прослушивание паттернов. Правки сохраняются в localStorage и публикуются в код (dev-режим).',
    storageKey: 'jazz-constructor-piano',
    saveEndpoint: '/api/dev/piano-source',

    loadMolecules,
    loadCells,
    loadOrganisms,

    soundLabel,
    makeAtom,
    defaultVelocity: DEFAULT_PIANO_VELOCITY,

    resolveMolecule: (id, overrides) =>
      overrides[id] ?? (PIANO_MOLECULES[id] as PianoMolecule | undefined),
    moleculeLabel: (id, overrides) => {
      const m = overrides[id];
      return m ? m.label : id;
    },
    assembleOrganism,
    validateCell: undefined,

    MoleculeEditor: PianoMoleculeTable,
    ToolbarExtras: PianoVariantSelector,
  };
}
