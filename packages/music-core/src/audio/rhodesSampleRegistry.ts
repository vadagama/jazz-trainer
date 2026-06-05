import type { NoteMap } from './sampleRegistry.js';

export type RhodesVelocityLayer = 'soft' | 'medium' | 'hard' | 'bark';

// Velocity thresholds for layer selection (0..1 scale)
export const RHODES_VELOCITY_THRESHOLDS = {
  soft:   0.35,
  medium: 0.65,
  hard:   0.88,
} as const;

export function pickRhodesLayer(velocity: number): RhodesVelocityLayer {
  if (velocity < RHODES_VELOCITY_THRESHOLDS.soft)   return 'soft';
  if (velocity < RHODES_VELOCITY_THRESHOLDS.medium) return 'medium';
  if (velocity < RHODES_VELOCITY_THRESHOLDS.hard)   return 'hard';
  return 'bark';
}

// Soft layer (~5x for F1–D3; ~5xx for G3–C7)
const RHODES_SOFT: NoteMap = {
  F1: 'As_029__F1_51-mono.ogg',
  B1: 'As_035__B1_53-mono.ogg',
  E2: 'As_040__E2_55-mono.ogg',
  A2: 'As_045__A2_57-mono.ogg',
  D3: 'As_050__D3_59-mono.ogg',
  G3: 'As_055__G3_511-mono.ogg',
  B3: 'As_059__B3_513-mono.ogg',
  D4: 'As_062__D4_513-mono.ogg',
  F4: 'As_065__F4_517-mono.ogg',
  B4: 'As_071__B4_519-mono.ogg',
  E5: 'As_076__E5_521-mono.ogg',
  A5: 'As_081__A5_523-mono.ogg',
  D6: 'As_086__D6_525-mono.ogg',
  G6: 'As_091__G6_527-mono.ogg',
  C7: 'As_096__C7_529-mono.ogg',
};

// Medium layer (~28x for F1–E5; not available for A5–C7, Tone.js interpolates from E5)
const RHODES_MEDIUM: NoteMap = {
  F1: 'As_029__F1_279-mono.ogg',
  B1: 'As_035__B1_281-mono.ogg',
  E2: 'As_040__E2_283-mono.ogg',
  A2: 'As_045__A2_285-mono.ogg',
  D3: 'As_050__D3_287-mono.ogg',
  G3: 'As_055__G3_289-mono.ogg',
  B3: 'As_059__B3_291-mono.ogg',
  D4: 'As_062__D4_293-mono.ogg',
  F4: 'As_065__F4_295-mono.ogg',
  B4: 'As_071__B4_297-mono.ogg',
  E5: 'As_076__E5_299-mono.ogg',
};

// Hard layer (~43x for all 15 notes)
const RHODES_HARD: NoteMap = {
  F1: 'As_029__F1_431-mono.ogg',
  B1: 'As_035__B1_433-mono.ogg',
  E2: 'As_040__E2_435-mono.ogg',
  A2: 'As_045__A2_437-mono.ogg',
  D3: 'As_050__D3_439-mono.ogg',
  G3: 'As_055__G3_441-mono.ogg',
  B3: 'As_059__B3_443-mono.ogg',
  D4: 'As_062__D4_445-mono.ogg',
  F4: 'As_065__F4_447-mono.ogg',
  B4: 'As_071__B4_449-mono.ogg',
  E5: 'As_076__E5_451-mono.ogg',
  A5: 'As_081__A5_453-mono.ogg',
  D6: 'As_086__D6_455-mono.ogg',
  G6: 'As_091__G6_457-mono.ogg',
  C7: 'As_096__C7_459-mono.ogg',
};

// Bark layer (~11xx for F1–E5; ~21xx for A5–C7)
const RHODES_BARK: NoteMap = {
  F1: 'As_029__F1_1109-mono.ogg',
  B1: 'As_035__B1_1111-mono.ogg',
  E2: 'As_040__E2_1113-mono.ogg',
  A2: 'As_045__A2_1115-mono.ogg',
  D3: 'As_050__D3_1117-mono.ogg',
  G3: 'As_055__G3_1119-mono.ogg',
  B3: 'As_059__B3_1121-mono.ogg',
  D4: 'As_062__D4_1123-mono.ogg',
  F4: 'As_065__F4_1125-mono.ogg',
  B4: 'As_071__B4_1127-mono.ogg',
  E5: 'As_076__E5_1129-mono.ogg',
  A5: 'As_081__A5_2101-mono.ogg',
  D6: 'As_086__D6_2103-mono.ogg',
  G6: 'As_091__G6_2105-mono.ogg',
  C7: 'As_096__C7_2107-mono.ogg',
};

export const RHODES_LAYERS: Record<RhodesVelocityLayer, NoteMap> = {
  soft:   RHODES_SOFT,
  medium: RHODES_MEDIUM,
  hard:   RHODES_HARD,
  bark:   RHODES_BARK,
};

export const RHODES_SAMPLER_BASE_URL = '/samples/rhodes/';
