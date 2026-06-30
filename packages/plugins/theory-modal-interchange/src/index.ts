import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'theory.modal-interchange',
    name: 'Ладовый обмен',
    apiVersion: 1 as const,
    category: 'theory' as const,
    description: 'Лекция: ладовый обмен — заимствование аккордов из параллельных ладов.',
  },
  contributes: {
    routes: [
      { path: '/theory/modal-interchange', element: () => import('./ModalInterchangePage') },
    ],
    navItems: [
      { section: 'learn', label: 'Ладовый обмен', to: '/theory/modal-interchange', icon: 'music' },
    ],
  },
});
