import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'admin.piano-constructor',
    name: 'Конструктор фортепиано',
    apiVersion: 1 as const,
    category: 'admin' as const,
    description: 'Изучение молекул и клеток фортепиано, сборка и прослушивание паттернов.',
  },

  contributes: {
    routes: [
      {
        path: '/admin/piano-constructor',
        element: () => import('./PianoConstructorPage'),
        requires: 'content:write',
      },
    ],
    navItems: [
      {
        section: 'admin',
        label: 'Конструктор фортепиано',
        to: '/admin/piano-constructor',
        icon: 'piano',
        requires: 'content:write',
      },
    ],
  },
});
