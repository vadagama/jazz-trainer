import { definePlugin } from '@jazz/plugin-sdk';
import { metronomeManifest } from './manifest.js';

export { metronomeManifest } from './manifest.js';

export default definePlugin({
  manifest: {
    id: 'instruments.metronome',
    name: 'Метроном',
    apiVersion: 1 as const,
    category: 'technique' as const,
    description: 'Метроном с настраиваемыми звуками и режимами затакта',
  },
  contributes: {
    instruments: [{ manifest: metronomeManifest, articulationMap: {} }],
    routes: [
      {
        path: '/settings/metronome',
        element: () => import('./settings/MetronomeSettings'),
        requires: 'settings:write',
      },
    ],
  },
});
