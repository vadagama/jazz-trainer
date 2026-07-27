import { Navigate } from 'react-router-dom';
import { useAuth } from '@jazz/plugin-sdk';
import CatalogPage from './CatalogPage';

/**
 * Гард корневого роута `/`:
 * - гостей (неавторизованных) уводим на лендинг `/landing`;
 * - авторизованным показываем каталог композиций.
 */
export default function CatalogRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Navigate to="/landing" replace />;

  return <CatalogPage />;
}
