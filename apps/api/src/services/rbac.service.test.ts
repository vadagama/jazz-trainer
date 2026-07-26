import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from '../db/testUtils.js';
import { users, userPermissions, featureFlags } from '../db/schema.js';
import { seedRbac } from '../db/seed.js';
import {
  resolvePermissions,
  resolveFlags,
  hasPermission,
  RBAC_PERMISSIONS,
  RBAC_ROLES,
} from './rbac.service.js';
import type { DrizzleDb } from '../db/index.js';

function createUser(db: DrizzleDb, role: string, id = 'test-user') {
  const now = Date.now();
  db.insert(users)
    .values({
      id,
      email: `${id}@test.com`,
      name: 'Test',
      avatarUrl: null,
      provider: 'dev',
      providerId: id,
      role,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    })
    .run();
}

describe('RBAC — resolvePermissions', () => {
  let db: DrizzleDb;

  beforeEach(() => {
    db = createTestDb();
    seedRbac(db);
  });

  it('returns empty set for non-existent user', () => {
    const perms = resolvePermissions(db, 'no-such-user');
    expect(perms.size).toBe(0);
  });

  it('returns empty set for disabled user', () => {
    const now = Date.now();
    db.insert(users)
      .values({
        id: 'disabled-user',
        email: 'disabled@test.com',
        name: 'Disabled',
        avatarUrl: null,
        provider: 'dev',
        providerId: 'disabled-user',
        role: RBAC_ROLES.SUPER_ADMIN,
        status: 'disabled',
        createdAt: now,
        updatedAt: now,
      })
      .run();
    const perms = resolvePermissions(db, 'disabled-user');
    expect(perms.size).toBe(0);
  });

  it('super_admin gets all seeded permissions', () => {
    createUser(db, RBAC_ROLES.SUPER_ADMIN);
    const perms = resolvePermissions(db, 'test-user');
    expect(perms.has(RBAC_PERMISSIONS.ADMIN)).toBe(true);
    expect(perms.has(RBAC_PERMISSIONS.USERS_READ)).toBe(true);
    expect(perms.has(RBAC_PERMISSIONS.USERS_WRITE)).toBe(true);
    expect(perms.has(RBAC_PERMISSIONS.CONTENT_READ)).toBe(true);
    expect(perms.has(RBAC_PERMISSIONS.CONTENT_WRITE)).toBe(true);
    expect(perms.has(RBAC_PERMISSIONS.FLAGS_READ)).toBe(true);
    expect(perms.has(RBAC_PERMISSIONS.FLAGS_WRITE)).toBe(true);
    expect(perms.has(RBAC_PERMISSIONS.AUDIT_READ)).toBe(true);
  });

  it('admin gets subset of permissions', () => {
    createUser(db, RBAC_ROLES.ADMIN, 'admin-user');
    const perms = resolvePermissions(db, 'admin-user');
    expect(perms.has(RBAC_PERMISSIONS.ADMIN)).toBe(true);
    expect(perms.has(RBAC_PERMISSIONS.USERS_READ)).toBe(true);
    expect(perms.has(RBAC_PERMISSIONS.CONTENT_READ)).toBe(true);
    expect(perms.has(RBAC_PERMISSIONS.CONTENT_WRITE)).toBe(true);
    // admin does NOT get USERS_WRITE
    expect(perms.has(RBAC_PERMISSIONS.USERS_WRITE)).toBe(false);
    // admin does NOT get ROLES_WRITE (reserved for super_admin)
    expect(perms.has(RBAC_PERMISSIONS.ROLES_WRITE)).toBe(false);
    // admin does NOT get SYSTEM_SETTINGS_WRITE (reserved for future)
    expect(perms.has(RBAC_PERMISSIONS.SYSTEM_SETTINGS_WRITE)).toBe(false);
  });

  it('regular user gets basic permissions', () => {
    createUser(db, RBAC_ROLES.USER, 'plain-user');
    const perms = resolvePermissions(db, 'plain-user');
    expect(perms.has(RBAC_PERMISSIONS.CATALOG_READ)).toBe(true);
    expect(perms.has(RBAC_PERMISSIONS.COMPOSITIONS_READ)).toBe(true);
    expect(perms.has(RBAC_PERMISSIONS.COMPOSITIONS_WRITE)).toBe(true);
    expect(perms.has('theory:read')).toBe(true);
    expect(perms.has(RBAC_PERMISSIONS.PROFILE_READ)).toBe(true);
    expect(perms.has(RBAC_PERMISSIONS.ADMIN)).toBe(false);
    expect(perms.has(RBAC_PERMISSIONS.USERS_WRITE)).toBe(false);
  });

  it('user-specific grant adds permission beyond role', () => {
    createUser(db, RBAC_ROLES.USER, 'grant-user');
    db.insert(userPermissions)
      .values({
        userId: 'grant-user',
        permissionCode: RBAC_PERMISSIONS.CONTENT_READ,
        granted: true,
      })
      .run();
    const perms = resolvePermissions(db, 'grant-user');
    expect(perms.has(RBAC_PERMISSIONS.CONTENT_READ)).toBe(true);
  });

  it('user-specific revoke removes role-based permission', () => {
    createUser(db, RBAC_ROLES.ADMIN, 'revoked-admin');
    // Admin role has CONTENT_READ, but we revoke it
    db.insert(userPermissions)
      .values({
        userId: 'revoked-admin',
        permissionCode: RBAC_PERMISSIONS.CONTENT_READ,
        granted: false,
      })
      .run();
    const perms = resolvePermissions(db, 'revoked-admin');
    expect(perms.has(RBAC_PERMISSIONS.CONTENT_READ)).toBe(false);
    // Other admin permissions remain
    expect(perms.has(RBAC_PERMISSIONS.ADMIN)).toBe(true);
  });
});

describe('RBAC — hasPermission', () => {
  let db: DrizzleDb;

  beforeEach(() => {
    db = createTestDb();
    seedRbac(db);
  });

  it('returns true when user has permission via role', () => {
    createUser(db, RBAC_ROLES.ADMIN, 'admin-1');
    expect(hasPermission(db, 'admin-1', RBAC_PERMISSIONS.ADMIN)).toBe(true);
  });

  it('returns false when user lacks permission', () => {
    createUser(db, RBAC_ROLES.USER, 'user-1');
    expect(hasPermission(db, 'user-1', RBAC_PERMISSIONS.ADMIN)).toBe(false);
  });

  it('returns false for non-existent user', () => {
    expect(hasPermission(db, 'no-one', RBAC_PERMISSIONS.ADMIN)).toBe(false);
  });
});

describe('RBAC — resolveFlags', () => {
  let db: DrizzleDb;

  beforeEach(() => {
    db = createTestDb();
  });

  it('returns empty object when no flags exist', () => {
    const flags = resolveFlags(db, RBAC_ROLES.USER, 'user-1');
    expect(flags).toEqual({});
  });

  it('disabled flag returns false regardless of role', () => {
    db.insert(featureFlags)
      .values({
        key: 'feature-x',
        enabled: false,
        roles: null,
        userIds: null,
      })
      .run();
    const flags = resolveFlags(db, RBAC_ROLES.SUPER_ADMIN, 'user-1');
    expect(flags['feature-x']).toBe(false);
  });

  it('enabled flag without filters returns true for everyone', () => {
    db.insert(featureFlags)
      .values({
        key: 'global-flag',
        enabled: true,
        roles: null,
        userIds: null,
      })
      .run();
    const flags = resolveFlags(db, RBAC_ROLES.USER, 'any-user');
    expect(flags['global-flag']).toBe(true);
  });

  it('role-filtered flag returns true for matching role only', () => {
    db.insert(featureFlags)
      .values({
        key: 'admin-only',
        enabled: true,
        roles: JSON.stringify([RBAC_ROLES.ADMIN, RBAC_ROLES.SUPER_ADMIN]),
        userIds: null,
      })
      .run();
    expect(resolveFlags(db, RBAC_ROLES.ADMIN, 'u1')['admin-only']).toBe(true);
    expect(resolveFlags(db, RBAC_ROLES.USER, 'u1')['admin-only']).toBe(false);
  });

  it('user-filtered flag returns true only for matching user', () => {
    db.insert(featureFlags)
      .values({
        key: 'beta-tester',
        enabled: true,
        roles: null,
        userIds: JSON.stringify(['user-a', 'user-b']),
      })
      .run();
    expect(resolveFlags(db, RBAC_ROLES.USER, 'user-a')['beta-tester']).toBe(true);
    expect(resolveFlags(db, RBAC_ROLES.USER, 'user-c')['beta-tester']).toBe(false);
  });

  it('role + user filter: either condition grants access', () => {
    db.insert(featureFlags)
      .values({
        key: 'hybrid',
        enabled: true,
        roles: JSON.stringify([RBAC_ROLES.ADMIN]),
        userIds: JSON.stringify(['special-user']),
      })
      .run();
    // admin role matches
    expect(resolveFlags(db, RBAC_ROLES.ADMIN, 'any')['hybrid']).toBe(true);
    // user matches via userId
    expect(resolveFlags(db, RBAC_ROLES.USER, 'special-user')['hybrid']).toBe(true);
    // neither role nor userId matches
    expect(resolveFlags(db, RBAC_ROLES.USER, 'other')['hybrid']).toBe(false);
  });

  it('handles malformed JSON in roles gracefully', () => {
    db.insert(featureFlags)
      .values({
        key: 'broken-json',
        enabled: true,
        roles: '{not-json',
        userIds: null,
      })
      .run();
    // Should not throw, returns false because no filter matched
    const flags = resolveFlags(db, RBAC_ROLES.ADMIN, 'u1');
    expect(flags['broken-json']).toBe(false);
  });

  // ── Percentage rollout (FEATURES-VISION.md §4.4) ──────────────────────────

  it('rolloutPercent=100 includes every user', () => {
    db.insert(featureFlags)
      .values({ key: 'rollout-100', enabled: true, rolloutPercent: 100 })
      .run();
    expect(resolveFlags(db, RBAC_ROLES.USER, 'user-a')['rollout-100']).toBe(true);
    expect(resolveFlags(db, RBAC_ROLES.USER, 'user-b')['rollout-100']).toBe(true);
  });

  it('rolloutPercent=0 excludes every user', () => {
    db.insert(featureFlags).values({ key: 'rollout-0', enabled: true, rolloutPercent: 0 }).run();
    expect(resolveFlags(db, RBAC_ROLES.USER, 'user-a')['rollout-0']).toBe(false);
  });

  it('rolloutPercent is deterministic for the same user', () => {
    db.insert(featureFlags).values({ key: 'rollout-50', enabled: true, rolloutPercent: 50 }).run();
    const first = resolveFlags(db, RBAC_ROLES.USER, 'user-a')['rollout-50'];
    const second = resolveFlags(db, RBAC_ROLES.USER, 'user-a')['rollout-50'];
    expect(first).toBe(second);
  });

  it('rolloutPercent ignores role/user targeting (precedence)', () => {
    // Even though roles/userIds would deny access, active rollout takes precedence.
    db.insert(featureFlags)
      .values({
        key: 'rollout-precedence',
        enabled: true,
        roles: JSON.stringify([RBAC_ROLES.ADMIN]),
        userIds: JSON.stringify(['someone-else']),
        rolloutPercent: 100,
      })
      .run();
    expect(resolveFlags(db, RBAC_ROLES.USER, 'any-user')['rollout-precedence']).toBe(true);
  });

  it('rolloutPercent is ignored when flag is disabled', () => {
    db.insert(featureFlags)
      .values({ key: 'rollout-disabled', enabled: false, rolloutPercent: 100 })
      .run();
    expect(resolveFlags(db, RBAC_ROLES.USER, 'user-a')['rollout-disabled']).toBe(false);
  });

  it('rolloutPercent approximates even distribution over many users', () => {
    db.insert(featureFlags)
      .values({ key: 'rollout-dist', enabled: true, rolloutPercent: 50 })
      .run();
    let enabled = 0;
    const total = 500;
    for (let i = 0; i < total; i++) {
      if (resolveFlags(db, RBAC_ROLES.USER, `user-${i}`)['rollout-dist']) enabled++;
    }
    // Expect ~50% with reasonable tolerance for a good hash.
    const ratio = enabled / total;
    expect(ratio).toBeGreaterThan(0.4);
    expect(ratio).toBeLessThan(0.6);
  });

  // ── expiresAt (auto-disable) ───────────────────────────────────────────────

  it('expired flag returns false even when enabled', () => {
    db.insert(featureFlags)
      .values({ key: 'expired', enabled: true, expiresAt: Date.now() - 1000 })
      .run();
    expect(resolveFlags(db, RBAC_ROLES.SUPER_ADMIN, 'u1')['expired']).toBe(false);
  });

  it('non-expired flag with future expiresAt resolves normally', () => {
    db.insert(featureFlags)
      .values({ key: 'future-expiry', enabled: true, expiresAt: Date.now() + 60_000 })
      .run();
    expect(resolveFlags(db, RBAC_ROLES.USER, 'u1')['future-expiry']).toBe(true);
  });
});
