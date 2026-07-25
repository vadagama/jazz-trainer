import type { FastifyInstance } from 'fastify';
import type { DrizzleDb } from '../db/index.js';
import {
  getDefaultSettings,
  upsertDefaultSettings,
  resetDefaultSettings,
  readDefaultSettings,
  toDefaultSettingsDTO,
} from '../services/defaults.service.js';
import { requirePermission } from '../plugins/rbac.plugin.js';
import { requireAuth } from '../plugins/auth.plugin.js';
import { withAuditSync } from '../services/audit.service.js';
import {
  UpdateDefaultSettingsSchema,
  type DefaultSettingsDTO,
} from '@jazz/shared';

export interface DefaultsRoutesOptions {
  db: DrizzleDb;
}

/**
 * In-process PATCH rate limit (1 request / 5s). Guards against accidental
 * update storms from a single admin client. Admin routes run on a single
 * process, so an in-memory timestamp is sufficient here.
 */
let lastPatchAt = 0;
const PATCH_MIN_INTERVAL_MS = 5_000;

export async function defaultsRoutes(
  fastify: FastifyInstance,
  opts: DefaultsRoutesOptions,
): Promise<void> {
  const { db } = opts;

  // ── GET /api/default-settings (PUBLIC) ─────────────────────────────────────
  // Anonymous (guest) users resolve their effective settings from these
  // defaults via useEffectiveSettings. Not cached: admin edits must take effect
  // on the next guest reload, so the browser must never serve a stale copy.
  fastify.get('/default-settings', async (_request, reply) => {
    const dto = getDefaultSettings(db);
    reply.header('Cache-Control', 'no-store');
    return reply.send(dto satisfies DefaultSettingsDTO);
  });

  // ── GET /api/admin/default-settings ────────────────────────────────────────
  fastify.get(
    '/admin/default-settings',
    { preHandler: [requireAuth, requirePermission('system:settings:read')] },
    async (_request, reply) => {
      const dto = getDefaultSettings(db);
      return reply.send(dto satisfies DefaultSettingsDTO);
    },
  );

  // ── PUT /api/admin/default-settings ────────────────────────────────────────
  fastify.put(
    '/admin/default-settings',
    { preHandler: [requireAuth, requirePermission('system:settings:write')] },
    async (request, reply) => {
      const parsed = UpdateDefaultSettingsSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid default settings',
            details: parsed.error.issues,
          },
        });
      }

      const before = getDefaultSettings(db);
      const updated = withAuditSync(
        db,
        request,
        'default_settings.update',
        'default_settings',
        '1',
        { before },
        () => upsertDefaultSettings(db, parsed.data),
      );
      return reply.send(updated satisfies DefaultSettingsDTO);
    },
  );

  // ── PATCH /api/admin/default-settings ──────────────────────────────────────
  fastify.patch(
    '/admin/default-settings',
    { preHandler: [requireAuth, requirePermission('system:settings:write')] },
    async (request, reply) => {
      const now = Date.now();
      if (now - lastPatchAt < PATCH_MIN_INTERVAL_MS) {
        return reply.status(429).send({
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many default-settings updates; wait a few seconds.',
          },
        });
      }
      lastPatchAt = now;

      const parsed = UpdateDefaultSettingsSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid default settings',
            details: parsed.error.issues,
          },
        });
      }

      const before = getDefaultSettings(db);
      const updated = withAuditSync(
        db,
        request,
        'default_settings.update',
        'default_settings',
        '1',
        { before },
        () => upsertDefaultSettings(db, parsed.data),
      );
      return reply.send(updated satisfies DefaultSettingsDTO);
    },
  );

  // ── POST /api/admin/default-settings/reset ─────────────────────────────────
  fastify.post(
    '/admin/default-settings/reset',
    { preHandler: [requireAuth, requirePermission('system:settings:write')] },
    async (request, reply) => {
      const before = getDefaultSettings(db);
      const reset = withAuditSync(
        db,
        request,
        'default_settings.reset',
        'default_settings',
        '1',
        { before },
        () => resetDefaultSettings(db),
      );
      return reply.send(reset satisfies DefaultSettingsDTO);
    },
  );
}

// Re-exported so tests can reset the singleton DTO without importing the service.
export { readDefaultSettings, toDefaultSettingsDTO };
