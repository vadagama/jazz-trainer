import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'rhythm.drills',
    name: 'Rhythm Drills',
    apiVersion: 1 as const,
    category: 'technique' as const,
    description: 'Rhythmic exercises with playback and metronome.',
  },
  contributes: {
    routes: [
      { path: '/rhythm', element: () => import('./RhythmPage') },
    ],
    navItems: [
      { section: 'practice', label: 'Rhythm', to: '/rhythm', icon: 'clock' },
    ],
  },
});
