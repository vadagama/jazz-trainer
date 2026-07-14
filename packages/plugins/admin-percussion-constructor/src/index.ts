import { definePlugin } from '@jazz/plugin-sdk';

// ---------------------------------------------------------------------------
// Percussion Constructor — admin-инструмент для изучения элементов перкуссионного
// движка (молекулы, клетки, организмы) и сборки/прослушивания паттернов.
// Правки сохраняются в localStorage (autosave) и публикуются в код (dev-режим).
// ---------------------------------------------------------------------------

export default definePlugin({
  manifest: {
    id: 'admin.percussion-constructor',
    name: 'Конструктор перкуссии',
    apiVersion: 1 as const,
    category: 'admin' as const,
    description: 'Изучение молекул и клеток перкуссии, сборка и прослушивание паттернов.',
  },

  contributes: {
    routes: [
      {
        path: '/admin/constructor/percussion',
        element: () => import('./PercussionConstructorPage'),
        requires: 'content:write',
      },
    ],
    navItems: [
      {
        section: 'admin',
        label: 'Конструктор',
        to: '/admin/constructor/percussion',
        icon: 'drum',
        requires: 'content:write',
      },
    ],
  },
});
