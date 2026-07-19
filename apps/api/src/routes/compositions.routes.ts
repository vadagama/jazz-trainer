import type { FastifyInstance } from 'fastify';
import {
  CreateCompositionSchema,
  UpdateCompositionSchema,
  CopyCompositionSchema,
  ImportCompositionSchema,
  PublicCompositionsQuerySchema,
} from '@jazz/shared';
import type { DrizzleDb } from '../db/index.js';
import { requireAuth } from '../plugins/auth.plugin.js';
import {
  getUserCompositions,
  getOwnComposition,
  createComposition,
  updateComposition,
  updateCompositionAsModerator,
  deleteComposition,
  copyComposition,
  publishComposition,
  importComposition,
  exportCompositionDsl,
  getPublicCompositions,
  getPublicCompositionById,
  likeComposition,
  unlikeComposition,
} from '../services/compositions.service.js';
import { hasPermission } from '../services/rbac.service.js';
import { eq } from 'drizzle-orm';
import { harmonyCompositions } from '../db/schema.js';

export interface CompositionsRoutesOptions {
  db: DrizzleDb;
}

export async function compositionsRoutes(
  fastify: FastifyInstance,
  opts: CompositionsRoutesOptions,
): Promise<void> {
  const { db } = opts;

  // ── GET /api/compositions/public — public catalog (no auth required) ────
  fastify.get('/compositions/public', async (request, reply) => {
    const parsed = PublicCompositionsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query',
          details: parsed.error.issues,
        },
      });
    }
    const compositions = getPublicCompositions(db, parsed.data, request.user?.id);
    return reply.send(compositions);
  });

  // ── GET /api/compositions/public/:id — single public composition ────────
  fastify.get<{ Params: { id: string } }>(
    '/compositions/public/:id',
    async (request, reply) => {
      const composition = getPublicCompositionById(db, request.params.id, request.user?.id);
      if (!composition) {
        return reply
          .status(404)
          .send({ error: { code: 'NOT_FOUND', message: 'Composition not found' } });
      }
      return reply.send(composition);
    },
  );

  // ── GET /api/compositions/mine — own compositions list ──────────────────
  fastify.get('/compositions/mine', { preHandler: requireAuth }, async (request, reply) => {
    const compositions = getUserCompositions(db, request.user!.id);
    return reply.send(compositions);
  });

  // ── POST /api/compositions — create composition ─────────────────────────
  fastify.post('/compositions', { preHandler: requireAuth }, async (request, reply) => {
    const parsed = CreateCompositionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid composition data',
          details: parsed.error.issues,
        },
      });
    }
    const composition = createComposition(db, request.user!.id, parsed.data);
    return reply.status(201).send(composition);
  });

  // ── POST /api/compositions/import — import DSL → new composition ────────
  fastify.post(
    '/compositions/import',
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = ImportCompositionSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid import data',
            details: parsed.error.issues,
          },
        });
      }
      const result = importComposition(db, request.user!.id, parsed.data);
      if (!result.ok) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'DSL parse error',
            details: result.errors,
          },
        });
      }
      return reply.status(201).send(result.composition);
    },
  );

  // ── GET /api/compositions/:id — get own or public composition (editable) ──
  fastify.get<{ Params: { id: string } }>(
    '/compositions/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const composition = getOwnComposition(db, request.user!.id, request.params.id);
      if (composition) return reply.send(composition);

      // Fallback: allow editing public compositions for catalog moderators
      if (hasPermission(db, request.user!.id, 'catalog:moderate')) {
        const pub = getPublicCompositionById(db, request.params.id, request.user!.id);
        if (pub) {
          const row = db
            .select({ moderationStatus: harmonyCompositions.moderationStatus })
            .from(harmonyCompositions)
            .where(eq(harmonyCompositions.id, request.params.id))
            .get();
          return reply.send({
            id: pub.id,
            name: pub.name,
            timeSignature: pub.timeSignature,
            key: pub.key,
            barsCount: pub.barsCount,
            visibility: 'public' as const,
            updatedAt: pub.updatedAt,
            recommendedStyle: pub.recommendedStyle,
            recommendedTempo: pub.recommendedTempo,
            content: pub.content,
            sourceCompositionId: null,
            createdAt: 0,
            moderationStatus: row?.moderationStatus as string | undefined,
          });
        }
      }

      return reply
        .status(404)
        .send({ error: { code: 'NOT_FOUND', message: 'Composition not found' } });
    },
  );

  // ── PATCH /api/compositions/:id — update own composition ────────────────
  fastify.patch<{ Params: { id: string } }>(
    '/compositions/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = UpdateCompositionSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid composition data',
            details: parsed.error.issues,
          },
        });
      }
      const composition = updateComposition(
        db,
        request.user!.id,
        request.params.id,
        parsed.data,
      );
      if (composition) return reply.send(composition);

      // Fallback: catalog moderators can edit any public composition
      if (hasPermission(db, request.user!.id, 'catalog:moderate')) {
        const modUpdate = updateCompositionAsModerator(
          db,
          request.params.id,
          parsed.data,
        );
        if (modUpdate) return reply.send(modUpdate);
      }

      return reply
        .status(404)
        .send({ error: { code: 'NOT_FOUND', message: 'Composition not found' } });
    },
  );

  // ── DELETE /api/compositions/:id — delete own composition ───────────────
  fastify.delete<{ Params: { id: string } }>(
    '/compositions/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const deleted = deleteComposition(db, request.user!.id, request.params.id);
      if (!deleted) {
        return reply
          .status(404)
          .send({ error: { code: 'NOT_FOUND', message: 'Composition not found' } });
      }
      return reply.status(204).send();
    },
  );

  // ── POST /api/compositions/:id/copy — copy composition ──────────────────
  fastify.post<{ Params: { id: string } }>(
    '/compositions/:id/copy',
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = CopyCompositionSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid copy data',
            details: parsed.error.issues,
          },
        });
      }
      const composition = copyComposition(
        db,
        request.user!.id,
        request.params.id,
        parsed.data.name,
      );
      if (!composition) {
        return reply
          .status(404)
          .send({ error: { code: 'NOT_FOUND', message: 'Composition not found' } });
      }
      return reply.status(201).send(composition);
    },
  );

  // ── POST /api/compositions/:id/publish — publish as public copy ─────────
  fastify.post<{ Params: { id: string } }>(
    '/compositions/:id/publish',
    { preHandler: requireAuth },
    async (request, reply) => {
      const result = publishComposition(db, request.user!.id, request.params.id);
      if (!result) {
        return reply
          .status(404)
          .send({ error: { code: 'NOT_FOUND', message: 'Composition not found' } });
      }
      return reply.status(201).send(result);
    },
  );

  // ── GET /api/compositions/:id/export — export composition as DSL ────────
  fastify.get<{ Params: { id: string } }>(
    '/compositions/:id/export',
    { preHandler: requireAuth },
    async (request, reply) => {
      const dsl = exportCompositionDsl(db, request.user!.id, request.params.id);
      if (dsl === null) {
        return reply
          .status(404)
          .send({ error: { code: 'NOT_FOUND', message: 'Composition not found' } });
      }
      return reply.send({ dsl });
    },
  );

  // ── POST /api/compositions/:id/like — like a public composition ─────────
  fastify.post<{ Params: { id: string } }>(
    '/compositions/:id/like',
    { preHandler: requireAuth },
    async (request, reply) => {
      const result = likeComposition(db, request.user!.id, request.params.id);
      if (!result) {
        return reply
          .status(404)
          .send({ error: { code: 'NOT_FOUND', message: 'Composition not found' } });
      }
      return reply.send(result);
    },
  );

  // ── DELETE /api/compositions/:id/like — unlike a public composition ─────
  fastify.delete<{ Params: { id: string } }>(
    '/compositions/:id/like',
    { preHandler: requireAuth },
    async (request, reply) => {
      const result = unlikeComposition(db, request.user!.id, request.params.id);
      if (!result) {
        return reply
          .status(404)
          .send({ error: { code: 'NOT_FOUND', message: 'Composition not found' } });
      }
      return reply.send(result);
    },
  );
}
