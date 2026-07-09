import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'theory.blues',
    name: 'Блюз',
    apiVersion: 1 as const,
    category: 'theory' as const,
    description: 'Лекция: блюзовая форма, блюзовый лад и блюзовые ноты.',
  },
  contributes: {
    routes: [{ path: '/theory/blues', element: () => import('./BluesPage') }],
    navItems: [{ section: 'learn', label: 'Блюз', to: '/theory/blues', icon: 'music' }],
  },
});
