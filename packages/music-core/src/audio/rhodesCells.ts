/**
 * Seed Rhodes cells — per-style 8-bar arrangements of molecules.
 *
 * Each cell is a complementary texture layer: lanes have low-ish
 * probabilities so Rhodes sits behind the piano. `pads` is the backbone
 * (always or near-always on), `arpeggio` adds gentle motion, `insert`/`accent`
 * are sparse fills. See docs/RHODES.md.
 */
import type { RhodesCell, RhodesPatternStyle, Lane } from './rhodesPatternTypes.js';
import { GENERATED_RHODES_CELLS } from './rhodesCellsGenerated.js';

type CellDraft = Omit<RhodesCell, 'id' | 'style'>;

function makeMultiCell(
  segments: string[][],
  extraLanes?: {
    name: string;
    probability: number;
    clips: { startBar: number; lengthBars: number; pool: string[] }[];
  }[],
): CellDraft {
  const clips = segments.map((pool, segIdx) => ({
    startBar: segIdx * 2,
    lengthBars: 2,
    pool,
  }));
  const lanes: Lane[] = [{ name: 'pads', probability: 1, clips }, ...(extraLanes ?? [])];
  return {
    length: 8,
    timeSignature: [4, 4],
    velocity: 0.55,
    dynamics: { type: 'steady', amount: 0 },
    lanes,
  };
}

interface CellSeed {
  id: string;
  label: string;
  style: RhodesPatternStyle;
  segments: string[][];
  /** Optional additional lanes (arpeggio/insert/accent). */
  extra?: {
    name: string;
    probability: number;
    clips: { startBar: number; lengthBars: number; pool: string[] }[];
  }[];
}

const SEED_CELLS: CellSeed[] = [
  // ── Swing cells ──────────────────────────────────────────────────────────
  {
    id: 'rhodes-swing-complement',
    label: 'Swing Complement',
    style: 'swing',
    segments: [
      ['rhodes-pad-half-swing', 'rhodes-pad-whole-swing', 'rhodes-shell-sparse-swing'],
      ['rhodes-pad-half-swing', 'rhodes-pad-whole-swing', 'rhodes-insert-one-three-swing'],
      ['rhodes-pad-whole-swing', 'rhodes-shell-sparse-swing', 'rhodes-pad-half-swing'],
      ['rhodes-pad-half-swing', 'rhodes-pad-whole-swing', 'rhodes-shell-sparse-swing'],
    ],
    extra: [
      {
        name: 'arpeggio',
        probability: 0.3,
        clips: [{ startBar: 2, lengthBars: 2, pool: ['rhodes-arp-up-quarter-swing'] }],
      },
      {
        name: 'insert',
        probability: 0.15,
        clips: [{ startBar: 0, lengthBars: 8, pool: ['rhodes-insert-offbeats-swing'] }],
      },
    ],
  },
  {
    id: 'rhodes-swing-sparse',
    label: 'Swing Sparse Complement',
    style: 'swing',
    segments: [
      ['rhodes-shell-sparse-swing', 'rhodes-pad-whole-swing'],
      ['rhodes-pad-whole-swing', 'rhodes-shell-sparse-swing'],
      ['rhodes-shell-sparse-swing', 'rhodes-pad-whole-swing'],
      ['rhodes-pad-whole-swing', 'rhodes-shell-sparse-swing'],
    ],
  },

  // ── Funk cells ───────────────────────────────────────────────────────────
  {
    id: 'rhodes-funk-mellow',
    label: 'Funk Mellow',
    style: 'funk',
    segments: [
      ['rhodes-pad-half-funk', 'rhodes-shell-sparse-funk'],
      ['rhodes-pad-half-funk', 'rhodes-stab-2-4-funk'],
      ['rhodes-pad-half-funk', 'rhodes-shell-sparse-funk'],
      ['rhodes-pad-half-funk', 'rhodes-stab-2-4-funk'],
    ],
    extra: [
      {
        name: 'insert',
        probability: 0.35,
        clips: [
          { startBar: 0, lengthBars: 4, pool: ['rhodes-insert-offbeats-funk'] },
          { startBar: 4, lengthBars: 4, pool: ['rhodes-stab-2-4-funk', 'rhodes-insert-offbeats-funk'] },
        ],
      },
      {
        name: 'accent',
        probability: 0.12,
        clips: [{ startBar: 6, lengthBars: 2, pool: ['rhodes-stab-2-4-funk'] }],
      },
    ],
  },

  // ── Ballad cells ─────────────────────────────────────────────────────────
  {
    id: 'rhodes-ballad-gentle',
    label: 'Ballad Gentle',
    style: 'ballad',
    segments: [
      ['rhodes-pad-whole-ballad', 'rhodes-pad-dotted-ballad'],
      ['rhodes-pad-whole-ballad', 'rhodes-pad-half-ballad'],
      ['rhodes-pad-dotted-ballad', 'rhodes-pad-whole-ballad'],
      ['rhodes-pad-half-ballad', 'rhodes-pad-whole-ballad', 'rhodes-pad-swell-ballad'],
    ],
    extra: [
      {
        name: 'arpeggio',
        probability: 0.25,
        clips: [
          { startBar: 2, lengthBars: 2, pool: ['rhodes-arp-roll-ballad', 'rhodes-arp-up-quarter-ballad'] },
        ],
      },
      {
        name: 'insert',
        probability: 0.1,
        clips: [{ startBar: 0, lengthBars: 8, pool: ['rhodes-insert-anticipation-ballad'] }],
      },
    ],
  },
  {
    id: 'rhodes-ballad-ambient',
    label: 'Ballad Ambient',
    style: 'ballad',
    segments: [
      ['rhodes-pad-swell-ballad', 'rhodes-pad-whole-ballad'],
      ['rhodes-upper-shimmer-ballad', 'rhodes-pad-whole-ballad'],
      ['rhodes-pad-swell-ballad', 'rhodes-pad-dotted-ballad'],
      ['rhodes-pad-whole-ballad', 'rhodes-upper-shimmer-ballad'],
    ],
  },

  // ── Bossa cells ──────────────────────────────────────────────────────────
  {
    id: 'rhodes-bossa-gentle',
    label: 'Bossa Gentle',
    style: 'bossa',
    segments: [
      ['rhodes-pad-half-bossa', 'rhodes-shell-sparse-bossa'],
      ['rhodes-pad-half-bossa', 'rhodes-pad-whole-bossa'],
      ['rhodes-shell-sparse-bossa', 'rhodes-pad-half-bossa'],
      ['rhodes-pad-whole-bossa', 'rhodes-pad-half-bossa'],
    ],
    extra: [
      {
        name: 'arpeggio',
        probability: 0.2,
        clips: [{ startBar: 4, lengthBars: 2, pool: ['rhodes-arp-up-quarter-bossa'] }],
      },
    ],
  },

  // ── Latin cells ──────────────────────────────────────────────────────────
  {
    id: 'rhodes-latin-cascade',
    label: 'Latin Cascade',
    style: 'latin',
    segments: [
      ['rhodes-arp-up-eighths-latin', 'rhodes-arp-down-quarter-latin'],
      ['rhodes-arp-up-quarter-latin', 'rhodes-arp-bounce-latin'],
      ['rhodes-arp-down-quarter-latin', 'rhodes-arp-up-eighths-latin'],
      ['rhodes-arp-bounce-latin', 'rhodes-arp-up-quarter-latin'],
    ],
    extra: [
      {
        name: 'pads',
        probability: 0.4,
        clips: [
          { startBar: 0, lengthBars: 4, pool: ['rhodes-pad-half-latin'] },
          { startBar: 4, lengthBars: 4, pool: ['rhodes-pad-whole-latin', 'rhodes-pad-half-latin'] },
        ],
      },
    ],
  },
  {
    id: 'rhodes-latin-sparse',
    label: 'Latin Sparse',
    style: 'latin',
    segments: [
      ['rhodes-pad-half-latin', 'rhodes-shell-sparse-latin'],
      ['rhodes-pad-whole-latin', 'rhodes-pad-half-latin'],
      ['rhodes-shell-sparse-latin', 'rhodes-pad-half-latin'],
      ['rhodes-pad-whole-latin', 'rhodes-pad-half-latin'],
    ],
    extra: [
      {
        name: 'arpeggio',
        probability: 0.25,
        clips: [{ startBar: 4, lengthBars: 2, pool: ['rhodes-arp-up-quarter-latin'] }],
      },
    ],
  },

  // ── Solo section: Rhodes steps way back to give the soloist room ────────
  {
    id: 'rhodes-solo-sparse',
    label: 'Solo Sparse (step back)',
    style: 'swing',
    segments: [
      ['rhodes-shell-sparse-swing', 'rhodes-pad-whole-swing'],
      ['rhodes-pad-whole-swing', 'rhodes-rest-swing'],
      ['rhodes-shell-sparse-swing', 'rhodes-pad-whole-swing'],
      ['rhodes-rest-swing', 'rhodes-pad-whole-swing'],
    ],
  },
];

// ─── Build base registry from seeds ────────────────────────────────────────
const BASE_RHODES_CELLS: Record<string, RhodesCell> = {};
const BASE_RHODES_CELL_LIST: RhodesCell[] = [];

for (const seed of SEED_CELLS) {
  const draft = makeMultiCell(seed.segments, seed.extra);
  const cell: RhodesCell = { id: seed.id, style: seed.style, ...draft };
  BASE_RHODES_CELLS[seed.id] = cell;
  BASE_RHODES_CELL_LIST.push(cell);
}

/**
 * Итоговый реестр клеток. Если сгенерированный реестр (из Конструктора
 * Rhodes) непуст — он ПОЛНОСТЬЮ замещает базовый.
 */
const GENERATED = GENERATED_RHODES_CELLS as Record<string, RhodesCell>;

export const RHODES_CELLS: Record<string, RhodesCell> =
  Object.keys(GENERATED).length > 0 ? GENERATED : BASE_RHODES_CELLS;

export const RHODES_CELL_LIST: RhodesCell[] = Object.values(RHODES_CELLS);

export function getRhodesCellsForStyle(style: string): RhodesCell[] {
  return RHODES_CELL_LIST.filter((c) => c.style === style);
}
