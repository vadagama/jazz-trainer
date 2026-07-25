import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'admin.bass-constructor',
    name: 'Конструктор баса',
    apiVersion: 1 as const,
    category: 'admin' as const,
    description: 'Изучение молекул и клеток баса, сборка и прослушивание паттернов.',
  },

  contributes: {
    routes: [
      {
        path: '/admin/constructor/bass',
        element: () => import('./BassConstructorPage'),
        requires: 'content:write',
      },
    ],
    navItems: [
      {
        section: 'admin',
        label: 'Конструктор',
        to: '/admin/constructor/bass',
        icon: 'bass',
        requires: 'content:write',
      },
    ],
  },
});
