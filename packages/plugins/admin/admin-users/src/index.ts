import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'admin.users',
    name: 'Admin — Users',
    apiVersion: 1,
    category: 'admin',
    description: 'User management panel.',
  },
  contributes: {
    routes: [
      { path: '/admin/users', element: () => import('./UsersPage'), requires: 'users:read' },
    ],
    navItems: [
      {
        section: 'admin',
        label: 'Users',
        to: '/admin/users',
        icon: 'users',
        requires: 'users:read',
      },
    ],
  },
});
