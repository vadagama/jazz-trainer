import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'theory.ii-v-i',
    name: 'ii–V–I',
    apiVersion: 1 as const,
    category: 'theory' as const,
    description: 'Лекция: ii–V–I прогрессия — главная джазовая каденция.',
  },
  contributes: {
    routes: [{ path: '/theory/ii-v-i', element: () => import('./IIvIPage') }],
    navItems: [
      { section: 'learn', label: 'ii–V–I прогрессия', to: '/theory/ii-v-i', icon: 'music' },
    ],
  },
});
