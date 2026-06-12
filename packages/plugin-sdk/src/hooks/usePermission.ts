import { useAuth } from '../queries/useAuth';

/**
 * Check whether the current user has a specific permission.
 * Returns false while loading or when the user is anonymous.
 */
export function usePermission(permission: string): boolean {
  const { permissions, isLoading } = useAuth();
  if (isLoading) return false;
  return permissions.includes(permission);
}
