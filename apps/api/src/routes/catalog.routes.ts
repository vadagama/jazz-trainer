import type { FastifyInstance } from 'fastify';
import {
  CatalogQuerySchema,
  CreateCatalogEntrySchema,
  UpdateCatalogEntrySchema,
} from '@jazz/shared';
import type { DrizzleDb } from '../db/index.js';
import { requireAuth } from '../plugins/auth.plugin.js';
import { requirePermission } from '../plugins/rbac.plugin.js';
import {
  getCatalog,
  getCatalogById,
  getFeatured,
  getCatalogTags,
  getCatalogStats,
  publishCatalogEntry,
  updateCatalogEntry,
  unpublishCatalogEntry,
} from '../services/catalog.service.js';

export interface CatalogRoutesOptions {
  db: DrizzleDb;
}

export async function catalogRoutes(
  fastify: FastifyInstance,
  opts: CatalogRoutesOptions,
): Promise<void> {
  const { db } = opts;

  // ── GET /api/catalog — list with filters/search/sort/pagination ─────────
  fastify.get('/catalog', async (request, reply) => {
    const parsed = CatalogQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid catalog query',
          details: parsed.error.issues,
        },
      });
    }
    const entries = getCatalog(db, parsed.data, request.user?.id);
    return reply.send(entries);
  });

  // ── GET /api/catalog/featured — featured carousel block ──────────────────
  fastify.get('/catalog/featured', async (request, reply) => {
    const featured = getFeatured(db, request.user?.id);
    return reply.send(featured);
  });

  // ── GET /api/catalog/tags — available tags with usage counts ────────────
  fastify.get('/catalog/tags', async (_request, reply) => {
    const tags = getCatalogTags(db, false);
    return reply.send(tags);
  });

  // ── GET /api/catalog/stats — public stats ───────────────────────────────
  fastify.get('/catalog/stats', async (_request, reply) => {
    const stats = getCatalogStats(db, false);
    return reply.send(stats);
  });

  // ── GET /api/catalog/:id — single entry details ─────────────────────────
  fastify.get<{ Params: { id: string } }>('/catalog/:id', async (request, reply) => {
    const entry = getCatalogById(db, request.params.id, request.user?.id);
    if (!entry) {
      return reply
        .status(404)
        .send({ error: { code: 'NOT_FOUND', message: 'Catalog entry not found' } });
    }
    return reply.send(entry);
  });

  // ── POST /api/catalog — publish (catalog_editor+) ───────────────────────
  fastify.post(
    '/catalog',
    { preHandler: [requireAuth, requirePermission('catalog:publish')] },
    async (request, reply) => {
      const parsed = CreateCatalogEntrySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid catalog entry data',
            details: parsed.error.issues,
          },
        });
      }
      const entry = publishCatalogEntry(db, request.user!.id, parsed.data);
      if (!entry) {
        return reply
          .status(404)
          .send({ error: { code: 'NOT_FOUND', message: 'Source composition not found' } });
      }
      return reply.status(201).send(entry);
    },
  );

  // ── PATCH /api/catalog/:id — update own entry (publisher or admin) ──────
  fastify.patch<{ Params: { id: string } }>(
    '/catalog/:id',
    { preHandler: [requireAuth, requirePermission('catalog:publish')] },
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
      const isAdmin = request.hasPermission('catalog:moderate');
      const entry = updateCatalogEntry(db, request.user!.id, request.params.id, parsed.data, isAdmin);
      if (!entry) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Catalog entry not found or not yours' },
        });
      }
      return reply.send(entry);
    },
  );

  // ── DELETE /api/catalog/:id — unpublish own entry (publisher or admin) ──
  fastify.delete<{ Params: { id: string } }>(
    '/catalog/:id',
    { preHandler: [requireAuth, requirePermission('catalog:publish')] },
    async (request, reply) => {
      const isAdmin = request.hasPermission('catalog:moderate');
      const ok = unpublishCatalogEntry(db, request.user!.id, request.params.id, isAdmin);
      if (!ok) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Catalog entry not found or not yours' },
        });
      }
      return reply.status(204).send();
    },
  );
}
