import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'theory.scales-jazz',
    name: 'Джазовые гаммы',
    apiVersion: 1 as const,
    category: 'theory' as const,
    description: 'Лекция: diminished, whole-tone, altered и другие джазовые гаммы.',
  },
  contributes: {
    routes: [{ path: '/theory/scales-jazz', element: () => import('./ScalesJazzPage') }],
    navItems: [
      { section: 'learn', label: 'Джазовые гаммы', to: '/theory/scales-jazz', icon: 'music' },
    ],
  },
});
