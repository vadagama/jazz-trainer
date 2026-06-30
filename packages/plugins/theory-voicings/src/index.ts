import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'theory.voicings',
    name: 'Голосоведения',
    apiVersion: 1 as const,
    category: 'theory' as const,
    description: 'Лекция: shell, rootless, drop-2 и другие аккордовые голосоведения.',
  },
  contributes: {
    routes: [{ path: '/theory/voicings', element: () => import('./VoicingsPage') }],
    navItems: [
      {
        section: 'learn',
        label: 'Аккордовые голосоведения',
        to: '/theory/voicings',
        icon: 'music',
      },
    ],
  },
});
