import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import supertest, { type Agent } from 'supertest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../src/server.js';
import { createTestDb } from '../src/db/testUtils.js';

async function makeApp() {
  const db = createTestDb();
  return buildServer({
    config: { authDevMode: true, webOrigin: 'http://localhost:5173' },
    db,
  });
}

async function devLogin(agent: Agent, email = 'alice@example.com', name = 'Alice') {
  return agent.post('/api/auth/dev-login').send({ email, name });
}

describe('GET /api/settings', () => {
  let app: FastifyInstance;
  let agent: Agent;

  beforeEach(async () => {
    app = await makeApp();
    await app.ready();
    agent = supertest.agent(app.server);
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 401 when not authenticated', async () => {
    const res = await supertest(app.server).get('/api/settings');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('returns settings for authenticated user', async () => {
    await devLogin(agent);
    const res = await agent.get('/api/settings');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('bpm');
    expect(res.body).toHaveProperty('volume');
    expect(typeof res.body.bpm).toBe('number');
  });

  it('returns default settings for newly created user', async () => {
    await devLogin(agent);
    const res = await agent.get('/api/settings');
    expect(res.body.bpm).toBe(120);
    expect(res.body.volume).toBe(0.8);
    expect(res.body.countIn).toBe(1);
  });
});

describe('PATCH /api/settings', () => {
  let app: FastifyInstance;
  let agent: Agent;

  beforeEach(async () => {
    app = await makeApp();
    await app.ready();
    agent = supertest.agent(app.server);
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 401 when not authenticated', async () => {
    const res = await supertest(app.server).patch('/api/settings').send({ bpm: 140 });
    expect(res.status).toBe(401);
  });

  it('updates bpm and returns updated settings', async () => {
    await devLogin(agent);
    const res = await agent.patch('/api/settings').send({ bpm: 140 });
    expect(res.status).toBe(200);
    expect(res.body.bpm).toBe(140);
  });

  it('updates volume', async () => {
    await devLogin(agent);
    const res = await agent.patch('/api/settings').send({ volume: 0.5 });
    expect(res.status).toBe(200);
    expect(res.body.volume).toBe(0.5);
  });

  it('returns 400 for invalid bpm (out of range)', async () => {
    await devLogin(agent);
    const res = await agent.patch('/api/settings').send({ bpm: 9999 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for negative volume', async () => {
    await devLogin(agent);
    const res = await agent.patch('/api/settings').send({ volume: -0.1 });
    expect(res.status).toBe(400);
  });

  it('persists settings across requests', async () => {
    await devLogin(agent);
    await agent.patch('/api/settings').send({ bpm: 160, countIn: 2 });
    const res = await agent.get('/api/settings');
    expect(res.body.bpm).toBe(160);
    expect(res.body.countIn).toBe(2);
  });

  it('partial update leaves other fields unchanged', async () => {
    await devLogin(agent);
    // First set a known state
    await agent.patch('/api/settings').send({ bpm: 140, volume: 0.6 });
    // Then update only bpm
    const res = await agent.patch('/api/settings').send({ bpm: 150 });
    expect(res.body.bpm).toBe(150);
    expect(res.body.volume).toBe(0.6);
  });

  it('updates boolean settings correctly', async () => {
    await devLogin(agent);
    const res = await agent.patch('/api/settings').send({ bassEnabled: false });
    expect(res.status).toBe(200);
    expect(res.body.bassEnabled).toBe(false);
  });

  it('updates swing ratio', async () => {
    await devLogin(agent);
    const res = await agent.patch('/api/settings').send({ swingRatio: 0.67 });
    expect(res.status).toBe(200);
    expect(res.body.swingRatio).toBe(0.67);
  });

  it('isolation: settings of user A not visible to user B', async () => {
    const agentA = supertest.agent(app.server);
    const agentB = supertest.agent(app.server);

    await devLogin(agentA, 'alice@example.com', 'Alice');
    await devLogin(agentB, 'bob@example.com', 'Bob');

    await agentA.patch('/api/settings').send({ bpm: 111 });
    await agentB.patch('/api/settings').send({ bpm: 222 });

    const resA = await agentA.get('/api/settings');
    const resB = await agentB.get('/api/settings');

    expect(resA.body.bpm).toBe(111);
    expect(resB.body.bpm).toBe(222);
  });
});
