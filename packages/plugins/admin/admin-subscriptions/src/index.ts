import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'admin.subscriptions',
    name: 'Admin — Subscriptions',
    apiVersion: 1,
    category: 'admin',
    description: 'Manual billing: subscription management panel.',
  },
  contributes: {
    routes: [
      {
        path: '/admin/subscriptions',
        element: () => import('./SubscriptionsPage'),
        requires: 'billing:read',
      },
    ],
    navItems: [
      {
        section: 'admin',
        label: 'Подписки',
        to: '/admin/subscriptions',
        icon: 'credit-card',
        requires: 'billing:read',
      },
    ],
  },
});
