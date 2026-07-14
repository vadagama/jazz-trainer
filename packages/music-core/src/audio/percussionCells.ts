import type { PercussionCell, Lane, Clip, Dynamics } from './percussionPatternTypes.js';
import { GENERATED_PERCUSSION_CELLS } from './percussionCellsGenerated.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STEADY: Dynamics = { type: 'steady', amount: 0 };
const WAVE: Dynamics = { type: 'wave', amount: 0.15 };
const PULSE: Dynamics = { type: 'pulse', amount: 0.2 };

function clip(startBar: number, lengthBars: number, pool: string[]): Clip {
  return { startBar, lengthBars, pool };
}

function lane(name: string, probability: number, clips: Clip[]): Lane {
  return { name, probability, clips };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOSSA cells — each lane uses a SINGLE-INSTRUMENT molecule
// (shaker lane → shaker molecule, clave lane → clave molecule, etc.)
// Exception: conga lane uses congaHigh + congaLow + bongoLow combined molecule.
// ═══════════════════════════════════════════════════════════════════════════════

const bossa16Verse: PercussionCell = {
  id: 'bossa-16-verse',
  style: 'bossa',
  length: 16,
  timeSignature: [4, 4],
  velocity: 0.85,
  dynamics: WAVE,
  lanes: [
    lane('shaker', 0.95, [clip(0, 16, ['bossa-shaker-classic'])]),
    lane('cabasa', 0.3, [clip(0, 16, ['bossa-cabasa-16ths'])]),
    lane('clave', 0.8, [clip(0, 16, ['bossa-clave-son-32'])]),
    lane('conga', 0.7, [clip(0, 16, ['bossa-conga-rio', 'bossa-conga-color'])]),
    lane('triangle', 0.4, [clip(0, 16, ['bossa-triangle-downbeats'])]),
    lane('tambourine', 0.25, [clip(0, 16, ['bossa-tambourine-16ths'])]),
    lane('guiro', 0.2, [clip(0, 16, ['bossa-guiro-quarters'])]),
  ],
};

const bossa16VerseVar: PercussionCell = {
  id: 'bossa-16-verse-var',
  style: 'bossa',
  length: 16,
  timeSignature: [4, 4],
  velocity: 0.82,
  dynamics: WAVE,
  lanes: [
    lane('shaker', 0.95, [clip(0, 16, ['bossa-shaker-rio'])]),
    lane('cabasa', 0.5, [clip(0, 16, ['bossa-cabasa-16ths'])]),
    lane('clave', 0.8, [clip(0, 16, ['bossa-clave-partido'])]),
    lane('conga', 0.75, [clip(0, 16, ['bossa-conga-tumbao'])]),
    lane('triangle', 0.35, [clip(0, 16, ['bossa-triangle-offbeats'])]),
    lane('tambourine', 0.3, [clip(0, 16, ['bossa-tambourine-16ths'])]),
    lane('cowbell', 0.2, [clip(0, 16, ['bossa-cowbell-quarters'])]),
  ],
};

const bossa16Basic: PercussionCell = {
  id: 'bossa-16-basic',
  style: 'bossa',
  length: 16,
  timeSignature: [4, 4],
  velocity: 0.8,
  dynamics: STEADY,
  lanes: [
    lane('shaker', 0.95, [clip(0, 16, ['bossa-shaker-soft'])]),
    lane('clave', 0.7, [clip(0, 16, ['bossa-clave-light'])]),
    lane('conga', 0.5, [clip(0, 16, ['bossa-conga-rio'])]),
    lane('triangle', 0.3, [clip(0, 16, ['bossa-triangle-mixed'])]),
  ],
};

const bossa16Chorus: PercussionCell = {
  id: 'bossa-16-chorus',
  style: 'bossa',
  length: 16,
  timeSignature: [4, 4],
  velocity: 0.9,
  dynamics: PULSE,
  lanes: [
    lane('shaker', 0.95, [clip(0, 16, ['bossa-shaker-classic'])]),
    lane('cabasa', 0.5, [clip(0, 16, ['bossa-cabasa-16ths'])]),
    lane('clave', 0.85, [clip(0, 16, ['bossa-clave-sync'])]),
    lane('conga', 0.8, [clip(0, 16, ['bossa-conga-tumbao'])]),
    lane('tambourine', 0.45, [clip(0, 16, ['bossa-tambourine-8ths'])]),
    lane('triangle', 0.35, [clip(0, 16, ['bossa-triangle-mixed'])]),
  ],
};

const bossa16Bridge: PercussionCell = {
  id: 'bossa-16-bridge',
  style: 'bossa',
  length: 16,
  timeSignature: [4, 4],
  velocity: 0.82,
  dynamics: WAVE,
  lanes: [
    lane('shaker', 0.9, [clip(0, 16, ['bossa-shaker-offbeats'])]),
    lane('guiro', 0.6, [clip(0, 16, ['bossa-guiro-quarters'])]),
    lane('clave', 0.6, [clip(0, 16, ['bossa-clave-light'])]),
    lane('conga', 0.5, [clip(0, 16, ['bossa-conga-color'])]),
    lane('belltree', 0.15, [clip(0, 16, ['bossa-belltree-swell'])]),
  ],
};

const bossa16Solo: PercussionCell = {
  id: 'bossa-16-solo',
  style: 'bossa',
  length: 16,
  timeSignature: [4, 4],
  velocity: 0.7,
  dynamics: STEADY,
  lanes: [
    lane('shaker', 0.9, [clip(0, 16, ['bossa-shaker-sparse'])]),
    lane('clave', 0.5, [clip(0, 16, ['bossa-clave-light'])]),
    lane('triangle', 0.3, [clip(0, 16, ['bossa-triangle-offbeats'])]),
  ],
};

const bossa8Intro: PercussionCell = {
  id: 'bossa-8-intro',
  style: 'bossa',
  length: 8,
  timeSignature: [4, 4],
  velocity: 0.65,
  dynamics: { type: 'crescendo', amount: 0.4 },
  lanes: [
    lane('shaker', 0.9, [clip(0, 8, ['bossa-shaker-sparse'])]),
    lane('triangle', 0.4, [clip(0, 8, ['bossa-triangle-downbeats'])]),
    lane('belltree', 0.2, [clip(0, 8, ['bossa-belltree-swell'])]),
  ],
};

const bossa8Ending: PercussionCell = {
  id: 'bossa-8-ending',
  style: 'bossa',
  length: 8,
  timeSignature: [4, 4],
  velocity: 0.6,
  dynamics: { type: 'decrescendo', amount: 0.4 },
  lanes: [
    lane('shaker', 0.85, [clip(0, 8, ['bossa-shaker-sparse'])]),
    lane('triangle', 0.35, [clip(0, 8, ['bossa-triangle-downbeats'])]),
    lane('belltree', 0.25, [clip(0, 8, ['bossa-belltree-swell'])]),
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// FUNK cells — each lane uses a SINGLE-INSTRUMENT molecule
// Funk uses cabasa/tambourine pulse (no shaker). Bongo high is separate.
// Conga lane = congaHigh + congaLow + bongoLow combined.
// ═══════════════════════════════════════════════════════════════════════════════

const funk16Verse: PercussionCell = {
  id: 'funk-16-verse',
  style: 'funk',
  length: 16,
  timeSignature: [4, 4],
  velocity: 0.85,
  dynamics: WAVE,
  lanes: [
    lane('cowbell', 0.55, [clip(0, 16, ['funk-cowbell-syncopated', 'funk-cowbell-disco'])]),
    lane('triangle', 0.35, [clip(0, 16, ['funk-triangle-offbeats', 'funk-triangle-backbeat'])]),
    lane('cabasa', 0.6, [clip(0, 16, ['funk-cabasa-16ths'])]),
  ],
};

const funk16VerseVar: PercussionCell = {
  id: 'funk-16-verse-var',
  style: 'funk',
  length: 16,
  timeSignature: [4, 4],
  velocity: 0.82,
  dynamics: WAVE,
  lanes: [
    lane('conga', 0.9, [clip(0, 16, ['funk-conga-groove', 'funk-conga-tumbao'])]),
    lane('bongo', 0.75, [clip(0, 16, ['funk-bongohi-martillo', 'funk-bongohi-call'])]),
    lane('cowbell', 0.65, [clip(0, 16, ['funk-cowbell-16ths', 'funk-cowbell-syncopated'])]),
    lane('triangle', 0.4, [clip(0, 16, ['funk-triangle-offbeats', 'funk-triangle-backbeat'])]),
    lane('tambourine', 0.35, [clip(0, 16, ['funk-tambourine-16ths'])]),
  ],
};

const funk16Chorus: PercussionCell = {
  id: 'funk-16-chorus',
  style: 'funk',
  length: 16,
  timeSignature: [4, 4],
  velocity: 0.9,
  dynamics: PULSE,
  lanes: [
    lane('cowbell', 0.75, [clip(0, 16, ['funk-cowbell-disco', 'funk-cowbell-16ths'])]),
    lane('conga', 0.85, [clip(0, 16, ['funk-conga-tumbao', 'funk-conga-groove'])]),
    lane('bongo', 0.65, [clip(0, 16, ['funk-bongohi-martillo', 'funk-bongohi-call'])]),
    lane('tambourine', 0.7, [clip(0, 16, ['funk-tambourine-16ths'])]),
    lane('triangle', 0.3, [clip(0, 16, ['funk-triangle-backbeat'])]),
    lane('cabasa', 0.5, [clip(0, 16, ['funk-cabasa-16ths'])]),
  ],
};

const funk16Bridge: PercussionCell = {
  id: 'funk-16-bridge',
  style: 'funk',
  length: 16,
  timeSignature: [4, 4],
  velocity: 0.8,
  dynamics: WAVE,
  lanes: [
    lane('conga', 0.85, [clip(0, 16, ['funk-conga-groove', 'funk-congaLow-downbeats'])]),
    lane('bongo', 0.7, [clip(0, 16, ['funk-bongohi-martillo', 'funk-bongohi-call'])]),
    lane('cowbell', 0.35, [clip(0, 16, ['funk-cowbell-syncopated', 'funk-cowbell-break'])]),
    lane('triangle', 0.45, [clip(0, 16, ['funk-triangle-offbeats', 'funk-triangle-backbeat'])]),
    lane('cabasa', 0.4, [clip(0, 16, ['funk-cabasa-quiet-16ths'])]),
  ],
};

const funk16Solo: PercussionCell = {
  id: 'funk-16-solo',
  style: 'funk',
  length: 16,
  timeSignature: [4, 4],
  velocity: 0.7,
  dynamics: STEADY,
  lanes: [
    lane('conga', 0.8, [clip(0, 16, ['funk-conga-groove', 'funk-conga-tumbao'])]),
    lane('bongo', 0.55, [clip(0, 16, ['funk-bongohi-martillo'])]),
    lane('triangle', 0.4, [clip(0, 16, ['funk-triangle-offbeats', 'funk-triangle-backbeat'])]),
    lane('cabasa', 0.35, [clip(0, 16, ['funk-cabasa-quiet-16ths'])]),
  ],
};

const funk16Tight: PercussionCell = {
  id: 'funk-16-tight',
  style: 'funk',
  length: 16,
  timeSignature: [4, 4],
  velocity: 0.83,
  dynamics: STEADY,
  lanes: [
    lane('conga', 0.9, [clip(0, 16, ['funk-conga-groove', 'funk-conga-tumbao'])]),
    lane('bongo', 0.7, [clip(0, 16, ['funk-bongohi-martillo'])]),
    lane('cowbell', 0.45, [clip(0, 16, ['funk-cowbell-syncopated', 'funk-cowbell-16ths'])]),
    lane('triangle', 0.3, [clip(0, 16, ['funk-triangle-backbeat'])]),
    lane('cabasa', 0.5, [clip(0, 16, ['funk-cabasa-quiet-16ths'])]),
  ],
};

const funk16Pocket: PercussionCell = {
  id: 'funk-16-pocket',
  style: 'funk',
  length: 16,
  timeSignature: [4, 4],
  velocity: 0.82,
  dynamics: WAVE,
  lanes: [
    lane('conga', 0.85, [clip(0, 16, ['funk-conga-groove', 'funk-conga-tumbao'])]),
    lane('bongo', 0.75, [clip(0, 16, ['funk-bongohi-martillo', 'funk-bongohi-call'])]),
    lane('cowbell', 0.6, [clip(0, 16, ['funk-cowbell-syncopated', 'funk-cowbell-16ths'])]),
    lane('triangle', 0.35, [clip(0, 16, ['funk-triangle-offbeats', 'funk-triangle-backbeat'])]),
    lane('tambourine', 0.3, [clip(0, 16, ['funk-tambourine-16ths'])]),
  ],
};

const funk8Intro: PercussionCell = {
  id: 'funk-8-intro',
  style: 'funk',
  length: 8,
  timeSignature: [4, 4],
  velocity: 0.65,
  dynamics: { type: 'crescendo', amount: 0.35 },
  lanes: [
    lane('conga', 0.8, [clip(0, 8, ['funk-conga-groove'])]),
    lane('bongo', 0.55, [clip(0, 8, ['funk-bongohi-martillo'])]),
    lane('triangle', 0.4, [clip(0, 8, ['funk-triangle-offbeats'])]),
  ],
};

const funk8Ending: PercussionCell = {
  id: 'funk-8-ending',
  style: 'funk',
  length: 8,
  timeSignature: [4, 4],
  velocity: 0.6,
  dynamics: { type: 'decrescendo', amount: 0.4 },
  lanes: [
    lane('conga', 0.75, [clip(0, 8, ['funk-conga-groove'])]),
    lane('bongo', 0.5, [clip(0, 8, ['funk-bongohi-martillo'])]),
    lane('triangle', 0.35, [clip(0, 8, ['funk-triangle-offbeats'])]),
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// LATIN cells — each lane uses a SINGLE-INSTRUMENT molecule
// Shaker lane → shaker molecule, clave lane → clave molecule, etc.
// Conga lane = congaHigh + congaLow + bongoLow combined. Bongo high unused for latin.
// ═══════════════════════════════════════════════════════════════════════════════

const latin16Verse: PercussionCell = {
  id: 'latin-16-verse',
  style: 'latin',
  length: 16,
  timeSignature: [4, 4],
  velocity: 0.85,
  dynamics: WAVE,
  lanes: [
    lane('shaker', 0.95, [clip(0, 16, ['latin-shaker-8ths'])]),
    lane('clave', 0.85, [clip(0, 16, ['latin-clave-son-32'])]),
    lane('timbales', 0.6, [clip(0, 16, ['latin-timbales-cascara'])]),
    lane('conga', 0.7, [clip(0, 16, ['latin-conga-tumbao'])]),
    lane('cowbell', 0.4, [clip(0, 16, ['latin-cowbell-sparse'])]),
  ],
};

const latin16VerseVar: PercussionCell = {
  id: 'latin-16-verse-var',
  style: 'latin',
  length: 16,
  timeSignature: [4, 4],
  velocity: 0.83,
  dynamics: WAVE,
  lanes: [
    lane('shaker', 0.9, [clip(0, 16, ['latin-shaker-16ths'])]),
    lane('clave', 0.8, [clip(0, 16, ['latin-clave-son-32'])]),
    lane('timbales', 0.5, [clip(0, 16, ['latin-timbales-dense'])]),
    lane('conga', 0.75, [clip(0, 16, ['latin-conga-montuno'])]),
    lane('cowbell', 0.5, [clip(0, 16, ['latin-cowbell-sparse'])]),
    lane('guiro', 0.3, [clip(0, 16, ['latin-guiro-quarters'])]),
  ],
};

const latin16Chorus: PercussionCell = {
  id: 'latin-16-chorus',
  style: 'latin',
  length: 16,
  timeSignature: [4, 4],
  velocity: 0.9,
  dynamics: PULSE,
  lanes: [
    lane('shaker', 0.95, [clip(0, 16, ['latin-shaker-8ths'])]),
    lane('cowbell', 0.7, [clip(0, 16, ['latin-cowbell-syncopated'])]),
    lane('clave', 0.85, [clip(0, 16, ['latin-clave-son-32'])]),
    lane('conga', 0.75, [clip(0, 16, ['latin-conga-tumbao'])]),
    lane('timbales', 0.5, [clip(0, 16, ['latin-timbales-dense'])]),
    lane('guiro', 0.35, [clip(0, 16, ['latin-guiro-quarters'])]),
  ],
};

const latin16Bridge: PercussionCell = {
  id: 'latin-16-bridge',
  style: 'latin',
  length: 16,
  timeSignature: [4, 4],
  velocity: 0.82,
  dynamics: WAVE,
  lanes: [
    lane('shaker', 0.85, [clip(0, 16, ['latin-shaker-16ths'])]),
    lane('clave', 0.7, [clip(0, 16, ['latin-clave-son-32'])]),
    lane('guiro', 0.45, [clip(0, 16, ['latin-guiro-quarters'])]),
    lane('conga', 0.6, [clip(0, 16, ['latin-conga-montuno'])]),
    lane('cowbell', 0.35, [clip(0, 16, ['latin-cowbell-syncopated'])]),
  ],
};

const latin16Solo: PercussionCell = {
  id: 'latin-16-solo',
  style: 'latin',
  length: 16,
  timeSignature: [4, 4],
  velocity: 0.7,
  dynamics: STEADY,
  lanes: [
    lane('shaker', 0.85, [clip(0, 16, ['latin-shaker-sparse'])]),
    lane('clave', 0.55, [clip(0, 16, ['latin-clave-sparse'])]),
    lane('triangle', 0.3, [clip(0, 16, ['latin-triangle-sparse'])]),
    lane('conga', 0.35, [clip(0, 16, ['latin-conga-sparse'])]),
  ],
};

const latin16Montuno: PercussionCell = {
  id: 'latin-16-montuno',
  style: 'latin',
  length: 16,
  timeSignature: [4, 4],
  velocity: 0.86,
  dynamics: PULSE,
  lanes: [
    lane('shaker', 0.95, [clip(0, 16, ['latin-shaker-16ths'])]),
    lane('clave', 0.85, [clip(0, 16, ['latin-clave-son-32'])]),
    lane('timbales', 0.55, [clip(0, 16, ['latin-timbales-dense'])]),
    lane('conga', 0.75, [clip(0, 16, ['latin-conga-montuno'])]),
    lane('cowbell', 0.5, [clip(0, 16, ['latin-cowbell-syncopated'])]),
    lane('guiro', 0.3, [clip(0, 16, ['latin-guiro-quarters'])]),
  ],
};

const latin8Intro: PercussionCell = {
  id: 'latin-8-intro',
  style: 'latin',
  length: 8,
  timeSignature: [4, 4],
  velocity: 0.6,
  dynamics: { type: 'crescendo', amount: 0.35 },
  lanes: [
    lane('shaker', 0.8, [clip(0, 8, ['latin-shaker-quiet'])]),
    lane('clave', 0.55, [clip(0, 8, ['latin-clave-intro'])]),
    lane('belltree', 0.2, [clip(0, 8, ['latin-belltree-swell'])]),
  ],
};

const latin8Ending: PercussionCell = {
  id: 'latin-8-ending',
  style: 'latin',
  length: 8,
  timeSignature: [4, 4],
  velocity: 0.6,
  dynamics: { type: 'decrescendo', amount: 0.4 },
  lanes: [
    lane('shaker', 0.8, [clip(0, 8, ['latin-shaker-quiet'])]),
    lane('belltree', 0.3, [clip(0, 8, ['latin-belltree-ending'])]),
    lane('triangle', 0.25, [clip(0, 8, ['latin-triangle-sparse'])]),
    lane('conga', 0.3, [clip(0, 8, ['latin-conga-sparse'])]),
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// Registry
// ═══════════════════════════════════════════════════════════════════════════════

const BASE_PERCUSSION_CELLS: Record<string, PercussionCell> = {
  // Bossa
  'bossa-16-verse': bossa16Verse,
  'bossa-16-verse-var': bossa16VerseVar,
  'bossa-16-basic': bossa16Basic,
  'bossa-16-chorus': bossa16Chorus,
  'bossa-16-bridge': bossa16Bridge,
  'bossa-16-solo': bossa16Solo,
  'bossa-8-intro': bossa8Intro,
  'bossa-8-ending': bossa8Ending,

  // Funk
  'funk-16-verse': funk16Verse,
  'funk-16-verse-var': funk16VerseVar,
  'funk-16-chorus': funk16Chorus,
  'funk-16-bridge': funk16Bridge,
  'funk-16-solo': funk16Solo,
  'funk-16-tight': funk16Tight,
  'funk-16-pocket': funk16Pocket,
  'funk-8-intro': funk8Intro,
  'funk-8-ending': funk8Ending,

  // Latin
  'latin-16-verse': latin16Verse,
  'latin-16-verse-var': latin16VerseVar,
  'latin-16-chorus': latin16Chorus,
  'latin-16-bridge': latin16Bridge,
  'latin-16-solo': latin16Solo,
  'latin-16-montuno': latin16Montuno,
  'latin-8-intro': latin8Intro,
  'latin-8-ending': latin8Ending,
};

export const PERCUSSION_CELLS: Record<string, PercussionCell> =
  Object.keys(GENERATED_PERCUSSION_CELLS).length > 0
    ? (GENERATED_PERCUSSION_CELLS as Record<string, PercussionCell>)
    : BASE_PERCUSSION_CELLS;

export const PERCUSSION_CELL_LIST: PercussionCell[] = Object.values(PERCUSSION_CELLS);

export function getCellsForStyle(style: string): PercussionCell[] {
  return PERCUSSION_CELL_LIST.filter((c) => c.style === style);
}
