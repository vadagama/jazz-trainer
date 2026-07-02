import type { NoteMap } from './sampleRegistry.js';

/**
 * Vibraphone — 2 velocity layers (soft, hard).
 *
 * Range: F2–E5, 11 anchor notes (major-2nd / minor-3rd spacing).
 * Tone.js interpolates ±2 semitones from each anchor note,
 * giving full coverage across F2–F#5.
 *
 * Samples: CC0 from Versilian Studios VSCO Community.
 */

export type VibraphoneVelocityLayer = 'soft' | 'hard';

/** Velocity threshold: < 0.5 → soft, ≥ 0.5 → hard. */
const VIBRAPHONE_VELOCITY_THRESHOLD = 0.5;

export function pickVibraphoneLayer(velocity: number): VibraphoneVelocityLayer {
  return velocity < VIBRAPHONE_VELOCITY_THRESHOLD ? 'soft' : 'hard';
}

// ─── Soft layer ────────────────────────────────────────────────────────────────

const VIBRAPHONE_SOFT: NoteMap = {
  F2: 'vibraphone_F2_soft.m4a',
  A2: 'vibraphone_A2_soft.m4a',
  C3: 'vibraphone_C3_soft.m4a',
  E3: 'vibraphone_E3_soft.m4a',
  G3: 'vibraphone_G3_soft.m4a',
  B3: 'vibraphone_B3_soft.m4a',
  D4: 'vibraphone_D4_soft.m4a',
  F4: 'vibraphone_F4_soft.m4a',
  A4: 'vibraphone_A4_soft.m4a',
  C5: 'vibraphone_C5_soft.m4a',
  E5: 'vibraphone_E5_soft.m4a',
};

// ─── Hard layer ────────────────────────────────────────────────────────────────

const VIBRAPHONE_HARD: NoteMap = {
  F2: 'vibraphone_F2_hard.m4a',
  A2: 'vibraphone_A2_hard.m4a',
  C3: 'vibraphone_C3_hard.m4a',
  E3: 'vibraphone_E3_hard.m4a',
  G3: 'vibraphone_G3_hard.m4a',
  B3: 'vibraphone_B3_hard.m4a',
  D4: 'vibraphone_D4_hard.m4a',
  F4: 'vibraphone_F4_hard.m4a',
  A4: 'vibraphone_A4_hard.m4a',
  C5: 'vibraphone_C5_hard.m4a',
  E5: 'vibraphone_E5_hard.m4a',
};

// ─── Exports ──────────────────────────────────────────────────────────────────

export const VIBRAPHONE_LAYERS: Record<VibraphoneVelocityLayer, NoteMap> = {
  soft: VIBRAPHONE_SOFT,
  hard: VIBRAPHONE_HARD,
};

export const VIBRAPHONE_SAMPLER_BASE_URL = '/samples/aac/vibraphone/';
