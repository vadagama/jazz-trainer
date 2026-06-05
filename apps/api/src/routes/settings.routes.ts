import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { UpdateSettingsSchema } from '@jazz/shared';
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
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Settings not found' } });
    }
    return reply.send(toSettingsDTO(row));
  });

  // ── PATCH /api/settings ───────────────────────────────────────────────────
  fastify.patch('/settings', { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user!;
    const parsed = UpdateSettingsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid settings', details: parsed.error.issues },
      });
    }

    const existing = db.select().from(userSettings).where(eq(userSettings.userId, user.id)).get();
    if (!existing) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Settings not found' } });
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
    if (data.metronomeVolume !== undefined) patch.metronomeVolume = data.metronomeVolume;
    if (data.bassEnabled !== undefined) patch.bassEnabled = data.bassEnabled;
    if (data.bassVolume !== undefined) patch.bassVolume = data.bassVolume;
    if (data.bassComplexity !== undefined) patch.bassComplexity = data.bassComplexity;
    if (data.bassOctaveUp !== undefined) patch.bassOctaveUp = data.bassOctaveUp;
    if (data.rhodesEnabled !== undefined) patch.rhodesEnabled = data.rhodesEnabled;
    if (data.rhodesVolume !== undefined) patch.rhodesVolume = data.rhodesVolume;
    if (data.rhodesMode !== undefined) patch.rhodesMode = data.rhodesMode;
    if (data.rhodesVoicingDensity !== undefined) patch.rhodesVoicingDensity = data.rhodesVoicingDensity;

    db.update(userSettings).set(patch).where(eq(userSettings.userId, user.id)).run();
    return reply.send(toSettingsDTO({ ...existing, ...patch }));
  });
}
