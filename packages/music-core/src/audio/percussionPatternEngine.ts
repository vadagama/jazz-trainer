import type {
  PercussionCell,
  PercussionOrganism,
  PercussionMolecule,
  PercussionHit,
  PercussionPatternStyle,
} from './percussionPatternTypes.js';
import { PERCUSSION_CELLS, getCellsForStyle } from './percussionCells.js';
import { PERCUSSION_MOLECULES } from './percussionMolecules.js';
import { getOrganismsForStyle } from './percussionOrganisms.js';
import {
  assembleBar as assembleBarGeneric,
  resolveSectionCells as resolveSectionCellsGeneric,
} from './pattern/engine.js';

// ═══════════════════════════════════════════════════════════════════════════════
// PercussionPatternEngine — percussion-bound wrapper over the generic pattern
// engine. Binds PERCUSSION_CELLS / PERCUSSION_MOLECULES registries into the
// generic functions so percussion callers keep a stateless class API.
// ═══════════════════════════════════════════════════════════════════════════════

export class PercussionPatternEngine {
  // ── selectOrganism ─────────────────────────────────────────────────────────

  selectOrganism(style: PercussionPatternStyle): PercussionOrganism {
    const organisms = getOrganismsForStyle(style);
    if (organisms.length === 0) {
      const cells = getCellsForStyle(style);
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

  getOrganisms(style: PercussionPatternStyle): PercussionOrganism[] {
    return getOrganismsForStyle(style);
  }

  // ── resolveSectionCells ────────────────────────────────────────────────────

  resolveSectionCells(
    organism: PercussionOrganism,
    sectionType: string,
    timeSignatureStr: string,
  ): string[] {
    return resolveSectionCellsGeneric(organism, sectionType, timeSignatureStr);
  }

  /**
   * Select a cell and its bar position for a given section type.
   *
   * - Resolves the cell pool via {@link resolveSectionCells}.
   * - Cycles through the pool every `cell.length` bars (cycling).
   * - Falls back to any cell of the style when pool is empty.
   */
  selectCellForSectionType(
    organism: PercussionOrganism,
    sectionType: string,
    timeSignatureStr: string,
    barInSection: number,
    style: PercussionPatternStyle,
  ): { cell: PercussionCell; barInCell: number } {
    const pool = this.resolveSectionCells(organism, sectionType, timeSignatureStr);

    const cells = pool
      .map((id) => PERCUSSION_CELLS[id])
      .filter((c): c is PercussionCell => !!c && c.style === style);

    if (cells.length === 0) {
      const allCells = getCellsForStyle(style);
      const fallback = allCells[0];
      if (!fallback) throw new Error(`No cells found for style: ${style}`);
      return { cell: fallback, barInCell: barInSection % fallback.length };
    }

    const cell = cells[0]!;

    const cellIndex = Math.floor(barInSection / cell.length) % pool.length;
    const selectedId = pool[cellIndex]!;
    const selected = PERCUSSION_CELLS[selectedId];
    if (!selected || selected.style !== style) {
      return { cell, barInCell: barInSection % cell.length };
    }

    return { cell: selected, barInCell: barInSection % selected.length };
  }

  getCells(style: PercussionPatternStyle): PercussionCell[] {
    return getCellsForStyle(style);
  }

  getMolecule(id: string): PercussionMolecule | undefined {
    return PERCUSSION_MOLECULES[id];
  }

  // ── assembleBar ────────────────────────────────────────────────────────────

  assembleBar(cell: PercussionCell, barInCell: number, swingRatio: number): PercussionHit[] {
    return assembleBarGeneric(cell, barInCell, swingRatio, (id) => PERCUSSION_MOLECULES[id]);
  }
}
