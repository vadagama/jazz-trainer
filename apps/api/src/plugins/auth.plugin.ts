import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { DrizzleDb } from '../db/index.js';
import type { UserRecord } from '../db/schema.js';
import { getSessionUser } from '../services/auth.service.js';

/**
 * Augment Fastify's Request type so `request.user` is typed everywhere.
 * `null` means anonymous; a UserRecord means authenticated.
 */
declare module 'fastify' {
  interface FastifyRequest {
    user: UserRecord | null;
  }
}

export interface AuthPluginOptions {
  db: DrizzleDb;
}

/**
 * Auth plugin — sets up optional-auth on every request:
 * reads the `sid` cookie, resolves the session, and attaches the user
 * (or null) to `request.user`.
 *
 * Must be registered with `fastify-plugin` so the decoration is visible
 * to all routes (not scoped to a child context).
 */
export const authPlugin = fp(async function authPlugin(
  app: FastifyInstance,
  opts: AuthPluginOptions,
) {
  app.decorateRequest('user', null);

  app.addHook('onRequest', async (request: FastifyRequest) => {
    const sid = request.cookies?.['sid'];
    if (!sid) {
      request.user = null;
      return;
    }
    request.user = getSessionUser(opts.db, sid);
  });
});

/**
 * Route-level preHandler: rejects the request with 401 if the user is not
 * authenticated. Register it on individual routes or on a scoped plugin.
 *
 * Usage: `{ preHandler: [requireAuth] }`
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!request.user) {
    await reply.status(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Login required' } });
  }
}
