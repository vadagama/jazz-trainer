import type { FastifyInstance } from 'fastify';
import {
  BatchActionSchema,
  CreateCatalogTagSchema,
  UpdateCatalogTagSchema,
  MergeCatalogTagsSchema,
  UpdateCatalogEntrySchema,
} from '@jazz/shared';
import type { DrizzleDb } from '../db/index.js';
import { requireAuth } from '../plugins/auth.plugin.js';
import { requirePermission } from '../plugins/rbac.plugin.js';
import {
  rejectCatalogEntry,
  approveCatalogEntry,
  toggleFeatured,
  reorderFeatured,
  deleteCatalogEntry,
  batchAction,
  getCatalogStats,
  getAllCatalogEntriesForModeration,
  getUserPrivateCompositionsForCatalog,
  getCatalogTags,
  createCatalogTag,
  updateCatalogTag,
  deleteCatalogTag,
  mergeCatalogTags,
  updateCatalogEntry,
} from '../services/catalog.service.js';

export interface AdminCatalogRoutesOptions {
  db: DrizzleDb;
}

/**
 * Admin catalog routes. Mounted under /api prefix; paths start with /admin/catalog.
 * The rbac plugin auto-guards anything under /api/admin/* requiring the 'admin'
 * permission, so catalog_editor (which lacks 'admin') cannot reach these.
 * Fine-grained permissions are applied per-route via requirePermission.
 */
export async function adminCatalogRoutes(
  fastify: FastifyInstance,
  opts: AdminCatalogRoutesOptions,
): Promise<void> {
  const { db } = opts;

  // ── GET /api/admin/catalog — moderation list (all public, incl. rejected) ─
  fastify.get(
    '/admin/catalog',
    { preHandler: [requireAuth, requirePermission('catalog:moderate')] },
    async (request, reply) => {
      const entries = getAllCatalogEntriesForModeration(db);
      // If the user can also publish, include their private compositions
      if (request.hasPermission('catalog:publish')) {
        const privateEntries = getUserPrivateCompositionsForCatalog(db, request.user!.id);
        // Prepend private entries (they go first since they're newest)
        entries.unshift(...privateEntries);
      }
      return reply.send(entries);
    },
  );

  // ── GET /api/admin/catalog/stats — full stats ───────────────────────────
  fastify.get(
    '/admin/catalog/stats',
    { preHandler: [requireAuth, requirePermission('catalog:stats:read')] },
    async (_request, reply) => {
      const stats = getCatalogStats(db, true);
      return reply.send(stats);
    },
  );

  // ── POST /api/admin/catalog/:id/reject — hide entry ─────────────────────
  fastify.post<{ Params: { id: string } }>(
    '/admin/catalog/:id/reject',
    { preHandler: [requireAuth, requirePermission('catalog:moderate')] },
    async (request, reply) => {
      const ok = rejectCatalogEntry(db, request, request.params.id);
      if (!ok) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Not found' } });
      }
      return reply.send({ ok });
    },
  );

  // ── POST /api/admin/catalog/:id/approve — restore entry ─────────────────
  fastify.post<{ Params: { id: string } }>(
    '/admin/catalog/:id/approve',
    { preHandler: [requireAuth, requirePermission('catalog:moderate')] },
    async (request, reply) => {
      const ok = approveCatalogEntry(db, request, request.params.id);
      if (!ok) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Not found' } });
      }
      return reply.send({ ok });
    },
  );

  // ── POST /api/admin/catalog/:id/feature — toggle featured ───────────────
  fastify.post<{ Params: { id: string } }>(
    '/admin/catalog/:id/feature',
    { preHandler: [requireAuth, requirePermission('catalog:feature')] },
    async (request, reply) => {
      const result = toggleFeatured(db, request, request.params.id);
      if (!result) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND_OR_CAP',
            message: 'Entry not found or featured cap (10) reached',
          },
        });
      }
      return reply.send(result);
    },
  );

  // ── PATCH /api/admin/catalog/:id — edit metadata ────────────────────────
  fastify.patch<{ Params: { id: string } }>(
    '/admin/catalog/:id',
    { preHandler: [requireAuth, requirePermission('catalog:moderate')] },
    async (request, reply) => {
      const parsed = UpdateCatalogEntrySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid catalog entry data',
            details: parsed.error.issues,
          },
        });
      }
      const entry = updateCatalogEntry(db, request.user!.id, request.params.id, parsed.data, true);
      if (!entry) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Not found' } });
      }
      return reply.send(entry);
    },
  );

  // ── PATCH /api/admin/catalog/:id/featured-order — reorder featured ──────
  fastify.patch<{ Params: { id: string }; Body: { order: number } }>(
    '/admin/catalog/:id/featured-order',
    { preHandler: [requireAuth, requirePermission('catalog:feature')] },
    async (request, reply) => {
      const ok = reorderFeatured(db, request.params.id, request.body.order);
      if (!ok) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Not found' } });
      }
      return reply.send({ ok });
    },
  );

  // ── DELETE /api/admin/catalog/:id — hard delete entry ───────────────────
  fastify.delete<{ Params: { id: string } }>(
    '/admin/catalog/:id',
    { preHandler: [requireAuth, requirePermission('catalog:moderate')] },
    async (request, reply) => {
      const ok = deleteCatalogEntry(db, request, request.params.id);
      if (!ok) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Not found' } });
      }
      return reply.status(204).send();
    },
  );

  // ── POST /api/admin/catalog/batch — bulk action ─────────────────────────
  fastify.post(
    '/admin/catalog/batch',
    { preHandler: [requireAuth, requirePermission('catalog:moderate')] },
    async (request, reply) => {
      const parsed = BatchActionSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid batch payload',
            details: parsed.error.issues,
          },
        });
      }
      const result = batchAction(db, request, parsed.data);
      return reply.send(result);
    },
  );

  // ── Tags management ─────────────────────────────────────────────────────

  fastify.get(
    '/admin/catalog/tags',
    { preHandler: [requireAuth, requirePermission('catalog:tags:write')] },
    async (_request, reply) => {
      const tags = getCatalogTags(db, true);
      return reply.send(tags);
    },
  );

  fastify.post(
    '/admin/catalog/tags',
    { preHandler: [requireAuth, requirePermission('catalog:tags:write')] },
    async (request, reply) => {
      const parsed = CreateCatalogTagSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid tag data',
            details: parsed.error.issues,
          },
        });
      }
      const tag = createCatalogTag(db, request, parsed.data);
      if (!tag) {
        return reply.status(409).send({
          error: { code: 'DUPLICATE', message: 'Tag value already exists' },
        });
      }
      return reply.status(201).send(tag);
    },
  );

  fastify.patch<{ Params: { id: string } }>(
    '/admin/catalog/tags/:id',
    { preHandler: [requireAuth, requirePermission('catalog:tags:write')] },
    async (request, reply) => {
      const parsed = UpdateCatalogTagSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid tag data',
            details: parsed.error.issues,
          },
        });
      }
      const tag = updateCatalogTag(db, request, request.params.id, parsed.data);
      if (!tag) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Not found' } });
      }
      return reply.send(tag);
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    '/admin/catalog/tags/:id',
    { preHandler: [requireAuth, requirePermission('catalog:tags:write')] },
    async (request, reply) => {
      const ok = deleteCatalogTag(db, request, request.params.id);
      if (!ok) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Not found' } });
      }
      return reply.status(204).send();
    },
  );

  fastify.post(
    '/admin/catalog/tags/merge',
    { preHandler: [requireAuth, requirePermission('catalog:tags:write')] },
    async (request, reply) => {
      const parsed = MergeCatalogTagsSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid merge payload',
            details: parsed.error.issues,
          },
        });
      }
      const result = mergeCatalogTags(db, request, parsed.data);
      return reply.send(result);
    },
  );
}
