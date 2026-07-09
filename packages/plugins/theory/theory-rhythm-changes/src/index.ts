import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'theory.rhythm-changes',
    name: 'Rhythm Changes',
    apiVersion: 1 as const,
    category: 'theory' as const,
    description: 'Лекция: Rhythm Changes — гармоническая структура на основе I Got Rhythm.',
  },
  contributes: {
    routes: [{ path: '/theory/rhythm-changes', element: () => import('./RhythmChangesPage') }],
    navItems: [
      { section: 'learn', label: 'Rhythm Changes', to: '/theory/rhythm-changes', icon: 'music' },
    ],
  },
});
