import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'theory.blues-advanced',
    name: 'Продвинутый блюз',
    apiVersion: 1 as const,
    category: 'theory' as const,
    description: 'Лекция: продвинутый блюз — гармонические усложнения блюзовой формы.',
  },
  contributes: {
    routes: [{ path: '/theory/blues-advanced', element: () => import('./BluesAdvancedPage') }],
    navItems: [
      { section: 'learn', label: 'Продвинутый блюз', to: '/theory/blues-advanced', icon: 'music' },
    ],
  },
});
