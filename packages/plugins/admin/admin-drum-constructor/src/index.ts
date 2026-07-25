import { definePlugin } from '@jazz/plugin-sdk';

// ---------------------------------------------------------------------------
// Drum Constructor — admin-инструмент для изучения элементов барабанного
// движка (молекулы, клетки) и быстрой сборки/прослушивания паттернов.
// Правки сохраняются в localStorage (autosave) и публикуются в код (dev-режим).
// ---------------------------------------------------------------------------

export default definePlugin({
  manifest: {
    id: 'admin.drum-constructor',
    name: 'Конструктор барабанов',
    apiVersion: 1 as const,
    category: 'admin' as const,
    description: 'Изучение молекул и клеток барабанов, сборка и прослушивание паттернов.',
  },

  contributes: {
    routes: [
      {
        path: '/admin/drum-constructor',
        element: () => import('./DrumConstructorPage'),
        requires: 'content:write',
      },
    ],
    navItems: [
      {
        section: 'admin',
        label: 'Конструктор',
        to: '/admin/drum-constructor',
        icon: 'drum',
        requires: 'content:write',
      },
    ],
  },
});
