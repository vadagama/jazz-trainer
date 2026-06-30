import type { FastifyInstance } from 'fastify';
import { LectureQuerySchema } from '@jazz/shared';
import type { DrizzleDb } from '../db/index.js';
import { requireAuth } from '../plugins/auth.plugin.js';
import { getLectures, likeLecture, unlikeLecture } from '../services/lectures.service.js';

export interface LecturesRoutesOptions {
  db: DrizzleDb;
}

export async function lecturesRoutes(
  fastify: FastifyInstance,
  opts: LecturesRoutesOptions,
): Promise<void> {
  const { db } = opts;

  // ── GET /api/lectures — list lectures (public, optional auth) ──────────
  fastify.get('/lectures', async (request, reply) => {
    const parsed = LectureQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query',
          details: parsed.error.issues,
        },
      });
    }
    const lectures = getLectures(db, parsed.data, request.user?.id);
    return reply.send(lectures);
  });

  // ── POST /api/lectures/:id/like — like a lecture (auth required) ───────
  fastify.post<{ Params: { id: string } }>(
    '/lectures/:id/like',
    { preHandler: requireAuth },
    async (request, reply) => {
      const result = likeLecture(db, request.user!.id, request.params.id);
      if (!result) {
        return reply
          .status(404)
          .send({ error: { code: 'NOT_FOUND', message: 'Lecture not found' } });
      }
      return reply.send(result);
    },
  );

  // ── DELETE /api/lectures/:id/like — unlike a lecture (auth required) ───
  fastify.delete<{ Params: { id: string } }>(
    '/lectures/:id/like',
    { preHandler: requireAuth },
    async (request, reply) => {
      const result = unlikeLecture(db, request.user!.id, request.params.id);
      if (!result) {
        return reply
          .status(404)
          .send({ error: { code: 'NOT_FOUND', message: 'Lecture not found' } });
      }
      return reply.send(result);
    },
  );
}
