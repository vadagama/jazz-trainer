/**
 * Rhodes constructor strategy (pitched family).
 *
 * Binds the generic constructor base to the Rhodes pattern-engine registries
 * in music-core. Mirrors pianoStrategy, but uses RhodesVoicingRole (VoiceRole
 * + arp1..arp4) as the atom sound and resolves via buildVoicing +
 * selectRhodesVoicingRole.
 *
 * See docs/MELODIC-PLUGIN.md §11 and docs/RHODES.md.
 */
import type { ConstructorStrategy } from '@jazz/plugin-admin-constructor-shared';
import {
  cloneCell,
  cloneMolecule,
  cloneOrganism,
  BAR_TICKS,
} from '@jazz/plugin-admin-constructor-shared';
import {
  RHODES_MOLECULE_LIST,
  RHODES_CELL_LIST,
  RHODES_ORGANISM_LIST,
  RHODES_MOLECULES,
  resolvePatternSectionCells,
  assemblePatternBar,
  type RhodesAtom,
  type RhodesCell,
  type RhodesHit,
  type RhodesMolecule,
  type RhodesOrganism,
  type RhodesPatternStyle,
  type RhodesVoicingRole,
  type OrganismSection,
} from '@jazz/music-core';
import { SECTION_TYPE_LABELS, type SectionType } from '@jazz/shared';
import { RhodesMoleculeTable } from './RhodesMoleculeTable.js';
import { roleLabel } from './rhodesSampler.js';

// ─── Sound labels + atom factory (Rhodes-specific) ──────────────────────────

export const DEFAULT_RHODES_VELOCITY = 0.38;
const DEFAULT_RHODES_DURATION = 480; // PPQ

/** `sound` is a {@link RhodesVoicingRole} — resolved at playback from the chord. */
export function soundLabel(sound: string): string {
  return roleLabel(sound);
}

export function makeAtom(role: string, atTick: number): RhodesAtom {
  return {
    sound: role as RhodesAtom['sound'],
    atTick,
    velocity: DEFAULT_RHODES_VELOCITY,
    durationTicks: DEFAULT_RHODES_DURATION,
  };
}

// ─── Data loaders ────────────────────────────────────────────────────────────

function loadMolecules(): Record<string, RhodesMolecule> {
  const m: Record<string, RhodesMolecule> = {};
  for (const mol of RHODES_MOLECULE_LIST) m[mol.id] = cloneMolecule(mol);
  return m;
}

function loadCells(): Record<string, RhodesCell> {
  const c: Record<string, RhodesCell> = {};
  for (const cell of RHODES_CELL_LIST) c[cell.id] = cloneCell(cell);
  return c;
}

function loadOrganisms(): Record<string, RhodesOrganism> {
  const o: Record<string, RhodesOrganism> = {};
  for (const org of RHODES_ORGANISM_LIST) o[org.id] = cloneOrganism(org);
  return o;
}

// ─── Assembly: organism → flat RhodesHit[] (generic engine) ──────────────────

function assembleOrganism(
  organism: RhodesOrganism,
  cells: Record<string, RhodesCell>,
  mols: Record<string, RhodesMolecule>,
  swing: number,
): { hits: RhodesHit[]; totalBars: number } {
  const hits: RhodesHit[] = [];
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

    for (let r = 0; r < repeats; r++) {
      const cellId = poolIds[r % poolIds.length]!;
      const cell = cells[cellId];
      if (!cell) continue;

      for (let bar = 0; bar < cell.length; bar++) {
        const barHits = assemblePatternBar(
          cell,
          bar,
          swing,
          (id) => mols[id] ?? (RHODES_MOLECULES[id] as RhodesMolecule | undefined),
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

// ─── Strategy ───────────────────────────────────────────────────────────────

export function createRhodesStrategy(): ConstructorStrategy<RhodesPatternStyle, RhodesVoicingRole> {
  return {
    family: 'pitched',
    title: 'Конструктор Rhodes',
    description:
      'Изучение молекул и клеток Rhodes (pads, арпеджио, вставки), сборка и прослушивание паттернов. Правки сохраняются в localStorage и публикуются в код (dev-режим).',
    storageKey: 'jazz-constructor-rhodes',
    saveEndpoint: '/api/dev/rhodes-source',

    loadMolecules,
    loadCells,
    loadOrganisms,

    soundLabel,
    makeAtom,
    defaultVelocity: DEFAULT_RHODES_VELOCITY,

    resolveMolecule: (id, overrides) =>
      overrides[id] ?? (RHODES_MOLECULES[id] as RhodesMolecule | undefined),
    moleculeLabel: (id, overrides) => {
      const m = overrides[id];
      return m ? m.label : id;
    },
    assembleOrganism,
    validateCell: undefined,

    MoleculeEditor: RhodesMoleculeTable,
  };
}
