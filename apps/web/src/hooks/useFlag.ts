import { useAuth } from '@/queries/useAuth';

/**
 * Check whether a feature flag is enabled for the current user.
 * Resolves: enabled && (roleMatch || userMatch || noFilters).
 */
export function useFlag(key: string): boolean {
  const { flags, isLoading } = useAuth();
  if (isLoading) return false;
  return flags[key] === true;
}
