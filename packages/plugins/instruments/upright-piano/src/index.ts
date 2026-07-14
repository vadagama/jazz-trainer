import { definePlugin } from '@jazz/plugin-sdk';
import { uprightPianoManifest } from './manifest.js';

export { uprightPianoManifest } from './manifest.js';
export {
  UPRIGHT_LAYERS,
  UPRIGHT_SAMPLER_BASE_URL,
  pickPianoLayer,
  type PianoVelocityLayer,
} from './sampleRegistry.js';

// Piano pattern engine (molecules/cells/organisms) lives entirely in
// @jazz/music-core — import PianoPatternEngine, PIANO_MOLECULES, etc. from
// there directly. See docs/PIANO-EXTENDED-ARRANGEMENT-2.md.

export default definePlugin({
  manifest: {
    id: 'instrument.upright-piano',
    name: 'Upright Piano',
    apiVersion: 1 as const,
    category: 'core' as const,
    description: 'Upright Piano — VSUpright1 sampled piano (2 velocity layers).',
  },
  contributes: {
    instruments: [{ manifest: uprightPianoManifest }],
  },
});
