import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'theory.intervals',
    name: 'Intervals',
    apiVersion: 1 as const,
    category: 'theory' as const,
    description: 'Interactive interval reference and ear training.',
  },
  contributes: {
    routes: [
      { path: '/intervals', element: () => import('./IntervalsPage') },
    ],
    navItems: [
      { section: 'learn', label: 'Intervals', to: '/intervals', icon: 'radio' },
    ],
  },
});
