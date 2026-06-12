import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'ear.training',
    name: 'Ear Training',
    apiVersion: 1 as const,
    category: 'technique' as const,
    description: 'Ear training exercises for jazz musicians.',
  },
  contributes: {
    routes: [
      { path: '/ear-training', element: () => import('./EarTrainingPage') },
    ],
    navItems: [
      { section: 'practice', label: 'Ear Training', to: '/ear-training', icon: 'headphones' },
    ],
  },
});
