import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'theory.chord-tones',
    name: 'Аккордовые звуки',
    apiVersion: 1 as const,
    category: 'theory' as const,
    description: 'Лекция: аккордовые звуки — фундамент джазовой импровизации.',
  },
  contributes: {
    routes: [{ path: '/theory/chord-tones', element: () => import('./ChordTonesPage') }],
    navItems: [
      { section: 'learn', label: 'Аккордовые звуки', to: '/theory/chord-tones', icon: 'music' },
    ],
  },
});
