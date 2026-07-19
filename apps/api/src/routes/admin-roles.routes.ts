import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import type { DrizzleDb } from '../db/index.js';
import { roles, permissions, rolePermissions } from '../db/schema.js';
import { CreateRoleSchema, UpdateRoleSchema } from '@jazz/shared';
import { withAuditSync } from '../services/audit.service.js';
import { RBAC_ROLES } from '../services/rbac.service.js';

export interface AdminRolesRoutesOptions {
  db: DrizzleDb;
}

export async function adminRolesRoutes(
  fastify: FastifyInstance,
  opts: AdminRolesRoutesOptions,
): Promise<void> {
  const { db } = opts;

  // ── GET /api/admin/permissions ────────────────────────────────────────────
  fastify.get('/admin/permissions', async (_request, reply) => {
    const all = db.select().from(permissions).all();
    return reply.send(all.map((p) => ({ code: p.code })));
  });

  // ── GET /api/admin/roles ──────────────────────────────────────────────────
  fastify.get('/admin/roles', async (_request, reply) => {
    const allRoles = db.select().from(roles).all();

    const result = allRoles.map((r) => {
      const rps = db
        .select({ code: rolePermissions.permissionCode })
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, r.id))
        .all();
      return {
        id: r.id,
        name: r.name,
        permissions: rps.map((rp) => rp.code),
        createdAt: r.createdAt instanceof Date ? r.createdAt.getTime() : (r.createdAt as number),
      };
    });

    return reply.send(result);
  });

  // ── POST /api/admin/roles ─────────────────────────────────────────────────
  fastify.post('/admin/roles', async (request, reply) => {
    const parsed = CreateRoleSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid role data', details: parsed.error.issues },
      });
    }

    const { name, permissions: permCodes } = parsed.data;

    // Check uniqueness
    const existing = db.select({ id: roles.id }).from(roles).where(eq(roles.name, name)).get();
    if (existing) {
      return reply.status(409).send({
        error: { code: 'CONFLICT', message: 'Role with this name already exists' },
      });
    }

    const id = crypto.randomUUID();
    const now = Date.now();

    const created = withAuditSync(db, request, 'role.create', 'role', id, {}, () => {
      db.insert(roles).values({ id, name, createdAt: new Date(now) }).run();

      for (const permCode of permCodes) {
        db.insert(rolePermissions)
          .values({ roleId: id, permissionCode: permCode })
          .run();
      }

      return {
        id,
        name,
        permissions: permCodes,
        createdAt: now,
      };
    });

    return reply.status(201).send(created);
  });

  // ── PATCH /api/admin/roles/:id ─────────────────────────────────────────────
  fastify.patch<{ Params: { id: string } }>(
    '/admin/roles/:id',
    async (request, reply) => {
      const { id } = request.params;

      const role = db.select().from(roles).where(eq(roles.id, id)).get();
      if (!role) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Role not found' },
        });
      }

      // Prevent editing super_admin role name
      if (role.name === RBAC_ROLES.SUPER_ADMIN) {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Cannot modify super_admin role' },
        });
      }

      const parsed = UpdateRoleSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid role data', details: parsed.error.issues },
        });
      }

      const { name, permissions: newPerms } = parsed.data;

      const updated = withAuditSync(db, request, 'role.update', 'role', id, {}, () => {
        if (name !== undefined) {
          db.update(roles).set({ name }).where(eq(roles.id, id)).run();
        }

        if (newPerms !== undefined) {
          // Replace all role_permissions for this role
          db.delete(rolePermissions).where(eq(rolePermissions.roleId, id)).run();
          for (const permCode of newPerms) {
            db.insert(rolePermissions)
              .values({ roleId: id, permissionCode: permCode })
              .run();
          }
        }

        const refreshed = db.select().from(roles).where(eq(roles.id, id)).get()!;
        const rps = db
          .select({ code: rolePermissions.permissionCode })
          .from(rolePermissions)
          .where(eq(rolePermissions.roleId, id))
          .all();

        return {
          id: refreshed.id,
          name: refreshed.name,
          permissions: rps.map((rp) => rp.code),
          createdAt:
            refreshed.createdAt instanceof Date
              ? refreshed.createdAt.getTime()
              : (refreshed.createdAt as number),
        };
      });

      return reply.send(updated);
    },
  );

  // ── DELETE /api/admin/roles/:id ──────────────────────────────────────────
  fastify.delete<{ Params: { id: string } }>(
    '/admin/roles/:id',
    async (request, reply) => {
      const { id } = request.params;

      const role = db.select().from(roles).where(eq(roles.id, id)).get();
      if (!role) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Role not found' },
        });
      }

      // Prevent deletion of system roles
      if (
        role.name === RBAC_ROLES.SUPER_ADMIN ||
        role.name === RBAC_ROLES.USER ||
        role.name === RBAC_ROLES.ADMIN
      ) {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Cannot delete a system role' },
        });
      }

      withAuditSync(db, request, 'role.delete', 'role', id, {}, () => {
        db.delete(rolePermissions).where(eq(rolePermissions.roleId, id)).run();
        db.delete(roles).where(eq(roles.id, id)).run();
      });

      return reply.status(204).send();
    },
  );
}
