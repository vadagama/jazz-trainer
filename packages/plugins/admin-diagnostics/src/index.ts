import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'admin.diagnostics',
    name: 'Admin — Diagnostics',
    apiVersion: 1,
    category: 'admin',
    description: 'System diagnostics panel.',
  },
  contributes: {
    routes: [
      { path: '/admin/diagnostics', element: () => import('./DiagnosticsPage'), requires: 'diagnostics:read' },
    ],
    navItems: [
      { section: 'admin', label: 'Diagnostics', to: '/admin/diagnostics', icon: 'activity', requires: 'diagnostics:read' },
    ],
  },
});
