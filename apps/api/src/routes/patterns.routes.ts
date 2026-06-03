import type { FastifyInstance } from 'fastify';
import { GenerateSchema } from '@jazz/shared';
import { generate, listPatterns } from '@jazz/music-core';

export async function patternsRoutes(fastify: FastifyInstance): Promise<void> {
  // ── GET /api/patterns — list built-in generator patterns (no auth) ────────
  fastify.get('/patterns', async (_request, reply) => {
    return reply.send(listPatterns());
  });

  // ── POST /api/generate — generate a GridContent (no auth, not saved) ──────
  fastify.post('/generate', async (request, reply) => {
    const parsed = GenerateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid generate input',
          details: parsed.error.issues,
        },
      });
    }
    try {
      const content = generate(parsed.data);
      return reply.send({ content });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed';
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message } });
    }
  });
}
