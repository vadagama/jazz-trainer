import type { CompChordRef } from './rhodesVoicing.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CompEvent {
  readonly beat: 1 | 2 | 3 | 4;
  readonly subdivision?: 0 | 0.5;
  readonly durationBeats: number;
  readonly velocity: number;
  readonly chordRef?: CompChordRef;
}

export type CompPatternId =
  | 'charleston'
  | 'reverse-charleston'
  | 'basie-2-4'
  | 'offbeat-2-4'
  | 'anticipation-4and'
  | 'one-twoand-four'
  | 'oneand-three'
  | 'twoand-only'
  | 'four-and-sparse'
  | 'two-threeand'
  | 'halfNotes'
  | 'quarterNotes'
  | 'wholeNotes'
  | 'rest';

export type CompingProfileId =
  | 'swing-sparse'
  | 'swing-medium'
  | 'basie-light'
  | 'offbeat-push'
  | 'beginner-safe';

export interface CompingProfile {
  readonly id: CompingProfileId;
  readonly name: string;
  readonly complexity: 1 | 2 | 3;
  /** 4-bar pattern sequence: one CompPatternId per bar. */
  readonly bars: readonly [CompPatternId, CompPatternId, CompPatternId, CompPatternId];
}

// ─── Simple comping patterns («кирпичики») ──────────────────────────────────

export const COMP_PATTERNS: Record<CompPatternId, readonly CompEvent[]> = {
  charleston: [
    { beat: 1, subdivision: 0, durationBeats: 0.75, velocity: 0.55 },
    { beat: 2, subdivision: 0.5, durationBeats: 1.1, velocity: 0.48 },
  ],
  'reverse-charleston': [
    { beat: 1, subdivision: 0.5, durationBeats: 0.75, velocity: 0.48 },
    { beat: 3, subdivision: 0, durationBeats: 1.0, velocity: 0.54 },
  ],
  'basie-2-4': [
    { beat: 2, subdivision: 0, durationBeats: 0.45, velocity: 0.45 },
    { beat: 4, subdivision: 0, durationBeats: 0.45, velocity: 0.48 },
  ],
  'offbeat-2-4': [
    { beat: 2, subdivision: 0.5, durationBeats: 0.55, velocity: 0.47 },
    { beat: 4, subdivision: 0.5, durationBeats: 0.55, velocity: 0.44 },
  ],
  'anticipation-4and': [
    { beat: 4, subdivision: 0.5, durationBeats: 0.6, velocity: 0.46, chordRef: 'next' },
  ],
  'one-twoand-four': [
    { beat: 1, subdivision: 0, durationBeats: 0.6, velocity: 0.52 },
    { beat: 2, subdivision: 0.5, durationBeats: 0.55, velocity: 0.45 },
    { beat: 4, subdivision: 0, durationBeats: 0.45, velocity: 0.46 },
  ],
  'oneand-three': [
    { beat: 1, subdivision: 0.5, durationBeats: 0.55, velocity: 0.45 },
    { beat: 3, subdivision: 0, durationBeats: 0.75, velocity: 0.52 },
  ],
  'twoand-only': [{ beat: 2, subdivision: 0.5, durationBeats: 0.65, velocity: 0.45 }],
  'four-and-sparse': [
    { beat: 4, subdivision: 0.5, durationBeats: 0.55, velocity: 0.43, chordRef: 'next' },
  ],
  'two-threeand': [
    { beat: 2, subdivision: 0, durationBeats: 0.45, velocity: 0.46 },
    { beat: 3, subdivision: 0.5, durationBeats: 0.6, velocity: 0.44 },
  ],
  halfNotes: [
    { beat: 1, durationBeats: 1.65, velocity: 0.55 },
    { beat: 3, durationBeats: 1.45, velocity: 0.49 },
  ],
  quarterNotes: [
    { beat: 1, durationBeats: 0.65, velocity: 0.53 },
    { beat: 2, durationBeats: 0.5, velocity: 0.42 },
    { beat: 3, durationBeats: 0.65, velocity: 0.5 },
    { beat: 4, durationBeats: 0.5, velocity: 0.44 },
  ],
  wholeNotes: [{ beat: 1, durationBeats: 3.6, velocity: 0.54 }],
  rest: [],
};

export function getCompPattern(id: CompPatternId): readonly CompEvent[] {
  return COMP_PATTERNS[id] ?? COMP_PATTERNS.wholeNotes;
}

// ─── Composite comping profiles (4-bar sequences) ───────────────────────────

export const COMPING_PROFILES: Record<CompingProfileId, CompingProfile> = {
  'swing-sparse': {
    id: 'swing-sparse',
    name: 'Swing Sparse',
    complexity: 1,
    bars: ['basie-2-4', 'charleston', 'basie-2-4', 'halfNotes'],
  },
  'swing-medium': {
    id: 'swing-medium',
    name: 'Swing Medium',
    complexity: 2,
    bars: ['charleston', 'one-twoand-four', 'reverse-charleston', 'oneand-three'],
  },
  'basie-light': {
    id: 'basie-light',
    name: 'Basie Light',
    complexity: 1,
    bars: ['basie-2-4', 'rest', 'basie-2-4', 'twoand-only'],
  },
  'offbeat-push': {
    id: 'offbeat-push',
    name: 'Offbeat Push',
    complexity: 3,
    bars: ['offbeat-2-4', 'two-threeand', 'offbeat-2-4', 'anticipation-4and'],
  },
  'beginner-safe': {
    id: 'beginner-safe',
    name: 'Beginner Safe',
    complexity: 1,
    bars: ['halfNotes', 'wholeNotes', 'halfNotes', 'wholeNotes'],
  },
};

export function getCompingProfile(id: string): CompingProfile {
  return COMPING_PROFILES[id as CompingProfileId] ?? COMPING_PROFILES['swing-sparse'];
}
