import { auditLog } from '../db/schema.js';
import type { DrizzleDb } from '../db/index.js';
import type { FastifyRequest } from 'fastify';

/**
 * Wraps a mutative operation with audit logging.
 * The audit entry is written atomically after the wrapped function succeeds.
 * If `fn` throws, no audit entry is written.
 *
 * @param db        - Drizzle database instance
 * @param request   - Fastify request (for actor ID, IP, User-Agent)
 * @param action    - human-readable action name, e.g. 'user:update'
 * @param targetType - entity type, e.g. 'user', 'grid'
 * @param targetId   - entity ID
 * @param opts.before - snapshot before mutation (JSON-serialisable)
 * @param opts.reason - optional reason for the audit record
 * @param fn         - the actual mutation (returns the new state)
 */
export async function withAudit<T>(
  db: DrizzleDb,
  request: FastifyRequest,
  action: string,
  targetType: string,
  targetId: string,
  opts: { before?: unknown; reason?: string },
  fn: () => Promise<T>,
): Promise<T> {
  const result = await fn();

  const actorUserId = request.user?.id ?? 'anonymous';

  db.insert(auditLog)
    .values({
      id: crypto.randomUUID(),
      actorUserId,
      action,
      targetType,
      targetId,
      before: opts.before ? JSON.stringify(opts.before) : null,
      after: JSON.stringify(result),
      timestamp: new Date(),
      ip: request.ip ?? null,
      userAgent: request.headers['user-agent'] ?? null,
      reason: opts.reason ?? null,
    })
    .run();

  return result;
}

/**
 * Convenience: wrap a synchronous mutation with audit logging.
 */
export function withAuditSync<T>(
  db: DrizzleDb,
  request: FastifyRequest,
  action: string,
  targetType: string,
  targetId: string,
  opts: { before?: unknown; reason?: string },
  fn: () => T,
): T {
  const result = fn();

  const actorUserId = request.user?.id ?? 'anonymous';

  db.insert(auditLog)
    .values({
      id: crypto.randomUUID(),
      actorUserId,
      action,
      targetType,
      targetId,
      before: opts.before ? JSON.stringify(opts.before) : null,
      after: JSON.stringify(result),
      timestamp: new Date(),
      ip: request.ip ?? null,
      userAgent: request.headers['user-agent'] ?? null,
      reason: opts.reason ?? null,
    })
    .run();

  return result;
}
