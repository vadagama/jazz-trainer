import { definePlugin } from '@jazz/plugin-sdk';

export default definePlugin({
  manifest: {
    id: 'core.settings',
    name: 'Настройки',
    apiVersion: 1 as const,
    category: 'core' as const,
    description: 'Страница настроек аранжировки: стиль, ансамбль, инструменты.',
  },

  contributes: {
    routes: [{ path: '/settings', element: () => import('./SettingsPage') }],
  },
});
