import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'theory.turnarounds',
    name: 'Обороты',
    apiVersion: 1 as const,
    category: 'theory' as const,
    description: 'Лекция: обороты (turnarounds) — I–VI–II–V и iii–VI–II–V.',
  },
  contributes: {
    routes: [{ path: '/theory/turnarounds', element: () => import('./TurnaroundsPage') }],
    navItems: [
      {
        section: 'learn',
        label: 'Обороты (turnarounds)',
        to: '/theory/turnarounds',
        icon: 'music',
      },
    ],
  },
});
