/**
 * Piano-specific type aliases over the generic pattern-engine model.
 *
 * Piano uses the same atom → molecule → cell → organism hierarchy
 * as drums, but with MIDI note numbers as "sounds".
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
import type { VoiceRole } from './pianoVoicing.js';

// ─── Style ───────────────────────────────────────────────────────────────────

export type PianoPatternStyle = 'swing' | 'bossa' | 'funk' | 'latin' | 'ballad';

// ─── Piano type aliases ──────────────────────────────────────────────────────

export type { VoiceRole, TensionLevel } from './pianoVoicing.js';

/**
 * PianoAtom sound = {@link VoiceRole} — which part of the current chord voicing
 * to play (resolved from the real chord + density + tension at playback time),
 * NOT a baked-in interval or MIDI note. See docs/PIANO-EXTENDED-ARRANGEMENT-2.md.
 */
export type PianoAtom = Atom<VoiceRole>;
export type PianoHit = Hit<VoiceRole>;
export type PianoMolecule = Molecule<PianoPatternStyle, VoiceRole>;
export type PianoCell = Cell<PianoPatternStyle>;
export type PianoOrganism = Organism<PianoPatternStyle>;

// ─── Re-exported building blocks ─────────────────────────────────────────────

export type { MoleculeCategory, MoleculeConditions, DynamicsType, Dynamics, Lane, OrganismSection };
export type { Clip } from './pattern/types.js';

export type PianoDynamicsType = DynamicsType;
export type PianoDynamics = Dynamics;
export type PianoClip = import('./pattern/types.js').Clip;
export type PianoLane = Lane;

// ─── Humanization ────────────────────────────────────────────────────────────

/** Discrete preset for jitter/spread controls (user-facing toggle). */
export type HumanizeAmount = 'none' | 'low' | 'medium' | 'high';

/** Maps {@link HumanizeAmount} to per-note random jitter in ±ms. */
export const TIMING_JITTER_MS: Record<HumanizeAmount, number> = {
  none: 0,
  low: 15,
  medium: 40,
  high: 80,
};

/** Maps {@link HumanizeAmount} to chord-note micro-spread in ±ms from center. */
export const CHORD_SPREAD_MS: Record<HumanizeAmount, number> = {
  none: 0,
  low: 20,
  medium: 50,
  high: 100,
};

export interface HumanizeParams {
  /** Per-note random jitter preset. Engine resolves ms via {@link TIMING_JITTER_MS}. */
  timingJitterMs: HumanizeAmount;
  velocityVariation: 'off' | 'light' | 'medium' | 'strong';
  /** Micro-spread of chord notes preset. Engine resolves ms via {@link CHORD_SPREAD_MS}. */
  chordSpreadMs: HumanizeAmount;
  /** Dynamic phrasing curve. */
  phrasing: 'flat' | 'gentle' | 'expressive';
  humanizeTiming: 'none' | 'slight-rush' | 'slight-lag' | 'medium-rush' | 'medium-lag';
}

export const DEFAULT_HUMANIZE: HumanizeParams = {
  timingJitterMs: 'low',
  velocityVariation: 'medium',
  chordSpreadMs: 'low',
  phrasing: 'expressive',
  humanizeTiming: 'slight-lag',
};
