import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'admin.theory',
    name: 'Admin — Theory',
    apiVersion: 1,
    category: 'admin',
    description: 'Управление доступом к разделам теории по ролям.',
  },
  contributes: {
    routes: [
      { path: '/admin/theory', element: () => import('./TheoryPage'), requires: 'roles:read' },
    ],
    navItems: [
      {
        section: 'admin',
        label: 'Теория',
        to: '/admin/theory',
        icon: 'book-open',
        requires: 'roles:read',
      },
    ],
  },
});
