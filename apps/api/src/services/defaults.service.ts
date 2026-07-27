import { eq } from 'drizzle-orm';
import type { DefaultSettingsDTO, Style, UpdateDefaultSettingsInput } from '@jazz/shared';
import { applyStyleDefaults } from '@jazz/music-core';
import { defaultSettings, type DefaultSettingsRecord } from '../db/schema.js';
import type { DrizzleDb } from '../db/index.js';

// ── DTO mapping ────────────────────────────────────────────────────────────

function clampVolume(v: number | undefined | null): number {
  if (v == null) return 0.7;
  return Math.max(0, Math.min(1, v));
}

/** Normalize old numeric humanize values to HumanizeAmount enum strings. */
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

/**
 * Map a default_settings row to a resolved DTO, overlaying per-style overrides
 * and applying StyleProfile defaults. Mirrors `toSettingsDTO` from
 * auth.service.ts — authorized users, new users, and guests all resolve
 * settings through the same logic so they sound identical.
 */
export function toDefaultSettingsDTO(s: DefaultSettingsRecord): DefaultSettingsDTO {
  const style = (s.style ?? 'swing') as string;
  const perStyle: Record<string, Record<string, unknown>> | undefined = s.perStyleOverrides
    ? (JSON.parse(s.perStyleOverrides) as Record<string, Record<string, unknown>>)
    : undefined;
  const so = perStyle?.[style];

  const dto = {
    bpm: Math.max(20, Math.min(400, s.bpm)),
    clickStrong: (s.clickStrong ?? null) as DefaultSettingsDTO['clickStrong'],
    clickStrong2: (s.clickStrong2 ?? null) as DefaultSettingsDTO['clickStrong2'],
    clickWeak: (s.clickWeak ?? null) as DefaultSettingsDTO['clickWeak'],
    volume: clampVolume(s.volume),
    countIn: s.countIn,
    metronomeEnabled: s.metronomeEnabled,
    metronomeVolume: clampVolume(s.metronomeVolume),
    metronomeMode: (s.metronomeMode as DefaultSettingsDTO['metronomeMode']) ?? 'both',
    metronomeStrongEnabled: s.metronomeStrongEnabled ?? true,
    metronomeStrongVolume: clampVolume(s.metronomeStrongVolume),
    metronomeStrong2Enabled: s.metronomeStrong2Enabled ?? true,
    metronomeStrong2Volume: clampVolume(s.metronomeStrong2Volume),
    metronomeWeakEnabled: s.metronomeWeakEnabled ?? true,
    metronomeWeakVolume: clampVolume(s.metronomeWeakVolume),
    bassEnabled: s.bassEnabled,
    bassVolume: clampVolume(s.bassVolume),
    bassComplexity: s.bassComplexity,
    bassVariant: (s.bassVariant as DefaultSettingsDTO['bassVariant']) ?? undefined,
    bassTension: (s.bassTension as DefaultSettingsDTO['bassTension']) ?? 'clean',
    bassHumanize: normalizeHumanize(
      s.bassHumanize ? JSON.parse(s.bassHumanize) : undefined,
    ) as DefaultSettingsDTO['bassHumanize'],
    bassUseMutedNotes: s.bassUseMutedNotes ?? true,
    bassPattern: null,
    bassRange: 'medium',
    rhodesEnabled: s.rhodesEnabled,
    rhodesVolume: clampVolume(s.rhodesVolume),
    rhodesMode: s.rhodesMode as DefaultSettingsDTO['rhodesMode'],
    rhodesLayerMode: s.rhodesLayerMode as DefaultSettingsDTO['rhodesLayerMode'],
    rhodesLayerVolume: clampVolume(s.rhodesLayerVolume),
    rhodesVoicingDensity: s.rhodesVoicingDensity as DefaultSettingsDTO['rhodesVoicingDensity'],
    pianoEnabled: s.pianoEnabled,
    pianoVolume: clampVolume(s.pianoVolume),
    pianoVoicingDensity: s.pianoVoicingDensity as DefaultSettingsDTO['pianoVoicingDensity'],
    pianoSampleLibrary: s.pianoSampleLibrary as DefaultSettingsDTO['pianoSampleLibrary'],
    pianoTension: s.pianoTension as DefaultSettingsDTO['pianoTension'],
    pianoHumanize: normalizeHumanize(
      s.pianoHumanize ? JSON.parse(s.pianoHumanize) : undefined,
    ) as DefaultSettingsDTO['pianoHumanize'],
    pianoPattern: null,

    drumsEnabled: s.drumsEnabled,
    drumsVolume: clampVolume(s.drumsVolume),
    style: (s.style as DefaultSettingsDTO['style']) ?? 'swing',
    drumKit: (s.drumKit as DefaultSettingsDTO['drumKit']) ?? 'jazz-drum-kit',
    drumsPattern: null,
    swingRatio: Math.max(0.5, Math.min(0.75, s.swingRatio)),
    audioFormat: s.audioFormat as DefaultSettingsDTO['audioFormat'],
    soloToneId: (s.soloToneId ?? undefined) as string | undefined,
    soloVolume: s.soloVolume ?? undefined,
    duckingEnabled: s.duckingEnabled ?? undefined,
    perStyleOverrides: s.perStyleOverrides
      ? (JSON.parse(s.perStyleOverrides) as DefaultSettingsDTO['perStyleOverrides'])
      : undefined,
    percussionEnabled: undefined,
    percussionVolume: undefined,
    percussionHumanizeIntensity: undefined,
    guitarEnabled: undefined,
    guitarVolume: undefined,
  } as DefaultSettingsDTO;

  if (so) {
    for (const [key, value] of Object.entries(so)) {
      if (value !== undefined) {
        if (key === 'pianoHumanize' || key === 'bassHumanize') {
          (dto as Record<string, unknown>)[key] = normalizeHumanize(value);
        } else {
          (dto as Record<string, unknown>)[key] = value;
        }
      }
    }
  }

  return applyStyleDefaults(dto, style as Style);
}

// ── Hardcoded fallback (used when singleton row is absent) ──────────────────

/**
 * Return the singleton row, or null when absent (first run, failed migration).
 * Callers fall back to schema-level `.default(...)` values via
 * {@link resetDefaultSettings} / the public endpoint.
 */
export async function readDefaultSettings(db: DrizzleDb): Promise<DefaultSettingsRecord | null> {
  return (await db.select().from(defaultSettings).where(eq(defaultSettings.id, 1)).get()) ?? null;
}

/**
 * Get the resolved default settings DTO. When the singleton row is missing,
 * returns the hardcoded factory defaults so guests/new users always have a
 * sane starting point (ADMIN-DEFAULT-INSTRUMENT-SETTINGS §4.2 fallback).
 */
export async function getDefaultSettings(db: DrizzleDb): Promise<DefaultSettingsDTO> {
  const row = await readDefaultSettings(db);
  if (!row) return HARDCODED_DEFAULTS;
  return toDefaultSettingsDTO(row);
}

/**
 * Apply a partial update to the default settings singleton, creating it if
 * absent. Mirrors the per-style auto-sync logic in settings.routes.ts: scalar
 * instrument fields for the current style are merged into
 * `perStyleOverrides[currentStyle]` so they survive style switches.
 */
export async function upsertDefaultSettings(
  db: DrizzleDb,
  data: UpdateDefaultSettingsInput,
): Promise<DefaultSettingsDTO> {
  const existing = await readDefaultSettings(db);
  const now = Date.now();

  // Merge explicit perStyleOverrides first.
  const existingOverrides: Record<string, Record<string, unknown>> = existing?.perStyleOverrides
    ? (JSON.parse(existing.perStyleOverrides) as Record<string, Record<string, unknown>>)
    : {};

  if (data.perStyleOverrides !== undefined) {
    for (const [style, overrides] of Object.entries(data.perStyleOverrides)) {
      existingOverrides[style] = { ...existingOverrides[style], ...overrides };
    }
  }

  // Auto-sync scalar instrument fields → perStyleOverrides[currentStyle].
  const currentStyle = (data.style ?? existing?.style ?? 'swing') as string;
  const scalarOverrides: Record<string, unknown> = {};
  for (const field of PER_STYLE_FIELDS) {
    const val = (data as Record<string, unknown>)[field];
    if (val !== undefined) scalarOverrides[field] = val;
  }
  if (Object.keys(scalarOverrides).length > 0) {
    existingOverrides[currentStyle] = { ...existingOverrides[currentStyle], ...scalarOverrides };
  }

  const patch: Partial<typeof defaultSettings.$inferInsert> = { updatedAt: now };
  if (data.bpm !== undefined) patch.bpm = data.bpm;
  if (data.clickStrong !== undefined) patch.clickStrong = data.clickStrong;
  if (data.clickStrong2 !== undefined) patch.clickStrong2 = data.clickStrong2;
  if (data.clickWeak !== undefined) patch.clickWeak = data.clickWeak;
  if (data.volume !== undefined) patch.volume = data.volume;
  if (data.countIn !== undefined) patch.countIn = data.countIn;
  if (data.metronomeEnabled !== undefined) patch.metronomeEnabled = data.metronomeEnabled;
  if (data.metronomeVolume !== undefined) patch.metronomeVolume = data.metronomeVolume;
  if (data.metronomeMode !== undefined) patch.metronomeMode = data.metronomeMode;
  if (data.metronomeStrongEnabled !== undefined)
    patch.metronomeStrongEnabled = data.metronomeStrongEnabled;
  if (data.metronomeStrongVolume !== undefined)
    patch.metronomeStrongVolume = data.metronomeStrongVolume;
  if (data.metronomeStrong2Enabled !== undefined)
    patch.metronomeStrong2Enabled = data.metronomeStrong2Enabled;
  if (data.metronomeStrong2Volume !== undefined)
    patch.metronomeStrong2Volume = data.metronomeStrong2Volume;
  if (data.metronomeWeakEnabled !== undefined)
    patch.metronomeWeakEnabled = data.metronomeWeakEnabled;
  if (data.metronomeWeakVolume !== undefined) patch.metronomeWeakVolume = data.metronomeWeakVolume;
  if (data.bassEnabled !== undefined) patch.bassEnabled = data.bassEnabled;
  if (data.bassVolume !== undefined) patch.bassVolume = data.bassVolume;
  if (data.bassComplexity !== undefined) patch.bassComplexity = data.bassComplexity;
  if (data.bassVariant !== undefined) patch.bassVariant = data.bassVariant;
  if (data.bassTension !== undefined) patch.bassTension = data.bassTension;
  if (data.bassHumanize !== undefined) patch.bassHumanize = JSON.stringify(data.bassHumanize);
  if (data.bassUseMutedNotes !== undefined) patch.bassUseMutedNotes = data.bassUseMutedNotes;
  if (data.rhodesEnabled !== undefined) patch.rhodesEnabled = data.rhodesEnabled;
  if (data.rhodesVolume !== undefined) patch.rhodesVolume = data.rhodesVolume;
  if (data.rhodesMode !== undefined) patch.rhodesMode = data.rhodesMode;
  if (data.rhodesVoicingDensity !== undefined)
    patch.rhodesVoicingDensity = data.rhodesVoicingDensity;
  if (data.rhodesLayerMode !== undefined) patch.rhodesLayerMode = data.rhodesLayerMode;
  if (data.rhodesLayerVolume !== undefined) patch.rhodesLayerVolume = data.rhodesLayerVolume;
  if (data.pianoEnabled !== undefined) patch.pianoEnabled = data.pianoEnabled;
  if (data.pianoVolume !== undefined) patch.pianoVolume = data.pianoVolume;
  if (data.pianoVoicingDensity !== undefined) patch.pianoVoicingDensity = data.pianoVoicingDensity;
  if (data.pianoSampleLibrary !== undefined) patch.pianoSampleLibrary = data.pianoSampleLibrary;
  if (data.pianoTension !== undefined) patch.pianoTension = data.pianoTension;
  if (data.pianoHumanize !== undefined) patch.pianoHumanize = JSON.stringify(data.pianoHumanize);
  if (data.drumsEnabled !== undefined) patch.drumsEnabled = data.drumsEnabled;
  if (data.drumsVolume !== undefined) patch.drumsVolume = data.drumsVolume;
  if (data.drumKit !== undefined) patch.drumKit = data.drumKit;
  if (data.style !== undefined) patch.style = data.style;
  if (data.swingRatio !== undefined) patch.swingRatio = data.swingRatio;
  if (data.audioFormat !== undefined) patch.audioFormat = data.audioFormat;
  if (data.soloToneId !== undefined) patch.soloToneId = data.soloToneId;
  if (data.soloVolume !== undefined) patch.soloVolume = data.soloVolume;
  if (data.duckingEnabled !== undefined) patch.duckingEnabled = data.duckingEnabled;
  patch.perStyleOverrides = JSON.stringify(existingOverrides);

  if (existing) {
    db.update(defaultSettings).set(patch).where(eq(defaultSettings.id, 1)).run();
  } else {
    db.insert(defaultSettings)
      .values({ id: 1, createdAt: now, updatedAt: now, ...patch })
      .run();
  }

  const updated = (await readDefaultSettings(db))!;
  return toDefaultSettingsDTO(updated);
}

/**
 * Reset the singleton to hardcoded factory defaults (ADMIN-DEFAULT-INSTRUMENT-
 * SETTINGS §3.5 "Сбросить к заводским"). Per-style values come from
 * StyleProfile at read time, so we only persist a near-empty row.
 */
export async function resetDefaultSettings(db: DrizzleDb): Promise<DefaultSettingsDTO> {
  const now = Date.now();
  const existing = await readDefaultSettings(db);
  if (existing) {
    db.update(defaultSettings)
      .set({ updatedAt: now, perStyleOverrides: null })
      .where(eq(defaultSettings.id, 1))
      .run();
  } else {
    db.insert(defaultSettings)
      .values({ id: 1, createdAt: now, updatedAt: now, perStyleOverrides: null })
      .run();
  }
  return await getDefaultSettings(db);
}

// ── Scalars mirrored into perStyleOverrides[currentStyle] ───────────────────

const PER_STYLE_FIELDS = [
  'bpm',
  'bassEnabled',
  'bassVolume',
  'bassComplexity',
  'bassVariant',
  'bassTension',
  'bassHumanize',
  'bassUseMutedNotes',
  'bassPattern',
  'bassRange',
  'pianoEnabled',
  'pianoVolume',
  'pianoVoicingDensity',
  'pianoTension',
  'pianoHumanize',
  'pianoPattern',
  'pianoSampleLibrary',
  'pianoRandomizationLevel',
  'rhodesEnabled',
  'rhodesVolume',
  'rhodesMode',
  'rhodesLayerMode',
  'rhodesLayerVolume',
  'rhodesVoicingDensity',
  'rhodesPattern',
  'drumsEnabled',
  'drumsVolume',
  'drumKit',
  'drumsPattern',
  'drumsHumanizeIntensity',
  'drumsBassDrumEnabled',
  'drumsBassDrumVolume',
  'drumsSnareEnabled',
  'drumsSnareVolume',
  'drumsHihatEnabled',
  'drumsHihatVolume',
  'drumsHihatOpenness',
  'drumsRideEnabled',
  'drumsRideVolume',
  'drumsCrashEnabled',
  'drumsCrashVolume',
  'drumsCrashFrequency',
  'drumsRimEnabled',
  'drumsRimVolume',
  'drumsTomEnabled',
  'drumsTomVolume',
  'percussionEnabled',
  'percussionVolume',
  'percussionHumanizeIntensity',
  'percussionPattern',
  'percussionCongaHighEnabled',
  'percussionCongaHighVolume',
  'percussionCongaLowEnabled',
  'percussionCongaLowVolume',
  'percussionBongoLowEnabled',
  'percussionBongoLowVolume',
  'percussionTumbaEnabled',
  'percussionTumbaVolume',
  'percussionTimbalesEnabled',
  'percussionTimbalesVolume',
  'percussionCowbellEnabled',
  'percussionCowbellVolume',
  'percussionClaveEnabled',
  'percussionClaveVolume',
  'percussionShakerEnabled',
  'percussionShakerVolume',
  'percussionGuiroEnabled',
  'percussionGuiroVolume',
  'percussionCabasaEnabled',
  'percussionCabasaVolume',
  'percussionTriangleEnabled',
  'percussionTriangleVolume',
  'percussionTambourineEnabled',
  'percussionTambourineVolume',
  'percussionVibraslapEnabled',
  'percussionVibraslapVolume',
  'percussionBelltreeEnabled',
  'percussionBelltreeVolume',
  'percussionWhistleEnabled',
  'percussionWhistleVolume',
  'percussionSleighBellsEnabled',
  'percussionSleighBellsVolume',
  'guitarEnabled',
  'guitarVolume',
  'swingRatio',
] as const;

// ── Hardcoded factory defaults (fallback when row missing) ──────────────────

/**
 * Resolved factory defaults for the fallback path (§4.2): when the
 * default_settings row is absent (first run, failed migration) guests and new
 * users still get a sane starting point. Resolved through applyStyleDefaults so
 * it matches the persisted-row path exactly.
 */
export const HARDCODED_DEFAULTS: DefaultSettingsDTO = applyStyleDefaults(
  {
    bpm: 120,
    clickStrong: 'drum-stick',
    clickStrong2: 'drum-stick',
    clickWeak: 'drum-stick',
    volume: 0.8,
    countIn: 1,
    metronomeEnabled: true,
    metronomeVolume: 0.8,
    metronomeMode: 'both',
    metronomeStrongEnabled: true,
    metronomeStrongVolume: 0.8,
    metronomeStrong2Enabled: true,
    metronomeStrong2Volume: 0.8,
    metronomeWeakEnabled: true,
    metronomeWeakVolume: 0.8,
    bassEnabled: true,
    bassVolume: 0.7,
    bassComplexity: 1,
    rhodesEnabled: false,
    rhodesVolume: 0.6,
    rhodesVoicingDensity: 'rootless3',
    rhodesLayerVolume: 0.5,
    pianoEnabled: false,
    pianoVolume: 0.7,
    pianoVoicingDensity: 'rootless3',
    pianoSampleLibrary: 'salamander',
    drumsEnabled: true,
    drumsVolume: 0.7,
    drumKit: 'jazz-drum-kit',
    style: 'swing',
    swingRatio: 0.5,
    audioFormat: 'aac',
    soloToneId: 'rhodes-jrhodes3c',
    perStyleOverrides: {},
  } as DefaultSettingsDTO,
  'swing',
);
