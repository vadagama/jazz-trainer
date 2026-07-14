/**
 * RhodesPatternEngine — Rhodes-bound wrapper over the generic pattern engine.
 *
 * Binds RHODES_CELLS / RHODES_MOLECULES / RHODES_ORGANISMS registries into the
 * generic engine functions so RhodesInstrument can self-manage organism-driven
 * scheduling. Stateless: no fields, no constructor args.
 *
 * Mirrors PianoPatternEngine; see docs/MELODIC-PLUGIN.md §11.
 */
import type {
  RhodesPatternStyle,
  RhodesMolecule,
  RhodesCell,
  RhodesOrganism,
  RhodesHit,
} from './rhodesPatternTypes.js';
import { RHODES_MOLECULES } from './rhodesMolecules.js';
import { RHODES_CELLS, getRhodesCellsForStyle } from './rhodesCells.js';
import { getRhodesOrganismsForStyle } from './rhodesOrganisms.js';
import {
  assembleBar as assembleBarGeneric,
  resolveSectionCells as resolveSectionCellsGeneric,
} from './pattern/engine.js';

export class RhodesPatternEngine {
  // ── Organism selection ────────────────────────────────────────────────────

  selectOrganism(style: RhodesPatternStyle): RhodesOrganism {
    const organisms = getRhodesOrganismsForStyle(style);
    if (organisms.length === 0) {
      const cells = getRhodesCellsForStyle(style);
      if (cells.length === 0) throw new Error(`No cells found for style: ${style}`);
      return {
        id: `${style}-flat-fallback`,
        style,
        label: `${style} Flat Fallback`,
        sectionMap: { verseA: [cells[0]!.id] },
        defaultForm: [{ label: 'A', type: 'verseA', cellPool: [cells[0]!.id], repeats: 1 }],
      };
    }
    return organisms[0]!;
  }

  getOrganisms(style: RhodesPatternStyle): RhodesOrganism[] {
    return getRhodesOrganismsForStyle(style);
  }

  resolveOrganism(id: string): RhodesOrganism | undefined {
    for (const style of ['swing', 'bossa', 'funk', 'latin', 'ballad'] as RhodesPatternStyle[]) {
      for (const org of getRhodesOrganismsForStyle(style)) {
        if (org.id === id) return org;
      }
    }
    return undefined;
  }

  // ── Section-driven cell resolution ────────────────────────────────────────

  resolveSectionCells(
    organism: RhodesOrganism,
    sectionType: string,
    timeSignatureStr: string,
  ): string[] {
    return resolveSectionCellsGeneric(organism, sectionType, timeSignatureStr);
  }

  selectCellForSectionType(
    organism: RhodesOrganism,
    sectionType: string,
    timeSignatureStr: string,
    barInSection: number,
    style: RhodesPatternStyle,
    passIndex = 0,
  ): { cell: RhodesCell; barInCell: number } {
    const pool = this.resolveSectionCells(organism, sectionType, timeSignatureStr);

    const cells = pool
      .map((id) => RHODES_CELLS[id])
      .filter((c): c is RhodesCell => !!c && c.style === style);

    if (cells.length === 0) {
      const allCells = getRhodesCellsForStyle(style);
      const fallback = allCells[0];
      if (!fallback) throw new Error(`No cells found for style: ${style}`);
      return { cell: fallback, barInCell: barInSection % fallback.length };
    }

    const cell = cells[0]!;
    const cellIndex = (passIndex + Math.floor(barInSection / cell.length)) % pool.length;
    const selectedId = pool[cellIndex]!;
    const selected = RHODES_CELLS[selectedId];
    if (!selected || selected.style !== style) {
      return { cell, barInCell: barInSection % cell.length };
    }

    return { cell: selected, barInCell: barInSection % selected.length };
  }

  // ── Bar assembly ──────────────────────────────────────────────────────────

  resolveBar(cellId: string, barInCell: number, swingRatio: number, seed?: number): RhodesHit[] {
    const cell = RHODES_CELLS[cellId];
    if (!cell) return [];
    return assembleBarGeneric(
      cell,
      barInCell,
      swingRatio,
      (id: string) => RHODES_MOLECULES[id],
      seed,
    );
  }

  getCells(style: RhodesPatternStyle): RhodesCell[] {
    return getRhodesCellsForStyle(style);
  }

  getMolecule(id: string): RhodesMolecule | undefined {
    return RHODES_MOLECULES[id];
  }
}

export default RhodesPatternEngine;
