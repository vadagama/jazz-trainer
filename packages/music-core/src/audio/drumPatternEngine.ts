import type {
  DrumCell,
  DrumOrganism,
  DrumMolecule,
  DrumHit,
  DrumPatternStyle,
} from './drumPatternTypes.js';
import { DRUM_CELLS, getCellsForStyle } from './drumCells.js';
import { DRUM_MOLECULES } from './drumMolecules.js';
import { getOrganismsForStyle } from './drumOrganisms.js';
import {
  assembleBar as assembleBarGeneric,
  resolveSectionCells as resolveSectionCellsGeneric,
} from './pattern/engine.js';

// ═══════════════════════════════════════════════════════════════════════════════
// DrumPatternEngine — drum-bound wrapper over the generic pattern engine.
// Binds DRUM_CELLS / DRUM_MOLECULES registries into the generic functions so
// drum callers keep a stateless class API.
// ═══════════════════════════════════════════════════════════════════════════════

export class DrumPatternEngine {
  // ── selectOrganism (section-driven) ──────────────────────────────────────

  selectOrganism(style: DrumPatternStyle, _formLength: number, _seed: number): DrumOrganism {
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

  getOrganisms(style: DrumPatternStyle): DrumOrganism[] {
    return getOrganismsForStyle(style);
  }

  // ── resolveSectionCells ──────────────────────────────────────────────────

  resolveSectionCells(
    organism: DrumOrganism,
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
    organism: DrumOrganism,
    sectionType: string,
    timeSignatureStr: string,
    barInSection: number,
    style: DrumPatternStyle,
    _seed: number,
  ): { cell: DrumCell; barInCell: number } {
    const pool = this.resolveSectionCells(organism, sectionType, timeSignatureStr);

    const cells = pool
      .map((id) => DRUM_CELLS[id])
      .filter((c): c is DrumCell => !!c && c.style === style);

    if (cells.length === 0) {
      const allCells = getCellsForStyle(style);
      const fallback = allCells[0];
      if (!fallback) throw new Error(`No cells found for style: ${style}`);
      return { cell: fallback, barInCell: barInSection % fallback.length };
    }

    const cell = cells[0]!;

    const cellIndex = Math.floor(barInSection / cell.length) % pool.length;
    const selectedId = pool[cellIndex]!;
    const selected = DRUM_CELLS[selectedId];
    if (!selected || selected.style !== style) {
      return { cell, barInCell: barInSection % cell.length };
    }

    return { cell: selected, barInCell: barInSection % selected.length };
  }

  getCells(style: DrumPatternStyle): DrumCell[] {
    return getCellsForStyle(style);
  }

  getMolecule(id: string): DrumMolecule | undefined {
    return DRUM_MOLECULES[id];
  }

  // ── assembleBar ──────────────────────────────────────────────────────────

  assembleBar(cell: DrumCell, barInCell: number, swingRatio: number): DrumHit[] {
    return assembleBarGeneric(cell, barInCell, swingRatio, (id) => DRUM_MOLECULES[id]);
  }
}

// Cell validation — see drumCellValidator.ts. Re-exported here for backward
// compatibility (callers used to import validateCell from this module).
export { validateCell, MAX_LANES, type CellValidationError } from './drumCellValidator.js';
