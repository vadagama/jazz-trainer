import { definePlugin } from '@jazz/plugin-sdk';

/**
 * Встроенный псевдоплагин для оставшихся страниц
 * (Login, MyGrids, Settings, Profile).
 * Editor, Player и Catalog вынесены в отдельные плагины в фазе 3.
 */
export const builtinCorePlugin = definePlugin({
  manifest: {
    id: 'builtin.core',
    name: 'Core',
    apiVersion: 1,
    category: 'core',
    description: 'Built-in core features (remaining pages, to be extracted later)',
  },
  contributes: {
    routes: [
      { path: '/login', element: () => import('../routes/LoginPage') },
      { path: '/my', element: () => import('../routes/MyGridsPage') },
      { path: '/settings', element: () => import('../routes/SettingsPage') },
      { path: '/profile', element: () => import('../routes/ProfilePage') },
    ],
    navItems: [{ section: 'main', label: 'My Grids', to: '/my', icon: 'grid' }],
  },
});
