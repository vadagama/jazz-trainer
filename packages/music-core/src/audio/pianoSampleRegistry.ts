import type { NoteMap } from './sampleRegistry.js';

/**
 * Upright Piano KW — 2 velocity layers (vL = soft, vH = hard).
 *
 * Sample library: UprightPianoKW-SFZ-20220221 (CC0, FreePats).
 * Chromatic coverage at minor-third intervals across A0–C8.
 *
 * Tone.js interpolates ±2 semitones from each anchor note,
 * so minor-third spacing gives full-range coverage.
 */

export type PianoVelocityLayer = 'soft' | 'hard';

/** Velocity threshold: < 0.5 → soft, ≥ 0.5 → hard. */
const PIANO_VELOCITY_THRESHOLD = 0.5;

export function pickPianoLayer(velocity: number): PianoVelocityLayer {
  return velocity < PIANO_VELOCITY_THRESHOLD ? 'soft' : 'hard';
}

// ─── Soft layer (vL) ──────────────────────────────────────────────────────────

const UPRIGHT_SOFT: NoteMap = {
  A0: 'A0vL.m4a',
  A1: 'A1vL.m4a',
  A2: 'A2vL.m4a',
  A3: 'A3vL.m4a',
  A4: 'A4vL.m4a',
  A5: 'A5vL.m4a',
  A6: 'A6vL.m4a',
  A7: 'A7vL.m4a',
  C1: 'C1vL.m4a',
  C2: 'C2vL.m4a',
  C3: 'C3vL.m4a',
  C4: 'C4vL.m4a',
  C5: 'C5vL.m4a',
  C6: 'C6vL.m4a',
  C7: 'C7vL.m4a',
  C8: 'C8vL.m4a',
  'D#1': 'Ds1vL.m4a',
  'D#2': 'Ds2vL.m4a',
  'D#3': 'Ds3vL.m4a',
  'D#4': 'Ds4vL.m4a',
  'D#5': 'Ds5vL.m4a',
  'D#6': 'Ds6vL.m4a',
  'D#7': 'Ds7vL.m4a',
  'F#1': 'Fs1vL.m4a',
  'F#2': 'Fs2vL.m4a',
  'F#3': 'Fs3vL.m4a',
  'F#4': 'Fs4vL.m4a',
  'F#5': 'Fs5vL.m4a',
  'F#6': 'Fs6vL.m4a',
  'F#7': 'Fs7vL.m4a',
};

// ─── Hard layer (vH) ──────────────────────────────────────────────────────────

const UPRIGHT_HARD: NoteMap = {
  A0: 'A0vH.m4a',
  A1: 'A1vH.m4a',
  A3: 'A3vH.m4a',
  A4: 'A4vH.m4a',
  A5: 'A5vH.m4a',
  A6: 'A6vH.m4a',
  A7: 'A7vH.m4a',
  B0: 'B0vH.m4a',
  B1: 'B1vH.m4a',
  B2: 'B2vH.m4a',
  B3: 'B3vH.m4a',
  B4: 'B4vH.m4a',
  B5: 'B5vH.m4a',
  B6: 'B6vH.m4a',
  B7: 'B7vH.m4a',
  C1: 'C1vH.m4a',
  C2: 'C2vH.m4a',
  C3: 'C3vH.m4a',
  C5: 'C5vH.m4a',
  C6: 'C6vH.m4a',
  C7: 'C7vH.m4a',
  C8: 'C8vH.m4a',
  'D#1': 'Ds1vH.m4a',
  'D#2': 'Ds2vH.m4a',
  'D#3': 'Ds3vH.m4a',
  'D#4': 'Ds4vH.m4a',
  'D#5': 'Ds5vH.m4a',
  'D#6': 'Ds6vH.m4a',
  'D#7': 'Ds7vH.m4a',
  'F#1': 'Fs1vH.m4a',
  'F#2': 'Fs2vH.m4a',
  'F#3': 'Fs3vH.m4a',
  'F#4': 'Fs4vH.m4a',
  'F#5': 'Fs5vH.m4a',
  'F#6': 'Fs6vH.m4a',
  'F#7': 'Fs7vH.m4a',
};

// ─── Exports ──────────────────────────────────────────────────────────────────

export const UPRIGHT_LAYERS: Record<PianoVelocityLayer, NoteMap> = {
  soft: UPRIGHT_SOFT,
  hard: UPRIGHT_HARD,
};

export const UPRIGHT_SAMPLER_BASE_URL = '/samples/aac/piano/upright/';
