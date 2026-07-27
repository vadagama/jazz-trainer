import type { FastifyInstance } from 'fastify';
import { eq, desc, and } from 'drizzle-orm';
import type { DrizzleDb } from '../db/index.js';
import { featureFlags, auditLog, type FeatureFlagRecord } from '../db/schema.js';
import { withAuditSync } from '../services/audit.service.js';
import { requirePermission } from '../plugins/rbac.plugin.js';
import {
  CreateFlagSchema,
  UpdateFlagSchema,
  type FeatureFlagDTO,
  type FlagHistoryEntryDTO,
} from '@jazz/shared';

export interface AdminFlagsRoutesOptions {
  db: DrizzleDb;
}

/** Parse a JSON column that stores an array; returns [] on null/invalid. */
function parseArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function toFlagDTO(record: FeatureFlagRecord): FeatureFlagDTO {
  const now = Date.now();
  return {
    key: record.key,
    description: record.description ?? null,
    category: record.category as FeatureFlagDTO['category'],
    enabled: record.enabled,
    roles: parseArray(record.roles),
    userIds: parseArray(record.userIds),
    rolloutPercent: record.rolloutPercent ?? null,
    expiresAt: record.expiresAt ?? null,
    isExpired: record.expiresAt != null && now > record.expiresAt,
    createdBy: record.createdBy ?? null,
    updatedAt: record.updatedAt ?? null,
    updatedBy: record.updatedBy ?? null,
    createdAt: record.createdAt instanceof Date ? record.createdAt.getTime() : record.createdAt,
  };
}

export async function adminFlagsRoutes(
  fastify: FastifyInstance,
  opts: AdminFlagsRoutesOptions,
): Promise<void> {
  const { db } = opts;

  // ── GET /api/admin/flags ──────────────────────────────────────────────────
  fastify.get(
    '/admin/flags',
    { preHandler: [requirePermission('flags:read')] },
    async (request, reply) => {
      const query = request.query as {
        q?: string;
        category?: string;
        status?: string;
      };

      let rows = await db.select().from(featureFlags).all();

      const q = query.q?.trim().toLowerCase();
      if (q) {
        rows = rows.filter(
          (r) => r.key.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q),
        );
      }
      if (query.category) {
        rows = rows.filter((r) => r.category === query.category);
      }
      if (query.status === 'enabled') {
        rows = rows.filter((r) => r.enabled);
      } else if (query.status === 'disabled') {
        rows = rows.filter((r) => !r.enabled);
      } else if (query.status === 'expired') {
        const now = Date.now();
        rows = rows.filter((r) => r.expiresAt != null && now > r.expiresAt);
      }

      const dtos = rows.map(toFlagDTO);
      return reply.send(dtos);
    },
  );

  // ── GET /api/admin/flags/:key ─────────────────────────────────────────────
  fastify.get<{ Params: { key: string } }>(
    '/admin/flags/:key',
    { preHandler: [requirePermission('flags:read')] },
    async (request, reply) => {
      const { key } = request.params;
      const record = await db.select().from(featureFlags).where(eq(featureFlags.key, key)).get();
      if (!record) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Flag not found' },
        });
      }

      const history = await db
        .select({
          id: auditLog.id,
          action: auditLog.action,
          actorUserId: auditLog.actorUserId,
          before: auditLog.before,
          after: auditLog.after,
          timestamp: auditLog.timestamp,
          reason: auditLog.reason,
        })
        .from(auditLog)
        .where(and(eq(auditLog.targetType, 'flag'), eq(auditLog.targetId, key)))
        .orderBy(desc(auditLog.timestamp))
        .limit(10)
        .all();

      const historyDtos: FlagHistoryEntryDTO[] = history.map((h) => ({
        id: h.id,
        action: h.action,
        actorUserId: h.actorUserId,
        before: h.before ? JSON.parse(h.before) : null,
        after: h.after ? JSON.parse(h.after) : null,
        timestamp: h.timestamp instanceof Date ? h.timestamp.getTime() : (h.timestamp as number),
        reason: h.reason,
      }));

      return reply.send({ ...toFlagDTO(record), history: historyDtos });
    },
  );

  // ── POST /api/admin/flags ─────────────────────────────────────────────────
  fastify.post(
    '/admin/flags',
    { preHandler: [requirePermission('flags:write')] },
    async (request, reply) => {
      const parsed = CreateFlagSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid flag data',
            details: parsed.error.issues,
          },
        });
      }

      const input = parsed.data;
      const existing = await db
        .select({ key: featureFlags.key })
        .from(featureFlags)
        .where(eq(featureFlags.key, input.key))
        .get();
      if (existing) {
        return reply.status(409).send({
          error: { code: 'CONFLICT', message: 'Flag with this key already exists' },
        });
      }

      const actorId = request.user?.id ?? null;
      const now = Date.now();
      const record: typeof featureFlags.$inferInsert = {
        key: input.key,
        enabled: input.enabled,
        roles: input.roles ? JSON.stringify(input.roles) : null,
        userIds: input.userIds ? JSON.stringify(input.userIds) : null,
        description: input.description ?? null,
        category: input.category ?? null,
        rolloutPercent: input.rolloutPercent ?? null,
        expiresAt: input.expiresAt ?? null,
        createdBy: actorId,
        updatedBy: actorId,
        updatedAt: now,
        createdAt: new Date(now),
      };

      const created = await withAuditSync(db, request, 'flag.create', 'flag', input.key, {}, async () => {
        await db.insert(featureFlags).values(record).run();
        const row = await db.select().from(featureFlags).where(eq(featureFlags.key, input.key)).get()!;
        return toFlagDTO(row);
      });

      return reply.status(201).send(created);
    },
  );

  // ── PATCH /api/admin/flags/:key ───────────────────────────────────────────
  fastify.patch<{ Params: { key: string } }>(
    '/admin/flags/:key',
    { preHandler: [requirePermission('flags:write')] },
    async (request, reply) => {
      const { key } = request.params;
      const existing = await db.select().from(featureFlags).where(eq(featureFlags.key, key)).get();
      if (!existing) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Flag not found' },
        });
      }

      const parsed = UpdateFlagSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid flag data',
            details: parsed.error.issues,
          },
        });
      }

      const input = parsed.data;
      const actorId = request.user?.id ?? null;
      const now = Date.now();

      const patch: Partial<typeof featureFlags.$inferInsert> = {
        updatedAt: now,
        updatedBy: actorId,
      };
      if (input.description !== undefined) patch.description = input.description ?? null;
      if (input.category !== undefined) patch.category = input.category ?? null;
      if (input.enabled !== undefined) patch.enabled = input.enabled;
      if (input.roles !== undefined) patch.roles = JSON.stringify(input.roles);
      if (input.userIds !== undefined) patch.userIds = JSON.stringify(input.userIds);
      if (input.rolloutPercent !== undefined) patch.rolloutPercent = input.rolloutPercent ?? null;
      if (input.expiresAt !== undefined) patch.expiresAt = input.expiresAt ?? null;

      const updated = await withAuditSync(
        db,
        request,
        'flag.update',
        'flag',
        key,
        { before: toFlagDTO(existing) },
        async () => {
          await db.update(featureFlags).set(patch).where(eq(featureFlags.key, key)).run();
          const row = await db.select().from(featureFlags).where(eq(featureFlags.key, key)).get()!;
          return toFlagDTO(row);
        },
      );

      return reply.send(updated);
    },
  );

  // ── DELETE /api/admin/flags/:key ──────────────────────────────────────────
  fastify.delete<{ Params: { key: string } }>(
    '/admin/flags/:key',
    { preHandler: [requirePermission('flags:write')] },
    async (request, reply) => {
      const { key } = request.params;
      const existing = await db.select().from(featureFlags).where(eq(featureFlags.key, key)).get();
      if (!existing) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Flag not found' },
        });
      }

      await withAuditSync(
        db,
        request,
        'flag.delete',
        'flag',
        key,
        { before: toFlagDTO(existing) },
        async () => {
          await db.delete(featureFlags).where(eq(featureFlags.key, key)).run();
          return null;
        },
      );

      return reply.status(204).send();
    },
  );
}
