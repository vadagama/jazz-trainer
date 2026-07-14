/**
 * Rhodes sample registry — convenience re-export of the velocity layers so the
 * plugin exposes a stable public surface (matching bass/upright-piano).
 *
 * The actual filename conventions and anchor notes live in music-core
 * (`rhodesSampleRegistry.ts`) because the manifest is authored there.
 *
 * One sample library: **jRhodes3c** (mono, AAC), 4 velocity layers
 * (soft / medium / hard / bark), 15 anchor notes F1–C7.
 */
export {
  RHODES_LAYERS,
  RHODES_SAMPLER_BASE_URL,
  pickRhodesLayer,
  RHODES_VELOCITY_THRESHOLDS,
  type RhodesVelocityLayer,
} from '@jazz/music-core';
