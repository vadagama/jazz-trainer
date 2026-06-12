import { eq } from 'drizzle-orm';
import {
  users,
  userSettings,
  harmonyGrids,
  roles,
  permissions,
  rolePermissions,
} from './schema.js';
import type { DrizzleDb } from './index.js';
import type { GridContent } from '@jazz/shared';
import { RBAC_PERMISSIONS, RBAC_ROLES } from '../services/rbac.service.js';

const SYSTEM_USER_ID = 'system';

/**
 * Idempotent: create the system user if it doesn't exist.
 * The system user owns the public catalog seed-grids (visibility='public').
 * It cannot log in (provider='system' is rejected by all auth paths).
 */
export function seedSystemUser(db: DrizzleDb): void {
  const now = Date.now();
  const existing = db.select().from(users).where(eq(users.id, SYSTEM_USER_ID)).get();
  if (!existing) {
    db.insert(users)
      .values({
        id: SYSTEM_USER_ID,
        email: 'system@jazz-trainer.internal',
        name: 'Jazz Trainer',
        avatarUrl: null,
        provider: 'system',
        providerId: 'system',
        role: 'system',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }
}

/**
 * Idempotent: create a dev test user + default settings.
 * Only called when AUTH_DEV_MODE=true. Used by e2e tests and local dev.
 * Dev user gets super_admin role for full local access.
 */
export function seedDevUser(db: DrizzleDb): void {
  const now = Date.now();
  const email = 'dev@jazz-trainer.local';
  const existing = db.select().from(users).where(eq(users.email, email)).get();
  if (existing) return;

  const id = crypto.randomUUID();
  db.insert(users)
    .values({
      id,
      email,
      name: 'Dev User',
      avatarUrl: null,
      provider: 'dev',
      providerId: email,
      role: RBAC_ROLES.SUPER_ADMIN,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    })
    .run();

  db.insert(userSettings)
    .values({
      userId: id,
      bpm: 120,
      clickStrong: 'drum-stick',
      clickWeak: 'drum-stick',
      volume: 0.8,
      countIn: 0,
      createdAt: now,
      updatedAt: now,
    })
    .run();
}

// ── RBAC seed (Phase R) ─────────────────────────────────────────────────────

const SEED_PERMISSIONS = [
  RBAC_PERMISSIONS.ADMIN,
  RBAC_PERMISSIONS.USERS_READ,
  RBAC_PERMISSIONS.USERS_WRITE,
  RBAC_PERMISSIONS.CONTENT_READ,
  RBAC_PERMISSIONS.CONTENT_WRITE,
  RBAC_PERMISSIONS.FLAGS_READ,
  RBAC_PERMISSIONS.FLAGS_WRITE,
  RBAC_PERMISSIONS.ASSETS_READ,
  RBAC_PERMISSIONS.ASSETS_WRITE,
  RBAC_PERMISSIONS.DIAGNOSTICS_READ,
  RBAC_PERMISSIONS.AUDIT_READ,
];

interface SeedRole {
  id: string;
  name: string;
  permissions: string[];
}

const SEED_ROLES: SeedRole[] = [
  {
    id: 'role-super-admin',
    name: RBAC_ROLES.SUPER_ADMIN,
    permissions: SEED_PERMISSIONS,
  },
  {
    id: 'role-admin',
    name: RBAC_ROLES.ADMIN,
    permissions: [
      RBAC_PERMISSIONS.ADMIN,
      RBAC_PERMISSIONS.USERS_READ,
      RBAC_PERMISSIONS.CONTENT_READ,
      RBAC_PERMISSIONS.CONTENT_WRITE,
      RBAC_PERMISSIONS.FLAGS_READ,
      RBAC_PERMISSIONS.FLAGS_WRITE,
      RBAC_PERMISSIONS.AUDIT_READ,
      RBAC_PERMISSIONS.DIAGNOSTICS_READ,
    ],
  },
  {
    id: 'role-user',
    name: RBAC_ROLES.USER,
    permissions: [],
  },
];

/**
 * Idempotent: seed RBAC roles and permissions.
 */
export function seedRbac(db: DrizzleDb): void {
  const now = Date.now();

  // Seed permissions
  for (const code of SEED_PERMISSIONS) {
    const existing = db
      .select({ id: permissions.id })
      .from(permissions)
      .where(eq(permissions.code, code))
      .get();
    if (existing) continue;
    db.insert(permissions).values({ id: crypto.randomUUID(), code }).run();
  }

  // Seed roles and role_permissions
  for (const roleDef of SEED_ROLES) {
    const existingRole = db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.id, roleDef.id))
      .get();
    if (!existingRole) {
      db.insert(roles)
        .values({ id: roleDef.id, name: roleDef.name, createdAt: new Date(now) })
        .run();
    }

    for (const permCode of roleDef.permissions) {
      const allRps = db
        .select()
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, roleDef.id))
        .all();
      const hasPerm = allRps.some((rp) => rp.permissionCode === permCode);
      if (hasPerm) continue;
      db.insert(rolePermissions).values({ roleId: roleDef.id, permissionCode: permCode }).run();
    }
  }
}

// ── Demo grids ─────────────────────────────────────────────────────────────

interface DemoGrid {
  id: string;
  name: string;
  timeSignature: string;
  key: string;
  content: GridContent;
}

const DEMO_GRIDS: DemoGrid[] = [
  {
    id: 'demo-ii-v-i-major',
    name: 'ii-V-I in C major',
    timeSignature: '4/4',
    key: 'C',
    content: {
      version: 1,
      bars: [
        { id: 'b1', chords: [{ symbol: 'Dm7' }] },
        { id: 'b2', chords: [{ symbol: 'G7' }] },
        { id: 'b3', chords: [{ symbol: 'Cmaj7' }] },
        { id: 'b4', chords: [{ symbol: 'Cmaj7' }] },
      ],
    },
  },
  {
    id: 'demo-ii-v-i-minor',
    name: 'ii-V-i in A minor',
    timeSignature: '4/4',
    key: 'A',
    content: {
      version: 1,
      bars: [
        { id: 'b1', chords: [{ symbol: 'Bm7b5' }] },
        { id: 'b2', chords: [{ symbol: 'E7' }] },
        { id: 'b3', chords: [{ symbol: 'Am7' }] },
        { id: 'b4', chords: [{ symbol: 'Am7' }] },
      ],
    },
  },
  {
    id: 'demo-rhythm-changes',
    name: 'Rhythm Changes (A section)',
    timeSignature: '4/4',
    key: 'Bb',
    content: {
      version: 1,
      bars: [
        { id: 'b1', chords: [{ symbol: 'Bbmaj7' }, { symbol: 'G7' }] },
        { id: 'b2', chords: [{ symbol: 'Cm7' }, { symbol: 'F7' }] },
        { id: 'b3', chords: [{ symbol: 'Bbmaj7' }, { symbol: 'Bb7' }] },
        { id: 'b4', chords: [{ symbol: 'Ebmaj7' }, { symbol: 'Edim7' }] },
        { id: 'b5', chords: [{ symbol: 'Bbmaj7' }, { symbol: 'G7' }] },
        { id: 'b6', chords: [{ symbol: 'Cm7' }, { symbol: 'F7' }] },
        { id: 'b7', chords: [{ symbol: 'Cm7' }, { symbol: 'F7' }] },
        { id: 'b8', chords: [{ symbol: 'Bbmaj7' }] },
      ],
    },
  },
  {
    id: 'demo-blues-f',
    name: 'Blues in F',
    timeSignature: '4/4',
    key: 'F',
    content: {
      version: 1,
      bars: [
        { id: 'b1', chords: [{ symbol: 'F7' }] },
        { id: 'b2', chords: [{ symbol: 'F7' }] },
        { id: 'b3', chords: [{ symbol: 'F7' }] },
        { id: 'b4', chords: [{ symbol: 'F7' }] },
        { id: 'b5', chords: [{ symbol: 'Bb7' }] },
        { id: 'b6', chords: [{ symbol: 'Bb7' }] },
        { id: 'b7', chords: [{ symbol: 'F7' }] },
        { id: 'b8', chords: [{ symbol: 'F7' }] },
        { id: 'b9', chords: [{ symbol: 'Gm7' }] },
        { id: 'b10', chords: [{ symbol: 'C7' }] },
        { id: 'b11', chords: [{ symbol: 'F7' }, { symbol: 'D7' }] },
        { id: 'b12', chords: [{ symbol: 'Gm7' }, { symbol: 'C7' }] },
      ],
    },
  },
  {
    id: 'demo-turnaround',
    name: 'Jazz Turnaround',
    timeSignature: '4/4',
    key: 'C',
    content: {
      version: 1,
      bars: [
        { id: 'b1', chords: [{ symbol: 'Cmaj7' }] },
        { id: 'b2', chords: [{ symbol: 'A7' }] },
        { id: 'b3', chords: [{ symbol: 'Dm7' }] },
        { id: 'b4', chords: [{ symbol: 'G7' }] },
      ],
    },
  },
];

/**
 * Idempotent: seed 5 public demo grids owned by the system user.
 */
export function seedDemoGrids(db: DrizzleDb): void {
  const now = Date.now();
  for (const demo of DEMO_GRIDS) {
    const existing = db
      .select({ id: harmonyGrids.id })
      .from(harmonyGrids)
      .where(eq(harmonyGrids.id, demo.id))
      .get();
    if (existing) continue;
    db.insert(harmonyGrids)
      .values({
        id: demo.id,
        userId: SYSTEM_USER_ID,
        name: demo.name,
        timeSignature: demo.timeSignature,
        key: demo.key,
        visibility: 'public',
        content: JSON.stringify(demo.content),
        sourceGridId: null,
        likeCount: 0,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }
}

// When executed directly: `npm run db:seed`
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  const { createDb } = await import('./index.js');
  const { loadConfig } = await import('../config.js');
  const { runMigrations } = await import('./migrate.js');

  const config = loadConfig();
  const { db } = createDb(config.databaseUrl);
  runMigrations(db);
  seedSystemUser(db);
  seedRbac(db);
  if (config.authDevMode) seedDevUser(db);
  console.log('[db] seed complete');
}
