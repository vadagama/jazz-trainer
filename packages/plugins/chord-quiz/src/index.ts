import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'assess.chords',
    name: 'Chord Quiz',
    apiVersion: 1 as const,
    category: 'assess' as const,
    description: 'Test your chord recognition skills with timed quizzes.',
  },
  contributes: {
    routes: [
      { path: '/quiz/chords', element: () => import('./ChordQuizPage') },
    ],
    navItems: [
      { section: 'practice', label: 'Chord Quiz', to: '/quiz/chords', icon: 'help-circle' },
    ],
  },
});
