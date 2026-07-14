/**
 * Bass cells — 8-bar multi-clip arrangements of bass molecules.
 *
 * Each cell is a timeline of `bass` lane clips (molecule pools cycled per
 * bar), optionally with an `accent`/`fill` lane that fires on specific bars
 * (turnarounds, phrase endings). Mirrors the piano/drum cell model.
 *
 * Cells are variant×style-scoped: upright (swing/bossa/ballad) and electric
 * (funk/latin). One organism per variant×style picks a cell pool per section.
 *
 * @see docs/BASS.md
 */
import type { BassCell, BassLane, BassPatternStyle } from './bassPatternTypes.js';

// ─── Cell authoring helpers ──────────────────────────────────────────────────

type ClipSpec = { startBar: number; lengthBars: number; pool: string[] };

function bassLane(segments: string[][]): BassLane {
  const clips: ClipSpec[] = segments.map((pool, segIdx) => ({
    startBar: segIdx * 2,
    lengthBars: 2,
    pool,
  }));
  return { name: 'bass', probability: 1, clips };
}

interface CellSeed {
  id: string;
  style: BassPatternStyle;
  /** Per-style molecule id prefix (without the `__style` suffix). */
  segments: string[][];
  /** Optional accent/fill lane (turnarounds, phrase ends). */
  accents?: ClipSpec[];
  /** Optional dynamics override (default: steady). */
  dynamics?: import('./bassPatternTypes.js').BassDynamics;
}

// Molecule ids are namespaced `<baseId>__<style>` at the registry level (see
// bassMolecules.ts). These helpers build the namespaced ids for a style.
function mol(baseId: string, style: string): string {
  return `${baseId}__${style}`;
}

// ─── Upright cells ───────────────────────────────────────────────────────────

const UPRIGHT_CELL_SEEDS: CellSeed[] = [
  // ── Swing: 4 режима ─────────────────────────────────────────────────────
  // Slow Swing — половинки (2 ноты/такт)
  {
    id: 'bass-up-swing-slow',
    style: 'swing',
    segments: [
      [mol('bass-up-swing-walk-half-note', 'swing')],
      [mol('bass-up-swing-walk-half-note', 'swing')],
      [mol('bass-up-swing-walk-half-note', 'swing')],
      [mol('bass-up-swing-walk-half-note', 'swing')],
    ],
  },
  // Walking — четверти (4 ноты/такт)
  {
    id: 'bass-up-swing-walking',
    style: 'swing',
    segments: [
      [mol('bass-up-swing-walk-basic', 'swing')],
      [mol('bass-up-swing-walk-basic', 'swing')],
      [mol('bass-up-swing-walk-basic', 'swing')],
      [mol('bass-up-swing-walk-basic', 'swing')],
    ],
  },
  // Dense — восьмые (8 нот/такт)
  {
    id: 'bass-up-swing-dense',
    style: 'swing',
    segments: [
      [mol('bass-up-swing-walk-8th', 'swing')],
      [mol('bass-up-swing-walk-8th', 'swing')],
      [mol('bass-up-swing-walk-8th', 'swing')],
      [mol('bass-up-swing-walk-8th', 'swing')],
    ],
    dynamics: { type: 'arch', amount: 0.25 },
  },
  // Max — сложные ритмы с триолями
  {
    id: 'bass-up-swing-max',
    style: 'swing',
    segments: [
      [mol('bass-up-swing-walk-triplet', 'swing'), mol('bass-up-swing-walk-8th', 'swing')],
      [mol('bass-up-swing-walk-2bar-chromatic', 'swing')],
      [mol('bass-up-swing-walk-8th-ghost', 'swing'), mol('bass-up-swing-walk-bebop', 'swing')],
      [mol('bass-up-swing-walk-triplet', 'swing'), mol('bass-up-swing-bebop-turnaround', 'swing')],
    ],
    dynamics: { type: 'arch', amount: 0.3 },
  },

  // ── Bossa ─────────────────────────────────────────────────────────────────
  {
    id: 'bass-up-bossa-sparse',
    style: 'bossa',
    segments: [
      [mol('bass-up-bossa-1-5', 'bossa')],
      [mol('bass-up-bossa-1-5', 'bossa')],
      [mol('bass-up-bossa-1-5', 'bossa')],
      [mol('bass-up-bossa-1-5', 'bossa'), mol('bass-up-bossa-approach', 'bossa')],
    ],
  },
  {
    id: 'bass-up-bossa-medium',
    style: 'bossa',
    segments: [
      [mol('bass-up-bossa-1-5-octave', 'bossa'), mol('bass-up-bossa-1-5', 'bossa')],
      [mol('bass-up-bossa-1-5', 'bossa'), mol('bass-up-bossa-1-5-octave', 'bossa')],
      [mol('bass-up-bossa-1-5-octave', 'bossa'), mol('bass-up-bossa-1-5', 'bossa')],
      [mol('bass-up-bossa-1-5', 'bossa'), mol('bass-up-bossa-approach', 'bossa')],
    ],
  },

  // ── Ballad ────────────────────────────────────────────────────────────────
  {
    id: 'bass-up-ballad-sparse',
    style: 'ballad',
    segments: [
      [mol('bass-up-ballad-two-feel', 'ballad')],
      [mol('bass-up-ballad-two-feel', 'ballad')],
      [mol('bass-up-ballad-two-feel', 'ballad')],
      [mol('bass-up-ballad-two-feel', 'ballad'), mol('bass-up-ballad-half-note-walk', 'ballad')],
    ],
  },
  {
    id: 'bass-up-ballad-medium',
    style: 'ballad',
    segments: [
      [mol('bass-up-ballad-two-feel-5', 'ballad'), mol('bass-up-ballad-two-feel', 'ballad')],
      [mol('bass-up-ballad-two-feel', 'ballad'), mol('bass-up-ballad-two-feel-5', 'ballad')],
      [mol('bass-up-ballad-two-feel-5', 'ballad'), mol('bass-up-ballad-approach', 'ballad')],
      [mol('bass-up-ballad-two-feel', 'ballad'), mol('bass-up-ballad-half-note-walk', 'ballad')],
    ],
  },
];

// ─── Electric cells ──────────────────────────────────────────────────────────

const ELECTRIC_CELL_SEEDS: CellSeed[] = [
  // ── Funk ──────────────────────────────────────────────────────────────────
  {
    id: 'bass-el-funk-sparse',
    style: 'funk',
    segments: [
      [mol('bass-el-funk-pocket', 'funk')],
      [mol('bass-el-funk-pocket', 'funk')],
      [mol('bass-el-funk-pocket', 'funk')],
      [mol('bass-el-funk-pocket', 'funk'), mol('bass-el-funk-release', 'funk')],
    ],
  },
  {
    id: 'bass-el-funk-medium',
    style: 'funk',
    segments: [
      [mol('bass-el-funk-one-bar', 'funk'), mol('bass-el-funk-pocket', 'funk')],
      [mol('bass-el-funk-stab', 'funk'), mol('bass-el-funk-one-bar', 'funk')],
      [mol('bass-el-funk-pocket', 'funk'), mol('bass-el-funk-stab', 'funk')],
      [mol('bass-el-funk-one-bar', 'funk'), mol('bass-el-funk-release', 'funk')],
    ],
  },
  {
    id: 'bass-el-funk-dense',
    style: 'funk',
    segments: [
      [mol('bass-el-funk-16th-chatter', 'funk'), mol('bass-el-funk-one-bar', 'funk')],
      [mol('bass-el-funk-two-bar', 'funk')],
      [mol('bass-el-funk-16th-chatter', 'funk'), mol('bass-el-funk-stab', 'funk')],
      [mol('bass-el-funk-one-bar', 'funk'), mol('bass-el-funk-release', 'funk')],
    ],
  },
  {
    id: 'bass-el-funk-16th',
    style: 'funk',
    segments: [
      [mol('bass-el-funk-16th-groove', 'funk')],
      [mol('bass-el-funk-16th-slap', 'funk')],
      [mol('bass-el-funk-16th-2bar', 'funk')],
      [mol('bass-el-funk-16th-groove', 'funk'), mol('bass-el-funk-release', 'funk')],
    ],
    dynamics: { type: 'pulse', amount: 0.2 },
  },

  // ── Latin ──────────────────────────────────────────────────────────────────
  {
    id: 'bass-el-latin-sparse',
    style: 'latin',
    segments: [
      [mol('bass-el-latin-montuno', 'latin')],
      [mol('bass-el-latin-montuno', 'latin')],
      [mol('bass-el-latin-montuno', 'latin')],
      [mol('bass-el-latin-montuno', 'latin')],
    ],
  },
  {
    id: 'bass-el-latin-medium',
    style: 'latin',
    segments: [
      [mol('bass-el-latin-montuno-octave', 'latin'), mol('bass-el-latin-montuno', 'latin')],
      [mol('bass-el-latin-2-3-clave', 'latin')],
      [mol('bass-el-latin-montuno-octave', 'latin'), mol('bass-el-latin-montuno', 'latin')],
      [mol('bass-el-latin-montuno-dense', 'latin'), mol('bass-el-latin-2-3-clave', 'latin')],
    ],
  },
  {
    id: 'bass-el-latin-dense',
    style: 'latin',
    segments: [
      [mol('bass-el-latin-montuno-dense', 'latin'), mol('bass-el-latin-montuno-octave', 'latin')],
      [mol('bass-el-latin-2-3-clave', 'latin')],
      [mol('bass-el-latin-montuno-dense', 'latin'), mol('bass-el-latin-montuno', 'latin')],
      [mol('bass-el-latin-montuno-dense', 'latin'), mol('bass-el-latin-2-3-clave', 'latin')],
    ],
  },
];

// ─── Build registries ────────────────────────────────────────────────────────

function buildCells(seeds: CellSeed[]): Record<string, BassCell> {
  const out: Record<string, BassCell> = {};
  for (const seed of seeds) {
    const lanes: BassLane[] = [bassLane(seed.segments)];
    if (seed.accents && seed.accents.length > 0) {
      lanes.push({ name: 'accent', probability: 0.2, clips: seed.accents });
    }
    out[seed.id] = {
      id: seed.id,
      style: seed.style,
      length: 8,
      timeSignature: [4, 4],
      velocity: 0.8,
      dynamics: seed.dynamics ?? { type: 'steady', amount: 0 },
      lanes,
    };
  }
  return out;
}

export const UPRIGHT_BASS_CELLS: Record<string, BassCell> = buildCells(UPRIGHT_CELL_SEEDS);
export const UPRIGHT_BASS_CELL_LIST: BassCell[] = Object.values(UPRIGHT_BASS_CELLS);

export const ELECTRIC_BASS_CELLS: Record<string, BassCell> = buildCells(ELECTRIC_CELL_SEEDS);
export const ELECTRIC_BASS_CELL_LIST: BassCell[] = Object.values(ELECTRIC_BASS_CELLS);

export function getUprightBassCellsForStyle(style: string): BassCell[] {
  return UPRIGHT_BASS_CELL_LIST.filter((c) => c.style === style);
}

export function getElectricBassCellsForStyle(style: string): BassCell[] {
  return ELECTRIC_BASS_CELL_LIST.filter((c) => c.style === style);
}
