import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { DrizzleDb } from '../db/index.js';
import { users, userRoles, userPermissions, roles, sessions } from '../db/schema.js';
import { toUserDTO } from '../services/auth.service.js';
import { withAuditSync, AUDIT_ACTIONS } from '../services/audit.service.js';
import { RBAC_ROLES } from '../services/rbac.service.js';
import { UpdateUserRolesSchema } from '@jazz/shared';
import { requireStepUp } from '../plugins/admin-ip-filter.plugin.js';

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
    const dtos = all.map((u) => {
      const dto = toUserDTO(u);
      let roleIds: string[] = [];
      try {
        const urRows = db
          .select({ roleId: userRoles.roleId })
          .from(userRoles)
          .where(eq(userRoles.userId, u.id))
          .all();
        roleIds = urRows.map((r) => r.roleId);
      } catch {
        // user_roles table may not exist yet
      }
      return { ...dto, roles: roleIds };
    });
    return reply.send(dtos);
  });

  // ── PATCH /api/admin/users/:id/roles ────────────────────────────────────────
  fastify.patch<{ Params: { id: string } }>(
    '/admin/users/:id/roles',
    { preHandler: [requireStepUp(db)] },
    async (request, reply) => {
    const { id } = request.params;

    const user = db.select().from(users).where(eq(users.id, id)).get();
    if (!user) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    // Prevent self-modification
    const actorId = request.user?.id;
    if (user.id === actorId) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Cannot modify your own roles' },
      });
    }

    const parsed = UpdateUserRolesSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid roles data',
          details: parsed.error.issues,
        },
      });
    }

    const { roleIds } = parsed.data;

    // Super admin constraint: only one user can have super_admin role
    const superAdminRole = db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, RBAC_ROLES.SUPER_ADMIN))
      .get();

    if (
      superAdminRole &&
      roleIds.includes(superAdminRole.id) &&
      user.role !== RBAC_ROLES.SUPER_ADMIN
    ) {
      try {
        const existingSuper = db
          .select()
          .from(userRoles)
          .where(eq(userRoles.roleId, superAdminRole.id))
          .all();
        if (existingSuper.length > 0) {
          return reply.status(409).send({
            error: { code: 'CONFLICT', message: 'Only one user can have the super_admin role' },
          });
        }
      } catch {
        // user_roles table may not exist yet
      }
    }

    try {
      withAuditSync(db, request, 'user.roles.update', 'user', id, {}, () => {
        db.delete(userRoles).where(eq(userRoles.userId, id)).run();
        for (const roleId of roleIds) {
          db.insert(userRoles).values({ userId: id, roleId }).run();
        }
        return { roleIds };
      });

      // T-041: Invalidate all sessions for the user whose role changed
      const deletedCount = db.delete(sessions).where(eq(sessions.userId, id)).run();
      if (deletedCount.changes > 0) {
        withAuditSync(
          db,
          request,
          AUDIT_ACTIONS.AUTH_SESSIONS_TERMINATED_ALL,
          'user',
          id,
          { before: { terminatedCount: deletedCount.changes } },
          () => ({ terminatedCount: deletedCount.changes }),
        );
      }
    } catch (err) {
      console.error('[admin-users] roles update failed:', err);
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update user roles' },
      });
    }

    const updated = db.select().from(users).where(eq(users.id, id)).get()!;
    let roleIdsOut: string[] = [];
    try {
      const urRows = db
        .select({ roleId: userRoles.roleId })
        .from(userRoles)
        .where(eq(userRoles.userId, id))
        .all();
      roleIdsOut = urRows.map((r) => r.roleId);
    } catch {
      // user_roles table may not exist yet
    }
    return reply.send({ ...toUserDTO(updated), roles: roleIdsOut });
  });

  // ── DELETE /api/admin/users/:id ─────────────────────────────────────────
  fastify.delete<{ Params: { id: string } }>(
    '/admin/users/:id',
    { preHandler: [requireStepUp(db)] },
    async (request, reply) => {
    const { id } = request.params;

    const user = db.select().from(users).where(eq(users.id, id)).get();
    if (!user) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    // Prevent self-deletion
    const actorId = request.user?.id;
    if (user.id === actorId) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Cannot delete yourself' },
      });
    }

    // Prevent deletion of super_admin
    if (user.role === 'super_admin') {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Cannot delete super_admin' },
      });
    }

    withAuditSync(
      db,
      request,
      'user.delete',
      'user',
      id,
      { before: { email: user.email, role: user.role } },
      () => {
        // Clean up dependent records without cascade
        db.delete(userPermissions).where(eq(userPermissions.userId, id)).run();
        // userRoles, sessions, userSettings, harmonyCompositions, compositionLikes,
        // lectureLikes cascade via FK. Then delete the user.
        db.delete(users).where(eq(users.id, id)).run();
      },
    );

    return reply.status(204).send();
  });

  // ── PATCH /api/admin/users/:id/status ─────────────────────────────────────
  fastify.patch<{ Params: { id: string } }>('/admin/users/:id/status', async (request, reply) => {
    const { id } = request.params;

    const parsed = UpdateStatusSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid status',
          details: parsed.error.issues,
        },
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
  });
}
