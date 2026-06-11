import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'core.player',
    name: 'Player',
    apiVersion: 1,
    category: 'play',
    description: 'Read-only grid player for public compositions.',
  },
  contributes: {
    routes: [
      { path: '/play', element: () => import('./PlayerPage') },
      { path: '/play/:id', element: () => import('./PlayerPage') },
    ],
  },
});
