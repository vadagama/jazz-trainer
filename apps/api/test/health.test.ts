import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../src/server.js';
import { createTestDb } from '../src/db/testUtils.js';

describe('GET /api/health', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildServer({
      config: { port: 0, webOrigin: 'http://localhost:5173', authDevMode: true },
      db: createTestDb(),
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns { status: "ok" }', async () => {
    const res = await supertest(app.server).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
