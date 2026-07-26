import fp from 'fastify-plugin';
import type { FastifyInstance, preHandlerHookHandler } from 'fastify';
import { createCIDRMatcher } from '../services/ipMatcher.js';
import { isTotpEnabled } from '../services/totp.service.js';
import type { DrizzleDb } from '../db/index.js';

/**
 * Augment FastifyRequest with totpVerifiedAt (set by auth plugin).
 */
declare module 'fastify' {
  interface FastifyRequest {
    totpVerifiedAt?: number;
  }
}

export interface AdminIpFilterOptions {
  /** CSV list of allowed IPs/CIDRs for super_admin. Null = disabled. */
  allowlist: string | null;
}

/**
 * IP-allowlist middleware for super_admin users on /api/admin/* routes.
 * Admins with role 'admin' (non-super_admin) are NOT restricted.
 */
export const adminIpFilterPlugin = fp(async function adminIpFilter(
  app: FastifyInstance,
  opts: AdminIpFilterOptions,
) {
  if (!opts.allowlist) return;

  const allowedNets = opts.allowlist
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (allowedNets.length === 0) return;

  const matchIp = createCIDRMatcher(allowedNets);

  app.addHook('onRoute', (routeOptions) => {
    const url: string = (routeOptions as { url?: string }).url ?? '';
    if (!url.startsWith('/api/admin')) return;

    const guard: preHandlerHookHandler = async (request, reply) => {
      if (!request.user) return; // let onRequest auth handle 401
      if (request.user.role !== 'super_admin') return; // only restrict super_admin

      const ip = request.ip;
      if (!ip || !matchIp(ip)) {
        return reply.status(403).send({
          error: { code: 'IP_NOT_ALLOWED', message: 'Access denied from this IP for super_admin' },
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

/**
 * Require recent TOTP step-up verification before critical operations.
 * Only applies to super_admin users with TOTP enabled.
 * Checks that the session's totpVerifiedAt is within stepUpWindowMs.
 */
export function requireStepUp(db: DrizzleDb, stepUpWindowMs = 5 * 60 * 1000): preHandlerHookHandler {
  return async (request, reply) => {
    if (!request.user) {
      await reply.status(401).send({
        error: { code: 'UNAUTHENTICATED', message: 'Login required' },
      });
      return;
    }

    // Step-up only applies to super_admin with TOTP enabled
    if (request.user.role !== 'super_admin') return;
    if (!isTotpEnabled(db, request.user.id)) return;

    const verifiedAt: number | undefined = request.totpVerifiedAt;
    if (!verifiedAt || Date.now() - verifiedAt > stepUpWindowMs) {
      await reply.status(403).send({
        error: {
          code: 'STEP_UP_REQUIRED',
          message: 'Recent TOTP verification required for this operation',
        },
      });
    }
  };
}
