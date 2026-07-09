import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { UpdateSettingsSchema, STYLES } from '@jazz/shared';
import type { DrizzleDb } from '../db/index.js';
import { userSettings } from '../db/schema.js';
import { requireAuth } from '../plugins/auth.plugin.js';
import { toSettingsDTO } from '../services/auth.service.js';

export interface SettingsRoutesOptions {
  db: DrizzleDb;
}

export async function settingsRoutes(
  fastify: FastifyInstance,
  opts: SettingsRoutesOptions,
): Promise<void> {
  const { db } = opts;

  // ── GET /api/settings ─────────────────────────────────────────────────────
  fastify.get('/settings', { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user!;
    const row = db.select().from(userSettings).where(eq(userSettings.userId, user.id)).get();
    if (!row) {
      return reply
        .status(404)
        .send({ error: { code: 'NOT_FOUND', message: 'Settings not found' } });
    }
    return reply.send(toSettingsDTO(row));
  });

  // ── PATCH /api/settings ───────────────────────────────────────────────────
  fastify.patch('/settings', { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user!;
    const parsed = UpdateSettingsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid settings',
          details: parsed.error.issues,
        },
      });
    }

    const existing = db.select().from(userSettings).where(eq(userSettings.userId, user.id)).get();
    if (!existing) {
      return reply
        .status(404)
        .send({ error: { code: 'NOT_FOUND', message: 'Settings not found' } });
    }

    const now = Date.now();
    const patch: Partial<typeof existing> = { updatedAt: now };
    const data = parsed.data;
    if (data.bpm !== undefined) patch.bpm = data.bpm;
    if (data.clickStrong !== undefined) patch.clickStrong = data.clickStrong;
    if (data.clickStrong2 !== undefined) patch.clickStrong2 = data.clickStrong2;
    if (data.clickWeak !== undefined) patch.clickWeak = data.clickWeak;
    if (data.volume !== undefined) patch.volume = data.volume;
    if (data.countIn !== undefined) patch.countIn = data.countIn;
    if (data.metronomeEnabled !== undefined) patch.metronomeEnabled = data.metronomeEnabled;
    if (data.metronomeVolume !== undefined) patch.metronomeVolume = data.metronomeVolume;
    if (data.bassEnabled !== undefined) patch.bassEnabled = data.bassEnabled;
    if (data.bassVolume !== undefined) patch.bassVolume = data.bassVolume;
    if (data.bassComplexity !== undefined) patch.bassComplexity = data.bassComplexity;
    if (data.bassOctaveUp !== undefined) patch.bassOctaveUp = data.bassOctaveUp;
    if (data.rhodesEnabled !== undefined) patch.rhodesEnabled = data.rhodesEnabled;
    if (data.rhodesVolume !== undefined) patch.rhodesVolume = data.rhodesVolume;
    if (data.rhodesMode !== undefined) patch.rhodesMode = data.rhodesMode;
    if (data.rhodesVoicingDensity !== undefined)
      patch.rhodesVoicingDensity = data.rhodesVoicingDensity;
    if (data.drumsEnabled !== undefined) patch.drumsEnabled = data.drumsEnabled;
    if (data.drumsVolume !== undefined) patch.drumsVolume = data.drumsVolume;
    if (data.style !== undefined) patch.style = data.style;
    if (data.drumKit !== undefined) patch.drumKit = data.drumKit;
    if (data.swingRatio !== undefined) patch.swingRatio = data.swingRatio;
    if (data.audioFormat !== undefined) patch.audioFormat = data.audioFormat;
    if (data.pianoEnabled !== undefined) patch.pianoEnabled = data.pianoEnabled;
    if (data.pianoVolume !== undefined) patch.pianoVolume = data.pianoVolume;
    if (data.pianoProfile !== undefined) patch.pianoProfile = data.pianoProfile;
    if (data.pianoVoicingDensity !== undefined)
      patch.pianoVoicingDensity = data.pianoVoicingDensity;
    if (data.pianoSampleLibrary !== undefined) patch.pianoSampleLibrary = data.pianoSampleLibrary;
    if (data.rhodesLayerMode !== undefined) patch.rhodesLayerMode = data.rhodesLayerMode;
    if (data.rhodesLayerVolume !== undefined) patch.rhodesLayerVolume = data.rhodesLayerVolume;
    if (data.practiceCards !== undefined) patch.practiceCards = JSON.stringify(data.practiceCards);
    // Merge style-specific overrides from both perStyleOverrides AND scalar fields
    const existingOverrides: Record<string, Record<string, unknown>> = existing.perStyleOverrides
      ? (JSON.parse(existing.perStyleOverrides) as Record<string, Record<string, unknown>>)
      : {};

    if (data.perStyleOverrides !== undefined) {
      for (const [style, overrides] of Object.entries(data.perStyleOverrides)) {
        existingOverrides[style] = { ...existingOverrides[style], ...overrides };
      }
    }

    // Auto-sync ALL instrument scalar fields → perStyleOverrides[currentStyle]
    // so that per-style preferences persist across style switches.
    const currentStyle = (data.style ?? existing.style) as string;
    if (currentStyle) {
      const PER_STYLE_FIELDS = [
        'bassEnabled',
        'bassVolume',
        'bassComplexity',
        'bassOctaveUp',
        'pianoEnabled',
        'pianoVolume',
        'pianoProfile',
        'pianoVoicingDensity',
        'rhodesEnabled',
        'rhodesVolume',
        'rhodesMode',
        'rhodesLayerMode',
        'rhodesLayerVolume',
        'rhodesVoicingDensity',
        'drumsEnabled',
        'drumsVolume',
        'drumKit',
        'drumsPattern',
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
      const scalarOverrides: Record<string, unknown> = {};
      for (const field of PER_STYLE_FIELDS) {
        const val = (data as Record<string, unknown>)[field];
        if (val !== undefined) scalarOverrides[field] = val;
      }
      if (Object.keys(scalarOverrides).length > 0) {
        existingOverrides[currentStyle] = {
          ...existingOverrides[currentStyle],
          ...scalarOverrides,
        };
      }
    }

    patch.perStyleOverrides = JSON.stringify(existingOverrides);

    // -- MIDI & solo settings (Phase C) --
    if (data.midiDeviceId !== undefined) patch.midiDeviceId = data.midiDeviceId;
    if (data.midiChannel !== undefined) patch.midiChannel = data.midiChannel;
    if (data.soloToneId !== undefined) patch.soloToneId = data.soloToneId;
    if (data.soloVolume !== undefined) patch.soloVolume = data.soloVolume;
    if (data.duckingEnabled !== undefined) patch.duckingEnabled = data.duckingEnabled;

    db.update(userSettings).set(patch).where(eq(userSettings.userId, user.id)).run();
    return reply.send(toSettingsDTO({ ...existing, ...patch }));
  });

  // ── DELETE /api/settings/style/:style ─────────────────────────────────────
  fastify.delete('/settings/style/:style', { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user!;
    const { style } = request.params as { style: string };

    if (!(STYLES as readonly string[]).includes(style)) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: `Unknown style: ${style}` },
      });
    }

    const existing = db.select().from(userSettings).where(eq(userSettings.userId, user.id)).get();
    if (!existing) {
      return reply
        .status(404)
        .send({ error: { code: 'NOT_FOUND', message: 'Settings not found' } });
    }

    const overrides: Record<string, unknown> = existing.perStyleOverrides
      ? JSON.parse(existing.perStyleOverrides)
      : {};
    delete overrides[style];

    const now = Date.now();
    db.update(userSettings)
      .set({
        perStyleOverrides: JSON.stringify(overrides),
        updatedAt: now,
      })
      .where(eq(userSettings.userId, user.id))
      .run();

    return reply.send(
      toSettingsDTO({ ...existing, perStyleOverrides: JSON.stringify(overrides), updatedAt: now }),
    );
  });
}
