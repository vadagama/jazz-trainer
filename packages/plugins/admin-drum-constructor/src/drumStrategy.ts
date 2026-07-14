/**
 * Стратегия конструктора барабанов (unpitched family).
 *
 * Связывает generic-базу @jazz/plugin-admin-constructor-shared с барабанными
 * реестрами music-core: step-grid редактор молекул, абстрактные имена звуков,
 * drum-specific validateCell.
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
  DRUM_MOLECULE_LIST,
  DRUM_CELL_LIST,
  DRUM_ORGANISM_LIST,
  DRUM_MOLECULES,
  validateCell as validateDrumCell,
  resolvePatternSectionCells,
  assemblePatternBar,
  type DrumAtom,
  type DrumCell,
  type DrumHit,
  type DrumMolecule,
  type DrumOrganism,
  type DrumPatternStyle,
  type DrumSound,
  type OrganismSection,
} from '@jazz/music-core';
import { SECTION_TYPE_LABELS, type SectionType } from '@jazz/shared';
import { DrumMoleculeTable } from './DrumMoleculeTable.js';
import { DrumKitSelector } from './DrumKitSelector.js';

// ─── Звуковые метки и порядок (из бывшего localModel.ts) ─────────────────────

const SOUND_LABELS: Record<string, string> = {
  crash: 'Crash',
  crash_sizzle: 'Crash sizzle',
  splash: 'Splash',
  ride: 'Ride',
  ride_bow: 'Ride',
  ride_bell: 'Ride bell',
  hihat: 'HH',
  hihat_closed: 'HH закр.',
  hihat_open: 'HH откр.',
  hihatHalf: 'HH half',
  hihatOpen: 'HH откр.',
  hihat_foot: 'HH нога',
  hihat_stir: 'Stir',
  snare: 'Snare',
  snare_center: 'Snare',
  snare_edge: 'Snare edge',
  snare_dig: 'Snare dig',
  snare_buzz: 'Snare buzz',
  snare_flam: 'Snare flam',
  snare_rimshot: 'Rimshot',
  snare_crossstick: 'Cross-stick',
  snare_muted: 'Snare muted',
  rim: 'Rim',
  highTom: 'Том выс.',
  lowTom: 'Том низ.',
  tom_hi: 'Том выс.',
  tom_lo: 'Том низ.',
  tom_mhi: 'Том ср.-в.',
  tom_mlow: 'Том ср.-н.',
  bassDrum: 'BD',
  kick: 'BD',
};

export const DEFAULT_DRUM_VELOCITY = 0.7;
const DEFAULT_DRUM_DURATION = 480; // PPQ

export function soundLabel(sound: string): string {
  return SOUND_LABELS[sound] ?? sound;
}

/** Порядок строк сверху вниз: тарелки → райд → хэт → малый → томы → бочка. */
function soundOrder(sound: string): number {
  if (sound.startsWith('crash') || sound === 'splash') return 0;
  if (sound.startsWith('ride')) return 1;
  if (sound.startsWith('hihat')) return 2;
  if (sound.startsWith('snare') || sound === 'rim') return 3;
  if (sound.startsWith('tom') || sound === 'highTom' || sound === 'lowTom') return 4;
  if (sound === 'bassDrum' || sound === 'kick') return 5;
  return 6;
}

/** Строки таблицы для конкретной молекулы: по фактически используемым звукам. */
export interface SoundRow {
  sound: DrumSound;
  label: string;
}

export function moleculeRows(sounds: Iterable<DrumSound>): SoundRow[] {
  const uniq = Array.from(new Set(sounds));
  return uniq
    .map((sound) => ({ sound, label: soundLabel(sound) }))
    .sort((a, b) => soundOrder(a.sound) - soundOrder(b.sound));
}

export function makeAtom(sound: DrumSound, atTick: number): DrumAtom {
  return {
    sound,
    atTick,
    velocity: DEFAULT_DRUM_VELOCITY,
    durationTicks: DEFAULT_DRUM_DURATION,
  };
}

// ─── Data loaders ────────────────────────────────────────────────────────────

function loadMolecules(): Record<string, DrumMolecule> {
  const m: Record<string, DrumMolecule> = {};
  for (const mol of DRUM_MOLECULE_LIST) m[mol.id] = cloneMolecule(mol);
  return m;
}

function loadCells(): Record<string, DrumCell> {
  const c: Record<string, DrumCell> = {};
  for (const cell of DRUM_CELL_LIST) c[cell.id] = cloneCell(cell);
  return c;
}

function loadOrganisms(): Record<string, DrumOrganism> {
  const o: Record<string, DrumOrganism> = {};
  for (const org of DRUM_ORGANISM_LIST) o[org.id] = cloneOrganism(org);
  return o;
}

// ─── Assembly: организм → плоский DrumHit[] ──────────────────────────────────

function assembleOrganism(
  organism: DrumOrganism,
  cells: Record<string, DrumCell>,
  mols: Record<string, DrumMolecule>,
  swing: number,
): { hits: DrumHit[]; totalBars: number } {
  const hits: DrumHit[] = [];
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
    // реальном движке — selectCellForSectionType), а не всегда первую.
    for (let r = 0; r < repeats; r++) {
      const cellId = poolIds[r % poolIds.length]!;
      const cell = cells[cellId];
      if (!cell) continue;

      for (let bar = 0; bar < cell.length; bar++) {
        const barHits = assemblePatternBar(
          cell,
          bar,
          swing,
          (id) => mols[id] ?? (DRUM_MOLECULES[id] as DrumMolecule | undefined),
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

export function createDrumStrategy(): ConstructorStrategy<DrumPatternStyle, DrumSound> {
  return {
    family: 'unpitched',
    title: 'Конструктор барабанов',
    description:
      'Изучение молекул и клеток, сборка и прослушивание паттернов. Правки сохраняются в localStorage и публикуются в код (dev-режим).',
    storageKey: 'jazz-constructor-drums',
    saveEndpoint: '/api/dev/drum-source',

    loadMolecules,
    loadCells,
    loadOrganisms,

    soundLabel,
    makeAtom,
    defaultVelocity: DEFAULT_DRUM_VELOCITY,

    resolveMolecule: (id, overrides) =>
      overrides[id] ?? (DRUM_MOLECULES[id] as DrumMolecule | undefined),
    moleculeLabel: (id, overrides) => {
      const m = overrides[id];
      if (m) return m.label;
      if (id.startsWith('accent-')) return soundLabel(id.replace('accent-', ''));
      return id;
    },
    assembleOrganism,
    validateCell: (cell) => validateDrumCell(cell) as CellValidationError[],

    MoleculeEditor: DrumMoleculeTable,
    ToolbarExtras: DrumKitSelector,
  };
}
