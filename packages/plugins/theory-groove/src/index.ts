import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'theory.groove',
    name: 'Грув',
    apiVersion: 1 as const,
    category: 'theory' as const,
    description: 'Лекция: понятие грува в джазе, взаимодействие ритм-секции.',
  },
  contributes: {
    routes: [{ path: '/theory/groove', element: () => import('./GroovePage') }],
    navItems: [{ section: 'learn', label: 'Грув', to: '/theory/groove', icon: 'music' }],
  },
});
