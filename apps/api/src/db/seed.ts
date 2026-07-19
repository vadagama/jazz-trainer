import { eq } from 'drizzle-orm';
import {
  users,
  userSettings,
  harmonyCompositions,
  catalogTags,
  roles,
  permissions,
  rolePermissions,
  userRoles,
} from './schema.js';
import type { DrizzleDb } from './index.js';
import type { CompositionContent } from '@jazz/shared';
import { CATALOG_TAGS } from '@jazz/shared';
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

  // Assign super_admin role via user_roles
  const existingUr = db
    .select()
    .from(userRoles)
    .where(eq(userRoles.userId, id))
    .all();
  if (existingUr.length === 0) {
    db.insert(userRoles).values({ userId: id, roleId: 'role-super-admin' }).run();
  }

  db.insert(userSettings)
    .values({
      userId: id,
      bpm: 120,
      clickStrong: 'drum-stick',
      clickWeak: 'drum-stick',
      volume: 0.8,
      countIn: 1,
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
  RBAC_PERMISSIONS.CATALOG_READ,
  RBAC_PERMISSIONS.CATALOG_PUBLISH,
  RBAC_PERMISSIONS.CATALOG_MODERATE,
  RBAC_PERMISSIONS.CATALOG_FEATURE,
  RBAC_PERMISSIONS.CATALOG_TAGS_WRITE,
  RBAC_PERMISSIONS.CATALOG_STATS_READ,
  RBAC_PERMISSIONS.ROLES_READ,
  RBAC_PERMISSIONS.ROLES_WRITE,
  RBAC_PERMISSIONS.EXERCISES_READ,
  RBAC_PERMISSIONS.COMPOSITIONS_READ,
  RBAC_PERMISSIONS.COMPOSITIONS_WRITE,
  RBAC_PERMISSIONS.THEORY_READ,
  RBAC_PERMISSIONS.PROFILE_READ,
  RBAC_PERMISSIONS.PROFILE_WRITE,
  RBAC_PERMISSIONS.SYSTEM_SETTINGS_READ,
  RBAC_PERMISSIONS.SYSTEM_SETTINGS_WRITE,
];

interface SeedRole {
  id: string;
  name: string;
  permissions: string[];
}

const ALL_PERMISSIONS = SEED_PERMISSIONS;

const ADMIN_PERMISSIONS = [
  RBAC_PERMISSIONS.ADMIN,
  RBAC_PERMISSIONS.USERS_READ,
  RBAC_PERMISSIONS.CONTENT_READ,
  RBAC_PERMISSIONS.CONTENT_WRITE,
  RBAC_PERMISSIONS.FLAGS_READ,
  RBAC_PERMISSIONS.FLAGS_WRITE,
  RBAC_PERMISSIONS.ASSETS_READ,
  RBAC_PERMISSIONS.ASSETS_WRITE,
  RBAC_PERMISSIONS.DIAGNOSTICS_READ,
  RBAC_PERMISSIONS.AUDIT_READ,
  RBAC_PERMISSIONS.CATALOG_READ,
  RBAC_PERMISSIONS.CATALOG_PUBLISH,
  RBAC_PERMISSIONS.CATALOG_MODERATE,
  RBAC_PERMISSIONS.CATALOG_FEATURE,
  RBAC_PERMISSIONS.CATALOG_TAGS_WRITE,
  RBAC_PERMISSIONS.CATALOG_STATS_READ,
  RBAC_PERMISSIONS.ROLES_READ,
  RBAC_PERMISSIONS.EXERCISES_READ,
  RBAC_PERMISSIONS.COMPOSITIONS_READ,
  RBAC_PERMISSIONS.COMPOSITIONS_WRITE,
  RBAC_PERMISSIONS.THEORY_READ,
  RBAC_PERMISSIONS.PROFILE_READ,
  RBAC_PERMISSIONS.PROFILE_WRITE,
  RBAC_PERMISSIONS.SYSTEM_SETTINGS_READ,
];

const USER_PERMISSIONS = [
  RBAC_PERMISSIONS.CATALOG_READ,
  RBAC_PERMISSIONS.EXERCISES_READ,
  RBAC_PERMISSIONS.COMPOSITIONS_READ,
  RBAC_PERMISSIONS.COMPOSITIONS_WRITE,
  RBAC_PERMISSIONS.THEORY_READ,
  RBAC_PERMISSIONS.PROFILE_READ,
  RBAC_PERMISSIONS.PROFILE_WRITE,
];

const SEED_ROLES: SeedRole[] = [
  {
    id: 'role-super-admin',
    name: RBAC_ROLES.SUPER_ADMIN,
    permissions: ALL_PERMISSIONS,
  },
  {
    id: 'role-admin',
    name: RBAC_ROLES.ADMIN,
    permissions: ADMIN_PERMISSIONS,
  },
  {
    id: 'role-catalog-editor',
    name: RBAC_ROLES.CATALOG_EDITOR,
    permissions: [
      ...USER_PERMISSIONS,
      RBAC_PERMISSIONS.ADMIN,
      RBAC_PERMISSIONS.CATALOG_READ,
      RBAC_PERMISSIONS.CATALOG_PUBLISH,
      RBAC_PERMISSIONS.CATALOG_MODERATE,
      RBAC_PERMISSIONS.CATALOG_FEATURE,
      RBAC_PERMISSIONS.CATALOG_TAGS_WRITE,
      RBAC_PERMISSIONS.CATALOG_STATS_READ,
    ],
  },
  {
    id: 'role-user',
    name: RBAC_ROLES.USER,
    permissions: USER_PERMISSIONS,
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
  author: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  recommendedStyle: 'swing' | 'bossa' | 'funk' | 'latin' | 'ballad';
  recommendedTempo: number;
  tags: string[];
  timeSignature: string;
  key: string;
  content: CompositionContent;
  moderationStatus?: 'approved' | 'rejected';
}

const DEMO_COMPOSITIONS: DemoGrid[] = [
  {
    id: 'demo-ii-v-i-major',
    name: 'ii-V-I in C major',
    author: 'Jazz Trainer',
    description: 'Классическая каденция ii-V-I в мажоре — основа джазовой гармонии.',
    difficulty: 'beginner',
    recommendedStyle: 'swing',
    recommendedTempo: 120,
    tags: ['ii-V-I', 'turnaround'],
    timeSignature: '4/4',
    key: 'C',
    content: {
      version: 1,
      bars: [
        { id: 'b1', chords: [{ symbol: 'Dm7' }] },
        { id: 'b2', chords: [{ symbol: 'G7' }] },
        { id: 'b3', chords: [{ symbol: 'Cmaj7' }] },
        { id: 'b4', chords: [{ symbol: 'Cmaj7' }], repeatEnd: { count: null } },
      ],
    },
  },
  {
    id: 'demo-ii-v-i-minor',
    name: 'ii-V-i in A minor',
    author: 'Jazz Trainer',
    description: 'Минорная каденция ii-V-i с уменьшённым аккордом ii (m7b5).',
    difficulty: 'beginner',
    recommendedStyle: 'swing',
    recommendedTempo: 120,
    tags: ['ii-V-I', 'turnaround'],
    timeSignature: '4/4',
    key: 'A',
    content: {
      version: 1,
      bars: [
        { id: 'b1', chords: [{ symbol: 'Bm7b5' }] },
        { id: 'b2', chords: [{ symbol: 'E7' }] },
        { id: 'b3', chords: [{ symbol: 'Am7' }] },
        { id: 'b4', chords: [{ symbol: 'Am7' }], repeatEnd: { count: null } },
      ],
    },
  },
  {
    id: 'demo-rhythm-changes',
    name: 'Rhythm Changes (A section)',
    author: 'George Gershwin',
    description: 'Секция A ритм-ченджес — гармонический каркас countless стандартов.',
    difficulty: 'intermediate',
    recommendedStyle: 'swing',
    recommendedTempo: 180,
    tags: ['rhythm-changes', 'jazz-standard'],
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
        { id: 'b8', chords: [{ symbol: 'Bbmaj7' }], repeatEnd: { count: null } },
      ],
    },
  },
  {
    id: 'demo-blues-f',
    name: 'Blues in F',
    author: 'Traditional',
    description: '12-тактовый блюз в F — классическая джазовая блюзовая форма.',
    difficulty: 'beginner',
    recommendedStyle: 'swing',
    recommendedTempo: 140,
    tags: ['blues', 'jazz-standard'],
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
        { id: 'b12', chords: [{ symbol: 'Gm7' }, { symbol: 'C7' }], repeatEnd: { count: null } },
      ],
    },
  },
  {
    id: 'demo-turnaround',
    name: 'Jazz Turnaround',
    author: 'Jazz Trainer',
    description: 'Классический джазовый оборот I-vi-ii-V (turnaround).',
    difficulty: 'beginner',
    recommendedStyle: 'swing',
    recommendedTempo: 160,
    tags: ['turnaround', 'ii-V-I'],
    timeSignature: '4/4',
    key: 'C',
    content: {
      version: 1,
      bars: [
        { id: 'b1', chords: [{ symbol: 'Cmaj7' }] },
        { id: 'b2', chords: [{ symbol: 'A7' }] },
        { id: 'b3', chords: [{ symbol: 'Dm7' }] },
        { id: 'b4', chords: [{ symbol: 'G7' }], repeatEnd: { count: null } },
      ],
    },
  },
  {
    id: 'demo-blue-bossa',
    name: 'Blue Bossa',
    author: 'Kenny Dorham',
    description: 'Латиноамериканский стандарт, сочетающий минорный блюз и латин-ритм.',
    difficulty: 'intermediate',
    recommendedStyle: 'latin',
    recommendedTempo: 140,
    tags: ['jazz-standard', 'latin', 'modal-interchange'],
    timeSignature: '4/4',
    key: 'C',
    content: {
      version: 1,
      bars: [
        { id: 'b1', chords: [{ symbol: 'Cm7' }] },
        { id: 'b2', chords: [{ symbol: 'Cm7' }] },
        { id: 'b3', chords: [{ symbol: 'Fm7' }] },
        { id: 'b4', chords: [{ symbol: 'Fm7' }] },
        { id: 'b5', chords: [{ symbol: 'Dm7b5' }] },
        { id: 'b6', chords: [{ symbol: 'G7b9' }] },
        { id: 'b7', chords: [{ symbol: 'Cm7' }] },
        { id: 'b8', chords: [{ symbol: 'Cm7' }] },
        { id: 'b9', chords: [{ symbol: 'Ebm7' }] },
        { id: 'b10', chords: [{ symbol: 'Ab7' }] },
        { id: 'b11', chords: [{ symbol: 'Dbmaj7' }] },
        { id: 'b12', chords: [{ symbol: 'Dbmaj7' }] },
        { id: 'b13', chords: [{ symbol: 'Dm7b5' }] },
        { id: 'b14', chords: [{ symbol: 'G7b9' }] },
        { id: 'b15', chords: [{ symbol: 'Cm7' }] },
        { id: 'b16', chords: [{ symbol: 'G7b9' }], repeatEnd: { count: null } },
      ],
    },
  },
  {
    id: 'demo-autumn-leaves',
    name: 'Autumn Leaves',
    author: 'Joseph Kosma',
    description:
      'Классический джазовый стандарт в оригинальной тональности Gm. Форма AABC: секвенция ii-V-I по квартовому кругу, хроматический спуск в секции C (Gm7→Gb7→Fm7→E7).',
    difficulty: 'intermediate',
    recommendedStyle: 'swing',
    recommendedTempo: 140,
    tags: ['jazz-standard', 'ii-V-I', 'modal-interchange', 'chromatic'],
    timeSignature: '4/4',
    key: 'Gm',
    moderationStatus: 'rejected',
    content: {
      version: 1,
      bars: [
        // A section (bars 1-8) — repeats via repeatEnd
        { id: 'b1', chords: [{ symbol: 'Cm7' }] },
        { id: 'b2', chords: [{ symbol: 'F7' }] },
        { id: 'b3', chords: [{ symbol: 'Bbmaj7' }] },
        { id: 'b4', chords: [{ symbol: 'Ebmaj7' }] },
        { id: 'b5', chords: [{ symbol: 'Am7b5' }] },
        { id: 'b6', chords: [{ symbol: 'D7b13' }] },
        { id: 'b7', chords: [{ symbol: 'Gm6' }] },
        { id: 'b8', chords: [{ symbol: 'Gm6' }], repeatEnd: { count: 2 } },
        // B section (bars 9-16) — cycle starting from iiø-V-i
        { id: 'b9', chords: [{ symbol: 'Am7b5' }] },
        { id: 'b10', chords: [{ symbol: 'D7b13' }] },
        { id: 'b11', chords: [{ symbol: 'Gm6' }] },
        { id: 'b12', chords: [{ symbol: 'Gm6' }] },
        { id: 'b13', chords: [{ symbol: 'Cm7' }] },
        { id: 'b14', chords: [{ symbol: 'F7' }] },
        { id: 'b15', chords: [{ symbol: 'Bbmaj7' }] },
        { id: 'b16', chords: [{ symbol: 'Ebmaj7' }] },
        // C section (bars 17-24) — chromatic descent + turnaround
        { id: 'b17', chords: [{ symbol: 'Am7b5' }] },
        { id: 'b18', chords: [{ symbol: 'D7b13' }] },
        { id: 'b19', chords: [{ symbol: 'Gm7' }, { symbol: 'Gb7' }] },
        { id: 'b20', chords: [{ symbol: 'Fm7' }, { symbol: 'E7' }] },
        { id: 'b21', chords: [{ symbol: 'Am7b5' }] },
        { id: 'b22', chords: [{ symbol: 'D7b13' }] },
        { id: 'b23', chords: [{ symbol: 'Gm6' }] },
        { id: 'b24', chords: [{ symbol: 'Gm6' }] },
      ],
      sections: [
        {
          id: 's-a1',
          name: 'A',
          type: 'verseA',
          timeSignature: '4/4',
          bars: [
            { id: 'b1', chords: [{ symbol: 'Cm7' }] },
            { id: 'b2', chords: [{ symbol: 'F7' }] },
            { id: 'b3', chords: [{ symbol: 'Bbmaj7' }] },
            { id: 'b4', chords: [{ symbol: 'Ebmaj7' }] },
            { id: 'b5', chords: [{ symbol: 'Am7b5' }] },
            { id: 'b6', chords: [{ symbol: 'D7b13' }] },
            { id: 'b7', chords: [{ symbol: 'Gm6' }] },
            { id: 'b8', chords: [{ symbol: 'Gm6' }], repeatEnd: { count: 2 } },
          ],
        },
        {
          id: 's-b',
          name: 'B',
          type: 'bridge',
          timeSignature: '4/4',
          bars: [
            { id: 'b9', chords: [{ symbol: 'Am7b5' }] },
            { id: 'b10', chords: [{ symbol: 'D7b13' }] },
            { id: 'b11', chords: [{ symbol: 'Gm6' }] },
            { id: 'b12', chords: [{ symbol: 'Gm6' }] },
            { id: 'b13', chords: [{ symbol: 'Cm7' }] },
            { id: 'b14', chords: [{ symbol: 'F7' }] },
            { id: 'b15', chords: [{ symbol: 'Bbmaj7' }] },
            { id: 'b16', chords: [{ symbol: 'Ebmaj7' }] },
          ],
        },
        {
          id: 's-c',
          name: 'C',
          type: 'chorus',
          timeSignature: '4/4',
          bars: [
            { id: 'b17', chords: [{ symbol: 'Am7b5' }] },
            { id: 'b18', chords: [{ symbol: 'D7b13' }] },
            { id: 'b19', chords: [{ symbol: 'Gm7' }, { symbol: 'Gb7' }] },
            { id: 'b20', chords: [{ symbol: 'Fm7' }, { symbol: 'E7' }] },
            { id: 'b21', chords: [{ symbol: 'Am7b5' }] },
            { id: 'b22', chords: [{ symbol: 'D7b13' }] },
            { id: 'b23', chords: [{ symbol: 'Gm6' }] },
            { id: 'b24', chords: [{ symbol: 'Gm6' }] },
          ],
        },
      ],
    },
  },
  {
    id: 'demo-a-foggy-day',
    name: 'A Foggy Day',
    author: 'George Gershwin',
    description:
      'Классический джазовый стандарт Джорджа Гершвина в форме AABA — элегантная гармония с минорными заимствованиями, вторичными доминантами и полууменьшёнными аккордами.',
    difficulty: 'intermediate',
    recommendedStyle: 'swing',
    recommendedTempo: 140,
    tags: ['jazz-standard', 'ii-V-I', 'modal-interchange', 'secondary-dominants'],
    timeSignature: '4/4',
    key: 'F',
    content: {
      version: 1,
      bars: [
        // VerseA (bars 1-8)
        { id: 'b1', chords: [{ symbol: 'Fmaj7' }] },
        { id: 'b2', chords: [{ symbol: 'Am7b5' }, { symbol: 'D7b9' }] },
        { id: 'b3', chords: [{ symbol: 'Gm7' }] },
        { id: 'b4', chords: [{ symbol: 'C7' }] },
        { id: 'b5', chords: [{ symbol: 'F6' }] },
        { id: 'b6', chords: [{ symbol: 'Dm7b5' }] },
        { id: 'b7', chords: [{ symbol: 'G7' }] },
        { id: 'b8', chords: [{ symbol: 'Gm7' }, { symbol: 'C7' }] },
        // VerseB (bars 9-16)
        { id: 'b9', chords: [{ symbol: 'Fmaj7' }] },
        { id: 'b10', chords: [{ symbol: 'Cm7' }, { symbol: 'F7' }] },
        { id: 'b11', chords: [{ symbol: 'Bb6' }] },
        { id: 'b12', chords: [{ symbol: 'Bbm6' }] },
        { id: 'b13', chords: [{ symbol: 'Fmaj7' }, { symbol: 'Am7' }] },
        { id: 'b14', chords: [{ symbol: 'D7' }] },
        { id: 'b15', chords: [{ symbol: 'G7' }] },
        { id: 'b16', chords: [{ symbol: 'Gm7' }, { symbol: 'C7' }] },
        // Bridge (bars 17-24)
        { id: 'b17', chords: [{ symbol: 'Cm7' }] },
        { id: 'b18', chords: [{ symbol: 'F7' }] },
        { id: 'b19', chords: [{ symbol: 'Bb6' }] },
        { id: 'b20', chords: [{ symbol: 'Eb7' }] },
        { id: 'b21', chords: [{ symbol: 'F6' }, { symbol: 'Gm7' }] },
        { id: 'b22', chords: [{ symbol: 'Am7' }, { symbol: 'Bbm6' }] },
        { id: 'b23', chords: [{ symbol: 'Am7' }, { symbol: 'Dm7' }] },
        { id: 'b24', chords: [{ symbol: 'Gm7' }, { symbol: 'C7' }] },
        // VerseC (bars 25-32)
        { id: 'b25', chords: [{ symbol: 'Fmaj7' }] },
        { id: 'b26', chords: [{ symbol: 'Cm7' }, { symbol: 'F7' }] },
        { id: 'b27', chords: [{ symbol: 'Bb6' }] },
        { id: 'b28', chords: [{ symbol: 'Bbm6' }] },
        { id: 'b29', chords: [{ symbol: 'F6' }] },
        { id: 'b30', chords: [{ symbol: 'Gm7' }, { symbol: 'C7' }] },
        { id: 'b31', chords: [{ symbol: 'F6' }] },
        { id: 'b32', chords: [{ symbol: 'F6' }], repeatEnd: { count: null } },
      ],
      sections: [
        {
          id: 's-a1',
          name: 'VerseA',
          type: 'verseA',
          timeSignature: '4/4',
          bars: [
            { id: 'b1', chords: [{ symbol: 'Fmaj7' }] },
            { id: 'b2', chords: [{ symbol: 'Am7b5' }, { symbol: 'D7b9' }] },
            { id: 'b3', chords: [{ symbol: 'Gm7' }] },
            { id: 'b4', chords: [{ symbol: 'C7' }] },
            { id: 'b5', chords: [{ symbol: 'F6' }] },
            { id: 'b6', chords: [{ symbol: 'Dm7b5' }] },
            { id: 'b7', chords: [{ symbol: 'G7' }] },
            { id: 'b8', chords: [{ symbol: 'Gm7' }, { symbol: 'C7' }] },
          ],
        },
        {
          id: 's-a2',
          name: 'VerseB',
          type: 'verseB',
          timeSignature: '4/4',
          bars: [
            { id: 'b9', chords: [{ symbol: 'Fmaj7' }] },
            { id: 'b10', chords: [{ symbol: 'Cm7' }, { symbol: 'F7' }] },
            { id: 'b11', chords: [{ symbol: 'Bb6' }] },
            { id: 'b12', chords: [{ symbol: 'Bbm6' }] },
            { id: 'b13', chords: [{ symbol: 'Fmaj7' }, { symbol: 'Am7' }] },
            { id: 'b14', chords: [{ symbol: 'D7' }] },
            { id: 'b15', chords: [{ symbol: 'G7' }] },
            { id: 'b16', chords: [{ symbol: 'Gm7' }, { symbol: 'C7' }] },
          ],
        },
        {
          id: 's-b',
          name: 'Bridge',
          type: 'bridge',
          timeSignature: '4/4',
          bars: [
            { id: 'b17', chords: [{ symbol: 'Cm7' }] },
            { id: 'b18', chords: [{ symbol: 'F7' }] },
            { id: 'b19', chords: [{ symbol: 'Bb6' }] },
            { id: 'b20', chords: [{ symbol: 'Eb7' }] },
            { id: 'b21', chords: [{ symbol: 'F6' }, { symbol: 'Gm7' }] },
            { id: 'b22', chords: [{ symbol: 'Am7' }, { symbol: 'Bbm6' }] },
            { id: 'b23', chords: [{ symbol: 'Am7' }, { symbol: 'Dm7' }] },
            { id: 'b24', chords: [{ symbol: 'Gm7' }, { symbol: 'C7' }] },
          ],
        },
        {
          id: 's-a3',
          name: 'VerseC',
          type: 'verseC',
          timeSignature: '4/4',
          bars: [
            { id: 'b25', chords: [{ symbol: 'Fmaj7' }] },
            { id: 'b26', chords: [{ symbol: 'Cm7' }, { symbol: 'F7' }] },
            { id: 'b27', chords: [{ symbol: 'Bb6' }] },
            { id: 'b28', chords: [{ symbol: 'Bbm6' }] },
            { id: 'b29', chords: [{ symbol: 'F6' }] },
            { id: 'b30', chords: [{ symbol: 'Gm7' }, { symbol: 'C7' }] },
            { id: 'b31', chords: [{ symbol: 'F6' }] },
            { id: 'b32', chords: [{ symbol: 'F6' }], repeatEnd: { count: null } },
          ],
        },
      ],
    },
  },
];

/**
 * Idempotent: seed public demo compositions owned by the system user.
 */
export function seedDemoCompositions(db: DrizzleDb): void {
  const now = Date.now();
  for (const demo of DEMO_COMPOSITIONS) {
    const existing = db
      .select({ id: harmonyCompositions.id })
      .from(harmonyCompositions)
      .where(eq(harmonyCompositions.id, demo.id))
      .get();
    if (existing) {
      db.update(harmonyCompositions)
        .set({
          name: demo.name,
          content: JSON.stringify(demo.content),
          description: demo.description,
          difficulty: demo.difficulty,
          tags: JSON.stringify(demo.tags),
          author: demo.author,
          recommendedStyle: demo.recommendedStyle,
          recommendedTempo: demo.recommendedTempo,
          timeSignature: demo.timeSignature,
          key: demo.key,
          moderationStatus: demo.moderationStatus ?? 'approved',
          updatedAt: now,
        })
        .where(eq(harmonyCompositions.id, demo.id))
        .run();
      continue;
    }
    db.insert(harmonyCompositions)
      .values({
        id: demo.id,
        userId: SYSTEM_USER_ID,
        name: demo.name,
        timeSignature: demo.timeSignature,
        key: demo.key,
        visibility: 'public',
        content: JSON.stringify(demo.content),
        sourceCompositionId: null,
        likeCount: 0,
        description: demo.description,
        difficulty: demo.difficulty,
        tags: JSON.stringify(demo.tags),
        author: demo.author,
        recommendedStyle: demo.recommendedStyle,
        recommendedTempo: demo.recommendedTempo,
        catalogPublishedAt: now,
        copyCount: 0,
        featured: demo.id === 'demo-blue-bossa',
        featuredOrder: demo.id === 'demo-blue-bossa' ? 1 : null,
        moderationStatus: demo.moderationStatus ?? 'approved',
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }
}

/**
 * Idempotent: seed the controlled catalog tag vocabulary (§2.3).
 */
export function seedCatalogTags(db: DrizzleDb): void {
  for (const tag of CATALOG_TAGS) {
    const existing = db
      .select({ id: catalogTags.id })
      .from(catalogTags)
      .where(eq(catalogTags.value, tag.value))
      .get();
    if (existing) continue;
    db.insert(catalogTags)
      .values({
        id: crypto.randomUUID(),
        value: tag.value,
        category: tag.category,
        description: null,
        hidden: false,
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
  seedCatalogTags(db);
  seedDemoCompositions(db);
  if (config.authDevMode) seedDevUser(db);
  console.log('[db] seed complete');
}
