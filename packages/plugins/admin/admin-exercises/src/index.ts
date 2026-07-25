import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'admin.exercises',
    name: 'Admin — Exercises',
    apiVersion: 1,
    category: 'admin',
    description: 'Управление доступом к упражнениям по ролям.',
  },
  contributes: {
    routes: [
      { path: '/admin/exercises', element: () => import('./ExercisesPage'), requires: 'roles:read' },
    ],
    navItems: [
      {
        section: 'admin',
        label: 'Упражнения',
        to: '/admin/exercises',
        icon: 'dumbbell',
        requires: 'roles:read',
      },
    ],
  },
});
