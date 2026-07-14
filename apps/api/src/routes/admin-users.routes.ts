import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { DrizzleDb } from '../db/index.js';
import { users } from '../db/schema.js';
import { toUserDTO } from '../services/auth.service.js';
import { withAuditSync } from '../services/audit.service.js';

export interface AdminUsersRoutesOptions {
  db: DrizzleDb;
}

const UpdateStatusSchema = z.object({
  status: z.enum(['active', 'disabled']),
});

export async function adminUsersRoutes(
  fastify: FastifyInstance,
  opts: AdminUsersRoutesOptions,
): Promise<void> {
  const { db } = opts;

  // ── GET /api/admin/users ──────────────────────────────────────────────────
  fastify.get('/admin/users', async (_request, reply) => {
    const all = db.select().from(users).orderBy(users.createdAt).all();
    return reply.send(all.map(toUserDTO));
  });

  // ── PATCH /api/admin/users/:id/status ─────────────────────────────────────
  fastify.patch<{ Params: { id: string } }>(
    '/admin/users/:id/status',
    async (request, reply) => {
      const { id } = request.params;

      const parsed = UpdateStatusSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid status', details: parsed.error.issues },
        });
      }

      const user = db.select().from(users).where(eq(users.id, id)).get();
      if (!user) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
      }

      // Prevent self-block and super_admin modification
      const actorId = request.user?.id;
      if (user.id === actorId) {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Cannot modify your own status' },
        });
      }
      if (user.role === 'super_admin') {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Cannot modify super_admin' },
        });
      }

      const { status } = parsed.data;
      const now = Date.now();

      const updated = withAuditSync(
        db,
        request,
        status === 'disabled' ? 'user.block' : 'user.unblock',
        'user',
        id,
        { before: user.status },
        () => {
          db.update(users).set({ status, updatedAt: now }).where(eq(users.id, id)).run();
          return db.select().from(users).where(eq(users.id, id)).get()!;
        },
      );

      return reply.send(toUserDTO(updated));
    },
  );
}
