/**
 * Funk Drum Kit sample registry (virtuosity-drums → reduced velocity layers).
 *
 * Naming convention: <articulation>_vl<layer>_rr<index>.m4a
 * Velocity layers vary per sound (3-5 layers, see §7.3).
 *
 * See docs/DRUMS-VISION.md §4.3 and §7.3 for the full specification.
 */
import type { DrumSound } from '@jazz/music-core';
import { buildVelocityRR } from '@jazz/music-core';

/** Ordered velocity layers from quietest to loudest. */
export const FUNK_VELOCITY_LAYERS = ['vl1', 'vl2', 'vl3', 'vl4', 'vl5'] as const;

/** Funk Kit oneshots: sound → velocity layer → [rr filenames]. */
export const FUNK_DRUM_KIT_SAMPLE_FILES: Record<string, Record<string, string[]>> = {
  // kick: 3 velocity layers (vl1, vl3, vl5 from original 6), 4 RR
  kick: buildVelocityRR('kick', ['vl1', 'vl2', 'vl3']),

  // snare articulations
  snare_center: buildVelocityRR('center', ['vl1', 'vl2', 'vl3', 'vl4', 'vl5']),
  snare_buzz: buildVelocityRR('buzz', ['vl1', 'vl2', 'vl3']),
  snare_flam: buildVelocityRR('flam', ['vl1', 'vl2', 'vl3']),
  snare_crossstick: buildVelocityRR('crossstick', ['vl1', 'vl2']),
  snare_muted: buildVelocityRR('muted', ['vl1', 'vl2']),
  snare_rimshot: buildVelocityRR('rimshot', ['vl1', 'vl2', 'vl3']),

  // hihat articulations
  hihat_closed: buildVelocityRR('closed', ['vl1', 'vl2', 'vl3']),
  hihat_open: {
    vl1: ['open_vl1_rr1.m4a', 'open_vl1_rr2.m4a', 'open_vl1_rr3.m4a'],
    vl2: ['open_vl2_rr1.m4a', 'open_vl2_rr2.m4a', 'open_vl2_rr3.m4a'],
  },
  hihat_foot: buildVelocityRR('pedal', ['vl1', 'vl2']),

  // ride articulations (only vl1/vl2 bow samples exist on disk)
  ride_bow: buildVelocityRR('bow', ['vl1', 'vl2']),
  ride_bell: {
    vl1: ['bell_vl1_rr1.m4a', 'bell_vl1_rr2.m4a', 'bell_vl1_rr3.m4a'],
    vl2: ['bell_vl2_rr1.m4a', 'bell_vl2_rr2.m4a', 'bell_vl2_rr3.m4a'],
    vl3: ['bell_vl3_rr1.m4a', 'bell_vl3_rr2.m4a', 'bell_vl3_rr3.m4a'],
  },

  // cymbals
  crash: buildVelocityRR('crash', ['vl1', 'vl2', 'vl3']),
  crash_sizzle: buildVelocityRR('sizzle', ['vl1', 'vl2', 'vl3']),

  // toms (no RR — single file per velocity layer)
  tom_hi: {
    vl1: ['htom_vl1.m4a'],
    vl2: ['htom_vl2.m4a'],
    vl3: ['htom_vl3.m4a'],
  },
  tom_lo: {
    vl1: ['ltom_vl1.m4a'],
    vl2: ['ltom_vl2.m4a'],
    vl3: ['ltom_vl3.m4a'],
  },
};

/**
 * Maps legacy DrumSound names to their articulation equivalents for Funk Kit.
 * Used by the articulation resolver to route old sound names → new sample keys.
 */
export const FUNK_ARTICULATION_MAP: Partial<Record<DrumSound, DrumSound>> = {
  bassDrum: 'kick',
  snare: 'snare_center',
  hihat: 'hihat_closed',
  hihatHalf: 'hihat_closed',
  hihatOpen: 'hihat_open',
  ride: 'ride_bow',
  crash: 'crash',
  rim: 'snare_crossstick',
  highTom: 'tom_hi',
  lowTom: 'tom_lo',
};
