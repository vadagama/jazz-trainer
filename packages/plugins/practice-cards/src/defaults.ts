import type { CardMode, SequenceDirection } from './generators/types.js';
import type { SequenceType, TargetDegree } from '@jazz/music-core';

export const DEF_TEMPO = 120;
export const DEF_COUNT_IN = 1;
export const DEF_METRONOME_ENABLED = true;
export const DEF_METRONOME_VOLUME = 0.5;
export const DEF_BACKING_VOLUME = 0.8;
export const DEF_REPETITIONS = 1;
export const DEF_BARS_PER_CHORD = 1;
export const DEF_TIME_SIGNATURE = '4/4' as const;
export const DEF_CARD_MODE: CardMode = 'current';
export const DEF_INFINITE = false;
export const DEF_PLAY_RANDOMLY = false;

// ── Sequences ────────────────────────────────────────────────────────────────
export const DEF_SEQUENCE_TYPE: SequenceType = '1235';
export const DEF_SEQUENCE_START_DEGREES: TargetDegree[] = [1, 2, 3, 4, 5];
export const DEF_SEQUENCE_DIRECTION: SequenceDirection = 'up';
