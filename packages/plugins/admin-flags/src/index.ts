import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'admin.flags',
    name: 'Admin — Feature Flags',
    apiVersion: 1,
    category: 'admin',
    description: 'Feature flag management.',
  },
  contributes: {
    routes: [
      { path: '/admin/flags', element: () => import('./FlagsPage'), requires: 'flags:read' },
    ],
    navItems: [
      {
        section: 'admin',
        label: 'Flags',
        to: '/admin/flags',
        icon: 'flag',
        requires: 'flags:read',
      },
    ],
  },
});
