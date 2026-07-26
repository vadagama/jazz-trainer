import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import type { DrizzleDb } from '../db/index.js';
import { featureAccess } from '../db/schema.js';
import { withAuditSync } from '../services/audit.service.js';
import { requirePermission } from '../plugins/rbac.plugin.js';
import { z } from 'zod';

const UpdateFeatureAccessSchema = z.object({
  features: z.array(
    z.object({
      code: z.string(),
      state: z.enum(['active', 'inactive']),
    }),
  ),
});

export interface AdminFeatureAccessRoutesOptions {
  db: DrizzleDb;
}

function getPublicFeatures(db: DrizzleDb): { code: string; state: string }[] {
  const rows = db.select().from(featureAccess).all();
  return rows.map((r) => ({ code: r.featureCode, state: r.state }));
}

export async function adminFeatureAccessRoutes(
  fastify: FastifyInstance,
  opts: AdminFeatureAccessRoutesOptions,
): Promise<void> {
  const { db } = opts;

  fastify.get(
    '/admin/feature-access',
    { preHandler: [requirePermission('roles:read')] },
    async (_request, reply) => {
      return reply.send(getPublicFeatures(db));
    },
  );

  fastify.put(
    '/admin/feature-access',
    { preHandler: [requirePermission('roles:write')] },
    async (request, reply) => {
      const parsed = UpdateFeatureAccessSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid data',
            details: parsed.error.issues,
          },
        });
      }

      const featureMap = new Map(parsed.data.features.map((f) => [f.code, f.state]));
      const existing = getPublicFeatures(db);

      const updated = withAuditSync(
        db,
        request,
        'feature_access.update',
        'feature_access',
        'public',
        {},
        () => {
          const existingRows = db.select().from(featureAccess).all();
          const codes = new Set(existingRows.map((r) => r.featureCode));

          for (const [code, state] of featureMap) {
            if (codes.has(code)) {
              db.update(featureAccess)
                .set({ state: state as 'active' | 'inactive' })
                .where(eq(featureAccess.featureCode, code))
                .run();
            } else {
              db.insert(featureAccess)
                .values({ featureCode: code, state: state as 'active' | 'inactive' })
                .run();
            }
          }

          for (const row of existingRows) {
            if (!featureMap.has(row.featureCode)) {
              db.delete(featureAccess).where(eq(featureAccess.featureCode, row.featureCode)).run();
            }
          }

          return { features: parsed.data.features };
        },
      );

      return reply.send(updated);
    },
  );
}
