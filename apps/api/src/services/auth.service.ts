import crypto from 'node:crypto';
import { eq, and, not } from 'drizzle-orm';
import type { UserDTO, UserSettingsDTO, Style } from '@jazz/shared';
import { users, userSettings, defaultSettings, sessions, magicLinks, auditLog } from '../db/schema.js';
import type { DrizzleDb } from '../db/index.js';
import type { UserRecord, UserSettingsRecord, DefaultSettingsRecord } from '../db/schema.js';
import { applyStyleDefaults } from '@jazz/music-core';

// ── DTO mapping ────────────────────────────────────────────────────────────

export function toUserDTO(u: UserRecord): UserDTO {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    avatarUrl: u.avatarUrl ?? null,
    provider: u.provider as 'google' | 'dev' | 'system' | 'github' | 'magic_link',
    role: u.role,
    status: u.status as 'active' | 'disabled',
    createdAt: u.createdAt,
  };
}

function clampVolume(v: number | undefined | null): number {
  if (v == null) return 0.7;
  return Math.max(0, Math.min(1, v));
}

/** Normalize old numeric humanize values to new HumanizeAmount enum strings. */
function normalizeHumanizeAmount(val: unknown): 'none' | 'low' | 'medium' | 'high' {
  if (typeof val === 'string' && ['none', 'low', 'medium', 'high'].includes(val)) {
    return val as 'none' | 'low' | 'medium' | 'high';
  }
  if (typeof val === 'number') {
    if (val === 0) return 'none';
    if (val <= 6) return 'low';
    if (val <= 20) return 'medium';
    return 'high';
  }
  return 'low';
}

function normalizeHumanize(raw: unknown): Record<string, string | undefined> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const h = raw as Record<string, unknown>;
  return {
    timingJitterMs: normalizeHumanizeAmount(h.timingJitterMs),
    velocityVariation: h.velocityVariation as string | undefined,
    chordSpreadMs: normalizeHumanizeAmount(h.chordSpreadMs),
    phrasing: h.phrasing as string | undefined,
    humanizeTiming: h.humanizeTiming as string | undefined,
  };
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
    metronomeMode: (s.metronomeMode as UserSettingsDTO['metronomeMode']) ?? 'both',
    metronomeStrongEnabled: s.metronomeStrongEnabled ?? true,
    metronomeStrongVolume: clampVolume(s.metronomeStrongVolume),
    metronomeStrong2Enabled: s.metronomeStrong2Enabled ?? true,
    metronomeStrong2Volume: clampVolume(s.metronomeStrong2Volume),
    metronomeWeakEnabled: s.metronomeWeakEnabled ?? true,
    metronomeWeakVolume: clampVolume(s.metronomeWeakVolume),
    bassEnabled: s.bassEnabled,
    bassVolume: clampVolume(s.bassVolume),
    bassComplexity: s.bassComplexity,
    bassVariant: (s.bassVariant as UserSettingsDTO['bassVariant']) ?? undefined,
    bassTension: (s.bassTension as UserSettingsDTO['bassTension']) ?? 'clean',
    bassHumanize: normalizeHumanize(
      s.bassHumanize ? JSON.parse(s.bassHumanize) : undefined,
    ) as UserSettingsDTO['bassHumanize'],
    bassUseMutedNotes: s.bassUseMutedNotes ?? true,
    bassPattern: null,
    bassRange: 'medium',
    rhodesEnabled: s.rhodesEnabled,
    rhodesVolume: clampVolume(s.rhodesVolume),
    rhodesMode: s.rhodesMode as UserSettingsDTO['rhodesMode'],
    rhodesLayerMode: s.rhodesLayerMode as UserSettingsDTO['rhodesLayerMode'],
    rhodesLayerVolume: clampVolume(s.rhodesLayerVolume),
    rhodesVoicingDensity: s.rhodesVoicingDensity as UserSettingsDTO['rhodesVoicingDensity'],
    pianoEnabled: s.pianoEnabled,
    pianoVolume: clampVolume(s.pianoVolume),
    pianoVoicingDensity: s.pianoVoicingDensity as UserSettingsDTO['pianoVoicingDensity'],
    pianoSampleLibrary: s.pianoSampleLibrary as UserSettingsDTO['pianoSampleLibrary'],
    pianoTension: s.pianoTension as UserSettingsDTO['pianoTension'],
    pianoHumanize: normalizeHumanize(
      s.pianoHumanize ? JSON.parse(s.pianoHumanize) : undefined,
    ) as UserSettingsDTO['pianoHumanize'],
    pianoPattern: null,

    drumsEnabled: s.drumsEnabled,
    drumsVolume: clampVolume(s.drumsVolume),
    style: (s.style as UserSettingsDTO['style']) ?? 'swing',

    drumKit: (s.drumKit as UserSettingsDTO['drumKit']) ?? 'jazz-drum-kit',
    drumsPattern: null,

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
    theme: (s.theme as UserSettingsDTO['theme']) ?? 'dark',
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

  // Overlay per-style overrides on top of scalar defaults. Humanize fields need
  // legacy-number normalization, which runs before delegating the rest to the
  // shared resolver (see applyStyleDefaults in @jazz/music-core).
  if (so) {
    for (const [key, value] of Object.entries(so)) {
      if (value !== undefined) {
        // Normalize pianoHumanize / bassHumanize: old DB may store numbers instead of enum strings
        if (key === 'pianoHumanize' || key === 'bassHumanize') {
          (dto as Record<string, unknown>)[key] = normalizeHumanize(value);
        } else {
          (dto as Record<string, unknown>)[key] = value;
        }
      }
    }
  }

  // Per-style isolation and profile defaults are resolved centrally in music-core
  // so the client (useEffectiveSettings for guests) shares the exact same logic.
  return applyStyleDefaults(dto, style as Style);
}

// ── User management ─────────────────────────────────────────────────────────

interface UpsertUserInput {
  provider: 'google' | 'dev' | 'github';
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
    // Append provider to providers array if not already present
    let currentProviders: string[] = [];
    try {
      currentProviders = JSON.parse(existing.providers ?? '[]') as string[];
    } catch {
      /* keep empty */
    }
    const providerList = currentProviders.includes(input.provider)
      ? currentProviders
      : [...currentProviders, input.provider];

    db.update(users)
      .set({
        email: input.email,
        name: input.name,
        avatarUrl: input.avatarUrl ?? null,
        providers: JSON.stringify(providerList),
        updatedAt: now,
      })
      .where(eq(users.id, existing.id))
      .run();
    return {
      ...existing,
      email: input.email,
      name: input.name,
      providers: JSON.stringify(providerList),
      updatedAt: now,
    };
  }

  const id = crypto.randomUUID();
  const row: Record<string, unknown> = {
    id,
    email: input.email,
    name: input.name,
    avatarUrl: input.avatarUrl ?? null,
    provider: input.provider,
    providerId: input.providerId,
    role: 'user',
    status: 'active',
    emailVerified: 0,
    deletedAt: null,
    providers: JSON.stringify([input.provider]),
    createdAt: now,
    updatedAt: now,
  };
  db.insert(users)
    .values(row as typeof users.$inferInsert)
    .run();
  return row as unknown as UserRecord;
}

/**
 * Ensure a `user_settings` row exists for the user.
 * Called on first login; idempotent.
 *
 * The row is initialised from the admin-managed `default_settings` singleton
 * (ADMIN-DEFAULT-INSTRUMENT-SETTINGS §3.3) so new users inherit the current
 * factory defaults instead of hardcoded values. When the singleton is absent
 * (first run / failed migration) we fall back to schema-level `.default(...)`.
 * Per-style overrides are copied verbatim so per-style admin tweaks propagate.
 */
export function ensureUserSettings(db: DrizzleDb, userId: string): void {
  const existing = db.select().from(userSettings).where(eq(userSettings.userId, userId)).get();
  if (existing) return;
  const now = Date.now();
  const defaults = db.select().from(defaultSettings).where(eq(defaultSettings.id, 1)).get();
  if (defaults) {
    db.insert(userSettings)
      .values({
        ...userSettingsValuesFromDefaults(defaults),
        userId,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    return;
  }
  // Fallback: hardcoded factory defaults (matches schema `.default(...)`).
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
      theme: 'dark',
      createdAt: now,
      updatedAt: now,
    })
    .run();
}

/** Copy the shared scalar fields of a default_settings row into a user_settings insert payload. */
function userSettingsValuesFromDefaults(
  d: DefaultSettingsRecord,
): Omit<typeof userSettings.$inferInsert, 'userId' | 'createdAt' | 'updatedAt'> {
  return {
    bpm: d.bpm,
    clickStrong: d.clickStrong,
    clickStrong2: d.clickStrong2,
    clickWeak: d.clickWeak,
    volume: d.volume,
    countIn: d.countIn,
    metronomeEnabled: d.metronomeEnabled,
    metronomeVolume: d.metronomeVolume,
    metronomeMode: d.metronomeMode,
    metronomeStrongEnabled: d.metronomeStrongEnabled,
    metronomeStrongVolume: d.metronomeStrongVolume,
    metronomeStrong2Enabled: d.metronomeStrong2Enabled,
    metronomeStrong2Volume: d.metronomeStrong2Volume,
    metronomeWeakEnabled: d.metronomeWeakEnabled,
    metronomeWeakVolume: d.metronomeWeakVolume,
    bassEnabled: d.bassEnabled,
    bassVolume: d.bassVolume,
    bassComplexity: d.bassComplexity,
    bassVariant: d.bassVariant,
    bassTension: d.bassTension,
    bassHumanize: d.bassHumanize,
    bassUseMutedNotes: d.bassUseMutedNotes,
    rhodesEnabled: d.rhodesEnabled,
    rhodesVolume: d.rhodesVolume,
    rhodesMode: d.rhodesMode,
    rhodesVoicingDensity: d.rhodesVoicingDensity,
    rhodesLayerMode: d.rhodesLayerMode,
    rhodesLayerVolume: d.rhodesLayerVolume,
    pianoEnabled: d.pianoEnabled,
    pianoVolume: d.pianoVolume,
    pianoProfile: d.pianoProfile,
    pianoVoicingDensity: d.pianoVoicingDensity,
    pianoSampleLibrary: d.pianoSampleLibrary,
    pianoTension: d.pianoTension,
    pianoHumanize: d.pianoHumanize,
    drumsEnabled: d.drumsEnabled,
    drumsVolume: d.drumsVolume,
    drumKit: d.drumKit,
    style: d.style,
    perStyleOverrides: d.perStyleOverrides,
    swingRatio: d.swingRatio,
    audioFormat: d.audioFormat,
    soloToneId: d.soloToneId,
    soloVolume: d.soloVolume,
    duckingEnabled: d.duckingEnabled,
    theme: d.theme,
  };
}

// ── Fingerprint ────────────────────────────────────────────────────────────

/**
 * Compute a device fingerprint from IP and User-Agent.
 * Uses /24 IP prefix to be robust against DHCP changes within the same subnet.
 */
export function computeFingerprint(ip: string, userAgent: string): string {
  const ipPrefix = ip.split('.').slice(0, 3).join('.');
  return crypto.createHash('sha256').update(`${userAgent}|${ipPrefix}`).digest('hex');
}

// ── Session management ──────────────────────────────────────────────────────

/** Create a new session and return the session ID (stored in the cookie). */
export function createSession(
  db: DrizzleDb,
  userId: string,
  ttlMs: number,
  meta?: { deviceName?: string; ip?: string; fingerprint?: string; totpVerified?: number },
): string {
  const id = crypto.randomUUID();
  db.insert(sessions)
    .values({
      id,
      userId,
      expiresAt: Date.now() + ttlMs,
      deviceName: meta?.deviceName ?? null,
      ip: meta?.ip ?? null,
      fingerprint: meta?.fingerprint ?? null,
      totpVerified: meta?.totpVerified ?? 1,
      createdAt: Date.now(),
    })
    .run();
  return id;
}

/**
 * Look up a session by its ID. Returns the owning user if the session is
 * valid and not expired, or null otherwise.
 *
 * Checks:
 * 1. Session exists and is not expired
 * 2. Absolute TTL not exceeded (if maxAbsoluteTtlMs provided)
 * 3. Fingerprint matches (if stored on session and requestFingerprint provided)
 * 4. On success: sliding expiration within the absolute TTL window
 */
export function getSessionUser(
  db: DrizzleDb,
  sessionId: string,
  opts?: {
    sessionTtlMs?: number;
    maxAbsoluteTtlMs?: number | ((user: UserRecord) => number);
    requestFingerprint?: string;
  },
): UserRecord | null {
  const now = Date.now();
  const session = db.select().from(sessions).where(eq(sessions.id, sessionId)).get();
  if (!session || session.expiresAt < now) {
    if (session) db.delete(sessions).where(eq(sessions.id, sessionId)).run();
    return null;
  }

  // TOTP pending: session exists but requires 2FA completion
  if (session.totpVerified === 0) {
    return null;
  }

  // Fetch user before TTL check for role-based maxAbsoluteTtlMs
  const user = db.select().from(users).where(eq(users.id, session.userId)).get();
  if (!user) {
    db.delete(sessions).where(eq(sessions.id, sessionId)).run();
    return null;
  }

  // Absolute TTL: force re-login after maxAbsoluteTtlMs since creation
  if (opts?.maxAbsoluteTtlMs) {
    const maxTtl = typeof opts.maxAbsoluteTtlMs === 'function'
      ? opts.maxAbsoluteTtlMs(user)
      : opts.maxAbsoluteTtlMs;
    if (maxTtl && now - session.createdAt > maxTtl) {
      db.delete(sessions).where(eq(sessions.id, sessionId)).run();
      return null;
    }
  }

  // Fingerprint check: if the session was created with a fingerprint,
  // subsequent requests must match it.
  if (session.fingerprint && opts?.requestFingerprint && session.fingerprint !== opts.requestFingerprint) {
    db.delete(sessions).where(eq(sessions.id, sessionId)).run();
    return null;
  }

  // Sliding expiration: extend expires_at and bump last_used_at on each access
  if (opts?.sessionTtlMs) {
    db.update(sessions)
      .set({ expiresAt: now + opts.sessionTtlMs, lastUsedAt: now })
      .where(eq(sessions.id, sessionId))
      .run();
  }

  return user;
}

/** List non-expired sessions for a user. */
export function getUserSessions(
  db: DrizzleDb,
  userId: string,
): (typeof sessions.$inferSelect)[] {
  const now = Date.now();
  return db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .all()
    .filter((s) => s.expiresAt >= now);
}

/** Delete all sessions for a user except the one with the given ID. */
export function deleteSessionsExcept(
  db: DrizzleDb,
  userId: string,
  exceptSessionId: string,
): void {
  db.delete(sessions)
    .where(and(eq(sessions.userId, userId), not(eq(sessions.id, exceptSessionId))))
    .run();
}

/**
 * Find or create a user by email for passwordless (magic_link) authentication.
 * Returns the existing user if found, or creates a new one with provider='magic_link'.
 */
export function upsertUserByEmail(
  db: DrizzleDb,
  email: string,
  requestIp?: string,
  userAgent?: string,
): UserRecord {
  const existing = db.select().from(users).where(eq(users.email, email)).get();
  if (existing) {
    // Append magic_link to providers array if not already present
    let currentProviders: string[] = [];
    try {
      currentProviders = JSON.parse(existing.providers ?? '[]') as string[];
    } catch {
      /* keep empty */
    }
    const isNewLink = !currentProviders.includes('magic_link');
    const providerList = isNewLink
      ? [...currentProviders, 'magic_link']
      : currentProviders;

    db.update(users)
      .set({
        providers: JSON.stringify(providerList),
        emailVerified: 1,
        updatedAt: Date.now(),
      })
      .where(eq(users.id, existing.id))
      .run();

    if (isNewLink) {
      const auditId = crypto.randomUUID();
      db.insert(auditLog)
        .values({
          id: auditId,
          actorUserId: existing.id,
          action: 'auth:oauth:linked',
          targetType: 'user',
          targetId: existing.id,
          before: JSON.stringify({ providers: currentProviders }),
          after: JSON.stringify({ providers: providerList, linkedProvider: 'magic_link' }),
          timestamp: new Date(),
          ip: requestIp ?? null,
          userAgent: userAgent ?? null,
          reason: null,
        })
        .run();
    }

    return {
      ...existing,
      providers: JSON.stringify(providerList),
      emailVerified: 1,
      updatedAt: Date.now(),
    };
  }

  const id = crypto.randomUUID();
  const now = Date.now();
  const row: Record<string, unknown> = {
    id,
    email,
    name: email.split('@')[0]!,
    avatarUrl: null,
    provider: 'magic_link',
    providerId: email,
    role: 'user',
    status: 'active',
    emailVerified: 1,
    deletedAt: null,
    providers: JSON.stringify(['magic_link']),
    createdAt: now,
    updatedAt: now,
  };
  db.insert(users)
    .values(row as typeof users.$inferInsert)
    .run();
  return row as unknown as UserRecord;
}

/**
 * Store a magic link token hash for later verification.
 */
export function storeMagicLink(
  db: DrizzleDb,
  email: string,
  tokenHash: string,
  ttlMs: number,
): void {
  const now = Date.now();
  db.insert(magicLinks)
    .values({
      id: crypto.randomUUID(),
      email,
      tokenHash,
      used: false,
      expiresAt: now + ttlMs,
      createdAt: now,
    })
    .run();
}

/**
 * Verify and consume a magic link token.
 * Returns the email if valid, or null if expired/used/not found.
 */
export function consumeMagicLink(db: DrizzleDb, tokenHash: string): string | null {
  const link = db
    .select()
    .from(magicLinks)
    .where(and(eq(magicLinks.tokenHash, tokenHash), eq(magicLinks.used, false)))
    .get();

  if (!link) return null;
  if (link.expiresAt < Date.now()) return null;

  db.update(magicLinks).set({ used: true }).where(eq(magicLinks.id, link.id)).run();

  return link.email;
}

/** Remove a session (logout). */
export function deleteSession(db: DrizzleDb, sessionId: string): void {
  db.delete(sessions).where(eq(sessions.id, sessionId)).run();
}
