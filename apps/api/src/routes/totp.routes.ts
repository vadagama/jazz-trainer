import type { FastifyInstance } from 'fastify';
import type { DrizzleDb } from '../db/index.js';
import type { ApiConfig } from '../config.js';
import { requireAuth } from '../plugins/auth.plugin.js';
import { sessions } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { setupTotp, enableTotp, checkTotp, isTotpEnabled, disableTotp } from '../services/totp.service.js';
import { withAuditSync } from '../services/audit.service.js';

export interface TotpRoutesOptions {
  db: DrizzleDb;
  config: ApiConfig;
}

export async function totpRoutes(app: FastifyInstance, opts: TotpRoutesOptions): Promise<void> {
  const { db } = opts;

  // ── GET /api/auth/totp/status ──────────────────────────────────────────
  app.get('/api/auth/totp/status', { preHandler: [requireAuth] }, async (request, reply) => {
    return reply.send({ enabled: isTotpEnabled(db, request.user!.id) });
  });

  // ── POST /api/auth/totp/setup ──────────────────────────────────────────
  app.post('/api/auth/totp/setup', { preHandler: [requireAuth] }, async (request, reply) => {
    if (isTotpEnabled(db, request.user!.id)) {
      return reply.status(409).send({
        error: { code: 'CONFLICT', message: 'TOTP is already enabled. Disable it first.' },
      });
    }
    const { otpauthUrl } = setupTotp(db, request.user!.id);
    return reply.send({ otpauthUrl });
  });

  // ── POST /api/auth/totp/enable ─────────────────────────────────────────
  app.post('/api/auth/totp/enable', { preHandler: [requireAuth] }, async (request, reply) => {
    const { token } = request.body as { token?: string };
    if (!token || typeof token !== 'string' || !/^\d{6}$/.test(token)) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'A 6-digit TOTP token is required' },
      });
    }
    const ok = enableTotp(db, request.user!.id, token);
    if (!ok) {
      return reply.status(400).send({
        error: { code: 'INVALID_TOTP', message: 'Invalid or expired TOTP token' },
      });
    }
    withAuditSync(db, request, 'auth:totp:enabled', 'user', request.user!.id, {}, () => ({}));
    return reply.send({ enabled: true });
  });

  // ── POST /api/auth/totp/check ──────────────────────────────────────────
  // Used for: 1) completing login when TOTP is pending, 2) step-up re-auth
  app.post('/api/auth/totp/check', async (request, reply) => {
    const { token } = request.body as { token?: string };
    if (!token || typeof token !== 'string' || !/^\d{6}$/.test(token)) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'A 6-digit TOTP token is required' },
      });
    }

    // Determine user: from pending session (login flow) or existing session (step-up)
    const sid = request.cookies?.['sid'];
    if (!sid) {
      return reply.status(401).send({
        error: { code: 'UNAUTHENTICATED', message: 'No session found' },
      });
    }

    const session = db.select().from(sessions).where(eq(sessions.id, sid)).get();
    if (!session || session.expiresAt < Date.now()) {
      return reply.status(401).send({
        error: { code: 'SESSION_EXPIRED', message: 'Session expired' },
      });
    }

    const userId = session.userId;

    if (!checkTotp(db, userId, token)) {
      return reply.status(400).send({
        error: { code: 'INVALID_TOTP', message: 'Invalid TOTP token' },
      });
    }

    // Mark session as TOTP-verified
    const now = Date.now();
    db.update(sessions)
      .set({ totpVerified: 1, totpVerifiedAt: now, lastUsedAt: now })
      .where(eq(sessions.id, sid))
      .run();

    withAuditSync(db, request, 'auth:totp:verified', 'user', userId, {}, () => ({}));

    return reply.send({ ok: true });
  });

  // ── DELETE /api/auth/totp ─────────────────────────────────────────────
  app.delete('/api/auth/totp', { preHandler: [requireAuth] }, async (request, reply) => {
    if (!isTotpEnabled(db, request.user!.id)) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'TOTP is not enabled' },
      });
    }
    disableTotp(db, request.user!.id);
    withAuditSync(db, request, 'auth:totp:disabled', 'user', request.user!.id, {}, () => ({}));
    return reply.send({ enabled: false });
  });
}
