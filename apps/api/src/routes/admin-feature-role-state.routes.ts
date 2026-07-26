import type { FastifyInstance } from 'fastify';
import { eq, and, inArray } from 'drizzle-orm';
import type { DrizzleDb } from '../db/index.js';
import { roles, rolePermissions } from '../db/schema.js';
import { requirePermission } from '../plugins/rbac.plugin.js';
import { ALL_FEATURE_CODES } from '@jazz/shared';
import { z } from 'zod';

const UpsertFeatureRoleStateSchema = z.object({
  featureCode: z.string().refine((c) => ALL_FEATURE_CODES.includes(c), {
    message: 'Unknown feature code',
  }),
  roleName: z.string().min(1),
  state: z.enum(['hidden', 'inactive', 'active']),
});

export interface AdminFeatureRoleStateRoutesOptions {
  db: DrizzleDb;
}

/**
 * 3-state feature visibility per role, backed by role_permissions.state
 * (single permission table — see FEATURES-VISION.md §4). 'hidden' is
 * represented by the absence of a role_permissions row.
 */
export async function adminFeatureRoleStateRoutes(
  fastify: FastifyInstance,
  opts: AdminFeatureRoleStateRoutesOptions,
): Promise<void> {
  const { db } = opts;

  fastify.get(
    '/admin/feature-role-state',
    { preHandler: [requirePermission('roles:read')] },
    async (_request, reply) => {
      const rows = db
        .select({
          featureCode: rolePermissions.permissionCode,
          roleName: roles.name,
          state: rolePermissions.state,
        })
        .from(rolePermissions)
        .innerJoin(roles, eq(roles.id, rolePermissions.roleId))
        .where(inArray(rolePermissions.permissionCode, [...ALL_FEATURE_CODES]))
        .all();
      return reply.send(rows);
    },
  );

  fastify.put(
    '/admin/feature-role-state',
    { preHandler: [requirePermission('roles:write')] },
    async (request, reply) => {
      const parsed = UpsertFeatureRoleStateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid data',
            details: parsed.error.issues,
          },
        });
      }

      const { featureCode, roleName, state } = parsed.data;

      const role = db.select().from(roles).where(eq(roles.name, roleName)).get();
      if (!role) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: `Role '${roleName}' not found` },
        });
      }

      const where = and(
        eq(rolePermissions.roleId, role.id),
        eq(rolePermissions.permissionCode, featureCode),
      );

      // 'hidden' = absence of a row. Write failures propagate to the Fastify
      // error handler (500) instead of being reported as a successful save.
      if (state === 'hidden') {
        db.delete(rolePermissions).where(where).run();
      } else {
        db.insert(rolePermissions)
          .values({ roleId: role.id, permissionCode: featureCode, state })
          .onConflictDoUpdate({
            target: [rolePermissions.roleId, rolePermissions.permissionCode],
            set: { state },
          })
          .run();
      }

      return reply.send({ featureCode, roleName, state });
    },
  );
}
