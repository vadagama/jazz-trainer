/**
 * Domain enums and constants shared by web, api and music-core.
 * Pure data — no runtime-framework dependencies.
 */

/** Time signatures supported by the metronome/grid (see docs/02-audio-engine.md). */
export const TIME_SIGNATURES = ['4/4', '3/4', '2/4', '5/4', '6/8'] as const;
export type TimeSignatureString = (typeof TIME_SIGNATURES)[number];

/** The twelve keys used by the harmony generator (see docs/06-dsl.md). */
export const KEYS = [
  'C',
  'C#',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'Gb',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
] as const;
export type Key = (typeof KEYS)[number];

/** Metronome click sound identifiers — each maps to a sample pair (<id>-strong.wav / <id>-weak.wav). */
export const CLICK_SOUNDS = [
  'analog-metronome',
  'button-click',
  'drum-stick',
  'retro-stick',
  'switch',
] as const;
export type ClickSound = (typeof CLICK_SOUNDS)[number];

/** Grid visibility (public-first model, see docs/03-data-model.md). */
export const VISIBILITY = ['public', 'private'] as const;
export type Visibility = (typeof VISIBILITY)[number];

/** Auth providers. */
export const AUTH_PROVIDERS = ['google', 'dev', 'system'] as const;
export type AuthProvider = (typeof AUTH_PROVIDERS)[number];
