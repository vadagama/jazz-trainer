import { eq, and } from 'drizzle-orm';
import type { UserDTO, UserSettingsDTO, Style } from '@jazz/shared';
import { users, userSettings, sessions } from '../db/schema.js';
import type { DrizzleDb } from '../db/index.js';
import type { UserRecord, UserSettingsRecord } from '../db/schema.js';
import { getStyleProfile } from '@jazz/music-core';

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

function clampVolume(v: number | undefined | null): number {
  if (v == null) return 0.7;
  return Math.max(0, Math.min(1, v));
}

export function toSettingsDTO(s: UserSettingsRecord): UserSettingsDTO {
  // Populate scalar instrument fields from perStyleOverrides[style]
  // so the UI always shows the current style's saved preferences.
  const style = (s.style ?? 'swing') as string;
  const perStyle: Record<string, Record<string, unknown>> | undefined = s.perStyleOverrides
    ? (JSON.parse(s.perStyleOverrides) as Record<string, Record<string, unknown>>)
    : undefined;
  const so = perStyle?.[style];

  const dto: UserSettingsDTO = {
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

    drumsEnabled: s.drumsEnabled,
    drumsVolume: clampVolume(s.drumsVolume),
    style: (s.style as UserSettingsDTO['style']) ?? 'swing',

    drumKit: (s.drumKit as UserSettingsDTO['drumKit']) ?? 'jazz-drum-kit',
    drumsPattern: (so?.drumsPattern as string | null) ?? null,

    swingRatio: Math.max(0.5, Math.min(0.75, s.swingRatio)),
    audioFormat: s.audioFormat as UserSettingsDTO['audioFormat'],
    practiceCards: s.practiceCards
      ? (JSON.parse(s.practiceCards) as UserSettingsDTO['practiceCards'])
      : undefined,
    midiDeviceId: (s.midiDeviceId ?? undefined) as string | undefined,
    midiChannel: (s.midiChannel ?? undefined) as number | undefined,
    soloToneId: (s.soloToneId ?? undefined) as string | undefined,
    soloVolume: s.soloVolume ?? undefined,
    duckingEnabled: s.duckingEnabled ?? undefined,
    perStyleOverrides: s.perStyleOverrides
      ? (JSON.parse(s.perStyleOverrides) as UserSettingsDTO['perStyleOverrides'])
      : undefined,
    // Fields stored only in perStyleOverrides (no scalar columns):
    percussionEnabled: undefined,
    percussionVolume: undefined,
    percussionHumanizeIntensity: undefined,
    guitarEnabled: undefined,
    guitarVolume: undefined,
  };

  // Overlay per-style overrides on top of scalar defaults
  if (so) {
    for (const [key, value] of Object.entries(so)) {
      if (value !== undefined) {
        (dto as Record<string, unknown>)[key] = value;
      }
    }
  }

  // Fix per-style isolation: for style-specific fields without a per-style override,
  // use profile defaults instead of scalar column values (which leak across styles).
  const profile = getStyleProfile(style as Style);
  const pd = profile.instrumentDefaults;
  const activeBass = (profile.defaultVariants.bass ?? 'upright-bass') as keyof typeof pd;
  const activeDrums = (profile.defaultVariants.drums ?? 'drums') as keyof typeof pd;
  const activeGuitar = (profile.defaultVariants.guitar ?? 'guitar') as keyof typeof pd;
  // Helper: check if key exists in so (not just truthy — false is a valid override)
  const has = (k: string) => so != null && k in so;

  if (!has('bassEnabled')) dto.bassEnabled = pd[activeBass]?.enabled;
  if (!has('bassVolume')) dto.bassVolume = pd[activeBass]?.volume ?? 0.7;
  if (!has('pianoEnabled')) dto.pianoEnabled = pd.piano?.enabled;
  if (!has('pianoVolume')) dto.pianoVolume = pd.piano?.volume ?? 0.7;
  if (!has('rhodesEnabled')) dto.rhodesEnabled = pd.rhodes?.enabled;
  if (!has('rhodesVolume')) dto.rhodesVolume = pd.rhodes?.volume ?? 0.5;
  if (!has('drumKit'))
    dto.drumKit = activeDrums === 'funk-drum-kit' ? 'funk-drum-kit' : 'jazz-drum-kit';
  if (!has('drumsEnabled')) dto.drumsEnabled = pd[activeDrums]?.enabled;
  if (!has('drumsVolume')) dto.drumsVolume = pd[activeDrums]?.volume ?? 0.7;
  if (!has('percussionEnabled')) dto.percussionEnabled = pd.percussion?.enabled;
  if (!has('percussionVolume')) dto.percussionVolume = pd.percussion?.volume ?? 0.7;
  if (!has('guitarEnabled')) dto.guitarEnabled = pd[activeGuitar]?.enabled;
  if (!has('guitarVolume')) dto.guitarVolume = pd[activeGuitar]?.volume ?? 0.6;
  if (!has('swingRatio')) dto.swingRatio = profile.swingRatio;

  return dto;
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
