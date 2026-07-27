import { auditLog } from '../db/schema.js';
import type { DrizzleDb } from '../db/index.js';
import type { FastifyRequest } from 'fastify';

// ── Audit action constants ──────────────────────────────────────────────────

export const AUDIT_ACTIONS = {
  // Auth
  AUTH_MAGIC_LINK_SENT: 'auth:magic_link:sent',
  AUTH_MAGIC_LINK_VERIFIED: 'auth:magic_link:verified',
  AUTH_OAUTH_LINKED: 'auth:oauth:linked',
  AUTH_SESSION_TERMINATED: 'auth:session:terminated',
  AUTH_SESSIONS_TERMINATED_ALL: 'auth:sessions:terminated_all',

  // Billing
  BILLING_SUBSCRIPTION_CREATED: 'billing:subscription:created',
  BILLING_SUBSCRIPTION_CANCELED: 'billing:subscription:canceled',
  BILLING_SUBSCRIPTION_STATUS: (status: string) => `billing:subscription:status_${status}`,
  BILLING_DEGRADED_TO_FREE: 'billing:degraded:to_free',
  BILLING_GRACE_ENTERED: 'billing:grace:entered',
  BILLING_REQUEST_APPROVED: 'billing:request:approved',
  BILLING_REQUEST_REJECTED: 'billing:request:rejected',
  BILLING_REQUEST_NEEDS_INFO: 'billing:request:needs_info',

  // GDPR (placeholders — routes not yet implemented)
  GDPR_DATA_EXPORT: 'gdpr:data:export',
  GDPR_ACCOUNT_DELETE_REQUEST: 'gdpr:account:delete_request',
  GDPR_ACCOUNT_DELETE_CONFIRM: 'gdpr:account:delete_confirm',
  GDPR_CONSENT_GRANTED: 'gdpr:consent:granted',
  GDPR_CONSENT_REVOKED: 'gdpr:consent:revoked',
  GDPR_DATA_RETENTION_PURGE: 'gdpr:data_retention:purge',
} as const;

/** Write a single audit log record. Low-level helper. */
export async function writeAuditLog(
  db: DrizzleDb,
  params: {
    actorUserId: string;
    action: string;
    targetType: string;
    targetId: string;
    before?: unknown;
    after: unknown;
    ip?: string | null;
    userAgent?: string | null;
    reason?: string | null;
  },
): Promise<void> {
  await db.insert(auditLog)
    .values({
      id: crypto.randomUUID(),
      actorUserId: params.actorUserId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      before: params.before != null ? JSON.stringify(params.before) : null,
      after: JSON.stringify(params.after),
      timestamp: new Date(),
      ip: params.ip ?? null,
      userAgent: params.userAgent ?? null,
      reason: params.reason ?? null,
    })
    .run();
}

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

  writeAuditLog(db, {
    actorUserId: request.user?.id ?? 'anonymous',
    action,
    targetType,
    targetId,
    before: opts.before,
    after: result,
    ip: request.ip,
    userAgent: request.headers['user-agent'],
    reason: opts.reason,
  });

  return result;
}

/**
 * Convenience: wrap a synchronous mutation with audit logging.
 */
export async function withAuditSync<T>(
  db: DrizzleDb,
  request: FastifyRequest,
  action: string,
  targetType: string,
  targetId: string,
  opts: { before?: unknown; reason?: string },
  fn: () => T | Promise<T>,
): Promise<T> {
  const result = await fn();

  await writeAuditLog(db, {
    actorUserId: request.user?.id ?? 'anonymous',
    action,
    targetType,
    targetId,
    before: opts.before,
    after: result,
    ip: request.ip,
    userAgent: request.headers['user-agent'],
    reason: opts.reason,
  });

  return result;
}

/**
 * Audit log entry for system/cron operations (no FastifyRequest).
 * Accepts explicit actor ID, IP and user-agent.
 */
export async function withSystemAudit<T>(
  db: DrizzleDb,
  action: string,
  targetType: string,
  targetId: string,
  opts: {
    before?: unknown;
    reason?: string;
    actorUserId?: string;
    ip?: string;
    userAgent?: string;
  },
  fn: () => T | Promise<T>,
): Promise<T> {
  const result = await fn();

  await writeAuditLog(db, {
    actorUserId: opts.actorUserId ?? 'system',
    action,
    targetType,
    targetId,
    before: opts.before,
    after: result,
    ip: opts.ip ?? null,
    userAgent: opts.userAgent ?? null,
    reason: opts.reason,
  });

  return result;
}
