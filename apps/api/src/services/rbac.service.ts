import { eq } from 'drizzle-orm';
import { users, roles, rolePermissions, userPermissions, userRoles, featureFlags } from '../db/schema.js';
import type { DrizzleDb } from '../db/index.js';

// ── Permission constants ────────────────────────────────────────────────────

export const RBAC_PERMISSIONS = {
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  CONTENT_READ: 'content:read',
  CONTENT_WRITE: 'content:write',
  FLAGS_READ: 'flags:read',
  FLAGS_WRITE: 'flags:write',
  ASSETS_READ: 'assets:read',
  ASSETS_WRITE: 'assets:write',
  DIAGNOSTICS_READ: 'diagnostics:read',
  AUDIT_READ: 'audit:read',
  ADMIN: 'admin',
  // Catalog
  CATALOG_READ: 'catalog:read',
  CATALOG_PUBLISH: 'catalog:publish',
  CATALOG_MODERATE: 'catalog:moderate',
  CATALOG_FEATURE: 'catalog:feature',
  CATALOG_TAGS_WRITE: 'catalog:tags:write',
  CATALOG_STATS_READ: 'catalog:stats:read',
  // Roles management
  ROLES_READ: 'roles:read',
  ROLES_WRITE: 'roles:write',
  // Feature-level
  EXERCISES_READ: 'exercises:read',
  COMPOSITIONS_READ: 'compositions:read',
  COMPOSITIONS_WRITE: 'compositions:write',
  THEORY_READ: 'theory:read',
  PROFILE_READ: 'profile:read',
  PROFILE_WRITE: 'profile:write',
  // System settings (reserved for future)
  SYSTEM_SETTINGS_READ: 'system:settings:read',
  SYSTEM_SETTINGS_WRITE: 'system:settings:write',
} as const;

export type PermissionCode = (typeof RBAC_PERMISSIONS)[keyof typeof RBAC_PERMISSIONS];

// ── Role constants ───────────────────────────────────────────────────────────

export const RBAC_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  USER: 'user',
  CATALOG_EDITOR: 'catalog_editor',
} as const;

export type RoleName = (typeof RBAC_ROLES)[keyof typeof RBAC_ROLES];

// ── Permission resolution ───────────────────────────────────────────────────

/**
 * Resolve effective permissions for a user.
 * Aggregates from all roles (via user_roles + legacy users.role),
 * then applies user-specific overrides.
 */
export function resolvePermissions(db: DrizzleDb, userId: string): Set<string> {
  const u = db
    .select({ role: users.role, status: users.status })
    .from(users)
    .where(eq(users.id, userId))
    .get();

  if (!u || u.status === 'disabled') return new Set();

  const effective = new Set<string>();

  // Collect all role names: from user_roles (many-to-many) + legacy users.role
  const roleNames = new Set<string>();

  // user_roles table may not exist yet (pre-migration); fall back to legacy role
  try {
    const urRows = db
      .select({ roleName: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(userRoles.userId, userId))
      .all();
    for (const r of urRows) roleNames.add(r.roleName);
  } catch {
    // Table doesn't exist yet — skip, legacy role fallback below covers it
  }

  // Legacy single-role fallback
  if (u.role) roleNames.add(u.role);

  // 1. Aggregate permissions from all roles
  for (const roleName of roleNames) {
    const rps = db
      .select({ code: rolePermissions.permissionCode })
      .from(rolePermissions)
      .innerJoin(roles, eq(roles.id, rolePermissions.roleId))
      .where(eq(roles.name, roleName))
      .all();
    for (const rp of rps) effective.add(rp.code);
  }

  // 2. User-specific overrides (grant/revoke)
  const ups = db
    .select({ code: userPermissions.permissionCode, granted: userPermissions.granted })
    .from(userPermissions)
    .where(eq(userPermissions.userId, userId))
    .all();

  for (const up of ups) {
    if (up.granted) effective.add(up.code);
    else effective.delete(up.code);
  }

  return effective;
}

/**
 * Check whether a user has a specific permission.
 */
export function hasPermission(db: DrizzleDb, userId: string, permission: string): boolean {
  return resolvePermissions(db, userId).has(permission);
}

// ── Feature flag resolution ──────────────────────────────────────────────────

export function resolveFlags(
  db: DrizzleDb,
  userRole: string,
  userId: string,
): Record<string, boolean> {
  const flags = db.select().from(featureFlags).all();
  const result: Record<string, boolean> = {};

  for (const flag of flags) {
    if (!flag.enabled) {
      result[flag.key] = false;
      continue;
    }

    let roleMatch = false;
    let userMatch = false;

    if (flag.roles) {
      try {
        const flagRoles: string[] = JSON.parse(flag.roles);
        roleMatch = flagRoles.includes(userRole);
      } catch {
        /* ignore parse errors */
      }
    }

    if (flag.userIds) {
      try {
        const flagUserIds: string[] = JSON.parse(flag.userIds);
        userMatch = flagUserIds.includes(userId);
      } catch {
        /* ignore parse errors */
      }
    }

    const noFilters = !flag.roles && !flag.userIds;
    result[flag.key] = noFilters || roleMatch || userMatch;
  }

  return result;
}
