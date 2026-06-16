import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'practice.cards',
    name: 'Упражнения',
    apiVersion: 1 as const,
    category: 'practice' as const,
    description: 'Интерактивные упражнения для тренировки аккордов и гамм',
  },
  contributes: {
    routes: [{ path: '/practice-cards', element: () => import('./PracticeCardsPage') }],
    navItems: [{ section: 'practice', label: 'Упражнения', to: '/practice-cards' }],
  },
});

export * from './generators/types.js';
export { generateChordExercise } from './generators/chordExercise.js';
export { generateScaleExercise } from './generators/scaleExercise.js';
