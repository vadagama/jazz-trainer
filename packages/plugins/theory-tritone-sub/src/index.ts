import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'theory.tritone-sub',
    name: 'Тритоновая замена',
    apiVersion: 1 as const,
    category: 'theory' as const,
    description: 'Лекция: тритоновая замена — замена доминанты (G7 → D♭7).',
  },
  contributes: {
    routes: [{ path: '/theory/tritone-sub', element: () => import('./TritoneSubPage') }],
    navItems: [
      { section: 'learn', label: 'Тритоновая замена', to: '/theory/tritone-sub', icon: 'music' },
    ],
  },
});
