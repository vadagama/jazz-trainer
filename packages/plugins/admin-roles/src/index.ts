import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'admin.roles',
    name: 'Admin — Roles',
    apiVersion: 1,
    category: 'admin',
    description: 'Role and permission management panel.',
  },
  contributes: {
    routes: [
      { path: '/admin/roles', element: () => import('./RolesPage'), requires: 'roles:read' },
    ],
    navItems: [
      {
        section: 'admin',
        label: 'Роли',
        to: '/admin/roles',
        icon: 'shield',
        requires: 'roles:read',
      },
    ],
  },
});
