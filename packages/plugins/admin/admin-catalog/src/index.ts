import { definePlugin } from '@jazz/plugin-sdk';

export { CatalogPublishPage } from './CatalogPublishPage';
export { CatalogModerationPage } from './CatalogModerationPage';
export { CatalogEditPage } from './CatalogEditPage';
export { CatalogTagsPage } from './CatalogTagsPage';
export { CatalogStatsPage } from './CatalogStatsPage';

export default definePlugin({
  manifest: {
    id: 'admin.catalog',
    name: 'Catalog Admin',
    apiVersion: 1,
    category: 'admin',
    description: 'Публикация, модерация и управление каталогом композиций.',
  },
  contributes: {
    routes: [
      {
        path: '/admin/catalog',
        element: () => import('./CatalogModerationPage'),
        requires: 'catalog:moderate',
      },
      {
        path: '/admin/catalog/publish',
        element: () => import('./CatalogPublishPage'),
        requires: 'catalog:publish',
      },
      {
        path: '/admin/catalog/:id/edit',
        element: () => import('./CatalogEditPage'),
        requires: 'catalog:moderate',
      },
      {
        path: '/admin/catalog/tags',
        element: () => import('./CatalogTagsPage'),
        requires: 'catalog:tags:write',
      },
      {
        path: '/admin/catalog/stats',
        element: () => import('./CatalogStatsPage'),
        requires: 'catalog:stats:read',
      },
    ],
    navItems: [
      {
        section: 'admin',
        label: 'Каталог',
        to: '/admin/catalog',
        icon: 'library',
        requires: 'catalog:moderate',
      },
    ],
  },
});
