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

function atom(sound: PercussionSound, step: number, velocity: number, lengthSteps = 1): PercussionAtom {
  return {
    sound,
    atTick: Math.round(step * STEP),
    velocity,
    durationTicks: Math.round(lengthSteps * STEP),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOSSA NOVA molecules (10 patterns → molecules)
// ═══════════════════════════════════════════════════════════════════════════════

/** 1. Classic Bossa Shaker + Clave */
const bossaClassicShakerClave: PercussionMolecule = {
  id: 'bossa-classic-shaker-clave',
  label: 'Classic Bossa Shaker + Clave',
  style: 'bossa',
  bars: 2,
  category: 'groove',
  tags: ['shaker', 'clave', 'conga'],
  complexity: { min: 1, max: 3 },
  atoms: [
    // shaker eighths
    ...[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30].map((s) =>
      atom('shaker', s, s % 8 === 0 ? 0.58 : 0.38),
    ),
    // 3-2 son clave
    atom('clave', 0, 0.78),
    atom('clave', 6, 0.62),
    atom('clave', 10, 0.70),
    atom('clave', 16, 0.72),
    atom('clave', 24, 0.64),
    // conga color
    atom('congaHigh', 7, 0.42),
    atom('congaLow', 15, 0.52),
    atom('congaHigh', 23, 0.38),
    atom('congaLow', 31, 0.48),
  ],
};

/** 2. Soft Bossa Texture */
const bossaSoftTexture: PercussionMolecule = {
  id: 'bossa-soft-texture',
  label: 'Soft Bossa Texture',
  style: 'bossa',
  bars: 2,
  category: 'texture',
  tags: ['shaker', 'guiro', 'triangle', 'conga'],
  complexity: { min: 1, max: 2 },
  atoms: [
    ...[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30].map((s) =>
      atom('shaker', s, s % 8 === 0 ? 0.45 : 0.28),
    ),
    atom('guiro', 5, 0.32, 2),
    atom('guiro', 13, 0.28, 2),
    atom('guiro', 21, 0.34, 2),
    atom('guiro', 29, 0.30, 2),
    atom('triangle', 0, 0.38),
    atom('triangle', 16, 0.34),
    atom('congaLow', 15, 0.38),
    atom('congaLow', 31, 0.34),
  ],
};

/** 3. Rio Conga Bossa */
const bossaRioConga: PercussionMolecule = {
  id: 'bossa-rio-conga',
  label: 'Rio Conga Bossa',
  style: 'bossa',
  bars: 2,
  category: 'groove',
  tags: ['shaker', 'conga', 'clave'],
  complexity: { min: 1, max: 3 },
  atoms: [
    ...[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30].map((s) =>
      atom('shaker', s, s % 4 === 0 ? 0.46 : 0.30),
    ),
    // conga call-response
    atom('congaHigh', 3, 0.42),
    atom('congaHigh', 6, 0.58),
    atom('congaLow', 8, 0.50),
    atom('congaHigh', 11, 0.36),
    atom('congaLow', 15, 0.62),
    atom('congaHigh', 19, 0.40),
    atom('congaHigh', 22, 0.56),
    atom('congaLow', 24, 0.48),
    atom('congaHigh', 27, 0.34),
    atom('congaLow', 31, 0.58),
    // clave light
    atom('clave', 0, 0.48),
    atom('clave', 10, 0.42),
    atom('clave', 24, 0.44),
  ],
};

/** 4. Cabasa Bossa Pulse */
const bossaCabasaPulse: PercussionMolecule = {
  id: 'bossa-cabasa-pulse',
  label: 'Cabasa Bossa Pulse',
  style: 'bossa',
  bars: 2,
  category: 'groove',
  tags: ['cabasa', 'conga', 'triangle'],
  complexity: { min: 1, max: 3 },
  atoms: [
    ...Array.from({ length: 32 }, (_, s) =>
      atom('cabasa', s, s % 4 === 0 ? 0.46 : s % 2 === 0 ? 0.34 : 0.20),
    ),
    atom('congaHigh', 4, 0.36),
    atom('congaLow', 7, 0.52),
    atom('congaHigh', 12, 0.42),
    atom('congaLow', 15, 0.58),
    atom('congaHigh', 20, 0.34),
    atom('congaLow', 23, 0.50),
    atom('congaHigh', 28, 0.40),
    atom('congaLow', 31, 0.54),
    atom('triangle', 0, 0.30),
    atom('triangle', 18, 0.26),
  ],
};

/** 5. Guiro Brush Bossa */
const bossaGuiroBrush: PercussionMolecule = {
  id: 'bossa-guiro-brush',
  label: 'Guiro Brush Bossa',
  style: 'bossa',
  bars: 2,
  category: 'texture',
  tags: ['guiro', 'shaker', 'clave', 'conga'],
  complexity: { min: 1, max: 3 },
  atoms: [
    ...[0, 4, 8, 12, 16, 20, 24, 28].map((s) => atom('guiro', s, 0.42, 2)),
    ...[2, 6, 10, 14, 18, 22, 26, 30].map((s) => atom('shaker', s, 0.24)),
    atom('clave', 0, 0.50),
    atom('clave', 6, 0.38),
    atom('clave', 10, 0.44),
    atom('clave', 24, 0.42),
    atom('congaLow', 15, 0.46),
    atom('congaLow', 31, 0.42),
  ],
};

/** 6. Bossa Tambourine Light */
const bossaTambourineLight: PercussionMolecule = {
  id: 'bossa-tambourine-light',
  label: 'Bossa Tambourine Light',
  style: 'bossa',
  bars: 2,
  category: 'groove',
  tags: ['shaker', 'tambourine', 'conga'],
  complexity: { min: 1, max: 3 },
  atoms: [
    ...[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30].map((s) =>
      atom('shaker', s, s % 8 === 0 ? 0.42 : 0.27),
    ),
    atom('tambourine', 3, 0.34),
    atom('tambourine', 7, 0.46),
    atom('tambourine', 11, 0.30),
    atom('tambourine', 15, 0.50),
    atom('tambourine', 19, 0.32),
    atom('tambourine', 23, 0.44),
    atom('tambourine', 27, 0.28),
    atom('tambourine', 31, 0.48),
    atom('congaLow', 8, 0.42),
    atom('congaLow', 24, 0.40),
  ],
};

/** 7. Bossa Partido Alto Hint */
const bossaPartidoAltoHint: PercussionMolecule = {
  id: 'bossa-partido-alto-hint',
  label: 'Bossa Partido Alto Hint',
  style: 'bossa',
  bars: 2,
  category: 'groove',
  tags: ['shaker', 'clave', 'conga'],
  complexity: { min: 2, max: 3 },
  atoms: [
    ...Array.from({ length: 32 }, (_, s) =>
      atom('shaker', s, s % 4 === 0 ? 0.48 : s % 2 === 0 ? 0.32 : 0.18),
    ),
    atom('clave', 0, 0.62),
    atom('clave', 5, 0.44),
    atom('clave', 11, 0.54),
    atom('clave', 18, 0.50),
    atom('clave', 24, 0.58),
    atom('congaHigh', 3, 0.34),
    atom('congaLow', 6, 0.52),
    atom('congaHigh', 9, 0.40),
    atom('congaLow', 14, 0.62),
    atom('congaHigh', 19, 0.32),
    atom('congaLow', 22, 0.50),
    atom('congaHigh', 25, 0.38),
    atom('congaLow', 30, 0.58),
  ],
};

/** 8. Bossa Cowbell Whisper */
const bossaCowbellWhisper: PercussionMolecule = {
  id: 'bossa-cowbell-whisper',
  label: 'Bossa Cowbell Whisper',
  style: 'bossa',
  bars: 2,
  category: 'groove',
  tags: ['shaker', 'cowbell', 'guiro', 'conga'],
  complexity: { min: 1, max: 3 },
  atoms: [
    ...[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30].map((s) =>
      atom('shaker', s, s % 8 === 0 ? 0.48 : 0.30),
    ),
    atom('cowbell', 0, 0.32),
    atom('cowbell', 6, 0.24),
    atom('cowbell', 10, 0.28),
    atom('cowbell', 16, 0.30),
    atom('cowbell', 24, 0.26),
    atom('guiro', 13, 0.30, 2),
    atom('guiro', 29, 0.32, 2),
    atom('congaHigh', 7, 0.36),
    atom('congaLow', 15, 0.48),
    atom('congaHigh', 23, 0.34),
    atom('congaLow', 31, 0.44),
  ],
};

/** 9. Minimal Jazz Bossa Percussion */
const bossaMinimalJazz: PercussionMolecule = {
  id: 'bossa-minimal-jazz',
  label: 'Minimal Jazz Bossa Percussion',
  style: 'bossa',
  bars: 2,
  category: 'texture',
  tags: ['shaker', 'clave', 'triangle', 'conga'],
  complexity: { min: 1, max: 2 },
  atoms: [
    ...[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30].map((s) =>
      atom('shaker', s, s % 8 === 0 ? 0.34 : 0.22),
    ),
    atom('clave', 0, 0.36),
    atom('clave', 10, 0.28),
    atom('clave', 24, 0.30),
    atom('triangle', 16, 0.24),
    atom('triangle', 31, 0.20),
    atom('congaLow', 15, 0.32),
  ],
};

/** 10. Bossa Extended Color */
const bossaExtendedColor: PercussionMolecule = {
  id: 'bossa-extended-color',
  label: 'Bossa Extended Color',
  style: 'bossa',
  bars: 2,
  category: 'groove',
  tags: ['cabasa', 'clave', 'bongo', 'conga', 'tumba', 'tambourine', 'belltree'],
  complexity: { min: 2, max: 3 },
  atoms: [
    ...Array.from({ length: 32 }, (_, s) =>
      atom('cabasa', s, s % 4 === 0 ? 0.42 : s % 2 === 0 ? 0.30 : 0.17),
    ),
    atom('clave', 0, 0.58),
    atom('clave', 6, 0.42),
    atom('clave', 10, 0.50),
    atom('clave', 16, 0.54),
    atom('clave', 24, 0.46),
    atom('bongoLow', 3, 0.32),
    atom('congaHigh', 7, 0.42),
    atom('bongoLow', 12, 0.28),
    atom('tumba', 15, 0.56),
    atom('bongoLow', 19, 0.30),
    atom('congaHigh', 23, 0.40),
    atom('bongoLow', 28, 0.26),
    atom('tumba', 31, 0.52),
    atom('tambourine', 11, 0.28),
    atom('tambourine', 27, 0.26),
    atom('belltree', 30, 0.22, 4),
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// FUNK molecules (5 patterns → molecules)
// ═══════════════════════════════════════════════════════════════════════════════

/** 1. Tight Shaker + Tambourine Funk */
const funkTightShakerTambourine: PercussionMolecule = {
  id: 'funk-tight-shaker-tambourine',
  label: 'Tight Shaker + Tambourine Funk',
  style: 'funk',
  bars: 2,
  category: 'groove',
  tags: ['shaker', 'tambourine'],
  complexity: { min: 1, max: 3 },
  atoms: [
    ...Array.from({ length: 32 }, (_, s) =>
      atom('shaker', s, s % 8 === 0 ? 0.62 : s % 4 === 2 ? 0.46 : s % 2 === 0 ? 0.34 : 0.18),
    ),
    atom('tambourine', 4, 0.72),
    atom('tambourine', 12, 0.66),
    atom('tambourine', 20, 0.74),
    atom('tambourine', 28, 0.68),
    atom('tambourine', 7, 0.28),
    atom('tambourine', 15, 0.34),
    atom('tambourine', 23, 0.26),
    atom('tambourine', 31, 0.36),
  ],
};

/** 2. Cowbell Pocket Funk */
const funkCowbellPocket: PercussionMolecule = {
  id: 'funk-cowbell-pocket',
  label: 'Cowbell Pocket Funk',
  style: 'funk',
  bars: 2,
  category: 'groove',
  tags: ['shaker', 'cowbell', 'tambourine'],
  complexity: { min: 1, max: 3 },
  atoms: [
    ...[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30].map((s) =>
      atom('shaker', s, s % 8 === 0 ? 0.42 : 0.24),
    ),
    atom('cowbell', 0, 0.74),
    atom('cowbell', 3, 0.38),
    atom('cowbell', 6, 0.56),
    atom('cowbell', 10, 0.64),
    atom('cowbell', 13, 0.32),
    atom('cowbell', 16, 0.72),
    atom('cowbell', 19, 0.34),
    atom('cowbell', 22, 0.52),
    atom('cowbell', 27, 0.66),
    atom('cowbell', 30, 0.42),
    atom('tambourine', 12, 0.46),
    atom('tambourine', 28, 0.50),
  ],
};

/** 3. 16th Cabasa Drive */
const funkSixteenthCabasaDrive: PercussionMolecule = {
  id: 'funk-sixteenth-cabasa-drive',
  label: '16th Cabasa Drive',
  style: 'funk',
  bars: 2,
  category: 'groove',
  tags: ['cabasa', 'tambourine', 'triangle'],
  complexity: { min: 2, max: 3 },
  atoms: [
    ...Array.from({ length: 32 }, (_, s) =>
      atom('cabasa', s, s % 8 === 0 ? 0.58 : s % 4 === 0 ? 0.44 : s % 2 === 0 ? 0.34 : 0.22),
    ),
    atom('tambourine', 2, 0.36),
    atom('tambourine', 6, 0.48),
    atom('tambourine', 11, 0.42),
    atom('tambourine', 14, 0.56),
    atom('tambourine', 18, 0.34),
    atom('tambourine', 22, 0.46),
    atom('tambourine', 25, 0.38),
    atom('tambourine', 30, 0.60),
    atom('triangle', 15, 0.18),
    atom('triangle', 31, 0.22),
  ],
};

/** 4. Sparse Breakbeat Percussion */
const funkSparseBreakbeatPerc: PercussionMolecule = {
  id: 'funk-sparse-breakbeat-perc',
  label: 'Sparse Breakbeat Percussion',
  style: 'funk',
  bars: 2,
  category: 'groove',
  tags: ['shaker', 'tambourine', 'vibraslap'],
  complexity: { min: 1, max: 2 },
  atoms: [
    atom('shaker', 0, 0.42),
    atom('shaker', 3, 0.22),
    atom('shaker', 6, 0.34),
    atom('shaker', 10, 0.28),
    atom('shaker', 13, 0.20),
    atom('shaker', 16, 0.44),
    atom('shaker', 19, 0.24),
    atom('shaker', 22, 0.32),
    atom('shaker', 26, 0.26),
    atom('shaker', 31, 0.30),
    atom('tambourine', 7, 0.48),
    atom('tambourine', 12, 0.62),
    atom('tambourine', 23, 0.42),
    atom('tambourine', 28, 0.66),
    atom('vibraslap', 30, 0.26),
  ],
};

/** 5. Funk Disco Tambourine Layer */
const funkDiscoTambourineLayer: PercussionMolecule = {
  id: 'funk-disco-tambourine-layer',
  label: 'Funk Disco Tambourine Layer',
  style: 'funk',
  bars: 2,
  category: 'groove',
  tags: ['shaker', 'tambourine', 'cowbell'],
  complexity: { min: 2, max: 3 },
  atoms: [
    ...Array.from({ length: 32 }, (_, s) =>
      atom('shaker', s, s % 4 === 0 ? 0.44 : s % 2 === 0 ? 0.34 : 0.20),
    ),
    atom('tambourine', 2, 0.48),
    atom('tambourine', 6, 0.58),
    atom('tambourine', 10, 0.50),
    atom('tambourine', 14, 0.64),
    atom('tambourine', 18, 0.46),
    atom('tambourine', 22, 0.56),
    atom('tambourine', 26, 0.48),
    atom('tambourine', 30, 0.68),
    atom('cowbell', 0, 0.42),
    atom('cowbell', 11, 0.34),
    atom('cowbell', 16, 0.38),
    atom('cowbell', 27, 0.36),
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// LATIN molecules — procedurally defined (no percussionPatterns.ts data yet)
// Build canonical latin patterns as molecules for the organism engine.
// ═══════════════════════════════════════════════════════════════════════════════

/** Latin Cascara + Clave — classic son clave 3-2 with cascara texture */
const latinCascaraClave: PercussionMolecule = {
  id: 'latin-cascara-clave',
  label: 'Cascara + Clave (Son 3-2)',
  style: 'latin',
  bars: 2,
  category: 'groove',
  tags: ['shaker', 'clave', 'timbales', 'conga', 'cowbell', 'bongo'],
  complexity: { min: 1, max: 3 },
  atoms: [
    // shaker eighths
    ...[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30].map((s) =>
      atom('shaker', s, s % 2 === 0 ? 0.48 : 0.28),
    ),
    // son clave 3-2: bar1 (3-side) beats 1,2&,4; bar2 (2-side) beats 1,2&
    atom('clave', 0, 0.78),
    atom('clave', 6, 0.62),
    atom('clave', 12, 0.70),
    atom('clave', 20, 0.72),
    atom('clave', 26, 0.64),
    // cascara on timbales
    atom('timbales', 0, 0.65),
    atom('timbales', 4, 0.55),
    atom('timbales', 6, 0.60),
    atom('timbales', 8, 0.58),
    atom('timbales', 12, 0.62),
    atom('timbales', 16, 0.65),
    atom('timbales', 20, 0.55),
    atom('timbales', 24, 0.60),
    atom('timbales', 28, 0.58),
    // tumbao on conga + bongo
    atom('congaLow', 6, 0.58),
    atom('congaLow', 14, 0.62),
    atom('congaLow', 22, 0.56),
    atom('congaLow', 30, 0.60),
    atom('congaHigh', 2, 0.42),
    atom('congaHigh', 10, 0.38),
    atom('congaHigh', 18, 0.40),
    atom('congaHigh', 26, 0.36),
    atom('bongoLow', 8, 0.35),
    atom('bongoLow', 24, 0.33),
    // cowbell on 1 and 3
    atom('cowbell', 0, 0.52),
    atom('cowbell', 8, 0.46),
    atom('cowbell', 16, 0.50),
    atom('cowbell', 24, 0.44),
  ],
};

/** Latin Montuno — denser, piano-montuno-driven percussion */
const latinMontuno: PercussionMolecule = {
  id: 'latin-montuno',
  label: 'Montuno Percussion',
  style: 'latin',
  bars: 2,
  category: 'groove',
  tags: ['shaker', 'clave', 'conga', 'cowbell', 'guiro', 'timbales'],
  complexity: { min: 2, max: 3 },
  atoms: [
    ...Array.from({ length: 32 }, (_, s) =>
      atom('shaker', s, s % 4 === 0 ? 0.50 : s % 2 === 0 ? 0.34 : 0.20),
    ),
    atom('clave', 0, 0.74),
    atom('clave', 6, 0.60),
    atom('clave', 12, 0.68),
    atom('clave', 20, 0.70),
    atom('clave', 26, 0.62),
    atom('guiro', 3, 0.34, 2),
    atom('guiro', 11, 0.30, 2),
    atom('guiro', 19, 0.32, 2),
    atom('guiro', 27, 0.28, 2),
    atom('timbales', 0, 0.60),
    atom('timbales', 4, 0.52),
    atom('timbales', 8, 0.56),
    atom('timbales', 12, 0.58),
    atom('timbales', 16, 0.60),
    atom('timbales', 20, 0.52),
    atom('timbales', 24, 0.56),
    atom('timbales', 28, 0.58),
    atom('congaLow', 6, 0.62),
    atom('congaLow', 14, 0.66),
    atom('congaHigh', 2, 0.44),
    atom('congaHigh', 10, 0.42),
    atom('congaLow', 22, 0.60),
    atom('congaLow', 30, 0.64),
    atom('congaHigh', 18, 0.42),
    atom('congaHigh', 26, 0.40),
    atom('cowbell', 0, 0.50),
    atom('cowbell', 8, 0.44),
    atom('cowbell', 16, 0.48),
    atom('cowbell', 24, 0.42),
  ],
};

/** Latin Sparse — light texture for solo/verse sections */
const latinSparse: PercussionMolecule = {
  id: 'latin-sparse',
  label: 'Latin Sparse Texture',
  style: 'latin',
  bars: 2,
  category: 'texture',
  tags: ['shaker', 'clave', 'triangle'],
  complexity: { min: 1, max: 2 },
  atoms: [
    ...[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30].map((s) =>
      atom('shaker', s, s % 8 === 0 ? 0.38 : 0.22),
    ),
    atom('clave', 0, 0.56),
    atom('clave', 6, 0.44),
    atom('clave', 12, 0.50),
    atom('clave', 20, 0.52),
    atom('clave', 26, 0.44),
    atom('triangle', 0, 0.28),
    atom('triangle', 16, 0.24),
    atom('congaHigh', 7, 0.30),
    atom('congaLow', 15, 0.36),
    atom('congaHigh', 23, 0.28),
    atom('congaLow', 31, 0.34),
  ],
};

/** Latin Intro — sparse clave + shaker build-up */
const latinIntro: PercussionMolecule = {
  id: 'latin-intro',
  label: 'Latin Intro Build',
  style: 'latin',
  bars: 2,
  category: 'intro',
  tags: ['shaker', 'clave', 'belltree'],
  complexity: { min: 1, max: 2 },
  atoms: [
    ...[0, 4, 8, 12, 16, 20, 24, 28].map((s) => atom('shaker', s, 0.32)),
    atom('clave', 0, 0.48),
    atom('clave', 12, 0.44),
    atom('clave', 20, 0.46),
    atom('belltree', 0, 0.22, 4),
    atom('belltree', 16, 0.20, 4),
    atom('triangle', 14, 0.22),
    atom('triangle', 30, 0.24),
  ],
};

/** Latin Ending — final accent + belltree */
const latinEnding: PercussionMolecule = {
  id: 'latin-ending',
  label: 'Latin Ending',
  style: 'latin',
  bars: 2,
  category: 'ending',
  tags: ['shaker', 'belltree', 'triangle', 'conga'],
  complexity: { min: 1, max: 2 },
  atoms: [
    ...[0, 4, 8, 12, 16, 20, 24, 28].map((s) => atom('shaker', s, 0.30)),
    atom('belltree', 0, 0.28, 6),
    atom('belltree', 16, 0.32, 6),
    atom('triangle', 0, 0.34),
    atom('triangle', 16, 0.30),
    atom('congaLow', 12, 0.44),
    atom('congaLow', 28, 0.48),
    atom('cowbell', 0, 0.36),
  ],
};

/** Latin Cowbell Accent — cowbell-driven groove */
const latinCowbellGroove: PercussionMolecule = {
  id: 'latin-cowbell-groove',
  label: 'Latin Cowbell Groove',
  style: 'latin',
  bars: 2,
  category: 'groove',
  tags: ['cowbell', 'shaker', 'clave', 'conga'],
  complexity: { min: 1, max: 3 },
  atoms: [
    ...[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30].map((s) =>
      atom('shaker', s, s % 4 === 0 ? 0.44 : s % 2 === 0 ? 0.30 : 0.18),
    ),
    atom('cowbell', 0, 0.64),
    atom('cowbell', 3, 0.34),
    atom('cowbell', 6, 0.48),
    atom('cowbell', 10, 0.56),
    atom('cowbell', 16, 0.62),
    atom('cowbell', 19, 0.32),
    atom('cowbell', 22, 0.44),
    atom('cowbell', 27, 0.54),
    atom('clave', 0, 0.66),
    atom('clave', 6, 0.52),
    atom('clave', 12, 0.58),
    atom('clave', 20, 0.60),
    atom('clave', 26, 0.54),
    atom('congaLow', 6, 0.48),
    atom('congaLow', 14, 0.54),
    atom('congaHigh', 2, 0.38),
    atom('congaHigh', 10, 0.36),
    atom('congaLow', 22, 0.46),
    atom('congaLow', 30, 0.52),
    atom('congaHigh', 18, 0.36),
    atom('congaHigh', 26, 0.34),
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT: All molecules keyed by ID
// ═══════════════════════════════════════════════════════════════════════════════

const BASE_PERCUSSION_MOLECULES: Record<string, PercussionMolecule> = {
  // Bossa Nova
  'bossa-classic-shaker-clave': bossaClassicShakerClave,
  'bossa-soft-texture': bossaSoftTexture,
  'bossa-rio-conga': bossaRioConga,
  'bossa-cabasa-pulse': bossaCabasaPulse,
  'bossa-guiro-brush': bossaGuiroBrush,
  'bossa-tambourine-light': bossaTambourineLight,
  'bossa-partido-alto-hint': bossaPartidoAltoHint,
  'bossa-cowbell-whisper': bossaCowbellWhisper,
  'bossa-minimal-jazz': bossaMinimalJazz,
  'bossa-extended-color': bossaExtendedColor,

  // Funk
  'funk-tight-shaker-tambourine': funkTightShakerTambourine,
  'funk-cowbell-pocket': funkCowbellPocket,
  'funk-sixteenth-cabasa-drive': funkSixteenthCabasaDrive,
  'funk-sparse-breakbeat-perc': funkSparseBreakbeatPerc,
  'funk-disco-tambourine-layer': funkDiscoTambourineLayer,

  // Latin
  'latin-cascara-clave': latinCascaraClave,
  'latin-montuno': latinMontuno,
  'latin-sparse': latinSparse,
  'latin-intro': latinIntro,
  'latin-ending': latinEnding,
  'latin-cowbell-groove': latinCowbellGroove,
};

export const PERCUSSION_MOLECULES: Record<string, PercussionMolecule> = BASE_PERCUSSION_MOLECULES;

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
