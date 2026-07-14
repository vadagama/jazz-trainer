import { definePlugin } from '@jazz/plugin-sdk';
import { rhodesManifest } from './manifest.js';

export { rhodesManifest } from './manifest.js';
export {
  RHODES_LAYERS,
  RHODES_SAMPLER_BASE_URL,
  pickRhodesLayer,
  RHODES_VELOCITY_THRESHOLDS,
  type RhodesVelocityLayer,
} from './sampleRegistry.js';

// The Rhodes pattern engine (molecules/cells/organisms) lives entirely in
// @jazz/music-core — import RhodesPatternEngine, RHODES_MOLECULES, etc.
// from there directly. See docs/RHODES.md.

export default definePlugin({
  manifest: {
    id: 'instrument.rhodes',
    name: 'Rhodes',
    apiVersion: 1 as const,
    category: 'core' as const,
    description:
      'Rhodes — complementary pitched layer (jRhodes3c, 4 velocity layers). Pattern-engine driven: pads, arpeggios and subtle inserts that sit behind the Grand Piano.',
  },
  contributes: {
    instruments: [{ manifest: rhodesManifest }],
  },
});
