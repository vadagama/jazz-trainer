import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'core.theory-catalog',
    name: 'Теория',
    apiVersion: 1 as const,
    category: 'theory' as const,
    description: 'Каталог лекций по джазовой теории с поиском, сортировкой и лайками.',
  },
  contributes: {
    routes: [
      { path: '/theory', element: () => import('./TheoryCatalogPage'), requires: 'theory:read' },
    ],
    navItems: [{ section: 'learn', label: 'Теория', to: '/theory', icon: 'book-open' }],
  },
});
