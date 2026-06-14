import type { FastifyInstance } from 'fastify';
import {
  CreateGridSchema,
  UpdateGridSchema,
  CopyGridSchema,
  ImportGridSchema,
  PublicGridsQuerySchema,
} from '@jazz/shared';
import type { DrizzleDb } from '../db/index.js';
import { requireAuth } from '../plugins/auth.plugin.js';
import {
  getUserGrids,
  getOwnGrid,
  createGrid,
  updateGrid,
  deleteGrid,
  copyGrid,
  importGrid,
  exportGridDsl,
  getPublicGrids,
  getPublicGridById,
  likeGrid,
  unlikeGrid,
} from '../services/grids.service.js';

export interface GridsRoutesOptions {
  db: DrizzleDb;
}

export async function gridsRoutes(
  fastify: FastifyInstance,
  opts: GridsRoutesOptions,
): Promise<void> {
  const { db } = opts;

  // ── GET /api/grids/public — public catalog (no auth required) ────────────
  fastify.get('/grids/public', async (request, reply) => {
    const parsed = PublicGridsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details: parsed.error.issues },
      });
    }
    const grids = getPublicGrids(db, parsed.data, request.user?.id);
    return reply.send(grids);
  });

  // ── GET /api/grids/public/:id — single public grid (no auth required) ────
  fastify.get<{ Params: { id: string } }>('/grids/public/:id', async (request, reply) => {
    const grid = getPublicGridById(db, request.params.id, request.user?.id);
    if (!grid) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Grid not found' } });
    }
    return reply.send(grid);
  });

  // ── GET /api/grids/mine — own grids list (auth required) ─────────────────
  fastify.get('/grids/mine', { preHandler: requireAuth }, async (request, reply) => {
    const grids = getUserGrids(db, request.user!.id);
    return reply.send(grids);
  });

  // ── POST /api/grids — create grid (auth required) ────────────────────────
  fastify.post('/grids', { preHandler: requireAuth }, async (request, reply) => {
    const parsed = CreateGridSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid grid data',
          details: parsed.error.issues,
        },
      });
    }
    const grid = createGrid(db, request.user!.id, parsed.data);
    return reply.status(201).send(grid);
  });

  // ── POST /api/grids/import — import DSL → new grid (auth required) ────────
  fastify.post('/grids/import', { preHandler: requireAuth }, async (request, reply) => {
    const parsed = ImportGridSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid import data',
          details: parsed.error.issues,
        },
      });
    }
    const result = importGrid(db, request.user!.id, parsed.data);
    if (!result.ok) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'DSL parse error', details: result.errors },
      });
    }
    return reply.status(201).send(result.grid);
  });

  // ── GET /api/grids/:id — get own grid (auth required) ────────────────────
  fastify.get<{ Params: { id: string } }>(
    '/grids/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const grid = getOwnGrid(db, request.user!.id, request.params.id);
      if (!grid) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Grid not found' } });
      }
      return reply.send(grid);
    },
  );

  // ── PATCH /api/grids/:id — update own grid (auth required) ───────────────
  fastify.patch<{ Params: { id: string } }>(
    '/grids/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = UpdateGridSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid grid data',
            details: parsed.error.issues,
          },
        });
      }
      const grid = updateGrid(db, request.user!.id, request.params.id, parsed.data);
      if (!grid) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Grid not found' } });
      }
      return reply.send(grid);
    },
  );

  // ── DELETE /api/grids/:id — delete own grid (auth required) ──────────────
  fastify.delete<{ Params: { id: string } }>(
    '/grids/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const deleted = deleteGrid(db, request.user!.id, request.params.id);
      if (!deleted) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Grid not found' } });
      }
      return reply.status(204).send();
    },
  );

  // ── POST /api/grids/:id/copy — copy grid (auth required) ─────────────────
  fastify.post<{ Params: { id: string } }>(
    '/grids/:id/copy',
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = CopyGridSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid copy data',
            details: parsed.error.issues,
          },
        });
      }
      const grid = copyGrid(db, request.user!.id, request.params.id, parsed.data.name);
      if (!grid) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Grid not found' } });
      }
      return reply.status(201).send(grid);
    },
  );

  // ── GET /api/grids/:id/export — export grid as DSL (auth required) ────────
  fastify.get<{ Params: { id: string } }>(
    '/grids/:id/export',
    { preHandler: requireAuth },
    async (request, reply) => {
      const dsl = exportGridDsl(db, request.user!.id, request.params.id);
      if (dsl === null) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Grid not found' } });
      }
      return reply.send({ dsl });
    },
  );

  // ── POST /api/grids/:id/like — like a public grid (auth required) ─────────
  fastify.post<{ Params: { id: string } }>(
    '/grids/:id/like',
    { preHandler: requireAuth },
    async (request, reply) => {
      const result = likeGrid(db, request.user!.id, request.params.id);
      if (!result) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Grid not found' } });
      }
      return reply.send(result);
    },
  );

  // ── DELETE /api/grids/:id/like — unlike a public grid (auth required) ─────
  fastify.delete<{ Params: { id: string } }>(
    '/grids/:id/like',
    { preHandler: requireAuth },
    async (request, reply) => {
      const result = unlikeGrid(db, request.user!.id, request.params.id);
      if (!result) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Grid not found' } });
      }
      return reply.send(result);
    },
  );
}
