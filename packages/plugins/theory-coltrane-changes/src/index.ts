import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'theory.coltrane-changes',
    name: 'Coltrane Changes',
    apiVersion: 1 as const,
    category: 'theory' as const,
    description: 'Лекция: Coltrane Changes — гармонический цикл больших терций.',
  },
  contributes: {
    routes: [{ path: '/theory/coltrane-changes', element: () => import('./ColtraneChangesPage') }],
    navItems: [
      {
        section: 'learn',
        label: 'Coltrane Changes',
        to: '/theory/coltrane-changes',
        icon: 'music',
      },
    ],
  },
});
