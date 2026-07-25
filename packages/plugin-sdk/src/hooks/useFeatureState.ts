import { useAuth } from '../queries/useAuth';

/**
 * Three-state visibility of a feature (theory/exercises section) for the current user.
 *
 * - `active`   — section is enabled (feature code present in `permissions`).
 * - `inactive` — section is visible but locked ("coming soon"); code is in `inactivePermissions`.
 * - `hidden`   — section is fully hidden; code is in neither set.
 *
 * Returns `hidden` while auth is loading — safer to briefly hide than to flash
 * a locked feature.
 */
export type FeatureState = 'active' | 'inactive' | 'hidden';

export function useFeatureState(code: string): FeatureState {
  const { permissions, inactivePermissions, isLoading } = useAuth();
  if (isLoading) return 'hidden';
  if (permissions.includes(code)) return 'active';
  if (inactivePermissions.includes(code)) return 'inactive';
  return 'hidden';
}

export interface FeatureGroupVisibility {
  /** At least one code is `active` or `inactive`. */
  isVisible: boolean;
  /** At least one code is `active`. */
  anyActive: boolean;
}

/**
 * Aggregate visibility across a group of feature codes.
 * Used to decide whether to render a parent menu item ("Теория"/"Упражнения"):
 * hide it entirely when every child is `hidden`.
 */
export function useFeatureGroupVisibility(
  codes: readonly string[],
): FeatureGroupVisibility {
  const { permissions, inactivePermissions, isLoading } = useAuth();
  if (isLoading) return { isVisible: false, anyActive: false };
  const visibleSet = new Set([...permissions, ...inactivePermissions]);
  let isVisible = false;
  let anyActive = false;
  // Full pass over all codes — the aggregate must not depend on code order.
  for (const code of codes) {
    if (visibleSet.has(code)) isVisible = true;
    if (permissions.includes(code)) anyActive = true;
  }
  return { isVisible, anyActive };
}
