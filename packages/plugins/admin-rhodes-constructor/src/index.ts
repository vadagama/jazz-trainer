import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'admin.rhodes-constructor',
    name: 'Конструктор Rhodes',
    apiVersion: 1 as const,
    category: 'admin' as const,
    description:
      'Изучение молекул и клеток Rhodes (pads, арпеджио, вставки), сборка и прослушивание паттернов.',
  },

  contributes: {
    routes: [
      {
        path: '/admin/constructor/rhodes',
        element: () => import('./RhodesConstructorPage'),
        requires: 'content:write',
      },
    ],
    navItems: [
      {
        section: 'admin',
        label: 'Конструктор Rhodes',
        to: '/admin/constructor/rhodes',
        icon: 'piano',
        requires: 'content:write',
      },
    ],
  },
});
