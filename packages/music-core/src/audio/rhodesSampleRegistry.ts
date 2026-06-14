import type { NoteMap } from './sampleRegistry.js';

export type RhodesVelocityLayer = 'soft' | 'medium' | 'hard' | 'bark';

// Velocity thresholds for layer selection (0..1 scale)
export const RHODES_VELOCITY_THRESHOLDS = {
  soft: 0.35,
  medium: 0.65,
  hard: 0.88,
} as const;

export function pickRhodesLayer(velocity: number): RhodesVelocityLayer {
  if (velocity < RHODES_VELOCITY_THRESHOLDS.soft) return 'soft';
  if (velocity < RHODES_VELOCITY_THRESHOLDS.medium) return 'medium';
  if (velocity < RHODES_VELOCITY_THRESHOLDS.hard) return 'hard';
  return 'bark';
}

// Soft layer (~5x for F1–D3; ~5xx for G3–C7)
const RHODES_SOFT: NoteMap = {
  F1: 'As_029__F1_51-mono.m4a',
  B1: 'As_035__B1_53-mono.m4a',
  E2: 'As_040__E2_55-mono.m4a',
  A2: 'As_045__A2_57-mono.m4a',
  D3: 'As_050__D3_59-mono.m4a',
  G3: 'As_055__G3_511-mono.m4a',
  B3: 'As_059__B3_513-mono.m4a',
  D4: 'As_062__D4_513-mono.m4a',
  F4: 'As_065__F4_517-mono.m4a',
  B4: 'As_071__B4_519-mono.m4a',
  E5: 'As_076__E5_521-mono.m4a',
  A5: 'As_081__A5_523-mono.m4a',
  D6: 'As_086__D6_525-mono.m4a',
  G6: 'As_091__G6_527-mono.m4a',
  C7: 'As_096__C7_529-mono.m4a',
};

// Medium layer (~28x for F1–E5; not available for A5–C7, Tone.js interpolates from E5)
const RHODES_MEDIUM: NoteMap = {
  F1: 'As_029__F1_279-mono.m4a',
  B1: 'As_035__B1_281-mono.m4a',
  E2: 'As_040__E2_283-mono.m4a',
  A2: 'As_045__A2_285-mono.m4a',
  D3: 'As_050__D3_287-mono.m4a',
  G3: 'As_055__G3_289-mono.m4a',
  B3: 'As_059__B3_291-mono.m4a',
  D4: 'As_062__D4_293-mono.m4a',
  F4: 'As_065__F4_295-mono.m4a',
  B4: 'As_071__B4_297-mono.m4a',
  E5: 'As_076__E5_299-mono.m4a',
};

// Hard layer (~43x for all 15 notes)
const RHODES_HARD: NoteMap = {
  F1: 'As_029__F1_431-mono.m4a',
  B1: 'As_035__B1_433-mono.m4a',
  E2: 'As_040__E2_435-mono.m4a',
  A2: 'As_045__A2_437-mono.m4a',
  D3: 'As_050__D3_439-mono.m4a',
  G3: 'As_055__G3_441-mono.m4a',
  B3: 'As_059__B3_443-mono.m4a',
  D4: 'As_062__D4_445-mono.m4a',
  F4: 'As_065__F4_447-mono.m4a',
  B4: 'As_071__B4_449-mono.m4a',
  E5: 'As_076__E5_451-mono.m4a',
  A5: 'As_081__A5_453-mono.m4a',
  D6: 'As_086__D6_455-mono.m4a',
  G6: 'As_091__G6_457-mono.m4a',
  C7: 'As_096__C7_459-mono.m4a',
};

// Bark layer (~11xx for F1–E5; ~21xx for A5–C7)
const RHODES_BARK: NoteMap = {
  F1: 'As_029__F1_1109-mono.m4a',
  B1: 'As_035__B1_1111-mono.m4a',
  E2: 'As_040__E2_1113-mono.m4a',
  A2: 'As_045__A2_1115-mono.m4a',
  D3: 'As_050__D3_1117-mono.m4a',
  G3: 'As_055__G3_1119-mono.m4a',
  B3: 'As_059__B3_1121-mono.m4a',
  D4: 'As_062__D4_1123-mono.m4a',
  F4: 'As_065__F4_1125-mono.m4a',
  B4: 'As_071__B4_1127-mono.m4a',
  E5: 'As_076__E5_1129-mono.m4a',
  A5: 'As_081__A5_2101-mono.m4a',
  D6: 'As_086__D6_2103-mono.m4a',
  G6: 'As_091__G6_2105-mono.m4a',
  C7: 'As_096__C7_2107-mono.m4a',
};

export const RHODES_LAYERS: Record<RhodesVelocityLayer, NoteMap> = {
  soft: RHODES_SOFT,
  medium: RHODES_MEDIUM,
  hard: RHODES_HARD,
  bark: RHODES_BARK,
};

export const RHODES_SAMPLER_BASE_URL = '/samples/aac/rhodes/';
