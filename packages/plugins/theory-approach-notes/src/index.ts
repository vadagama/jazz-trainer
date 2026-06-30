import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'theory.approach-notes',
    name: 'Подходные ноты',
    apiVersion: 1 as const,
    category: 'theory' as const,
    description: 'Лекция: хроматические подходные ноты в джазовой импровизации.',
  },
  contributes: {
    routes: [{ path: '/theory/approach-notes', element: () => import('./ApproachNotesPage') }],
    navItems: [
      { section: 'learn', label: 'Подходные ноты', to: '/theory/approach-notes', icon: 'music' },
    ],
  },
});
