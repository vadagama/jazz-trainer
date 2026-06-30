import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'theory.rhythm',
    name: 'Ритм в джазе',
    apiVersion: 1 as const,
    category: 'theory' as const,
    description: 'Лекция: основы джазового ритма, свинг и синкопы.',
  },
  contributes: {
    routes: [{ path: '/theory/rhythm', element: () => import('./RhythmPage') }],
    navItems: [{ section: 'learn', label: 'Ритм', to: '/theory/rhythm', icon: 'music' }],
  },
});
