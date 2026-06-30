import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'theory.secondary-dominants',
    name: 'Побочные доминанты',
    apiVersion: 1 as const,
    category: 'theory' as const,
    description: 'Лекция: побочные доминанты — V7/ii, V7/V, V7/vi и т.д.',
  },
  contributes: {
    routes: [
      { path: '/theory/secondary-dominants', element: () => import('./SecondaryDominantsPage') },
    ],
    navItems: [
      {
        section: 'learn',
        label: 'Побочные доминанты',
        to: '/theory/secondary-dominants',
        icon: 'music',
      },
    ],
  },
});
