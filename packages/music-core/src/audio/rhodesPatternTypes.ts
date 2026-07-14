/**
 * Rhodes-specific type aliases over the generic pattern-engine model.
 *
 * Rhodes is a complementary pitched layer sitting behind Piano. Like piano,
 * its atom `sound` is a *voicing role* resolved at playback time from the real
 * chord + density (never a baked-in pitch). On top of piano's `VoiceRole` set
 * (chord/shell/top/bass/upper), Rhodes adds `arp1..arp4` — positional roles
 * selecting the n-th note of the resolved voicing, enabling gentle arpeggio
 * lines and rolls that complement the piano comping.
 *
 * See docs/MELODIC-PLUGIN.md §4 and docs/RHODES.md.
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

// ─── Style ───────────────────────────────────────────────────────────────────

export type RhodesPatternStyle = 'swing' | 'bossa' | 'funk' | 'latin' | 'ballad';

// ─── Sound: voicing roles ────────────────────────────────────────────────────

/**
 * Rhodes atom sound — which part of the current chord voicing to play.
 *
 * - `'chord'` — full resolved voicing (pad/hit)
 * - `'shell'` — two lowest voices (guide-tone shell)
 * - `'top'` — melody (top voice), used for pedal/insert lines
 * - `'bass'` — lowest voice
 * - `'upper'` — voices above the shell (color tones)
 * - `'arp1'..'arp4'` — positional: the n-th note of the ascending voicing
 *   (with wrapping for short voicings). Enables arpeggio/roll textures.
 *
 * Resolved at playback via {@link selectRhodesVoicingRole} (rhodesVoicingRoles.ts)
 * over a voicing produced by `buildVoicing()` (rhodesVoicing.ts).
 */
export type RhodesVoicingRole =
  | 'chord'
  | 'shell'
  | 'top'
  | 'bass'
  | 'upper'
  | 'arp1'
  | 'arp2'
  | 'arp3'
  | 'arp4';

/** Ordered list of roles for the constructor's piano-roll rows. */
export const RHODES_VOICING_ROLES: RhodesVoicingRole[] = [
  'arp4',
  'arp3',
  'arp2',
  'arp1',
  'upper',
  'top',
  'shell',
  'chord',
  'bass',
];

// ─── Rhodes type aliases ─────────────────────────────────────────────────────

export type RhodesAtom = Atom<RhodesVoicingRole>;
export type RhodesHit = Hit<RhodesVoicingRole>;
export type RhodesMolecule = Molecule<RhodesPatternStyle, RhodesVoicingRole>;
export type RhodesCell = Cell<RhodesPatternStyle>;
export type RhodesOrganism = Organism<RhodesPatternStyle>;

// ─── Re-exported building blocks ─────────────────────────────────────────────

export type { MoleculeCategory, MoleculeConditions, DynamicsType, Dynamics, Lane, OrganismSection };
export type { Clip } from './pattern/types.js';

export type RhodesDynamicsType = DynamicsType;
export type RhodesDynamics = Dynamics;
export type RhodesClip = import('./pattern/types.js').Clip;
export type RhodesLane = Lane;
