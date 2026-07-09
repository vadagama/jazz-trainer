import { definePlugin } from '@jazz/plugin-sdk';
import { funkDrumKitManifest } from './manifest.js';
import { FUNK_ARTICULATION_MAP } from './sampleRegistry.js';

export { funkDrumKitManifest } from './manifest.js';
export {
  FUNK_DRUM_KIT_SAMPLE_FILES,
  FUNK_VELOCITY_LAYERS,
  FUNK_ARTICULATION_MAP,
} from './sampleRegistry.js';

export default definePlugin({
  manifest: {
    id: 'instrument.funk-drum-kit',
    name: 'Funk Drum Kit',
    apiVersion: 1 as const,
    category: 'core' as const,
    description: 'Virtuosity Drums — universal acoustic kit (2–5 velocity layers ×4 RR).',
  },
  contributes: {
    instruments: [{ manifest: funkDrumKitManifest, articulationMap: FUNK_ARTICULATION_MAP }],
  },
});
