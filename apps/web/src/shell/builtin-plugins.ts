import { definePlugin } from '@jazz/plugin-sdk';

/**
 * Встроенный псевдоплагин для оставшихся страниц
 * (Login, MyCompositions, Profile).
 * Settings вынесен в @jazz/plugin-core-settings.
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
      { path: '/my', element: () => import('../routes/MyCompositionsPage') },
      { path: '/profile', element: () => import('../routes/ProfilePage') },
      {
        path: '/admin/exercises',
        element: () => import('../routes/AdminPlaceholderPage'),
        requires: 'admin',
      },
      {
        path: '/admin/theory',
        element: () => import('../routes/AdminPlaceholderPage'),
        requires: 'admin',
      },
      {
        path: '/admin/analytics',
        element: () => import('../routes/AdminPlaceholderPage'),
        requires: 'admin',
      },
    ],
    navItems: [{ section: 'main', label: 'My Compositions', to: '/my', icon: 'music' }],
  },
});
