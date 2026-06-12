import { type ReactNode } from 'react';
import { usePermission } from '@/hooks/usePermission';

interface RbacGuardProps {
  permission: string;
  children: ReactNode;
  /** Optional fallback when permission is missing (default: null) */
  fallback?: ReactNode;
}

/**
 * Conditionally renders children only when the current user has the
 * required permission. By default renders nothing (null) when missing.
 */
export function RbacGuard({ permission, children, fallback = null }: RbacGuardProps) {
  const has = usePermission(permission);
  if (!has) return <>{fallback}</>;
  return <>{children}</>;
}
