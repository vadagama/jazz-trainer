import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'admin.content',
    name: 'Admin — Content',
    apiVersion: 1,
    category: 'admin',
    description: 'Content moderation panel.',
  },
  contributes: {
    routes: [
      { path: '/admin/content', element: () => import('./ContentPage'), requires: 'content:read' },
    ],
    navItems: [
      {
        section: 'admin',
        label: 'Content',
        to: '/admin/content',
        icon: 'file-text',
        requires: 'content:read',
      },
    ],
  },
});
