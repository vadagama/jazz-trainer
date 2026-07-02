import type { NoteMap } from './sampleRegistry.js';

/**
 * Organ (Hammond-style) — 2 velocity layers (soft, hard).
 *
 * Source: FreePats Drawbar Organ Emulation (CC0), setBfree software synthesizer.
 * Range: C2–C7, anchors at C, E, G# (major-third spacing, 4 semitones).
 * Single velocity layer per note → duplicated as soft/hard for 2-layer registry.
 * Tone.js interpolates ±2 semitones from each anchor.
 *
 * Filename convention: G# → Gs for URL safety.
 */

export type OrganVelocityLayer = 'soft' | 'hard';

/** Velocity threshold: < 0.5 → soft, ≥ 0.5 → hard. */
const ORGAN_VELOCITY_THRESHOLD = 0.5;

export function pickOrganLayer(velocity: number): OrganVelocityLayer {
  return velocity < ORGAN_VELOCITY_THRESHOLD ? 'soft' : 'hard';
}

// ─── Soft layer ────────────────────────────────────────────────────────────────

const ORGAN_SOFT: NoteMap = {
  C2: 'organ_C2_soft.m4a',
  E2: 'organ_E2_soft.m4a',
  'G#2': 'organ_Gs2_soft.m4a',
  C3: 'organ_C3_soft.m4a',
  E3: 'organ_E3_soft.m4a',
  'G#3': 'organ_Gs3_soft.m4a',
  C4: 'organ_C4_soft.m4a',
  E4: 'organ_E4_soft.m4a',
  'G#4': 'organ_Gs4_soft.m4a',
  C5: 'organ_C5_soft.m4a',
  E5: 'organ_E5_soft.m4a',
  'G#5': 'organ_Gs5_soft.m4a',
  C6: 'organ_C6_soft.m4a',
  E6: 'organ_E6_soft.m4a',
  'G#6': 'organ_Gs6_soft.m4a',
  C7: 'organ_C7_soft.m4a',
};

// ─── Hard layer ────────────────────────────────────────────────────────────────

const ORGAN_HARD: NoteMap = {
  C2: 'organ_C2_hard.m4a',
  E2: 'organ_E2_hard.m4a',
  'G#2': 'organ_Gs2_hard.m4a',
  C3: 'organ_C3_hard.m4a',
  E3: 'organ_E3_hard.m4a',
  'G#3': 'organ_Gs3_hard.m4a',
  C4: 'organ_C4_hard.m4a',
  E4: 'organ_E4_hard.m4a',
  'G#4': 'organ_Gs4_hard.m4a',
  C5: 'organ_C5_hard.m4a',
  E5: 'organ_E5_hard.m4a',
  'G#5': 'organ_Gs5_hard.m4a',
  C6: 'organ_C6_hard.m4a',
  E6: 'organ_E6_hard.m4a',
  'G#6': 'organ_Gs6_hard.m4a',
  C7: 'organ_C7_hard.m4a',
};

// ─── Exports ──────────────────────────────────────────────────────────────────

export const ORGAN_LAYERS: Record<OrganVelocityLayer, NoteMap> = {
  soft: ORGAN_SOFT,
  hard: ORGAN_HARD,
};

export const ORGAN_SAMPLER_BASE_URL = '/samples/aac/organ/';
