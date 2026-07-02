import type { NoteMap } from './sampleRegistry.js';

/**
 * Clarinet — 2 velocity layers (soft, hard).
 *
 * Range: D3–Bb5, 9 anchor notes (minor-3rd spacing).
 * Tone.js interpolates ±2 semitones from each anchor note.
 *
 * Single velocity source → duplicated as soft/hard for 2-layer registry.
 * Samples: CC0.
 */

export type ClarinetVelocityLayer = 'soft' | 'hard';

/** Velocity threshold: < 0.5 → soft, ≥ 0.5 → hard. */
const CLARINET_VELOCITY_THRESHOLD = 0.5;

export function pickClarinetLayer(velocity: number): ClarinetVelocityLayer {
  return velocity < CLARINET_VELOCITY_THRESHOLD ? 'soft' : 'hard';
}

// ─── Soft layer ────────────────────────────────────────────────────────────────

const CLARINET_SOFT: NoteMap = {
  D3: 'clarinet_D3_soft.m4a',
  F3: 'clarinet_F3_soft.m4a',
  Bb3: 'clarinet_Bb3_soft.m4a',
  D4: 'clarinet_D4_soft.m4a',
  F4: 'clarinet_F4_soft.m4a',
  Bb4: 'clarinet_Bb4_soft.m4a',
  D5: 'clarinet_D5_soft.m4a',
  F5: 'clarinet_F5_soft.m4a',
  Bb5: 'clarinet_Bb5_soft.m4a',
};

// ─── Hard layer ────────────────────────────────────────────────────────────────

const CLARINET_HARD: NoteMap = {
  D3: 'clarinet_D3_hard.m4a',
  F3: 'clarinet_F3_hard.m4a',
  Bb3: 'clarinet_Bb3_hard.m4a',
  D4: 'clarinet_D4_hard.m4a',
  F4: 'clarinet_F4_hard.m4a',
  Bb4: 'clarinet_Bb4_hard.m4a',
  D5: 'clarinet_D5_hard.m4a',
  F5: 'clarinet_F5_hard.m4a',
  Bb5: 'clarinet_Bb5_hard.m4a',
};

// ─── Exports ──────────────────────────────────────────────────────────────────

export const CLARINET_LAYERS: Record<ClarinetVelocityLayer, NoteMap> = {
  soft: CLARINET_SOFT,
  hard: CLARINET_HARD,
};

export const CLARINET_SAMPLER_BASE_URL = '/samples/aac/clarinet/';
