import { eq } from 'drizzle-orm';
import {
  users,
  roles,
  rolePermissions,
  userPermissions,
  userRoles,
  featureFlags,
} from '../db/schema.js';
import type { DrizzleDb } from '../db/index.js';
import type { SystemRole } from '@jazz/shared';

// ── Permission constants ────────────────────────────────────────────────────
//
// Granular exercise/theory feature codes are NOT listed here on purpose:
// their single source of truth is ALL_FEATURE_CODES in @jazz/shared, and their
// 3-state visibility lives in role_permissions.state (resolved by
// featureAccess.service.ts), not in plain RBAC grants.

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
  COMPOSITIONS_READ: 'compositions:read',
  COMPOSITIONS_WRITE: 'compositions:write',
  PROFILE_READ: 'profile:read',
  PROFILE_WRITE: 'profile:write',
  // System settings (reserved for future)
  SYSTEM_SETTINGS_READ: 'system:settings:read',
  SYSTEM_SETTINGS_WRITE: 'system:settings:write',
  // Billing
  BILLING_READ: 'billing:read',
  BILLING_MANAGE: 'billing:manage',
} as const;

export type PermissionCode = (typeof RBAC_PERMISSIONS)[keyof typeof RBAC_PERMISSIONS];

// ── Role constants ───────────────────────────────────────────────────────────

/** Values are canonical SYSTEM_ROLES from @jazz/shared — `satisfies` enforces sync. */
export const RBAC_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  USER: 'user',
  CATALOG_EDITOR: 'catalog_editor',
  SUBSCRIBER_FREE: 'subscriber_free',
  SUBSCRIBER_PRO: 'subscriber_pro',
  SUBSCRIBER_PREMIUM: 'subscriber_premium',
} as const satisfies Record<string, SystemRole>;

export type RoleName = (typeof RBAC_ROLES)[keyof typeof RBAC_ROLES];

// ── Permission resolution ───────────────────────────────────────────────────

export function resolvePermissions(db: DrizzleDb, userId: string): Set<string> {
  const u = db
    .select({ role: users.role, status: users.status })
    .from(users)
    .where(eq(users.id, userId))
    .get();

  if (!u || u.status === 'disabled') return new Set();

  const effective = new Set<string>();

  const roleNames = new Set<string>();
  const urRows = db
    .select({ roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, userId))
    .all();
  for (const r of urRows) roleNames.add(r.roleName);
  if (u.role) roleNames.add(u.role);

  for (const roleName of roleNames) {
    const rps = db
      .select({ code: rolePermissions.permissionCode })
      .from(rolePermissions)
      .innerJoin(roles, eq(roles.id, rolePermissions.roleId))
      .where(eq(roles.name, roleName))
      .all();
    for (const rp of rps) effective.add(rp.code);
  }

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

/**
 * cyrb53 — deterministic hash (https://github.com/bryc/code/blob/master/jshash/README.md).
 * Used for percentage rollout: same (key + userId) always produces the same bucket.
 */
function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/**
 * Resolve effective feature flags for a user.
 *
 * Resolution priority per flag (FEATURES-VISION.md §4.4):
 *  1. `enabled = false` → false
 *  2. `expiresAt` in the past → false (auto-disable)
 *  3. `rolloutPercent` set → deterministic bucket hash (roles/userIds ignored)
 *  4. otherwise → role OR userId match (no filters = available to everyone)
 */
export function resolveFlags(
  db: DrizzleDb,
  userRole: string,
  userId: string,
): Record<string, boolean> {
  const flags = db.select().from(featureFlags).all();
  const result: Record<string, boolean> = {};
  const now = Date.now();

  for (const flag of flags) {
    if (!flag.enabled) {
      result[flag.key] = false;
      continue;
    }

    // Auto-disable past expiry
    if (flag.expiresAt != null && now > flag.expiresAt) {
      result[flag.key] = false;
      continue;
    }

    // Percentage rollout takes precedence over role/user targeting
    if (flag.rolloutPercent != null) {
      const bucket = cyrb53(flag.key + userId) % 100;
      result[flag.key] = bucket < flag.rolloutPercent;
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
