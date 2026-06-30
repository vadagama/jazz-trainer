import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'theory.arpeggios',
    name: 'Арпеджио',
    apiVersion: 1 as const,
    category: 'theory' as const,
    description: 'Лекция: арпеджио — построение и применение в джазовой импровизации.',
  },
  contributes: {
    routes: [{ path: '/theory/arpeggios', element: () => import('./ArpeggiosPage') }],
    navItems: [{ section: 'learn', label: 'Арпеджио', to: '/theory/arpeggios', icon: 'music' }],
  },
});
