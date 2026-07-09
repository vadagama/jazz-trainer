import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'theory.diminished-harmony',
    name: 'Уменьшённая гармония',
    apiVersion: 1 as const,
    category: 'theory' as const,
    description: 'Лекция: уменьшённая гармония — diminished-аккорды и их применение в джазе.',
  },
  contributes: {
    routes: [
      { path: '/theory/diminished-harmony', element: () => import('./DiminishedHarmonyPage') },
    ],
    navItems: [
      {
        section: 'learn',
        label: 'Уменьшённая гармония',
        to: '/theory/diminished-harmony',
        icon: 'music',
      },
    ],
  },
});
