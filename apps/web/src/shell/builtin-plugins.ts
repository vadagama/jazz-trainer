import { definePlugin } from '@jazz/plugin-sdk';

/**
 * Встроенный псевдоплагин, который регистрирует существующие роуты
 * и навигацию как вклады. В фазе 3 будет заменён на отдельные плагины
 * (`core-editor`, `core-player`, `catalog`).
 */
export const builtinCorePlugin = definePlugin({
  manifest: {
    id: 'builtin.core',
    name: 'Core',
    apiVersion: 1,
    category: 'core',
    description: 'Built-in core features (pseudo-plugin, replaced in Phase 3)',
  },
  contributes: {
    routes: [
      { path: '/', element: () => import('../routes/PublicDashboardPage') },
      { path: '/login', element: () => import('../routes/LoginPage') },
      { path: '/my', element: () => import('../routes/MyGridsPage') },
      { path: '/settings', element: () => import('../routes/SettingsPage') },
      { path: '/profile', element: () => import('../routes/ProfilePage') },
      { path: '/play', element: () => import('../routes/PlayerPage') },
      { path: '/play/:id', element: () => import('../routes/PlayerPage') },
      {
        path: '/grids/:id',
        element: () => import('../routes/EditorPage'),
      },
    ],
    navItems: [
      { section: 'main', label: 'Dashboard', to: '/', icon: 'home' },
      { section: 'main', label: 'My Grids', to: '/my', icon: 'grid' },
    ],
  },
});
