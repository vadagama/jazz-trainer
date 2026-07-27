import { eq, and, inArray } from 'drizzle-orm';
import { ALL_FEATURE_CODES } from '@jazz/shared';
import { roles, rolePermissions, userRoles, userPermissions, featureAccess } from '../db/schema.js';
import type { DrizzleDb } from '../db/index.js';

/**
 * 3-state feature visibility resolution (FEATURES-VISION.md §4).
 *
 * Single source of truth for "which exercise/theory sections does this user
 * see, and in what state". Composed of three layers, in ascending priority:
 *  1. role grants — role_permissions.state for the user's roles
 *     (active in ANY role wins over inactive, mirroring RBAC grant union);
 *  2. user-specific overrides — user_permissions (grant → active, revoke → hidden);
 *  3. public overlay — feature_access rows apply to everyone, anonymous included.
 *
 * Non-feature permissions are resolved separately by resolvePermissions
 * (rbac.service.ts); /api/auth/me composes the two.
 */
export interface FeatureAccessResolution {
  /** Feature codes the user can use. */
  active: Set<string>;
  /** Feature codes visible but locked ("coming soon"). */
  inactive: Set<string>;
}

function emptyResolution(): FeatureAccessResolution {
  return { active: new Set<string>(), inactive: new Set<string>() };
}

/** Global feature visibility for anonymous users (the "Public" admin column). */
export async function resolvePublicFeatureAccess(db: DrizzleDb): Promise<FeatureAccessResolution> {
  const result = emptyResolution();
  const rows = await db.select().from(featureAccess).all();
  for (const row of rows) {
    if (row.state === 'active') result.active.add(row.featureCode);
    else result.inactive.add(row.featureCode);
  }
  return result;
}

/** Full per-user resolution: role states + user overrides + public overlay. */
export async function resolveUserFeatureAccess(
  db: DrizzleDb,
  user: { id: string; role: string | null },
): Promise<FeatureAccessResolution> {
  const result = emptyResolution();

  // 1. Role-based states
  const roleNames = new Set<string>();
  if (user.role) roleNames.add(user.role);
  const urRows = await db
    .select({ roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, user.id))
    .all();
  for (const r of urRows) roleNames.add(r.roleName);

  if (roleNames.size > 0) {
    const rows = await db
      .select({ code: rolePermissions.permissionCode, state: rolePermissions.state })
      .from(rolePermissions)
      .innerJoin(roles, eq(roles.id, rolePermissions.roleId))
      .where(
        and(
          inArray(roles.name, [...roleNames]),
          inArray(rolePermissions.permissionCode, [...ALL_FEATURE_CODES]),
        ),
      )
      .all();
    for (const row of rows) {
      if (row.state === 'active') {
        result.active.add(row.code);
        result.inactive.delete(row.code);
      } else if (!result.active.has(row.code)) {
        result.inactive.add(row.code);
      }
    }
  }

  // 2. User-specific overrides for feature codes
  const ups = await db
    .select({ code: userPermissions.permissionCode, granted: userPermissions.granted })
    .from(userPermissions)
    .where(eq(userPermissions.userId, user.id))
    .all();
  for (const up of ups) {
    if (!ALL_FEATURE_CODES.includes(up.code)) continue;
    if (up.granted) {
      result.active.add(up.code);
      result.inactive.delete(up.code);
    } else {
      result.active.delete(up.code);
      result.inactive.delete(up.code);
    }
  }

  // 3. Public overlay (feature_access applies to everyone)
  const pub = await resolvePublicFeatureAccess(db);
  for (const code of pub.active) {
    result.active.add(code);
    result.inactive.delete(code);
  }
  for (const code of pub.inactive) {
    if (!result.active.has(code)) result.inactive.add(code);
  }

  return result;
}
