import type { PianoCell, PianoPatternStyle } from './pianoPatternTypes.js';
import { GENERATED_PIANO_CELLS } from './pianoCellsGenerated.js';

// ─── Seed cells: 8-bar multi-clip pool arrangements ────────────────────────

type CellDraft = Omit<PianoCell, 'id' | 'style'>;

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
  const lanes: import('./pianoPatternTypes.js').Lane[] = [
    { name: 'comping', probability: 1, clips },
    ...(extraLanes ?? []),
  ];
  return {
    length: 8,
    timeSignature: [4, 4],
    velocity: 0.8,
    dynamics: { type: 'steady', amount: 0 },
    lanes,
  };
}

interface CellSeed {
  id: string;
  label: string;
  style: PianoPatternStyle;
  segments: string[][];
  fills?: { startBar: number; lengthBars: number; pool: string[] }[];
  accents?: { startBar: number; lengthBars: number; pool: string[] }[];
}

const SEED_CELLS: CellSeed[] = [
  // ── Swing cells (6) ─────────────────────────────────────────────────────
  {
    id: 'piano-swing-sparse',
    label: 'Swing Sparse',
    style: 'swing',
    segments: [
      ['piano-basie-2-4-swing', 'piano-half-notes-swing', 'piano-one-three-swing'],
      ['piano-charleston-swing', 'piano-offbeat-2-4-swing', 'piano-basie-2-4-swing'],
      ['piano-basie-2-4-swing', 'piano-two-and-four-swing', 'piano-half-notes-swing'],
      ['piano-half-notes-swing', 'piano-basie-2-4-swing', 'piano-charleston-swing'],
    ],
  },
  {
    id: 'piano-swing-medium',
    label: 'Swing Medium',
    style: 'swing',
    segments: [
      ['piano-charleston-swing', 'piano-anticipation-push-swing', 'piano-one-twoand-four-swing'],
      ['piano-bossa-top-swing', 'piano-garland-swing', 'piano-charleston-swing'],
      ['piano-garland-swing', 'piano-anticipation-push-swing', 'piano-offbeat-2-4-swing'],
      ['piano-kelly-push-swing', 'piano-bossa-top-swing', 'piano-garland-swing'],
    ],
  },
  {
    id: 'piano-swing-dense',
    label: 'Swing Dense',
    style: 'swing',
    segments: [
      ['piano-walking-comp-swing', 'piano-full-comp-swing', 'piano-shout-swing'],
      ['piano-quarter-notes-swing', 'piano-walking-comp-swing', 'piano-full-comp-swing'],
      ['piano-shout-swing', 'piano-full-comp-swing', 'piano-walking-comp-swing'],
      ['piano-quarter-comp-swing', 'piano-walking-comp-swing', 'piano-full-comp-swing'],
    ],
  },
  {
    id: 'piano-basie-light-swing',
    label: 'Basie Light',
    style: 'swing',
    segments: [
      ['piano-basie-2-4-swing', 'piano-twoand-only-swing', 'piano-half-notes-swing'],
      ['piano-rest-swing', 'piano-basie-2-4-swing', 'piano-twoand-only-swing'],
      ['piano-basie-2-4-swing', 'piano-half-notes-swing', 'piano-twoand-only-swing'],
      ['piano-twoand-only-swing', 'piano-rest-swing', 'piano-basie-2-4-swing'],
    ],
  },
  {
    id: 'piano-offbeat-push-swing',
    label: 'Offbeat Push',
    style: 'swing',
    segments: [
      ['piano-offbeat-2-4-swing', 'piano-two-threeand-swing', 'piano-anticipation-4and-swing'],
      ['piano-kelly-push-swing', 'piano-offbeat-2-4-swing', 'piano-anticipation-push-swing'],
      ['piano-offbeat-2-4-swing', 'piano-anticipation-4and-swing', 'piano-two-threeand-swing'],
      ['piano-anticipation-4and-swing', 'piano-kelly-push-swing', 'piano-offbeat-2-4-swing'],
    ],
  },
  {
    id: 'piano-beginner-safe-swing',
    label: 'Beginner Safe',
    style: 'swing',
    segments: [
      ['piano-half-notes-swing', 'piano-whole-note-swing', 'piano-half-notes-swing'],
      ['piano-whole-note-swing', 'piano-half-notes-swing', 'piano-one-three-swing'],
      ['piano-half-notes-swing', 'piano-whole-note-swing', 'piano-two-and-four-swing'],
      ['piano-whole-note-swing', 'piano-half-notes-swing', 'piano-whole-note-swing'],
    ],
  },

  // ── Bossa cells (3) ─────────────────────────────────────────────────────
  {
    id: 'piano-bossa-sparse',
    label: 'Bossa Sparse',
    style: 'bossa',
    segments: [
      ['piano-half-notes-bossa', 'piano-bossa-gilberto-bossa', 'piano-one-three-bossa'],
      ['piano-bossa-gilberto-bossa', 'piano-half-notes-bossa', 'piano-bossa-gilberto-bossa'],
      ['piano-half-notes-bossa', 'piano-bossa-gilberto-bossa', 'piano-two-and-four-bossa'],
      ['piano-bossa-gilberto-bossa', 'piano-half-notes-bossa', 'piano-bossa-sync-bossa'],
    ],
  },
  {
    id: 'piano-bossa-medium',
    label: 'Bossa Medium',
    style: 'bossa',
    segments: [
      ['piano-bossa-gilberto-bossa', 'piano-bossa-sync-bossa', 'piano-bossa-full-bossa'],
      ['piano-bossa-full-bossa', 'piano-bossa-gilberto-bossa', 'piano-bossa-sync-bossa'],
      ['piano-bossa-sync-bossa', 'piano-bossa-full-bossa', 'piano-bossa-gilberto-bossa'],
      ['piano-bossa-full-bossa', 'piano-bossa-sync-bossa', 'piano-bossa-full-bossa'],
    ],
  },
  {
    id: 'piano-bossa-dense',
    label: 'Bossa Dense',
    style: 'bossa',
    segments: [
      ['piano-bossa-full-bossa', 'piano-bossa-sync-bossa', 'piano-quarter-comp-bossa'],
      ['piano-bossa-sync-bossa', 'piano-bossa-full-bossa', 'piano-quarter-comp-bossa'],
      ['piano-bossa-full-bossa', 'piano-quarter-comp-bossa', 'piano-bossa-sync-bossa'],
      ['piano-bossa-sync-bossa', 'piano-bossa-full-bossa', 'piano-bossa-full-bossa'],
    ],
  },

  // ── Funk cells (3) ──────────────────────────────────────────────────────
  {
    id: 'piano-funk-sparse',
    label: 'Funk Sparse',
    style: 'funk',
    segments: [
      ['piano-two-and-four-funk', 'piano-funk-sync-funk', 'piano-funk-tight-funk'],
      ['piano-funk-tight-funk', 'piano-two-and-four-funk', 'piano-funk-sync-funk'],
      ['piano-two-and-four-funk', 'piano-funk-tight-funk', 'piano-funk-sync-funk'],
      ['piano-funk-sync-funk', 'piano-two-and-four-funk', 'piano-funk-tight-funk'],
    ],
  },
  {
    id: 'piano-funk-medium',
    label: 'Funk Medium',
    style: 'funk',
    segments: [
      ['piano-funk-sync-funk', 'piano-funk-tight-funk', 'piano-funk-sixteenths-funk'],
      ['piano-funk-tight-funk', 'piano-funk-sync-funk', 'piano-funk-sixteenths-funk'],
      ['piano-funk-sixteenths-funk', 'piano-funk-tight-funk', 'piano-funk-sync-funk'],
      ['piano-funk-sync-funk', 'piano-funk-sixteenths-funk', 'piano-funk-tight-funk'],
    ],
  },
  {
    id: 'piano-funk-dense',
    label: 'Funk Dense',
    style: 'funk',
    segments: [
      ['piano-funk-sixteenths-funk', 'piano-funk-tight-funk', 'piano-funk-sync-funk'],
      ['piano-funk-tight-funk', 'piano-funk-sixteenths-funk', 'piano-funk-sync-funk'],
      ['piano-funk-sixteenths-funk', 'piano-funk-sync-funk', 'piano-funk-tight-funk'],
      ['piano-funk-sync-funk', 'piano-funk-sixteenths-funk', 'piano-funk-tight-funk'],
    ],
  },

  // ── Latin cells (3) ─────────────────────────────────────────────────────
  {
    id: 'piano-latin-montuno',
    label: 'Latin Montuno',
    style: 'latin',
    segments: [
      ['piano-montuno-latin', 'piano-montuno-variant-latin', 'piano-montuno-dense-latin'],
      ['piano-montuno-variant-latin', 'piano-montuno-latin', 'piano-montuno-dense-latin'],
      ['piano-montuno-latin', 'piano-montuno-dense-latin', 'piano-montuno-variant-latin'],
      ['piano-montuno-latin', 'piano-montuno-variant-latin', 'piano-montuno-latin'],
    ],
  },
  {
    id: 'piano-latin-sparse',
    label: 'Latin Sparse',
    style: 'latin',
    segments: [
      ['piano-half-notes-latin', 'piano-montuno-latin', 'piano-montuno-variant-latin'],
      ['piano-montuno-latin', 'piano-half-notes-latin', 'piano-montuno-latin'],
      ['piano-half-notes-latin', 'piano-montuno-variant-latin', 'piano-montuno-latin'],
      ['piano-montuno-variant-latin', 'piano-half-notes-latin', 'piano-montuno-variant-latin'],
    ],
  },
  {
    id: 'piano-latin-dense',
    label: 'Latin Dense',
    style: 'latin',
    segments: [
      ['piano-montuno-dense-latin', 'piano-montuno-latin', 'piano-montuno-variant-latin'],
      ['piano-montuno-latin', 'piano-montuno-dense-latin', 'piano-montuno-dense-latin'],
      ['piano-montuno-dense-latin', 'piano-montuno-variant-latin', 'piano-montuno-latin'],
      ['piano-montuno-variant-latin', 'piano-montuno-dense-latin', 'piano-montuno-variant-latin'],
    ],
  },

  // ── Ballad cells (3) ────────────────────────────────────────────────────
  {
    id: 'piano-ballad-sparse',
    label: 'Ballad Sparse',
    style: 'ballad',
    segments: [
      ['piano-ballad-whole-ballad', 'piano-ballad-half-ballad', 'piano-ballad-whole-ballad'],
      ['piano-ballad-half-ballad', 'piano-ballad-whole-ballad', 'piano-ballad-half-ballad'],
      ['piano-ballad-whole-ballad', 'piano-ballad-half-ballad', 'piano-ballad-whole-ballad'],
      ['piano-ballad-half-ballad', 'piano-ballad-whole-ballad', 'piano-ballad-half-ballad'],
    ],
  },
  {
    id: 'piano-ballad-medium',
    label: 'Ballad Medium',
    style: 'ballad',
    segments: [
      ['piano-ballad-half-ballad', 'piano-ballad-push-ballad', 'piano-ballad-half-ballad'],
      ['piano-ballad-push-ballad', 'piano-ballad-half-ballad', 'piano-quarter-notes-ballad'],
      ['piano-ballad-half-ballad', 'piano-ballad-push-ballad', 'piano-quarter-notes-ballad'],
      ['piano-ballad-push-ballad', 'piano-ballad-half-ballad', 'piano-ballad-push-ballad'],
    ],
  },
  {
    id: 'piano-ballad-intro',
    label: 'Ballad Intro',
    style: 'ballad',
    segments: [
      ['piano-ballad-whole-ballad', 'piano-ballad-whole-ballad', 'piano-ballad-half-ballad'],
      ['piano-ballad-whole-ballad', 'piano-ballad-half-ballad', 'piano-ballad-whole-ballad'],
      ['piano-ballad-half-ballad', 'piano-ballad-half-ballad', 'piano-ballad-whole-ballad'],
      ['piano-ballad-half-ballad', 'piano-ballad-push-ballad', 'piano-ballad-half-ballad'],
    ],
  },

  // ── Extended cells: multi-lane with fill + accent (5 cells) ──────────────
  // No dedicated 'upper' lane — the 'chord' role already carries any
  // upper-structure color once `tension` engages, so a separate accent
  // lane would just re-trigger the same notes (see PIANO-EXTENDED-ARRANGEMENT-2.md).
  {
    id: 'piano-swing-extended',
    label: 'Swing Extended',
    style: 'swing',
    segments: [
      ['piano-basie-2-4-swing', 'piano-half-notes-swing', 'piano-charleston-swing'],
      ['piano-charleston-swing', 'piano-garland-swing', 'piano-basie-2-4-swing'],
      ['piano-garland-swing', 'piano-bossa-top-swing', 'piano-charleston-swing'],
      ['piano-kelly-push-swing', 'piano-garland-swing', 'piano-offbeat-2-4-swing'],
    ],
    fills: [
      {
        startBar: 3,
        lengthBars: 1,
        pool: ['piano-pass-chromatic-above-swing', 'piano-pass-diatonic-ii-v-swing'],
      },
      {
        startBar: 7,
        lengthBars: 1,
        pool: ['piano-pass-tritone-sub-swing', 'piano-pass-dim-7-swing'],
      },
    ],
    accents: [
      {
        startBar: 0,
        lengthBars: 1,
        pool: ['piano-two-and-four-swing', 'piano-anticipation-push-swing'],
      },
      {
        startBar: 4,
        lengthBars: 1,
        pool: ['piano-one-three-swing', 'piano-one-twoand-four-swing'],
      },
    ],
  },
  {
    id: 'piano-bossa-extended',
    label: 'Bossa Extended',
    style: 'bossa',
    segments: [
      ['piano-bossa-gilberto-bossa', 'piano-half-notes-bossa', 'piano-bossa-sync-bossa'],
      ['piano-bossa-sync-bossa', 'piano-bossa-gilberto-bossa', 'piano-bossa-full-bossa'],
      ['piano-bossa-full-bossa', 'piano-bossa-sync-bossa', 'piano-bossa-gilberto-bossa'],
      ['piano-bossa-gilberto-bossa', 'piano-bossa-full-bossa', 'piano-half-notes-bossa'],
    ],
    fills: [
      {
        startBar: 3,
        lengthBars: 1,
        pool: ['piano-pass-backdoor-bossa', 'piano-pass-chromatic-below-bossa'],
      },
      {
        startBar: 7,
        lengthBars: 1,
        pool: ['piano-pass-diatonic-ii-v-bossa', 'piano-pass-tritone-sub-bossa'],
      },
    ],
    accents: [
      { startBar: 0, lengthBars: 1, pool: ['piano-one-three-bossa', 'piano-bossa-sync-bossa'] },
      { startBar: 4, lengthBars: 1, pool: ['piano-charleston-bossa', 'piano-two-and-four-bossa'] },
    ],
  },
  {
    id: 'piano-funk-extended',
    label: 'Funk Extended',
    style: 'funk',
    segments: [
      ['piano-funk-sync-funk', 'piano-funk-tight-funk', 'piano-funk-sixteenths-funk'],
      ['piano-funk-tight-funk', 'piano-funk-sync-funk', 'piano-two-and-four-funk'],
      ['piano-funk-sixteenths-funk', 'piano-funk-tight-funk', 'piano-funk-sync-funk'],
      ['piano-funk-sync-funk', 'piano-funk-sixteenths-funk', 'piano-funk-tight-funk'],
    ],
    fills: [
      {
        startBar: 3,
        lengthBars: 1,
        pool: ['piano-pass-secondary-dom-funk', 'piano-pass-dim-approach-funk'],
      },
      {
        startBar: 7,
        lengthBars: 1,
        pool: ['piano-pass-dim-7-funk', 'piano-pass-chromatic-above-funk'],
      },
    ],
    accents: [
      { startBar: 0, lengthBars: 1, pool: ['piano-two-and-four-funk', 'piano-funk-tight-funk'] },
      {
        startBar: 4,
        lengthBars: 1,
        pool: ['piano-funk-sixteenths-funk', 'piano-two-and-four-funk'],
      },
    ],
  },
  {
    id: 'piano-latin-extended',
    label: 'Latin Extended',
    style: 'latin',
    segments: [
      ['piano-montuno-latin', 'piano-montuno-variant-latin', 'piano-half-notes-latin'],
      ['piano-montuno-variant-latin', 'piano-montuno-latin', 'piano-montuno-dense-latin'],
      ['piano-montuno-dense-latin', 'piano-montuno-latin', 'piano-montuno-variant-latin'],
      ['piano-montuno-latin', 'piano-montuno-dense-latin', 'piano-montuno-variant-latin'],
    ],
    fills: [
      {
        startBar: 3,
        lengthBars: 1,
        pool: ['piano-pass-single-chromatic-latin', 'piano-pass-chromatic-below-latin'],
      },
      {
        startBar: 7,
        lengthBars: 1,
        pool: ['piano-pass-enclosure-latin', 'piano-pass-diatonic-ii-v-latin'],
      },
    ],
    accents: [
      { startBar: 0, lengthBars: 1, pool: ['piano-montuno-latin', 'piano-montuno-dense-latin'] },
      { startBar: 4, lengthBars: 1, pool: ['piano-montuno-variant-latin', 'piano-montuno-latin'] },
    ],
  },
  {
    id: 'piano-ballad-extended',
    label: 'Ballad Extended',
    style: 'ballad',
    segments: [
      ['piano-ballad-half-ballad', 'piano-ballad-whole-ballad', 'piano-ballad-half-ballad'],
      ['piano-ballad-push-ballad', 'piano-ballad-half-ballad', 'piano-ballad-whole-ballad'],
      ['piano-ballad-half-ballad', 'piano-ballad-push-ballad', 'piano-quarter-notes-ballad'],
      ['piano-ballad-half-ballad', 'piano-ballad-whole-ballad', 'piano-ballad-push-ballad'],
    ],
    fills: [
      {
        startBar: 3,
        lengthBars: 1,
        pool: ['piano-pass-chromatic-below-ballad', 'piano-pass-backdoor-ballad'],
      },
      {
        startBar: 7,
        lengthBars: 1,
        pool: ['piano-pass-diatonic-ii-v-ballad', 'piano-pass-tritone-sub-ballad'],
      },
    ],
    accents: [
      {
        startBar: 0,
        lengthBars: 1,
        pool: ['piano-ballad-whole-ballad', 'piano-ballad-half-ballad'],
      },
      {
        startBar: 4,
        lengthBars: 1,
        pool: ['piano-ballad-half-ballad', 'piano-ballad-push-ballad'],
      },
    ],
  },
];

// ─── Build base registry from seeds ────────────────────────────────────────
const BASE_PIANO_CELLS: Record<string, PianoCell> = {};
const BASE_PIANO_CELL_LIST: PianoCell[] = [];

for (const seed of SEED_CELLS) {
  const extraLanes: {
    name: string;
    probability: number;
    clips: { startBar: number; lengthBars: number; pool: string[] }[];
  }[] = [];
  if (seed.fills && seed.fills.length > 0) {
    extraLanes.push({ name: 'fill', probability: 0.15, clips: seed.fills });
  }
  if (seed.accents && seed.accents.length > 0) {
    extraLanes.push({ name: 'accent', probability: 0.18, clips: seed.accents });
  }
  const draft = makeMultiCell(seed.segments, extraLanes.length > 0 ? extraLanes : undefined);
  const cell: PianoCell = { id: seed.id, style: seed.style, ...draft };
  BASE_PIANO_CELLS[seed.id] = cell;
  BASE_PIANO_CELL_LIST.push(cell);
}

/**
 * Итоговый реестр клеток. Если сгенерированный реестр (из Конструктора
 * фортепиано) непуст — он ПОЛНОСТЬЮ замещает базовый. Иначе используются
 * базовые seed-клетки.
 */
const GENERATED = GENERATED_PIANO_CELLS as Record<string, PianoCell>;

export const PIANO_CELLS: Record<string, PianoCell> =
  Object.keys(GENERATED).length > 0 ? GENERATED : BASE_PIANO_CELLS;

export const PIANO_CELL_LIST: PianoCell[] = Object.values(PIANO_CELLS);

export function getPianoCellsForStyle(style: string): PianoCell[] {
  return PIANO_CELL_LIST.filter((c) => c.style === style);
}
