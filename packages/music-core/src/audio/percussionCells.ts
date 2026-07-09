import type { PercussionCell, Lane, Clip, Dynamics } from './percussionPatternTypes.js';

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
// BOSSA cells
// ═══════════════════════════════════════════════════════════════════════════════

const bossa16Verse: PercussionCell = {
  id: 'bossa-16-verse',
  style: 'bossa',
  length: 16,
  timeSignature: [4, 4],
  velocity: 0.85,
  dynamics: WAVE,
  lanes: [
    lane('shaker', 0.95, [clip(0, 16, ['bossa-classic-shaker-clave'])]),
    lane('cabasa', 0.3, [clip(0, 16, ['bossa-cabasa-pulse'])]),
    lane('clave', 0.8, [clip(0, 16, ['bossa-classic-shaker-clave'])]),
    lane('conga', 0.7, [clip(0, 16, ['bossa-rio-conga'])]),
    lane('triangle', 0.4, [clip(0, 16, ['bossa-soft-texture'])]),
    lane('tambourine', 0.25, [clip(0, 16, ['bossa-tambourine-light'])]),
    lane('guiro', 0.2, [clip(0, 16, ['bossa-guiro-brush'])]),
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
    lane('shaker', 0.95, [clip(0, 16, ['bossa-cabasa-pulse'])]),
    lane('cabasa', 0.5, [clip(0, 16, ['bossa-cabasa-pulse'])]),
    lane('clave', 0.8, [clip(0, 16, ['bossa-partido-alto-hint'])]),
    lane('conga', 0.75, [clip(0, 16, ['bossa-partido-alto-hint'])]),
    lane('triangle', 0.35, [clip(0, 16, ['bossa-soft-texture'])]),
    lane('tambourine', 0.3, [clip(0, 16, ['bossa-tambourine-light'])]),
    lane('cowbell', 0.2, [clip(0, 16, ['bossa-cowbell-whisper'])]),
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
    lane('shaker', 0.95, [clip(0, 16, ['bossa-tambourine-light'])]),
    lane('clave', 0.7, [clip(0, 16, ['bossa-cowbell-whisper'])]),
    lane('conga', 0.5, [clip(0, 16, ['bossa-rio-conga'])]),
    lane('triangle', 0.3, [clip(0, 16, ['bossa-soft-texture'])]),
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
    lane('shaker', 0.95, [clip(0, 16, ['bossa-partido-alto-hint'])]),
    lane('cabasa', 0.5, [clip(0, 16, ['bossa-extended-color'])]),
    lane('clave', 0.85, [clip(0, 16, ['bossa-extended-color'])]),
    lane('conga', 0.8, [clip(0, 16, ['bossa-extended-color'])]),
    lane('tambourine', 0.45, [clip(0, 16, ['bossa-extended-color'])]),
    lane('triangle', 0.35, [clip(0, 16, ['bossa-cowbell-whisper'])]),
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
    lane('shaker', 0.9, [clip(0, 16, ['bossa-guiro-brush'])]),
    lane('guiro', 0.6, [clip(0, 16, ['bossa-guiro-brush'])]),
    lane('clave', 0.6, [clip(0, 16, ['bossa-guiro-brush'])]),
    lane('conga', 0.5, [clip(0, 16, ['bossa-tambourine-light'])]),
    lane('belltree', 0.15, [clip(0, 16, ['bossa-extended-color'])]),
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
    lane('shaker', 0.9, [clip(0, 16, ['bossa-minimal-jazz'])]),
    lane('clave', 0.5, [clip(0, 16, ['bossa-minimal-jazz'])]),
    lane('triangle', 0.3, [clip(0, 16, ['bossa-minimal-jazz'])]),
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
    lane('shaker', 0.9, [clip(0, 8, ['bossa-minimal-jazz'])]),
    lane('triangle', 0.4, [clip(0, 8, ['bossa-soft-texture'])]),
    lane('belltree', 0.2, [clip(0, 8, ['bossa-extended-color'])]),
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
    lane('shaker', 0.85, [clip(0, 8, ['bossa-minimal-jazz'])]),
    lane('triangle', 0.35, [clip(0, 8, ['bossa-soft-texture'])]),
    lane('belltree', 0.25, [clip(0, 8, ['bossa-extended-color'])]),
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// FUNK cells
// ═══════════════════════════════════════════════════════════════════════════════

const funk16Verse: PercussionCell = {
  id: 'funk-16-verse',
  style: 'funk',
  length: 16,
  timeSignature: [4, 4],
  velocity: 0.85,
  dynamics: WAVE,
  lanes: [
    lane('shaker', 0.9, [clip(0, 16, ['funk-tight-shaker-tambourine'])]),
    lane('tambourine', 0.7, [clip(0, 16, ['funk-tight-shaker-tambourine'])]),
    lane('cowbell', 0.3, [clip(0, 16, ['funk-cowbell-pocket'])]),
    lane('cabasa', 0.2, [clip(0, 16, ['funk-sixteenth-cabasa-drive'])]),
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
    lane('shaker', 0.9, [clip(0, 16, ['funk-cowbell-pocket'])]),
    lane('cowbell', 0.6, [clip(0, 16, ['funk-cowbell-pocket'])]),
    lane('tambourine', 0.5, [clip(0, 16, ['funk-tight-shaker-tambourine'])]),
    lane('triangle', 0.15, [clip(0, 16, ['funk-sixteenth-cabasa-drive'])]),
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
    lane('shaker', 0.95, [clip(0, 16, ['funk-disco-tambourine-layer'])]),
    lane('tambourine', 0.8, [clip(0, 16, ['funk-disco-tambourine-layer'])]),
    lane('cabasa', 0.45, [clip(0, 16, ['funk-sixteenth-cabasa-drive'])]),
    lane('cowbell', 0.4, [clip(0, 16, ['funk-disco-tambourine-layer'])]),
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
    lane('shaker', 0.85, [clip(0, 16, ['funk-sparse-breakbeat-perc'])]),
    lane('tambourine', 0.55, [clip(0, 16, ['funk-sparse-breakbeat-perc'])]),
    lane('vibraslap', 0.15, [clip(0, 16, ['funk-sparse-breakbeat-perc'])]),
    lane('cowbell', 0.25, [clip(0, 16, ['funk-cowbell-pocket'])]),
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
    lane('shaker', 0.8, [clip(0, 16, ['funk-sparse-breakbeat-perc'])]),
    lane('tambourine', 0.4, [clip(0, 16, ['funk-sparse-breakbeat-perc'])]),
    lane('triangle', 0.15, [clip(0, 16, ['funk-sixteenth-cabasa-drive'])]),
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
    lane('shaker', 0.9, [clip(0, 16, ['funk-tight-shaker-tambourine'])]),
    lane('tambourine', 0.6, [clip(0, 16, ['funk-tight-shaker-tambourine'])]),
    lane('cowbell', 0.2, [clip(0, 16, ['funk-cowbell-pocket'])]),
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
    lane('shaker', 0.85, [clip(0, 16, ['funk-cowbell-pocket'])]),
    lane('cowbell', 0.55, [clip(0, 16, ['funk-cowbell-pocket'])]),
    lane('tambourine', 0.4, [clip(0, 16, ['funk-tight-shaker-tambourine'])]),
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
    lane('shaker', 0.85, [clip(0, 8, ['funk-sparse-breakbeat-perc'])]),
    lane('tambourine', 0.4, [clip(0, 8, ['funk-sparse-breakbeat-perc'])]),
    lane('vibraslap', 0.12, [clip(0, 8, ['funk-sparse-breakbeat-perc'])]),
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
    lane('shaker', 0.8, [clip(0, 8, ['funk-sparse-breakbeat-perc'])]),
    lane('tambourine', 0.35, [clip(0, 8, ['funk-sparse-breakbeat-perc'])]),
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// LATIN cells
// ═══════════════════════════════════════════════════════════════════════════════

const latin16Verse: PercussionCell = {
  id: 'latin-16-verse',
  style: 'latin',
  length: 16,
  timeSignature: [4, 4],
  velocity: 0.85,
  dynamics: WAVE,
  lanes: [
    lane('shaker', 0.95, [clip(0, 16, ['latin-cascara-clave'])]),
    lane('clave', 0.85, [clip(0, 16, ['latin-cascara-clave'])]),
    lane('timbales', 0.6, [clip(0, 16, ['latin-cascara-clave'])]),
    lane('conga', 0.7, [clip(0, 16, ['latin-cascara-clave'])]),
    lane('cowbell', 0.4, [clip(0, 16, ['latin-cascara-clave'])]),
    lane('bongo', 0.3, [clip(0, 16, ['latin-cascara-clave'])]),
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
    lane('shaker', 0.9, [clip(0, 16, ['latin-montuno'])]),
    lane('clave', 0.8, [clip(0, 16, ['latin-montuno'])]),
    lane('timbales', 0.5, [clip(0, 16, ['latin-montuno'])]),
    lane('conga', 0.75, [clip(0, 16, ['latin-montuno'])]),
    lane('cowbell', 0.5, [clip(0, 16, ['latin-montuno'])]),
    lane('guiro', 0.3, [clip(0, 16, ['latin-montuno'])]),
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
    lane('shaker', 0.95, [clip(0, 16, ['latin-cowbell-groove'])]),
    lane('cowbell', 0.7, [clip(0, 16, ['latin-cowbell-groove'])]),
    lane('clave', 0.85, [clip(0, 16, ['latin-cowbell-groove'])]),
    lane('conga', 0.75, [clip(0, 16, ['latin-cowbell-groove'])]),
    lane('timbales', 0.5, [clip(0, 16, ['latin-cowbell-groove'])]),
    lane('guiro', 0.35, [clip(0, 16, ['latin-montuno'])]),
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
    lane('shaker', 0.85, [clip(0, 16, ['latin-montuno'])]),
    lane('clave', 0.7, [clip(0, 16, ['latin-montuno'])]),
    lane('guiro', 0.45, [clip(0, 16, ['latin-montuno'])]),
    lane('conga', 0.6, [clip(0, 16, ['latin-montuno'])]),
    lane('cowbell', 0.35, [clip(0, 16, ['latin-cowbell-groove'])]),
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
    lane('shaker', 0.85, [clip(0, 16, ['latin-sparse'])]),
    lane('clave', 0.55, [clip(0, 16, ['latin-sparse'])]),
    lane('triangle', 0.3, [clip(0, 16, ['latin-sparse'])]),
    lane('conga', 0.35, [clip(0, 16, ['latin-sparse'])]),
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
    lane('shaker', 0.95, [clip(0, 16, ['latin-montuno'])]),
    lane('clave', 0.85, [clip(0, 16, ['latin-montuno'])]),
    lane('timbales', 0.55, [clip(0, 16, ['latin-montuno'])]),
    lane('conga', 0.75, [clip(0, 16, ['latin-montuno'])]),
    lane('cowbell', 0.5, [clip(0, 16, ['latin-cowbell-groove'])]),
    lane('guiro', 0.3, [clip(0, 16, ['latin-montuno'])]),
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
    lane('shaker', 0.8, [clip(0, 8, ['latin-intro'])]),
    lane('clave', 0.55, [clip(0, 8, ['latin-intro'])]),
    lane('belltree', 0.2, [clip(0, 8, ['latin-intro'])]),
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
    lane('shaker', 0.8, [clip(0, 8, ['latin-ending'])]),
    lane('belltree', 0.3, [clip(0, 8, ['latin-ending'])]),
    lane('triangle', 0.25, [clip(0, 8, ['latin-ending'])]),
    lane('conga', 0.3, [clip(0, 8, ['latin-ending'])]),
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

export const PERCUSSION_CELLS: Record<string, PercussionCell> = BASE_PERCUSSION_CELLS;

export const PERCUSSION_CELL_LIST: PercussionCell[] = Object.values(PERCUSSION_CELLS);

export function getCellsForStyle(style: string): PercussionCell[] {
  return PERCUSSION_CELL_LIST.filter((c) => c.style === style);
}
