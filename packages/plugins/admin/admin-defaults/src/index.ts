import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'admin.defaults',
    name: 'Admin — Default Settings',
    apiVersion: 1,
    category: 'admin',
    description: 'Factory default settings for new and guest users.',
  },
  contributes: {
    routes: [
      {
        path: '/admin/defaults',
        element: () => import('./DefaultsPage'),
        requires: 'system:settings:read',
      },
    ],
    navItems: [
      {
        section: 'admin',
        label: 'Настройки по умолчанию',
        to: '/admin/defaults',
        icon: 'sliders',
        requires: 'system:settings:read',
      },
    ],
  },
});
