/**
 * Percussion-specific type aliases over the generic pattern-engine model.
 *
 * Generic types live in `pattern/types.ts`; this file binds them to the
 * percussion sound/style vocabulary so percussion code mirrors the drum model.
 */
import type {
  Atom,
  Cell,
  Dynamics,
  DynamicsType,
  Hit,
  Lane,
  Molecule,
  MoleculeCategory,
  MoleculeConditions,
  Organism,
  OrganismSection,
} from './pattern/types.js';

/**
 * Latin percussion sound vocabulary. Lives in core (like `DrumSound`) because
 * the pattern engine, cells, molecules and organisms all reference it. The
 * concrete sample-file layout for these sounds lives in the percussion plugin.
 */
export type PercussionSound =
  | 'congaHigh'
  | 'congaLow'
  | 'bongoLow'
  | 'tumba'
  | 'timbales'
  | 'cowbell'
  | 'clave'
  | 'shaker'
  | 'guiro'
  | 'cabasa'
  | 'triangle'
  | 'tambourine'
  | 'vibraslap'
  | 'belltree'
  | 'whistle'
  | 'sleighBells';

// ─── Style ───────────────────────────────────────────────────────────────────

/** Percussion pattern styles (styles where percussion is active). */
export type PercussionPatternStyle = 'latin' | 'bossa' | 'funk';

// ─── Percussion type aliases ─────────────────────────────────────────────────

export type PercussionAtom = Atom<PercussionSound>;
export type PercussionHit = Hit<PercussionSound>;
export type PercussionMolecule = Molecule<PercussionPatternStyle, PercussionSound>;
export type PercussionCell = Cell<PercussionPatternStyle>;
export type PercussionOrganism = Organism<PercussionPatternStyle>;

// ─── Re-exported building blocks ─────────────────────────────────────────────

export type {
  MoleculeCategory,
  MoleculeConditions,
  DynamicsType,
  Dynamics,
  Lane,
  OrganismSection,
};
export type { Clip } from './pattern/types.js';
