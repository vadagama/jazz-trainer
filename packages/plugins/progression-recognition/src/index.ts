import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'assess.progressions',
    name: 'Progression Recognition',
    apiVersion: 1 as const,
    category: 'assess' as const,
    description: 'Identify chord progressions by ear.',
  },
  contributes: {
    routes: [
      { path: '/quiz/progressions', element: () => import('./ProgressionsPage') },
    ],
    navItems: [
      { section: 'practice', label: 'Progressions', to: '/quiz/progressions', icon: 'list-music' },
    ],
  },
});
