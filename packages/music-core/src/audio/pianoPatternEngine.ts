/**
 * PianoPatternEngine — piano-bound wrapper over the generic pattern engine.
 *
 * Binds PIANO_CELLS / PIANO_MOLECULES / PIANO_ORGANISMS registries into the
 * generic engine functions so piano callers keep a stateless class API.
 *
 * Lives in music-core (like DrumPatternEngine) so PianoInstrument can
 * self-manage organism-driven scheduling.
 */
import type {
  PianoPatternStyle,
  PianoMolecule,
  PianoCell,
  PianoOrganism,
  PianoHit,
} from './pianoPatternTypes.js';
import { PIANO_MOLECULES } from './pianoMolecules.js';
import { PIANO_CELLS, getPianoCellsForStyle } from './pianoCells.js';
import { getPianoOrganismsForStyle } from './pianoOrganisms.js';
import {
  assembleBar as assembleBarGeneric,
  resolveSectionCells as resolveSectionCellsGeneric,
} from './pattern/engine.js';

export class PianoPatternEngine {
  // ── Organism selection ────────────────────────────────────────────────────

  selectOrganism(style: PianoPatternStyle): PianoOrganism {
    const organisms = getPianoOrganismsForStyle(style);
    if (organisms.length === 0) {
      const cells = getPianoCellsForStyle(style);
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

  getOrganisms(style: PianoPatternStyle): PianoOrganism[] {
    return getPianoOrganismsForStyle(style);
  }

  resolveOrganism(id: string): PianoOrganism | undefined {
    for (const style of ['swing', 'bossa', 'funk', 'latin', 'ballad'] as PianoPatternStyle[]) {
      for (const org of getPianoOrganismsForStyle(style)) {
        if (org.id === id) return org;
      }
    }
    return undefined;
  }

  // ── Section-driven cell resolution ────────────────────────────────────────

  resolveSectionCells(
    organism: PianoOrganism,
    sectionType: string,
    timeSignatureStr: string,
  ): string[] {
    return resolveSectionCellsGeneric(organism, sectionType, timeSignatureStr);
  }

  selectCellForSectionType(
    organism: PianoOrganism,
    sectionType: string,
    timeSignatureStr: string,
    barInSection: number,
    style: PianoPatternStyle,
    passIndex = 0,
  ): { cell: PianoCell; barInCell: number } {
    const pool = this.resolveSectionCells(organism, sectionType, timeSignatureStr);

    const cells = pool
      .map((id) => PIANO_CELLS[id])
      .filter((c): c is PianoCell => !!c && c.style === style);

    if (cells.length === 0) {
      const allCells = getPianoCellsForStyle(style);
      const fallback = allCells[0];
      if (!fallback) throw new Error(`No cells found for style: ${style}`);
      return { cell: fallback, barInCell: barInSection % fallback.length };
    }

    const cell = cells[0]!;
    // passIndex shifts the cell pool on each form pass;
    // barInSection / cell.length handles within-section cycling
    const cellIndex = (passIndex + Math.floor(barInSection / cell.length)) % pool.length;
    const selectedId = pool[cellIndex]!;
    const selected = PIANO_CELLS[selectedId];
    if (!selected || selected.style !== style) {
      return { cell, barInCell: barInSection % cell.length };
    }

    return { cell: selected, barInCell: barInSection % selected.length };
  }

  // ── Bar assembly ──────────────────────────────────────────────────────────

  resolveBar(cellId: string, barInCell: number, swingRatio: number, seed?: number): PianoHit[] {
    const cell = PIANO_CELLS[cellId];
    if (!cell) return [];
    return assembleBarGeneric(
      cell,
      barInCell,
      swingRatio,
      (id: string) => PIANO_MOLECULES[id],
      seed,
    );
  }

  getCells(style: PianoPatternStyle): PianoCell[] {
    return getPianoCellsForStyle(style);
  }

  getMolecule(id: string): PianoMolecule | undefined {
    return PIANO_MOLECULES[id];
  }
}

export default PianoPatternEngine;
