import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'theory.scales',
    name: 'Scales',
    apiVersion: 1 as const,
    category: 'theory' as const,
    description: 'Interactive scale reference with visualization.',
  },
  contributes: {
    routes: [{ path: '/scales', element: () => import('./ScalesPage') }],
    navItems: [{ section: 'learn', label: 'Scales', to: '/scales', icon: 'music' }],
  },
});
