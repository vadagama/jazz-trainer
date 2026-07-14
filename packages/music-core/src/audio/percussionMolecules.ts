import type {
  PercussionMolecule,
  PercussionAtom,
  MoleculeCategory,
  PercussionSound,
} from './percussionPatternTypes.js';

// ─── Tick helpers ─────────────────────────────────────────────────────────────

const PPQ = 480;
const STEP = PPQ / 4; // 120 ticks per 16th note (16 steps per bar)

// ─── Atom helpers ─────────────────────────────────────────────────────────────

function atom(
  sound: PercussionSound,
  step: number,
  velocity: number,
  lengthSteps = 1,
): PercussionAtom {
  return {
    sound,
    atTick: Math.round(step * STEP),
    velocity,
    durationTicks: Math.round(lengthSteps * STEP),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHAKER molecules (single-instrument: shaker only)
// ═══════════════════════════════════════════════════════════════════════════════

const eighths = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30];
const quarters = [0, 4, 8, 12, 16, 20, 24, 28];

/** Shaker 8ths — accented on downbeats (multiples of 8 steps = beats 1 & 3). */
const bossaShakerClassic: PercussionMolecule = {
  id: 'bossa-shaker-classic',
  label: 'Shaker 8ths (accented downbeats)',
  style: 'bossa',
  bars: 2,
  category: 'groove',
  tags: ['shaker'],
  complexity: { min: 1, max: 3 },
  atoms: eighths.map((s) => atom('shaker', s, s % 8 === 0 ? 0.58 : 0.38)),
};

/** Shaker 8ths — accented on quarters (multiples of 4). */
const bossaShakerRio: PercussionMolecule = {
  id: 'bossa-shaker-rio',
  label: 'Shaker 8ths (quarter accents)',
  style: 'bossa',
  bars: 2,
  category: 'groove',
  tags: ['shaker'],
  complexity: { min: 1, max: 3 },
  atoms: eighths.map((s) => atom('shaker', s, s % 4 === 0 ? 0.46 : 0.3)),
};

/** Shaker 8ths — soft, for textures and solo sections. */
const bossaShakerSoft: PercussionMolecule = {
  id: 'bossa-shaker-soft',
  label: 'Shaker 8ths (soft)',
  style: 'bossa',
  bars: 2,
  category: 'texture',
  tags: ['shaker'],
  complexity: { min: 1, max: 2 },
  atoms: eighths.map((s) => atom('shaker', s, s % 8 === 0 ? 0.45 : 0.28)),
};

/** Shaker offbeat 8ths only (steps 2,6,10,14,…). */
const bossaShakerOffbeats: PercussionMolecule = {
  id: 'bossa-shaker-offbeats',
  label: 'Shaker offbeat 8ths',
  style: 'bossa',
  bars: 2,
  category: 'texture',
  tags: ['shaker'],
  complexity: { min: 1, max: 2 },
  atoms: [2, 6, 10, 14, 18, 22, 26, 30].map((s) => atom('shaker', s, 0.24)),
};

/** Shaker sparse — quarters only (steps 0,4,8,…). */
const bossaShakerSparse: PercussionMolecule = {
  id: 'bossa-shaker-sparse',
  label: 'Shaker sparse (quarters)',
  style: 'bossa',
  bars: 2,
  category: 'texture',
  tags: ['shaker'],
  complexity: { min: 1, max: 1 },
  atoms: quarters.map((s) => atom('shaker', s, 0.32)),
};

/** Latin shaker 8ths — medium pulse. */
const latinShaker8ths: PercussionMolecule = {
  id: 'latin-shaker-8ths',
  label: 'Shaker 8ths (medium)',
  style: 'latin',
  bars: 2,
  category: 'groove',
  tags: ['shaker'],
  complexity: { min: 1, max: 3 },
  atoms: eighths.map((s) => atom('shaker', s, s % 2 === 0 ? 0.48 : 0.28)),
};

/** Latin shaker 16ths — dense bed for montuno. */
const latinShaker16ths: PercussionMolecule = {
  id: 'latin-shaker-16ths',
  label: 'Shaker 16ths (dense)',
  style: 'latin',
  bars: 2,
  category: 'groove',
  tags: ['shaker'],
  complexity: { min: 2, max: 3 },
  atoms: Array.from({ length: 32 }, (_, s) =>
    atom('shaker', s, s % 4 === 0 ? 0.5 : s % 2 === 0 ? 0.34 : 0.2),
  ),
};

/** Latin shaker sparse — quarters only for intro/ending. */
const latinShakerSparse: PercussionMolecule = {
  id: 'latin-shaker-sparse',
  label: 'Shaker sparse (quarters)',
  style: 'latin',
  bars: 2,
  category: 'texture',
  tags: ['shaker'],
  complexity: { min: 1, max: 1 },
  atoms: quarters.map((s) => atom('shaker', s, 0.32)),
};

/** Latin shaker sparse — quieter, for intro/ending. */
const latinShakerQuiet: PercussionMolecule = {
  id: 'latin-shaker-quiet',
  label: 'Shaker sparse (quiet)',
  style: 'latin',
  bars: 2,
  category: 'intro',
  tags: ['shaker'],
  complexity: { min: 1, max: 1 },
  atoms: quarters.map((s) => atom('shaker', s, 0.3)),
};

// ═══════════════════════════════════════════════════════════════════════════════
// CLAVE molecules (single-instrument: clave only)
// ═══════════════════════════════════════════════════════════════════════════════

/** Son clave 3-2 — bossa classic (5 hits over 2 bars). */
const bossaClaveSon32: PercussionMolecule = {
  id: 'bossa-clave-son-32',
  label: 'Son clave 3-2',
  style: 'bossa',
  bars: 2,
  category: 'groove',
  tags: ['clave'],
  complexity: { min: 1, max: 3 },
  atoms: [
    atom('clave', 0, 0.78),
    atom('clave', 6, 0.62),
    atom('clave', 10, 0.7),
    atom('clave', 16, 0.72),
    atom('clave', 24, 0.64),
  ],
};

/** Light clave — sparse 3-hit hints (from rio / cowbell-whisper). */
const bossaClaveLight: PercussionMolecule = {
  id: 'bossa-clave-light',
  label: 'Clave light (3 hints)',
  style: 'bossa',
  bars: 2,
  category: 'groove',
  tags: ['clave'],
  complexity: { min: 1, max: 2 },
  atoms: [
    atom('clave', 0, 0.48),
    atom('clave', 10, 0.42),
    atom('clave', 24, 0.44),
  ],
};

/** Partido-alto clave — 12 hits over 2 bars (from partido-alto-hint). */
const bossaClavePartido: PercussionMolecule = {
  id: 'bossa-clave-partido',
  label: 'Partido-alto clave',
  style: 'bossa',
  bars: 2,
  category: 'groove',
  tags: ['clave'],
  complexity: { min: 2, max: 3 },
  atoms: [
    atom('clave', 0, 0.62),
    atom('clave', 5, 0.34),
    atom('clave', 6, 0.54),
    atom('clave', 10, 0.48),
    atom('clave', 12, 0.58),
    atom('clave', 15, 0.52),
    atom('clave', 16, 0.62),
    atom('clave', 20, 0.36),
    atom('clave', 22, 0.56),
    atom('clave', 24, 0.5),
    atom('clave', 28, 0.6),
    atom('clave', 30, 0.34),
    atom('clave', 31, 0.48),
  ],
};

/** Syncopated clave — 8 hits from extended-color. */
const bossaClaveSync: PercussionMolecule = {
  id: 'bossa-clave-sync',
  label: 'Syncopated clave',
  style: 'bossa',
  bars: 2,
  category: 'groove',
  tags: ['clave'],
  complexity: { min: 2, max: 3 },
  atoms: [
    atom('clave', 0, 0.7),
    atom('clave', 6, 0.58),
    atom('clave', 10, 0.54),
    atom('clave', 12, 0.62),
    atom('clave', 16, 0.68),
    atom('clave', 22, 0.56),
    atom('clave', 26, 0.52),
    atom('clave', 28, 0.6),
  ],
};

/** Latin son clave 3-2 (from cascara-clave + cowbell-groove). */
const latinClaveSon32: PercussionMolecule = {
  id: 'latin-clave-son-32',
  label: 'Son clave 3-2',
  style: 'latin',
  bars: 2,
  category: 'groove',
  tags: ['clave'],
  complexity: { min: 1, max: 3 },
  atoms: [
    atom('clave', 0, 0.78),
    atom('clave', 6, 0.62),
    atom('clave', 12, 0.7),
    atom('clave', 20, 0.72),
    atom('clave', 26, 0.64),
  ],
};

/** Latin son clave 3-2 — lighter velocity (for sparse sections). */
const latinClaveSparse: PercussionMolecule = {
  id: 'latin-clave-sparse',
  label: 'Son clave 3-2 (sparse)',
  style: 'latin',
  bars: 2,
  category: 'texture',
  tags: ['clave'],
  complexity: { min: 1, max: 2 },
  atoms: [
    atom('clave', 0, 0.56),
    atom('clave', 6, 0.44),
    atom('clave', 12, 0.5),
    atom('clave', 20, 0.52),
    atom('clave', 26, 0.44),
  ],
};

/** Latin clave for intro — just 3 hits. */
const latinClaveIntro: PercussionMolecule = {
  id: 'latin-clave-intro',
  label: 'Clave intro (3 hits)',
  style: 'latin',
  bars: 2,
  category: 'intro',
  tags: ['clave'],
  complexity: { min: 1, max: 1 },
  atoms: [
    atom('clave', 0, 0.48),
    atom('clave', 12, 0.44),
    atom('clave', 20, 0.46),
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONGA + BONGOLOW molecules (allowed combo: congaHigh + congaLow + bongoLow)
// ═══════════════════════════════════════════════════════════════════════════════

/** Bossa conga color — congaHigh/congaLow alternation on last 16th of each beat. */
const bossaCongaColor: PercussionMolecule = {
  id: 'bossa-conga-color',
  label: 'Conga color (Hi/Lo alternation)',
  style: 'bossa',
  bars: 2,
  category: 'groove',
  tags: ['conga'],
  complexity: { min: 1, max: 3 },
  atoms: [
    atom('congaHigh', 7, 0.42),
    atom('congaLow', 15, 0.52),
    atom('congaHigh', 23, 0.38),
    atom('congaLow', 31, 0.48),
    // bongoLow anchor
    atom('bongoLow', 8, 0.35),
    atom('bongoLow', 24, 0.33),
  ],
};

/** Bossa Rio conga — call-response pattern (10 conga hits). */
const bossaCongaRio: PercussionMolecule = {
  id: 'bossa-conga-rio',
  label: 'Rio conga call-response',
  style: 'bossa',
  bars: 2,
  category: 'groove',
  tags: ['conga'],
  complexity: { min: 1, max: 3 },
  atoms: [
    atom('congaHigh', 3, 0.42),
    atom('congaHigh', 6, 0.58),
    atom('congaLow', 8, 0.5),
    atom('congaHigh', 11, 0.36),
    atom('congaLow', 15, 0.62),
    atom('congaHigh', 19, 0.4),
    atom('congaHigh', 22, 0.56),
    atom('congaLow', 24, 0.48),
    atom('congaHigh', 27, 0.34),
    atom('congaLow', 31, 0.58),
    // bongoLow anchors
    atom('bongoLow', 0, 0.42),
    atom('bongoLow', 16, 0.4),
  ],
};

/** Bossa basic tumbao — congaLow on & of 1 and 3, congaHigh fills. */
const bossaCongaTumbao: PercussionMolecule = {
  id: 'bossa-conga-tumbao',
  label: 'Conga tumbao (basic)',
  style: 'bossa',
  bars: 2,
  category: 'groove',
  tags: ['conga'],
  complexity: { min: 1, max: 3 },
  atoms: [
    atom('congaHigh', 2, 0.42),
    atom('congaLow', 6, 0.58),
    atom('congaHigh', 10, 0.38),
    atom('congaLow', 14, 0.62),
    atom('congaHigh', 18, 0.4),
    atom('congaLow', 22, 0.56),
    atom('congaHigh', 26, 0.36),
    atom('congaLow', 30, 0.6),
    // bongoLow
    atom('bongoLow', 0, 0.4),
    atom('bongoLow', 8, 0.38),
    atom('bongoLow', 16, 0.4),
    atom('bongoLow', 24, 0.38),
  ],
};

/** Bossa conga sparse — just congaLow on last beat accents. */
const bossaCongaSparse: PercussionMolecule = {
  id: 'bossa-conga-sparse',
  label: 'Conga sparse (low accents)',
  style: 'bossa',
  bars: 2,
  category: 'texture',
  tags: ['conga'],
  complexity: { min: 1, max: 2 },
  atoms: [
    atom('congaLow', 15, 0.36),
    atom('congaLow', 31, 0.34),
  ],
};

/** Funk conga tumbao — funky tumbao with congaHigh/congaLow syncopation. */
const funkCongaTumbao: PercussionMolecule = {
  id: 'funk-conga-tumbao',
  label: 'Funk tumbao',
  style: 'funk',
  bars: 2,
  category: 'groove',
  tags: ['conga'],
  complexity: { min: 2, max: 3 },
  atoms: [
    atom('congaLow', 1, 0.6),
    atom('congaHigh', 2, 0.44),
    atom('congaHigh', 3, 0.42),
    atom('congaHigh', 6, 0.46),
    atom('congaLow', 7, 0.56),
    atom('congaHigh', 9, 0.4),
    atom('congaHigh', 10, 0.42),
    atom('congaLow', 11, 0.58),
    atom('congaHigh', 14, 0.44),
    atom('congaLow', 15, 0.62),
    atom('congaLow', 17, 0.6),
    atom('congaHigh', 18, 0.44),
    atom('congaHigh', 19, 0.42),
    atom('congaHigh', 22, 0.46),
    atom('congaLow', 23, 0.56),
    atom('congaHigh', 25, 0.4),
    atom('congaHigh', 26, 0.42),
    atom('congaLow', 27, 0.58),
    atom('congaHigh', 30, 0.44),
    atom('congaLow', 31, 0.62),
    // bongoLow fills
    atom('bongoLow', 7, 0.38),
    atom('bongoLow', 15, 0.42),
    atom('bongoLow', 23, 0.38),
    atom('bongoLow', 31, 0.42),
  ],
};

/** Funk conga groove — syncopated Hi/Lo call-response + bongoLow offbeat anchors. */
const funkCongaGroove: PercussionMolecule = {
  id: 'funk-conga-groove',
  label: 'Conga pocket groove',
  style: 'funk',
  bars: 2,
  category: 'groove',
  tags: ['conga'],
  complexity: { min: 1, max: 3 },
  atoms: [
    atom('congaHigh', 3, 0.48),
    atom('congaLow', 4, 0.65),
    atom('congaHigh', 7, 0.52),
    atom('congaLow', 8, 0.62),
    atom('congaHigh', 11, 0.46),
    atom('congaLow', 12, 0.58),
    atom('congaHigh', 15, 0.54),
    atom('congaHigh', 19, 0.46),
    atom('congaLow', 20, 0.62),
    atom('congaHigh', 23, 0.5),
    atom('congaLow', 24, 0.58),
    atom('congaHigh', 27, 0.44),
    atom('congaLow', 28, 0.56),
    atom('congaHigh', 31, 0.52),
    // bongoLow offbeat anchors
    atom('bongoLow', 2, 0.38),
    atom('bongoLow', 6, 0.36),
    atom('bongoLow', 10, 0.36),
    atom('bongoLow', 14, 0.34),
    atom('bongoLow', 18, 0.38),
    atom('bongoLow', 22, 0.34),
    atom('bongoLow', 26, 0.36),
    atom('bongoLow', 30, 0.32),
  ],
};

/** Funk congaLow downbeats — just bongoLow/congaLow anchors on strong beats. */
const funkCongaLowDownbeats: PercussionMolecule = {
  id: 'funk-congaLow-downbeats',
  label: 'Conga low downbeats',
  style: 'funk',
  bars: 2,
  category: 'groove',
  tags: ['conga'],
  complexity: { min: 1, max: 2 },
  atoms: [
    atom('congaLow', 0, 0.56),
    atom('congaLow', 8, 0.54),
    atom('congaLow', 16, 0.56),
    atom('congaLow', 24, 0.54),
    atom('bongoLow', 0, 0.48),
    atom('bongoLow', 8, 0.46),
    atom('bongoLow', 16, 0.48),
    atom('bongoLow', 24, 0.46),
  ],
};

/** Latin tumbao — classic pattern: congaLow on & of 2 and 4, congaHigh fills. */
const latinCongaTumbao: PercussionMolecule = {
  id: 'latin-conga-tumbao',
  label: 'Conga tumbao',
  style: 'latin',
  bars: 2,
  category: 'groove',
  tags: ['conga'],
  complexity: { min: 1, max: 3 },
  atoms: [
    atom('congaHigh', 2, 0.42),
    atom('congaLow', 6, 0.58),
    atom('congaHigh', 10, 0.38),
    atom('congaLow', 14, 0.62),
    atom('congaHigh', 18, 0.4),
    atom('congaLow', 22, 0.56),
    atom('congaHigh', 26, 0.36),
    atom('congaLow', 30, 0.6),
    // bongoLow anchors
    atom('bongoLow', 0, 0.4),
    atom('bongoLow', 8, 0.38),
    atom('bongoLow', 16, 0.4),
    atom('bongoLow', 24, 0.38),
  ],
};

/** Latin montuno conga — denser pattern for chorus/montuno sections. */
const latinCongaMontuno: PercussionMolecule = {
  id: 'latin-conga-montuno',
  label: 'Conga montuno (dense)',
  style: 'latin',
  bars: 2,
  category: 'groove',
  tags: ['conga'],
  complexity: { min: 2, max: 3 },
  atoms: [
    atom('congaHigh', 2, 0.44),
    atom('congaLow', 6, 0.62),
    atom('congaHigh', 10, 0.42),
    atom('congaLow', 14, 0.66),
    atom('congaHigh', 18, 0.42),
    atom('congaLow', 22, 0.6),
    atom('congaHigh', 26, 0.4),
    atom('congaLow', 30, 0.64),
    // bongoLow anchors
    atom('bongoLow', 0, 0.42),
    atom('bongoLow', 8, 0.4),
    atom('bongoLow', 16, 0.42),
    atom('bongoLow', 24, 0.4),
  ],
};

/** Latin conga sparse — just congaLow accents for solo/intro. */
const latinCongaSparse: PercussionMolecule = {
  id: 'latin-conga-sparse',
  label: 'Conga sparse (low accents)',
  style: 'latin',
  bars: 2,
  category: 'texture',
  tags: ['conga'],
  complexity: { min: 1, max: 1 },
  atoms: [
    atom('congaHigh', 7, 0.3),
    atom('congaLow', 15, 0.36),
    atom('congaHigh', 23, 0.28),
    atom('congaLow', 31, 0.34),
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// COWBELL molecules (single-instrument: cowbell only)
// ═══════════════════════════════════════════════════════════════════════════════

/** Bossa cowbell quarters — on 1,2,3,4 of each bar. */
const bossaCowbellQuarters: PercussionMolecule = {
  id: 'bossa-cowbell-quarters',
  label: 'Cowbell quarters',
  style: 'bossa',
  bars: 2,
  category: 'groove',
  tags: ['cowbell'],
  complexity: { min: 1, max: 2 },
  atoms: [0, 4, 8, 12, 16, 20, 24, 28].map((s) => atom('cowbell', s, 0.52)),
};

/** Bossa cowbell syncopated — complex grid from cowbell-whisper. */
const bossaCowbellSyncopated: PercussionMolecule = {
  id: 'bossa-cowbell-syncopated',
  label: 'Cowbell syncopated',
  style: 'bossa',
  bars: 2,
  category: 'groove',
  tags: ['cowbell'],
  complexity: { min: 2, max: 3 },
  atoms: [
    atom('cowbell', 0, 0.64),
    atom('cowbell', 3, 0.34),
    atom('cowbell', 4, 0.5),
    atom('cowbell', 6, 0.58),
    atom('cowbell', 8, 0.56),
    atom('cowbell', 12, 0.54),
    atom('cowbell', 14, 0.36),
    atom('cowbell', 16, 0.62),
    atom('cowbell', 19, 0.32),
    atom('cowbell', 20, 0.48),
    atom('cowbell', 22, 0.56),
    atom('cowbell', 24, 0.52),
    atom('cowbell', 28, 0.5),
    atom('cowbell', 30, 0.34),
  ],
};

/** Funk cowbell syncopated — sparse syncopated accents, leaves space for conga. */
const funkCowbellSyncopated: PercussionMolecule = {
  id: 'funk-cowbell-syncopated',
  label: 'Cowbell syncopated (sparse)',
  style: 'funk',
  bars: 2,
  category: 'groove',
  tags: ['cowbell'],
  complexity: { min: 1, max: 2 },
  atoms: [
    // Bar 1: strong 1, a-of-2, e-of-3
    atom('cowbell', 0, 0.72),
    atom('cowbell', 7, 0.52),
    atom('cowbell', 11, 0.48),
    // Bar 2: strong 1, a-of-2, 4
    atom('cowbell', 16, 0.72),
    atom('cowbell', 22, 0.54),
    atom('cowbell', 28, 0.56),
  ],
};

/** Funk cowbell disco — sparse accent hits on 1 and 3, one variation per bar. */
const funkCowbellDisco: PercussionMolecule = {
  id: 'funk-cowbell-disco',
  label: 'Cowbell sparse accents',
  style: 'funk',
  bars: 2,
  category: 'groove',
  tags: ['cowbell'],
  complexity: { min: 1, max: 2 },
  atoms: [
    // Bar 1: 1 (strong), & of 2, 3
    atom('cowbell', 0, 0.72),
    atom('cowbell', 6, 0.48),
    atom('cowbell', 8, 0.64),
    // Bar 2: 1 (strong), 3, a of 4
    atom('cowbell', 16, 0.72),
    atom('cowbell', 24, 0.62),
    atom('cowbell', 31, 0.46),
  ],
};

/** Funk cowbell 16ths — advanced syncopated accents, sparse but sophisticated. */
const funkCowbell16ths: PercussionMolecule = {
  id: 'funk-cowbell-16ths',
  label: 'Cowbell advanced accents',
  style: 'funk',
  bars: 2,
  category: 'groove',
  tags: ['cowbell'],
  complexity: { min: 3, max: 3 },
  atoms: [
    // Bar 1: 1, e-of-1, a-of-2, 3, e-of-3, a-of-3
    atom('cowbell', 0, 0.72),
    atom('cowbell', 3, 0.46),
    atom('cowbell', 7, 0.52),
    atom('cowbell', 8, 0.66),
    atom('cowbell', 11, 0.42),
    atom('cowbell', 14, 0.48),
    // Bar 2: 1, e-of-2, a-of-2, 3, e-of-4, a-of-4
    atom('cowbell', 16, 0.72),
    atom('cowbell', 19, 0.48),
    atom('cowbell', 22, 0.54),
    atom('cowbell', 24, 0.64),
    atom('cowbell', 27, 0.42),
    atom('cowbell', 30, 0.5),
  ],
};

/** Funk cowbell break — punchy syncopated riff for fills/transitions. */
const funkCowbellBreak: PercussionMolecule = {
  id: 'funk-cowbell-break',
  label: 'Cowbell break riff',
  style: 'funk',
  bars: 1,
  category: 'fill',
  tags: ['cowbell'],
  complexity: { min: 2, max: 3 },
  atoms: [
    atom('cowbell', 0, 0.74),
    atom('cowbell', 3, 0.52),
    atom('cowbell', 6, 0.56),
    atom('cowbell', 8, 0.68),
    atom('cowbell', 10, 0.48),
    atom('cowbell', 12, 0.72),
    atom('cowbell', 15, 0.58),
  ],
};

/** Latin cowbell syncopated — from cowbell-groove. */
const latinCowbellSyncopated: PercussionMolecule = {
  id: 'latin-cowbell-syncopated',
  label: 'Cowbell syncopated',
  style: 'latin',
  bars: 2,
  category: 'groove',
  tags: ['cowbell'],
  complexity: { min: 1, max: 3 },
  atoms: [
    atom('cowbell', 0, 0.64),
    atom('cowbell', 3, 0.34),
    atom('cowbell', 6, 0.48),
    atom('cowbell', 10, 0.56),
    atom('cowbell', 16, 0.62),
    atom('cowbell', 19, 0.32),
    atom('cowbell', 22, 0.44),
    atom('cowbell', 27, 0.54),
  ],
};

/** Latin cowbell sparse — just on 1 and 3 of each bar. */
const latinCowbellSparse: PercussionMolecule = {
  id: 'latin-cowbell-sparse',
  label: 'Cowbell sparse (1 & 3)',
  style: 'latin',
  bars: 2,
  category: 'groove',
  tags: ['cowbell'],
  complexity: { min: 1, max: 1 },
  atoms: [0, 8, 16, 24].map((s) => atom('cowbell', s, 0.5)),
};

// ═══════════════════════════════════════════════════════════════════════════════
// TIMBALES molecules (single-instrument: timbales only, latin only)
// ═══════════════════════════════════════════════════════════════════════════════

/** Timbales cascara basic — traditional cascara pattern. */
const latinTimbalesCascara: PercussionMolecule = {
  id: 'latin-timbales-cascara',
  label: 'Timbales cascara',
  style: 'latin',
  bars: 2,
  category: 'groove',
  tags: ['timbales'],
  complexity: { min: 1, max: 2 },
  atoms: [
    atom('timbales', 0, 0.65),
    atom('timbales', 4, 0.55),
    atom('timbales', 6, 0.6),
    atom('timbales', 8, 0.58),
    atom('timbales', 12, 0.62),
    atom('timbales', 16, 0.65),
    atom('timbales', 20, 0.55),
    atom('timbales', 24, 0.6),
    atom('timbales', 28, 0.58),
  ],
};

/** Timbales cascara dense — for montuno/chorus sections. */
const latinTimbalesDense: PercussionMolecule = {
  id: 'latin-timbales-dense',
  label: 'Timbales cascara (dense)',
  style: 'latin',
  bars: 2,
  category: 'groove',
  tags: ['timbales'],
  complexity: { min: 2, max: 3 },
  atoms: [
    atom('timbales', 0, 0.6),
    atom('timbales', 4, 0.52),
    atom('timbales', 8, 0.56),
    atom('timbales', 12, 0.58),
    atom('timbales', 16, 0.6),
    atom('timbales', 20, 0.52),
    atom('timbales', 24, 0.56),
    atom('timbales', 28, 0.58),
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// GUIRO molecules (single-instrument: guiro only)
// ═══════════════════════════════════════════════════════════════════════════════

/** Bossa guiro quarters — scrape on each beat. */
const bossaGuiroQuarters: PercussionMolecule = {
  id: 'bossa-guiro-quarters',
  label: 'Guiro quarters',
  style: 'bossa',
  bars: 2,
  category: 'texture',
  tags: ['guiro'],
  complexity: { min: 1, max: 2 },
  atoms: quarters.map((s) => atom('guiro', s, 0.42, 2)),
};

/** Bossa guiro sparse — from extended-color: just 2 scrapes. */
const bossaGuiroSparse: PercussionMolecule = {
  id: 'bossa-guiro-sparse',
  label: 'Guiro sparse (2 scrapes)',
  style: 'bossa',
  bars: 2,
  category: 'texture',
  tags: ['guiro'],
  complexity: { min: 1, max: 1 },
  atoms: [2, 18].map((s) => atom('guiro', s, 0.32, 2)),
};

/** Latin guiro quarters — scrape on offbeat quarters. */
const latinGuiroQuarters: PercussionMolecule = {
  id: 'latin-guiro-quarters',
  label: 'Guiro quarters',
  style: 'latin',
  bars: 2,
  category: 'texture',
  tags: ['guiro'],
  complexity: { min: 1, max: 2 },
  atoms: [3, 11, 19, 27].map((s) => atom('guiro', s, 0.34, 2)),
};

// ═══════════════════════════════════════════════════════════════════════════════
// TRIANGLE molecules (single-instrument: triangle only)
// ═══════════════════════════════════════════════════════════════════════════════

/** Bossa triangle downbeats — just on bar transitions (1 of each bar). */
const bossaTriangleDownbeats: PercussionMolecule = {
  id: 'bossa-triangle-downbeats',
  label: 'Triangle downbeats',
  style: 'bossa',
  bars: 2,
  category: 'texture',
  tags: ['triangle'],
  complexity: { min: 1, max: 1 },
  atoms: [
    atom('triangle', 0, 0.38),
    atom('triangle', 16, 0.34),
  ],
};

/** Bossa triangle offbeats — all 16 offbeat 8th notes. */
const bossaTriangleOffbeats: PercussionMolecule = {
  id: 'bossa-triangle-offbeats',
  label: 'Triangle offbeat 8ths',
  style: 'bossa',
  bars: 2,
  category: 'texture',
  tags: ['triangle'],
  complexity: { min: 1, max: 2 },
  atoms: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31].map(
    (s) => atom('triangle', s, 0.3),
  ),
};

/** Bossa triangle mixed — sparse mixed pattern from extended-color. */
const bossaTriangleMixed: PercussionMolecule = {
  id: 'bossa-triangle-mixed',
  label: 'Triangle mixed (sparse)',
  style: 'bossa',
  bars: 2,
  category: 'texture',
  tags: ['triangle'],
  complexity: { min: 1, max: 2 },
  atoms: [
    atom('triangle', 0, 0.3),
    atom('triangle', 18, 0.26),
  ],
};



/** Funk triangle offbeat 8ths — all 16 offbeats. */
const funkTriangleOffbeats: PercussionMolecule = {
  id: 'funk-triangle-offbeats',
  label: 'Triangle offbeat 8ths',
  style: 'funk',
  bars: 2,
  category: 'texture',
  tags: ['triangle'],
  complexity: { min: 1, max: 2 },
  atoms: [
    atom('triangle', 1, 0.38), atom('triangle', 3, 0.34),
    atom('triangle', 5, 0.36), atom('triangle', 7, 0.4),
    atom('triangle', 9, 0.34), atom('triangle', 11, 0.32),
    atom('triangle', 13, 0.36), atom('triangle', 15, 0.42),
    atom('triangle', 17, 0.38), atom('triangle', 19, 0.34),
    atom('triangle', 21, 0.36), atom('triangle', 23, 0.4),
    atom('triangle', 25, 0.34), atom('triangle', 27, 0.32),
    atom('triangle', 29, 0.36), atom('triangle', 31, 0.44),
  ],
};

/** Funk triangle backbeat — on the "and" of 2 and 4. */
const funkTriangleBackbeat: PercussionMolecule = {
  id: 'funk-triangle-backbeat',
  label: 'Triangle backbeat accents',
  style: 'funk',
  bars: 2,
  category: 'texture',
  tags: ['triangle'],
  complexity: { min: 1, max: 2 },
  atoms: [
    atom('triangle', 5, 0.44),
    atom('triangle', 13, 0.46),
    atom('triangle', 21, 0.44),
    atom('triangle', 29, 0.46),
    // occasional fills
    atom('triangle', 1, 0.3), atom('triangle', 9, 0.28),
    atom('triangle', 17, 0.3), atom('triangle', 25, 0.28),
  ],
};

/** Funk triangle 8ths — light pulse on all 8th notes. */
const funkTriangle8ths: PercussionMolecule = {
  id: 'funk-triangle-8ths',
  label: 'Triangle 8ths pulse',
  style: 'funk',
  bars: 2,
  category: 'texture',
  tags: ['triangle'],
  complexity: { min: 1, max: 1 },
  atoms: eighths.map((s) => atom('triangle', s, s % 4 === 0 ? 0.32 : 0.22)),
};

/** Latin triangle sparse — two hits for intro/ending. */
const latinTriangleSparse: PercussionMolecule = {
  id: 'latin-triangle-sparse',
  label: 'Triangle sparse (2 hits)',
  style: 'latin',
  bars: 2,
  category: 'texture',
  tags: ['triangle'],
  complexity: { min: 1, max: 1 },
  atoms: [
    atom('triangle', 14, 0.22),
    atom('triangle', 30, 0.24),
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// CABASA molecules (single-instrument: cabasa only)
// ═══════════════════════════════════════════════════════════════════════════════

/** Bossa cabasa 16ths — steady pulse bed. */
const bossaCabasa16ths: PercussionMolecule = {
  id: 'bossa-cabasa-16ths',
  label: 'Cabasa 16ths pulse',
  style: 'bossa',
  bars: 2,
  category: 'groove',
  tags: ['cabasa'],
  complexity: { min: 1, max: 3 },
  atoms: Array.from({ length: 32 }, (_, s) =>
    atom('cabasa', s, s % 4 === 0 ? 0.46 : s % 2 === 0 ? 0.34 : 0.2),
  ),
};

/** Funk cabasa 16ths — steady bed for groove. */
const funkCabasa16ths: PercussionMolecule = {
  id: 'funk-cabasa-16ths',
  label: 'Cabasa 16ths pulse',
  style: 'funk',
  bars: 2,
  category: 'groove',
  tags: ['cabasa'],
  complexity: { min: 1, max: 2 },
  atoms: Array.from({ length: 32 }, (_, s) =>
    atom('cabasa', s, s % 4 === 0 ? 0.44 : s % 2 === 0 ? 0.32 : 0.22),
  ),
};

/** Funk cabasa 8ths — medium pulse. */
const funkCabasa8ths: PercussionMolecule = {
  id: 'funk-cabasa-8ths',
  label: 'Cabasa 8ths pulse',
  style: 'funk',
  bars: 2,
  category: 'groove',
  tags: ['cabasa'],
  complexity: { min: 1, max: 2 },
  atoms: eighths.map((s) => atom('cabasa', s, s % 4 === 0 ? 0.4 : 0.28)),
};

/** Funk cabasa quiet 16ths — for texture sections. */
const funkCabasaQuiet16ths: PercussionMolecule = {
  id: 'funk-cabasa-quiet-16ths',
  label: 'Cabasa 16ths (quiet)',
  style: 'funk',
  bars: 2,
  category: 'texture',
  tags: ['cabasa'],
  complexity: { min: 1, max: 1 },
  atoms: Array.from({ length: 32 }, (_, s) => atom('cabasa', s, 0.28)),
};

/** Funk cabasa very quiet 16ths — for sparse textures. */
const funkCabasaQuietest16ths: PercussionMolecule = {
  id: 'funk-cabasa-quietest-16ths',
  label: 'Cabasa 16ths (very quiet)',
  style: 'funk',
  bars: 2,
  category: 'texture',
  tags: ['cabasa'],
  complexity: { min: 1, max: 1 },
  atoms: Array.from({ length: 32 }, (_, s) => atom('cabasa', s, 0.22)),
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAMBOURINE molecules (single-instrument: tambourine only)
// ═══════════════════════════════════════════════════════════════════════════════

/** Bossa tambourine 16ths — from tambourine-light. */
const bossaTambourine16ths: PercussionMolecule = {
  id: 'bossa-tambourine-16ths',
  label: 'Tambourine 16ths',
  style: 'bossa',
  bars: 2,
  category: 'groove',
  tags: ['tambourine'],
  complexity: { min: 1, max: 2 },
  atoms: Array.from({ length: 32 }, (_, s) =>
    atom('tambourine', s, s % 4 === 0 ? 0.52 : s % 2 === 0 ? 0.38 : 0.28),
  ),
};

/** Bossa tambourine 8ths — from extended-color. */
const bossaTambourine8ths: PercussionMolecule = {
  id: 'bossa-tambourine-8ths',
  label: 'Tambourine 8ths',
  style: 'bossa',
  bars: 2,
  category: 'groove',
  tags: ['tambourine'],
  complexity: { min: 1, max: 2 },
  atoms: eighths.map((s) => atom('tambourine', s, s % 4 === 0 ? 0.48 : 0.32)),
};

/** Funk tambourine 16ths — disco bed. */
const funkTambourine16ths: PercussionMolecule = {
  id: 'funk-tambourine-16ths',
  label: 'Tambourine 16ths',
  style: 'funk',
  bars: 2,
  category: 'groove',
  tags: ['tambourine'],
  complexity: { min: 1, max: 2 },
  atoms: Array.from({ length: 32 }, (_, s) =>
    atom('tambourine', s, s % 4 === 0 ? 0.52 : s % 2 === 0 ? 0.38 : 0.28),
  ),
};

// ═══════════════════════════════════════════════════════════════════════════════
// BONGO HIGH molecules (single-instrument: bongoHigh only — separate from conga combo)
// ═══════════════════════════════════════════════════════════════════════════════

/** Funk bongoHigh martillo — martillo-inspired bongoHigh accents. */
const funkBongoHiMartillo: PercussionMolecule = {
  id: 'funk-bongohi-martillo',
  label: 'Bongo high martillo accents',
  style: 'funk',
  bars: 2,
  category: 'groove',
  tags: ['bongo'],
  complexity: { min: 2, max: 3 },
  atoms: [
    atom('bongoHigh', 1, 0.36), atom('bongoHigh', 3, 0.42),
    atom('bongoHigh', 5, 0.34), atom('bongoHigh', 7, 0.44),
    atom('bongoHigh', 9, 0.36), atom('bongoHigh', 11, 0.42),
    atom('bongoHigh', 13, 0.34), atom('bongoHigh', 15, 0.46),
    atom('bongoHigh', 17, 0.36), atom('bongoHigh', 19, 0.42),
    atom('bongoHigh', 21, 0.34), atom('bongoHigh', 23, 0.44),
    atom('bongoHigh', 25, 0.36), atom('bongoHigh', 27, 0.42),
    atom('bongoHigh', 29, 0.34), atom('bongoHigh', 31, 0.46),
  ],
};

/** Funk bongoHigh call — call-response bongo accents. */
const funkBongoHiCall: PercussionMolecule = {
  id: 'funk-bongohi-call',
  label: 'Bongo high call accents',
  style: 'funk',
  bars: 2,
  category: 'groove',
  tags: ['bongo'],
  complexity: { min: 2, max: 3 },
  atoms: [
    atom('bongoHigh', 1, 0.34), atom('bongoHigh', 2, 0.38),
    atom('bongoHigh', 4, 0.36), atom('bongoHigh', 7, 0.44),
    atom('bongoHigh', 15, 0.44),
    atom('bongoHigh', 25, 0.34), atom('bongoHigh', 26, 0.38),
    atom('bongoHigh', 28, 0.36), atom('bongoHigh', 31, 0.46),
  ],
};

/** Funk bongoHigh ghosts — sparse ghost accents. */
const funkBongoHiGhosts: PercussionMolecule = {
  id: 'funk-bongohi-ghosts',
  label: 'Bongo high ghost accents',
  style: 'funk',
  bars: 2,
  category: 'texture',
  tags: ['bongo'],
  complexity: { min: 2, max: 3 },
  atoms: [
    atom('bongoHigh', 3, 0.28),
    atom('bongoHigh', 11, 0.26),
    atom('bongoHigh', 19, 0.28),
    atom('bongoHigh', 27, 0.26),
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// BELLTREE molecules (single-instrument: belltree only)
// ═══════════════════════════════════════════════════════════════════════════════

/** Bossa belltree swell — long swells for intro/ending. */
const bossaBelltreeSwell: PercussionMolecule = {
  id: 'bossa-belltree-swell',
  label: 'Belltree swell',
  style: 'bossa',
  bars: 2,
  category: 'texture',
  tags: ['belltree'],
  complexity: { min: 1, max: 1 },
  atoms: [
    atom('belltree', 0, 0.22, 6),
    atom('belltree', 16, 0.2, 6),
  ],
};

/** Latin belltree swell — for intro/ending sections. */
const latinBelltreeSwell: PercussionMolecule = {
  id: 'latin-belltree-swell',
  label: 'Belltree swell',
  style: 'latin',
  bars: 2,
  category: 'intro',
  tags: ['belltree'],
  complexity: { min: 1, max: 1 },
  atoms: [
    atom('belltree', 0, 0.22, 4),
    atom('belltree', 16, 0.2, 4),
  ],
};

/** Latin belltree ending — longer swell for ending. */
const latinBelltreeEnding: PercussionMolecule = {
  id: 'latin-belltree-ending',
  label: 'Belltree ending swell',
  style: 'latin',
  bars: 2,
  category: 'ending',
  tags: ['belltree'],
  complexity: { min: 1, max: 1 },
  atoms: [
    atom('belltree', 0, 0.28, 6),
    atom('belltree', 16, 0.32, 6),
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORT generated overrides
// ═══════════════════════════════════════════════════════════════════════════════

import { GENERATED_PERCUSSION_MOLECULES } from './percussionMoleculesGenerated.js';

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT: All molecules keyed by ID
// ═══════════════════════════════════════════════════════════════════════════════

const BASE_PERCUSSION_MOLECULES: Record<string, PercussionMolecule> = {
  // ── Shaker ──────────────────────────────────────────────────────────────────
  'bossa-shaker-classic': bossaShakerClassic,
  'bossa-shaker-rio': bossaShakerRio,
  'bossa-shaker-soft': bossaShakerSoft,
  'bossa-shaker-offbeats': bossaShakerOffbeats,
  'bossa-shaker-sparse': bossaShakerSparse,
  'latin-shaker-8ths': latinShaker8ths,
  'latin-shaker-16ths': latinShaker16ths,
  'latin-shaker-sparse': latinShakerSparse,
  'latin-shaker-quiet': latinShakerQuiet,

  // ── Clave ───────────────────────────────────────────────────────────────────
  'bossa-clave-son-32': bossaClaveSon32,
  'bossa-clave-light': bossaClaveLight,
  'bossa-clave-partido': bossaClavePartido,
  'bossa-clave-sync': bossaClaveSync,
  'latin-clave-son-32': latinClaveSon32,
  'latin-clave-sparse': latinClaveSparse,
  'latin-clave-intro': latinClaveIntro,

  // ── Conga + BongoLow (combined) ─────────────────────────────────────────────
  'bossa-conga-color': bossaCongaColor,
  'bossa-conga-rio': bossaCongaRio,
  'bossa-conga-tumbao': bossaCongaTumbao,
  'bossa-conga-sparse': bossaCongaSparse,
  'funk-conga-tumbao': funkCongaTumbao,
  'funk-conga-groove': funkCongaGroove,
  'funk-congaLow-downbeats': funkCongaLowDownbeats,
  'latin-conga-tumbao': latinCongaTumbao,
  'latin-conga-montuno': latinCongaMontuno,
  'latin-conga-sparse': latinCongaSparse,

  // ── Cowbell ─────────────────────────────────────────────────────────────────
  'bossa-cowbell-quarters': bossaCowbellQuarters,
  'bossa-cowbell-syncopated': bossaCowbellSyncopated,
  'funk-cowbell-syncopated': funkCowbellSyncopated,
  'funk-cowbell-disco': funkCowbellDisco,
  'funk-cowbell-16ths': funkCowbell16ths,
  'funk-cowbell-break': funkCowbellBreak,
  'latin-cowbell-syncopated': latinCowbellSyncopated,
  'latin-cowbell-sparse': latinCowbellSparse,

  // ── Timbales ────────────────────────────────────────────────────────────────
  'latin-timbales-cascara': latinTimbalesCascara,
  'latin-timbales-dense': latinTimbalesDense,

  // ── Guiro ───────────────────────────────────────────────────────────────────
  'bossa-guiro-quarters': bossaGuiroQuarters,
  'bossa-guiro-sparse': bossaGuiroSparse,
  'latin-guiro-quarters': latinGuiroQuarters,

  // ── Triangle ────────────────────────────────────────────────────────────────
  'bossa-triangle-downbeats': bossaTriangleDownbeats,
  'bossa-triangle-offbeats': bossaTriangleOffbeats,
  'bossa-triangle-mixed': bossaTriangleMixed,
  'funk-triangle-offbeats': funkTriangleOffbeats,
  'funk-triangle-backbeat': funkTriangleBackbeat,
  'funk-triangle-8ths': funkTriangle8ths,
  'latin-triangle-sparse': latinTriangleSparse,

  // ── Cabasa ──────────────────────────────────────────────────────────────────
  'bossa-cabasa-16ths': bossaCabasa16ths,
  'funk-cabasa-16ths': funkCabasa16ths,
  'funk-cabasa-8ths': funkCabasa8ths,
  'funk-cabasa-quiet-16ths': funkCabasaQuiet16ths,
  'funk-cabasa-quietest-16ths': funkCabasaQuietest16ths,

  // ── Tambourine ──────────────────────────────────────────────────────────────
  'bossa-tambourine-16ths': bossaTambourine16ths,
  'bossa-tambourine-8ths': bossaTambourine8ths,
  'funk-tambourine-16ths': funkTambourine16ths,

  // ── Bongo High ──────────────────────────────────────────────────────────────
  'funk-bongohi-martillo': funkBongoHiMartillo,
  'funk-bongohi-call': funkBongoHiCall,
  'funk-bongohi-ghosts': funkBongoHiGhosts,

  // ── Belltree ────────────────────────────────────────────────────────────────
  'bossa-belltree-swell': bossaBelltreeSwell,
  'latin-belltree-swell': latinBelltreeSwell,
  'latin-belltree-ending': latinBelltreeEnding,
};

export const PERCUSSION_MOLECULES: Record<string, PercussionMolecule> =
  Object.keys(GENERATED_PERCUSSION_MOLECULES).length > 0
    ? (GENERATED_PERCUSSION_MOLECULES as Record<string, PercussionMolecule>)
    : BASE_PERCUSSION_MOLECULES;

export const PERCUSSION_MOLECULE_LIST: PercussionMolecule[] = Object.values(PERCUSSION_MOLECULES);

export function getMoleculesForStyle(style: PercussionMolecule['style']): PercussionMolecule[] {
  return PERCUSSION_MOLECULE_LIST.filter((m) => m.style === style);
}

export function getMoleculesForCategory(
  style: PercussionMolecule['style'],
  category: MoleculeCategory,
): PercussionMolecule[] {
  return PERCUSSION_MOLECULE_LIST.filter((m) => m.style === style && m.category === category);
}
