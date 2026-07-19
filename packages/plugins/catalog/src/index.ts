import { definePlugin } from '@jazz/plugin-sdk';

// Re-export components for use by tests and other consumers
export { SearchBar } from './components/SearchBar';
export { PublicCompositionCard } from './components/PublicCompositionCard';
export { CatalogFilters } from './components/CatalogFilters';
export { CatalogFeatured } from './components/CatalogFeatured';
export { LikeButton } from './components/LikeButton';
export { CopyToMineButton } from './components/CopyToMineButton';
export { CatalogPage } from './CatalogPage';

export default definePlugin({
  manifest: {
    id: 'core.catalog',
    name: 'Catalog',
    apiVersion: 1,
    category: 'core',
    description: 'Public composition catalog with rich filters, search and featured block.',
  },
  contributes: {
    routes: [{ path: '/', element: () => import('./CatalogPage') }],
    navItems: [{ section: 'main', label: 'Каталог', to: '/', icon: 'library' }],
  },
});
