import type { NoteMap } from './sampleRegistry.js';

/**
 * Upright Piano — VSUpright1 (Versilian Studios Upright #1).
 *
 * 3 velocity layers (soft / medium / hard) at C–G chromatic anchors
 * across C1–G7 (scientific notation; source uses C3=middle-C convention).
 * Tone.js interpolates ±2 semitones from each anchor.
 *
 * Sample library: VSUpright1_SFZ (Versilian Studios Upright #1).
 * Encoded via: scripts/encode-piano.sh (VSUpright1 section).
 *
 * IMPORTANT: VSUpright1 names files one octave lower than scientific pitch
 * (C3=middle-C = MIDI 60). Keys here are scientific (C4=middle-C).
 */

export type PianoVelocityLayer = 'soft' | 'medium' | 'hard';

/** Velocity thresholds: <0.33 → soft, 0.33–0.66 → medium, >0.66 → hard. */
export function pickPianoLayer(velocity: number): PianoVelocityLayer {
  if (velocity < 0.33) return 'soft';
  if (velocity < 0.66) return 'medium';
  return 'hard';
}

// ─── Soft layer (vl1, vel 0–65) ────────────────────────────────────────────────
// VSUpright1 uses C3=middle-C convention; keys below are scientific (C4=middle-C).

const UPRIGHT_SOFT: NoteMap = {
  C1: 'C0_vl1_rr1.m4a',
  C2: 'C1_vl1_rr1.m4a',
  C3: 'C2_vl1_rr1.m4a',
  C4: 'C3_vl1_rr1.m4a',
  C5: 'C4_vl1_rr1.m4a',
  C6: 'C5_vl1_rr1.m4a',
  G1: 'G0_vl1_rr1.m4a',
  G2: 'G1_vl1_rr1.m4a',
  G3: 'G2_vl1_rr1.m4a',
  G4: 'G3_vl1_rr1.m4a',
  G5: 'G4_vl1_rr1.m4a',
  G6: 'G5_vl1_rr1.m4a',
  G7: 'G6_vl1_rr1.m4a',
};

// ─── Medium layer (vl2, vel 66–99) ─────────────────────────────────────────────
// VSUpright1 uses C3=middle-C convention; keys below are scientific (C4=middle-C).

const UPRIGHT_MEDIUM: NoteMap = {
  C1: 'C0_vl2_rr1.m4a',
  C2: 'C1_vl2_rr1.m4a',
  C3: 'C2_vl2_rr1.m4a',
  C4: 'C3_vl2_rr1.m4a',
  C5: 'C4_vl2_rr1.m4a',
  C6: 'C5_vl2_rr1.m4a',
  C7: 'C6_vl2_rr1.m4a',
  G1: 'G0_vl2_rr1.m4a',
  G2: 'G1_vl2_rr1.m4a',
  G3: 'G2_vl2_rr1.m4a',
  G4: 'G3_vl2_rr1.m4a',
  G5: 'G4_vl2_rr1.m4a',
  G6: 'G5_vl2_rr1.m4a',
};

// ─── Hard layer (vl3, vel 100–127) ─────────────────────────────────────────────
// VSUpright1 uses C3=middle-C convention; keys below are scientific (C4=middle-C).

const UPRIGHT_HARD: NoteMap = {
  C1: 'C0_vl3_rr1.m4a',
  C2: 'C1_vl3_rr1.m4a',
  C3: 'C2_vl3_rr1.m4a',
  C4: 'C3_vl3_rr1.m4a',
  C5: 'C4_vl3_rr1.m4a',
  C6: 'C5_vl3_rr1.m4a',
  C7: 'C6_vl3_rr1.m4a',
  G1: 'G0_vl3_rr1.m4a',
  G2: 'G1_vl3_rr1.m4a',
  G3: 'G2_vl3_rr1.m4a',
  G4: 'G3_vl3_rr1.m4a',
  G5: 'G4_vl3_rr1.m4a',
  G6: 'G5_vl3_rr1.m4a',
  G7: 'G6_vl3_rr2.m4a',
};

// ─── Exports ──────────────────────────────────────────────────────────────────

export const UPRIGHT_LAYERS: Record<PianoVelocityLayer, NoteMap> = {
  soft: UPRIGHT_SOFT,
  medium: UPRIGHT_MEDIUM,
  hard: UPRIGHT_HARD,
};

export const UPRIGHT_SAMPLER_BASE_URL = '/samples/aac/piano/upright/';
