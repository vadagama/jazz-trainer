/**
 * Drum-specific type aliases over the generic pattern-engine model.
 *
 * Generic types live in `pattern/types.ts`; this file binds them to the drum
 * sound/style vocabulary so existing drum code keeps working unchanged.
 */
import type { DrumSound } from './drumSampleRegistry.js';
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

// ─── Style ───────────────────────────────────────────────────────────────────

/**
 * Extended drum style type for the pattern engine.
 * Includes explicit 'latin' and 'ballad' styles (not degraded).
 */
export type DrumPatternStyle = 'swing' | 'bossa' | 'funk' | 'latin' | 'ballad';

/**
 * Legacy drum style union used for articulation resolution.
 * Structurally identical to {@link DrumPatternStyle}.
 */
export type DrumStyle = DrumPatternStyle;

// ─── Drum type aliases ────────────────────────────────────────────────────────

export type DrumAtom = Atom<DrumSound>;
export type DrumHit = Hit<DrumSound>;
export type DrumMolecule = Molecule<DrumPatternStyle, DrumSound>;
export type DrumCell = Cell<DrumPatternStyle>;
export type DrumOrganism = Organism<DrumPatternStyle>;

// ─── Re-exported building blocks (consumers import from here) ─────────────────

export type {
  MoleculeCategory,
  MoleculeConditions,
  DynamicsType,
  Dynamics,
  Lane,
  OrganismSection,
};
export type { Clip } from './pattern/types.js';

// ─── Drum-specific dynamics aliases (backward-compat) ────────────────────────

export type DrumDynamicsType = DynamicsType;
export type DrumDynamics = Dynamics;
export type DrumClip = import('./pattern/types.js').Clip;
export type DrumLane = Lane;
