import { definePlugin } from '@jazz/plugin-sdk';
import { percussionManifest } from './manifest.js';

export { percussionManifest } from './manifest.js';
export { PERCUSSION_SAMPLE_FILES } from './sampleRegistry.js';

export default definePlugin({
  manifest: {
    id: 'instrument.percussion',
    name: 'Percussion',
    apiVersion: 1 as const,
    category: 'core' as const,
    description: 'Latin percussion — 16 sounds (congas, timbales, shaker, clave …), 4 RR.',
  },
  contributes: {
    instruments: [{ manifest: percussionManifest }],
  },
});
