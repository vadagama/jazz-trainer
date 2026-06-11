import { definePlugin } from '@jazz/plugin-sdk';

// Re-export components for use by tests and other consumers
export { SearchBar } from './components/SearchBar';
export { PublicGridCard } from './components/PublicGridCard';
export { LikeButton } from './components/LikeButton';
export { CopyToMineButton } from './components/CopyToMineButton';
export { CatalogPage } from './CatalogPage';

export default definePlugin({
  manifest: {
    id: 'core.catalog',
    name: 'Catalog',
    apiVersion: 1,
    category: 'core',
    description: 'Public grid catalog and dashboard.',
  },
  contributes: {
    routes: [{ path: '/', element: () => import('./CatalogPage') }],
    navItems: [{ section: 'main', label: 'Dashboard', to: '/', icon: 'home' }],
  },
});
