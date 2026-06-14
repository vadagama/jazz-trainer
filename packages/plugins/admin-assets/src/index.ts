import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'admin.assets',
    name: 'Admin — Assets',
    apiVersion: 1,
    category: 'admin',
    description: 'Asset management panel.',
  },
  contributes: {
    routes: [
      { path: '/admin/assets', element: () => import('./AssetsPage'), requires: 'assets:read' },
    ],
    navItems: [
      {
        section: 'admin',
        label: 'Assets',
        to: '/admin/assets',
        icon: 'image',
        requires: 'assets:read',
      },
    ],
  },
});
