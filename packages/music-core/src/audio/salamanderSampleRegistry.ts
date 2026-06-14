import type { NoteMap } from './sampleRegistry.js';

/**
 * Salamander Grand Piano V3 — 2 velocity layers mapped from 16 velocity layers.
 *
 * Sample library: SalamanderGrandPianoV3_44.1khz16bit (CC-by, Alexander Holm).
 * Source has 16 velocity layers per note; we pick v4 (soft, ~mp) and v12 (hard, ~f).
 * Chromatic coverage at minor-third intervals across A0–C8.
 *
 * Tone.js interpolates ±2 semitones from each anchor note,
 * so minor-third spacing gives full-range coverage.
 */

export type SalamanderVelocityLayer = 'soft' | 'hard';

/** Velocity threshold: < 0.5 → soft, ≥ 0.5 → hard. */
const SALAMANDER_VELOCITY_THRESHOLD = 0.5;

export function pickSalamanderLayer(velocity: number): SalamanderVelocityLayer {
  return velocity < SALAMANDER_VELOCITY_THRESHOLD ? 'soft' : 'hard';
}

// ─── Soft layer (v4) ──────────────────────────────────────────────────────────

const SALAMANDER_SOFT: NoteMap = {
  A0: 'A0v4.m4a',
  A1: 'A1v4.m4a',
  A2: 'A2v4.m4a',
  A3: 'A3v4.m4a',
  A4: 'A4v4.m4a',
  A5: 'A5v4.m4a',
  A6: 'A6v4.m4a',
  A7: 'A7v4.m4a',
  C1: 'C1v4.m4a',
  C2: 'C2v4.m4a',
  C3: 'C3v4.m4a',
  C4: 'C4v4.m4a',
  C5: 'C5v4.m4a',
  C6: 'C6v4.m4a',
  C7: 'C7v4.m4a',
  C8: 'C8v4.m4a',
  'D#1': 'Ds1v4.m4a',
  'D#2': 'Ds2v4.m4a',
  'D#3': 'Ds3v4.m4a',
  'D#4': 'Ds4v4.m4a',
  'D#5': 'Ds5v4.m4a',
  'D#6': 'Ds6v4.m4a',
  'D#7': 'Ds7v4.m4a',
  'F#1': 'Fs1v4.m4a',
  'F#2': 'Fs2v4.m4a',
  'F#3': 'Fs3v4.m4a',
  'F#4': 'Fs4v4.m4a',
  'F#5': 'Fs5v4.m4a',
  'F#6': 'Fs6v4.m4a',
  'F#7': 'Fs7v4.m4a',
};

// ─── Hard layer (v12) ─────────────────────────────────────────────────────────

const SALAMANDER_HARD: NoteMap = {
  A0: 'A0v12.m4a',
  A1: 'A1v12.m4a',
  A2: 'A2v12.m4a',
  A3: 'A3v12.m4a',
  A4: 'A4v12.m4a',
  A5: 'A5v12.m4a',
  A6: 'A6v12.m4a',
  A7: 'A7v12.m4a',
  C1: 'C1v12.m4a',
  C2: 'C2v12.m4a',
  C3: 'C3v12.m4a',
  C4: 'C4v12.m4a',
  C5: 'C5v12.m4a',
  C6: 'C6v12.m4a',
  C7: 'C7v12.m4a',
  C8: 'C8v12.m4a',
  'D#1': 'Ds1v12.m4a',
  'D#2': 'Ds2v12.m4a',
  'D#3': 'Ds3v12.m4a',
  'D#4': 'Ds4v12.m4a',
  'D#5': 'Ds5v12.m4a',
  'D#6': 'Ds6v12.m4a',
  'D#7': 'Ds7v12.m4a',
  'F#1': 'Fs1v12.m4a',
  'F#2': 'Fs2v12.m4a',
  'F#3': 'Fs3v12.m4a',
  'F#4': 'Fs4v12.m4a',
  'F#5': 'Fs5v12.m4a',
  'F#6': 'Fs6v12.m4a',
  'F#7': 'Fs7v12.m4a',
};

// ─── Exports ──────────────────────────────────────────────────────────────────

export const SALAMANDER_LAYERS: Record<SalamanderVelocityLayer, NoteMap> = {
  soft: SALAMANDER_SOFT,
  hard: SALAMANDER_HARD,
};

export const SALAMANDER_SAMPLER_BASE_URL = '/samples/aac/piano/salamander/';
