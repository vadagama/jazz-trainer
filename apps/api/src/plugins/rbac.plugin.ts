import fp from 'fastify-plugin';
import type { FastifyInstance, preHandlerHookHandler } from 'fastify';
import type { DrizzleDb } from '../db/index.js';
import { hasPermission } from '../services/rbac.service.js';

export interface RbacPluginOptions {
  db: DrizzleDb;
}

/**
 * RBAC plugin — provides `hasPermission` request decorator and
 * admin-route guard via onRoute hook.
 */
export const rbacPlugin = fp(async function rbacPlugin(
  app: FastifyInstance,
  opts: RbacPluginOptions,
) {
  app.decorateRequest('hasPermission', function (permission: string): boolean {
    if (!this.user) return false;
    return hasPermission(opts.db, this.user.id, permission);
  });

  // Auto-guard every /api/admin/* route
  app.addHook('onRoute', (routeOptions) => {
    const url: string = (routeOptions as { url?: string }).url ?? '';
    if (!url.startsWith('/api/admin')) return;

    const guard: preHandlerHookHandler = async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHENTICATED', message: 'Login required' },
        });
      }
      if (!request.hasPermission('admin')) {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
        });
      }
    };

    const ro = routeOptions as { preHandler?: preHandlerHookHandler | preHandlerHookHandler[] };
    if (Array.isArray(ro.preHandler)) {
      ro.preHandler = [guard, ...ro.preHandler];
    } else if (ro.preHandler) {
      ro.preHandler = [guard, ro.preHandler];
    } else {
      ro.preHandler = [guard];
    }
  });
});

declare module 'fastify' {
  interface FastifyRequest {
    hasPermission(permission: string): boolean;
  }
}

/**
 * Route-level preHandler: checks for a specific permission.
 *
 * Usage:
 *   { preHandler: [requireAuth, requirePermission('users:read')] }
 */
export function requirePermission(permission: string): preHandlerHookHandler {
  return async (request, reply) => {
    if (!request.user) {
      await reply.status(401).send({
        error: { code: 'UNAUTHENTICATED', message: 'Login required' },
      });
      return;
    }
    if (!request.hasPermission(permission)) {
      await reply.status(403).send({
        error: { code: 'FORBIDDEN', message: `Missing permission: ${permission}` },
      });
    }
  };
}
