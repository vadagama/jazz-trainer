import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'theory.voice-leading',
    name: 'Voice Leading',
    apiVersion: 1 as const,
    category: 'theory' as const,
    description: 'Лекция: плавное голосоведение, общие тоны и пошаговое движение в ii–V–I.',
  },
  contributes: {
    routes: [{ path: '/theory/voice-leading', element: () => import('./VoiceLeadingPage') }],
    navItems: [
      {
        section: 'learn',
        label: 'Голосоведение в ii–V–I',
        to: '/theory/voice-leading',
        icon: 'music',
      },
    ],
  },
});
