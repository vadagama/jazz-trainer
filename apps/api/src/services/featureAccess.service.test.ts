import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from '../db/testUtils.js';
import { seedRbac } from '../db/seed.js';
import { users, userPermissions } from '../db/schema.js';
import {
  resolvePublicFeatureAccess,
  resolveUserFeatureAccess,
} from './featureAccess.service.js';
import { ALL_FEATURE_CODES } from '@jazz/shared';
import type { DrizzleDb } from '../db/index.js';

function createUser(db: DrizzleDb, role: string, id: string) {
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

function grantFeature(db: DrizzleDb, userId: string, code: string) {
  db.insert(userPermissions).values({ userId, permissionCode: code, granted: true }).run();
}

function revokeFeature(db: DrizzleDb, userId: string, code: string) {
  db.insert(userPermissions).values({ userId, permissionCode: code, granted: false }).run();
}

describe('featureAccess — resolvePublicFeatureAccess', () => {
  let db: DrizzleDb;

  beforeEach(() => {
    db = createTestDb();
  });

  it('returns seeded defaults: 2 active, rest inactive', () => {
    const pub = resolvePublicFeatureAccess(db);
    expect([...pub.active].sort()).toEqual(['exercises:read', 'theory:read']);
    expect(pub.inactive.size).toBe(ALL_FEATURE_CODES.length - 2);
  });
});

describe('featureAccess — resolveUserFeatureAccess', () => {
  let db: DrizzleDb;

  beforeEach(() => {
    db = createTestDb();
    seedRbac(db);
  });

  it('regular user: default codes active, other features inactive', () => {
    createUser(db, 'user', 'u1');
    const res = resolveUserFeatureAccess(db, { id: 'u1', role: 'user' });
    expect(res.active.has('exercises:read')).toBe(true);
    expect(res.active.has('theory:read')).toBe(true);
    expect(res.active.has('theory:blues')).toBe(false);
    expect(res.inactive.has('theory:blues')).toBe(true);
  });

  it('super_admin: every feature active (plain grants default to active)', () => {
    createUser(db, 'super_admin', 'sa1');
    const res = resolveUserFeatureAccess(db, { id: 'sa1', role: 'super_admin' });
    for (const code of ALL_FEATURE_CODES) {
      expect(res.active.has(code)).toBe(true);
    }
    expect(res.inactive.size).toBe(0);
  });

  it('user-specific grant activates an inactive feature', () => {
    createUser(db, 'user', 'u2');
    grantFeature(db, 'u2', 'theory:blues');
    const res = resolveUserFeatureAccess(db, { id: 'u2', role: 'user' });
    expect(res.active.has('theory:blues')).toBe(true);
    expect(res.inactive.has('theory:blues')).toBe(false);
  });

  it('user-specific revoke removes a role-granted feature from active', () => {
    createUser(db, 'super_admin', 'sa2');
    revokeFeature(db, 'sa2', 'theory:blues');
    const res = resolveUserFeatureAccess(db, { id: 'sa2', role: 'super_admin' });
    expect(res.active.has('theory:blues')).toBe(false);
  });

  it('non-feature user overrides do not leak into feature resolution', () => {
    createUser(db, 'user', 'u3');
    grantFeature(db, 'u3', 'catalog:publish');
    const res = resolveUserFeatureAccess(db, { id: 'u3', role: 'user' });
    expect(res.active.has('catalog:publish')).toBe(false);
  });
});
