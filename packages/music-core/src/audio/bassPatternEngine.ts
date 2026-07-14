/**
 * BassPatternEngine — bass-bound wrapper over the generic pattern engine.
 *
 * Binds the upright/electric registries (molecules / cells / organisms)
 * into the generic engine functions so bass callers keep a stateless class
 * API, mirroring {@link DrumPatternEngine} / {@link PianoPatternEngine}.
 *
 * A single engine instance serves both variants; callers select the variant
 * on each lookup so the registries stay co-located.
 *
 * Lives in music-core (pure, no browser APIs) so {@link BassInstrument} can
 * self-manage organism-driven scheduling.
 */
import type {
  BassCell,
  BassHit,
  BassMolecule,
  BassOrganism,
  BassPatternStyle,
  BassVariant,
} from './bassPatternTypes.js';
import { UPRIGHT_BASS_MOLECULES, ELECTRIC_BASS_MOLECULES } from './bassMolecules.js';
import {
  UPRIGHT_BASS_CELLS,
  ELECTRIC_BASS_CELLS,
  getUprightBassCellsForStyle,
  getElectricBassCellsForStyle,
} from './bassCells.js';
import {
  UPRIGHT_BASS_ORGANISMS,
  ELECTRIC_BASS_ORGANISMS,
  getUprightBassOrganismsForStyle,
  getElectricBassOrganismsForStyle,
} from './bassOrganisms.js';
import {
  assembleBar as assembleBarGeneric,
  resolveSectionCells as resolveSectionCellsGeneric,
} from './pattern/engine.js';

export class BassPatternEngine {
  // ─── variant-scoped registry accessors ─────────────────────────────────────

  private molecules(variant: BassVariant): Record<string, BassMolecule> {
    return variant === 'upright' ? UPRIGHT_BASS_MOLECULES : ELECTRIC_BASS_MOLECULES;
  }

  private cells(variant: BassVariant): Record<string, BassCell> {
    return variant === 'upright' ? UPRIGHT_BASS_CELLS : ELECTRIC_BASS_CELLS;
  }

  private organismsForStyle(variant: BassVariant, style: string): BassOrganism[] {
    const list =
      variant === 'upright'
        ? getUprightBassOrganismsForStyle(style)
        : getElectricBassOrganismsForStyle(style);
    // Fallback: when a variant is selected for a style it has no authored
    // content for (e.g. electric on swing), reuse the variant's native style.
    if (list.length === 0) {
      const native = variant === 'upright' ? 'swing' : 'funk';
      return variant === 'upright'
        ? getUprightBassOrganismsForStyle(native)
        : getElectricBassOrganismsForStyle(native);
    }
    return list;
  }

  private cellsForStyle(variant: BassVariant, style: string): BassCell[] {
    const list =
      variant === 'upright'
        ? getUprightBassCellsForStyle(style)
        : getElectricBassCellsForStyle(style);
    // Fallback: when a variant has no cells for a style, reuse the variant's
    // native style content so the engine never throws on cross-style use.
    if (list.length === 0) {
      const native = variant === 'upright' ? 'swing' : 'funk';
      return variant === 'upright'
        ? getUprightBassCellsForStyle(native)
        : getElectricBassCellsForStyle(native);
    }
    return list;
  }

  // ─── Organism selection ────────────────────────────────────────────────────

  selectOrganism(variant: BassVariant, style: BassPatternStyle): BassOrganism {
    const organisms = this.organismsForStyle(variant, style);
    if (organisms.length === 0) {
      const cells = this.cellsForStyle(variant, style);
      if (cells.length === 0) throw new Error(`No bass cells found for ${variant}/${style}`);
      return {
        id: `${variant}-${style}-flat-fallback`,
        style,
        label: `${variant} ${style} Flat Fallback`,
        sectionMap: { verseA: [cells[0]!.id] },
        defaultForm: [{ label: 'A', type: 'verseA', cellPool: [cells[0]!.id], repeats: 1 }],
      };
    }
    return organisms[0]!;
  }

  getOrganisms(variant: BassVariant, style: BassPatternStyle): BassOrganism[] {
    return this.organismsForStyle(variant, style);
  }

  resolveOrganism(id: string): BassOrganism | undefined {
    return UPRIGHT_BASS_ORGANISMS[id] ?? ELECTRIC_BASS_ORGANISMS[id];
  }

  // ─── Section-driven cell resolution ────────────────────────────────────────

  resolveSectionCells(
    organism: BassOrganism,
    sectionType: string,
    timeSignatureStr: string,
  ): string[] {
    return resolveSectionCellsGeneric(organism, sectionType, timeSignatureStr);
  }

  selectCellForSectionType(
    variant: BassVariant,
    organism: BassOrganism,
    sectionType: string,
    timeSignatureStr: string,
    barInSection: number,
    style: BassPatternStyle,
    passIndex = 0,
  ): { cell: BassCell; barInCell: number } {
    const pool = this.resolveSectionCells(organism, sectionType, timeSignatureStr);
    const registry = this.cells(variant);

    const cells = pool
      .map((id) => registry[id])
      .filter((c): c is BassCell => !!c && c.style === style);

    if (cells.length === 0) {
      const allCells = this.cellsForStyle(variant, style);
      const fallback = allCells[0];
      if (!fallback) throw new Error(`No bass cells found for ${variant}/${style}`);
      return { cell: fallback, barInCell: barInSection % fallback.length };
    }

    const cell = cells[0]!;
    const cellIndex = (passIndex + Math.floor(barInSection / cell.length)) % pool.length;
    const selectedId = pool[cellIndex]!;
    const selected = registry[selectedId];
    if (!selected || selected.style !== style) {
      return { cell, barInCell: barInSection % cell.length };
    }
    return { cell: selected, barInCell: barInSection % selected.length };
  }

  // ─── Bar assembly ──────────────────────────────────────────────────────────

  resolveBar(
    variant: BassVariant,
    cellId: string,
    barInCell: number,
    swingRatio: number,
    seed?: number,
  ): BassHit[] {
    const cell = this.cells(variant)[cellId];
    if (!cell) return [];
    const registry = this.molecules(variant);
    return assembleBarGeneric(cell, barInCell, swingRatio, (id) => registry[id], seed);
  }

  getCells(variant: BassVariant, style: BassPatternStyle): BassCell[] {
    return this.cellsForStyle(variant, style);
  }

  getMolecule(variant: BassVariant, id: string): BassMolecule | undefined {
    return this.molecules(variant)[id];
  }
}

export default BassPatternEngine;
