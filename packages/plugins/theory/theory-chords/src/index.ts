import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'theory.chords',
    name: 'Chords',
    apiVersion: 1 as const,
    category: 'theory' as const,
    description: 'Interactive chord dictionary with voicing explorer.',
  },
  contributes: {
    routes: [{ path: '/chords', element: () => import('./ChordsPage') }],
    navItems: [{ section: 'learn', label: 'Chords', to: '/chords', icon: 'disc' }],
  },
});
