import { definePlugin } from '@jazz/plugin-sdk';
import { jazzDrumKitManifest } from './manifest.js';
import { JAZZ_ARTICULATION_MAP } from './sampleRegistry.js';

export { jazzDrumKitManifest } from './manifest.js';
export {
  JAZZ_DRUM_KIT_SAMPLE_FILES,
  JAZZ_VELOCITY_LAYERS,
  JAZZ_ARTICULATION_MAP,
} from './sampleRegistry.js';

export default definePlugin({
  manifest: {
    id: 'instrument.jazz-drum-kit',
    name: 'Jazz Drum Kit',
    apiVersion: 1 as const,
    category: 'core' as const,
    description: 'Swirly Drums 1104 — acoustic jazz kit (4 velocity layers ×4 RR).',
  },
  contributes: {
    instruments: [{ manifest: jazzDrumKitManifest, articulationMap: JAZZ_ARTICULATION_MAP }],
  },
});
