import { eq, and } from 'drizzle-orm';
import type { UserDTO, UserSettingsDTO } from '@jazz/shared';
import { users, userSettings, sessions } from '../db/schema.js';
import type { DrizzleDb } from '../db/index.js';
import type { UserRecord, UserSettingsRecord } from '../db/schema.js';

// ── DTO mapping ────────────────────────────────────────────────────────────

export function toUserDTO(u: UserRecord): UserDTO {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    avatarUrl: u.avatarUrl ?? null,
    provider: u.provider as 'google' | 'dev' | 'system',
    role: u.role,
    status: u.status as 'active' | 'disabled',
    createdAt: u.createdAt,
  };
}

function clampVolume(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function toSettingsDTO(s: UserSettingsRecord): UserSettingsDTO {
  return {
    bpm: Math.max(20, Math.min(400, s.bpm)),
    clickStrong: (s.clickStrong ?? null) as UserSettingsDTO['clickStrong'],
    clickStrong2: (s.clickStrong2 ?? null) as UserSettingsDTO['clickStrong2'],
    clickWeak: (s.clickWeak ?? null) as UserSettingsDTO['clickWeak'],
    volume: clampVolume(s.volume),
    countIn: s.countIn,
    metronomeEnabled: s.metronomeEnabled,
    metronomeVolume: clampVolume(s.metronomeVolume),
    bassEnabled: s.bassEnabled,
    bassVolume: clampVolume(s.bassVolume),
    bassComplexity: s.bassComplexity,
    bassOctaveUp: s.bassOctaveUp,
    rhodesEnabled: s.rhodesEnabled,
    rhodesVolume: clampVolume(s.rhodesVolume),
    rhodesMode: s.rhodesMode as UserSettingsDTO['rhodesMode'],
    rhodesLayerMode: s.rhodesLayerMode as UserSettingsDTO['rhodesLayerMode'],
    rhodesLayerVolume: clampVolume(s.rhodesLayerVolume),
    rhodesVoicingDensity: s.rhodesVoicingDensity as UserSettingsDTO['rhodesVoicingDensity'],
    pianoEnabled: s.pianoEnabled,
    pianoVolume: clampVolume(s.pianoVolume),
    pianoProfile: s.pianoProfile as UserSettingsDTO['pianoProfile'],
    pianoVoicingDensity: s.pianoVoicingDensity as UserSettingsDTO['pianoVoicingDensity'],
    pianoSampleLibrary: s.pianoSampleLibrary as UserSettingsDTO['pianoSampleLibrary'],
    pianoRandomizationLevel:
      s.pianoRandomizationLevel as UserSettingsDTO['pianoRandomizationLevel'],
    drumsEnabled: s.drumsEnabled,
    drumsVolume: clampVolume(s.drumsVolume),
    drumsRideEnabled: s.drumsRideEnabled,
    drumsRideVolume: clampVolume(s.drumsRideVolume),
    drumsStirEnabled: s.drumsStirEnabled,
    drumsStirVolume: clampVolume(s.drumsStirVolume),
    drumsHihatEnabled: s.drumsHihatEnabled,
    drumsHihatVolume: clampVolume(s.drumsHihatVolume),
    drumsHihatOpenness: s.drumsHihatOpenness,
    drumsBassDrumEnabled: s.drumsBassDrumEnabled,
    drumsBassDrumVolume: clampVolume(s.drumsBassDrumVolume),
    drumsSnareEnabled: s.drumsSnareEnabled,
    drumsSnareVolume: clampVolume(s.drumsSnareVolume),
    drumsCrashEnabled: s.drumsCrashEnabled,
    drumsCrashVolume: clampVolume(s.drumsCrashVolume),
    drumsCrashFrequency: s.drumsCrashFrequency,
    drumsRimEnabled: s.drumsRimEnabled,
    drumsRimVolume: clampVolume(s.drumsRimVolume),
    style:
      (s.style as UserSettingsDTO['style']) ??
      (s.drumsPattern as UserSettingsDTO['style']) ??
      'swing',
    drumsPattern: s.drumsPattern as UserSettingsDTO['drumsPattern'],
    drumsHumanizeIntensity: s.drumsHumanizeIntensity as UserSettingsDTO['drumsHumanizeIntensity'],
    drumsFunkComplexity: s.drumsFunkComplexity as UserSettingsDTO['drumsFunkComplexity'],
    drumsFillFrequency: s.drumsFillFrequency as UserSettingsDTO['drumsFillFrequency'],
    drumsRandomizationLevel:
      s.drumsRandomizationLevel as UserSettingsDTO['drumsRandomizationLevel'],
    drumsFillComplexity: s.drumsFillComplexity as UserSettingsDTO['drumsFillComplexity'],
    drumsRideVariation: s.drumsRideVariation,
    drumsSnareGhosts: s.drumsSnareGhosts,
    drumsBassDrumVariation: s.drumsBassDrumVariation,
    drumsRidePattern: s.drumsRidePattern as UserSettingsDTO['drumsRidePattern'],
    swingRatio: Math.max(0.5, Math.min(0.75, s.swingRatio)),
    audioFormat: s.audioFormat as UserSettingsDTO['audioFormat'],
    practiceCards: s.practiceCards
      ? (JSON.parse(s.practiceCards) as UserSettingsDTO['practiceCards'])
      : undefined,
  };
}

// ── User management ─────────────────────────────────────────────────────────

interface UpsertUserInput {
  provider: 'google' | 'dev';
  providerId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

/**
 * Create or update a user by (provider, providerId).
 * On conflict: update email/name/avatarUrl and updatedAt.
 */
export function upsertUser(db: DrizzleDb, input: UpsertUserInput): UserRecord {
  const now = Date.now();
  const existing = db
    .select()
    .from(users)
    .where(and(eq(users.provider, input.provider), eq(users.providerId, input.providerId)))
    .get();

  if (existing) {
    db.update(users)
      .set({
        email: input.email,
        name: input.name,
        avatarUrl: input.avatarUrl ?? null,
        updatedAt: now,
      })
      .where(eq(users.id, existing.id))
      .run();
    return { ...existing, email: input.email, name: input.name, updatedAt: now };
  }

  const id = crypto.randomUUID();
  const newUser: UserRecord = {
    id,
    email: input.email,
    name: input.name,
    avatarUrl: input.avatarUrl ?? null,
    provider: input.provider,
    providerId: input.providerId,
    role: 'user',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
  db.insert(users).values(newUser).run();
  return newUser;
}

/**
 * Ensure a `user_settings` row exists for the user.
 * Called on first login; idempotent.
 */
export function ensureUserSettings(db: DrizzleDb, userId: string): void {
  const existing = db.select().from(userSettings).where(eq(userSettings.userId, userId)).get();
  if (existing) return;
  const now = Date.now();
  db.insert(userSettings)
    .values({
      userId,
      bpm: 120,
      clickStrong: 'drum-stick',
      clickStrong2: 'drum-stick',
      clickWeak: 'drum-stick',
      volume: 0.8,
      countIn: 1,
      metronomeVolume: 0.8,
      bassComplexity: 1,
      createdAt: now,
      updatedAt: now,
    })
    .run();
}

// ── Session management ──────────────────────────────────────────────────────

/** Create a new session and return the session ID (stored in the cookie). */
export function createSession(db: DrizzleDb, userId: string, ttlMs: number): string {
  const id = crypto.randomUUID();
  db.insert(sessions)
    .values({ id, userId, expiresAt: Date.now() + ttlMs, createdAt: Date.now() })
    .run();
  return id;
}

/**
 * Look up a session by its ID. Returns the owning user if the session is
 * valid and not expired, or null otherwise.
 */
export function getSessionUser(db: DrizzleDb, sessionId: string): UserRecord | null {
  const session = db.select().from(sessions).where(eq(sessions.id, sessionId)).get();
  if (!session || session.expiresAt < Date.now()) {
    if (session) db.delete(sessions).where(eq(sessions.id, sessionId)).run();
    return null;
  }
  return db.select().from(users).where(eq(users.id, session.userId)).get() ?? null;
}

/** Remove a session (logout). */
export function deleteSession(db: DrizzleDb, sessionId: string): void {
  db.delete(sessions).where(eq(sessions.id, sessionId)).run();
}
