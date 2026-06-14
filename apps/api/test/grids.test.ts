import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import supertest, { type Agent } from 'supertest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../src/server.js';
import { createTestDb } from '../src/db/testUtils.js';
import type { DrizzleDb } from '../src/db/index.js';

async function makeApp(db?: DrizzleDb): Promise<FastifyInstance> {
  return buildServer({
    config: { authDevMode: true, webOrigin: 'http://localhost:5173' },
    db: db ?? createTestDb(),
  });
}

async function login(agent: Agent, email: string, name: string): Promise<void> {
  const res = await agent.post('/api/auth/dev-login').send({ email, name });
  expect(res.status).toBe(200);
}

// ── Public endpoints (no auth) ────────────────────────────────────────────

describe('GET /api/grids/public — public catalog', () => {
  let app: FastifyInstance;
  let agent: Agent;

  beforeEach(async () => {
    app = await makeApp();
    await app.ready();
    agent = supertest.agent(app.server);
  });

  afterEach(() => app.close());

  it('returns demo grids without auth (200)', async () => {
    const res = await agent.get('/api/grids/public');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(5);
  });

  it('each entry has expected shape', async () => {
    const res = await agent.get('/api/grids/public');
    const first = res.body[0];
    expect(first).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      barsCount: expect.any(Number),
      likeCount: expect.any(Number),
      likedByMe: false,
    });
  });

  it('filters by name with ?q=', async () => {
    const res = await agent.get('/api/grids/public?q=Blues');
    expect(res.status).toBe(200);
    expect(res.body.every((g: { name: string }) => g.name.toLowerCase().includes('blues'))).toBe(
      true,
    );
  });

  it('supports sort=name', async () => {
    const res = await agent.get('/api/grids/public?sort=name');
    expect(res.status).toBe(200);
    const names: string[] = res.body.map((g: { name: string }) => g.name);
    expect(names).toEqual([...names].sort());
  });

  it('supports limit + offset pagination', async () => {
    const page1 = await agent.get('/api/grids/public?limit=2&offset=0');
    const page2 = await agent.get('/api/grids/public?limit=2&offset=2');
    expect(page1.body).toHaveLength(2);
    expect(page2.body).toHaveLength(2);
    expect(page1.body[0].id).not.toBe(page2.body[0].id);
  });
});

describe('GET /api/grids/public/:id', () => {
  let app: FastifyInstance;
  let agent: Agent;

  beforeEach(async () => {
    app = await makeApp();
    await app.ready();
    agent = supertest.agent(app.server);
  });

  afterEach(() => app.close());

  it('returns full public grid with content + owner', async () => {
    const res = await agent.get('/api/grids/public/demo-blues-f');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 'demo-blues-f',
      name: 'Blues in F',
      content: { version: 1, bars: expect.any(Array) },
      owner: { name: expect.any(String) },
      likedByMe: false,
    });
  });

  it('returns 404 for unknown id', async () => {
    const res = await agent.get('/api/grids/public/does-not-exist');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/patterns and POST /api/generate', () => {
  let app: FastifyInstance;
  let agent: Agent;

  beforeEach(async () => {
    app = await makeApp();
    await app.ready();
    agent = supertest.agent(app.server);
  });

  afterEach(() => app.close());

  it('GET /api/patterns returns pattern list without auth', async () => {
    const res = await agent.get('/api/patterns');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toMatchObject({ id: expect.any(String), name: expect.any(String) });
  });

  it('POST /api/generate returns GridContent without auth', async () => {
    const patternsRes = await agent.get('/api/patterns');
    const patternId = patternsRes.body[0].id;

    const res = await agent.post('/api/generate').send({ patternId, key: 'C' });
    expect(res.status).toBe(200);
    expect(res.body.content).toMatchObject({ version: 1, bars: expect.any(Array) });
  });

  it('POST /api/generate returns 400 for unknown patternId', async () => {
    const res = await agent.post('/api/generate').send({ patternId: 'no-such-pattern', key: 'C' });
    expect(res.status).toBe(400);
  });

  it('POST /api/generate returns 400 for invalid input', async () => {
    const res = await agent.post('/api/generate').send({ key: 'C' });
    expect(res.status).toBe(400);
  });
});

// ── Authentication guard tests ─────────────────────────────────────────────

describe('permission: anonymous gets 401 on protected endpoints', () => {
  let app: FastifyInstance;
  let agent: Agent;

  beforeEach(async () => {
    app = await makeApp();
    await app.ready();
    agent = supertest.agent(app.server);
  });

  afterEach(() => app.close());

  it('GET /api/grids/mine → 401', async () => {
    expect((await agent.get('/api/grids/mine')).status).toBe(401);
  });

  it('POST /api/grids → 401', async () => {
    expect((await agent.post('/api/grids').send({ name: 'x' })).status).toBe(401);
  });

  it('GET /api/settings → 401', async () => {
    expect((await agent.get('/api/settings')).status).toBe(401);
  });

  it('PATCH /api/settings → 401', async () => {
    expect((await agent.patch('/api/settings').send({ bpm: 100 })).status).toBe(401);
  });

  it('POST /api/grids/:id/like → 401', async () => {
    expect((await agent.post('/api/grids/demo-blues-f/like')).status).toBe(401);
  });

  it('DELETE /api/grids/:id/like → 401', async () => {
    expect((await agent.delete('/api/grids/demo-blues-f/like')).status).toBe(401);
  });
});

// ── Settings ──────────────────────────────────────────────────────────────

describe('GET + PATCH /api/settings', () => {
  let app: FastifyInstance;
  let agent: Agent;

  beforeEach(async () => {
    app = await makeApp();
    await app.ready();
    agent = supertest.agent(app.server);
    await login(agent, 'alice@example.com', 'Alice');
  });

  afterEach(() => app.close());

  it('GET returns default settings', async () => {
    const res = await agent.get('/api/settings');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ bpm: 120, volume: 0.8 });
  });

  it('PATCH updates partial settings', async () => {
    await agent.patch('/api/settings').send({ clickStrong: 'button-click' });
    const res = await agent.patch('/api/settings').send({ bpm: 140, volume: 0.5 });
    expect(res.status).toBe(200);
    expect(res.body.bpm).toBe(140);
    expect(res.body.volume).toBe(0.5);
    expect(res.body.clickStrong).toBe('button-click'); // unchanged
  });

  it('PATCH rejects invalid bpm', async () => {
    const res = await agent.patch('/api/settings').send({ bpm: 5 });
    expect(res.status).toBe(400);
  });
});

// ── Grids CRUD ─────────────────────────────────────────────────────────────

describe('grids CRUD (authenticated)', () => {
  let app: FastifyInstance;
  let agent: Agent;

  beforeEach(async () => {
    app = await makeApp();
    await app.ready();
    agent = supertest.agent(app.server);
    await login(agent, 'alice@example.com', 'Alice');
  });

  afterEach(() => app.close());

  it('POST /api/grids creates a private grid (201)', async () => {
    const res = await agent.post('/api/grids').send({ name: 'My grid' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'My grid', visibility: 'private' });
    expect(res.body.id).toBeTruthy();
  });

  it('GET /api/grids/mine lists own grids', async () => {
    await agent.post('/api/grids').send({ name: 'Grid A' });
    await agent.post('/api/grids').send({ name: 'Grid B' });
    const res = await agent.get('/api/grids/mine');
    expect(res.status).toBe(200);
    expect(res.body.some((g: { name: string }) => g.name === 'Grid A')).toBe(true);
    expect(res.body.some((g: { name: string }) => g.name === 'Grid B')).toBe(true);
  });

  it('GET /api/grids/:id returns own grid', async () => {
    const created = await agent.post('/api/grids').send({ name: 'Test' });
    const res = await agent.get(`/api/grids/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Test');
  });

  it('PATCH /api/grids/:id updates own grid', async () => {
    const created = await agent.post('/api/grids').send({ name: 'Original' });
    const res = await agent.patch(`/api/grids/${created.body.id}`).send({ name: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated');
  });

  it('PATCH /api/grids/:id can set visibility to public', async () => {
    const created = await agent.post('/api/grids').send({ name: 'Will be public' });
    const res = await agent.patch(`/api/grids/${created.body.id}`).send({ visibility: 'public' });
    expect(res.status).toBe(200);
    expect(res.body.visibility).toBe('public');
  });

  it('DELETE /api/grids/:id removes own grid (204)', async () => {
    const created = await agent.post('/api/grids').send({ name: 'To delete' });
    const del = await agent.delete(`/api/grids/${created.body.id}`);
    expect(del.status).toBe(204);
    const get = await agent.get(`/api/grids/${created.body.id}`);
    expect(get.status).toBe(404);
  });

  it('POST /api/grids requires name', async () => {
    const res = await agent.post('/api/grids').send({});
    expect(res.status).toBe(400);
  });
});

// ── Permission isolation (user A vs user B) ────────────────────────────────

describe('permission isolation: user B cannot access user A grids', () => {
  let app: FastifyInstance;
  let agentA: Agent;
  let agentB: Agent;
  let gridId: string;

  beforeEach(async () => {
    const db = createTestDb();
    app = await makeApp(db);
    await app.ready();

    agentA = supertest.agent(app.server);
    agentB = supertest.agent(app.server);

    await login(agentA, 'alice@example.com', 'Alice');
    await login(agentB, 'bob@example.com', 'Bob');

    const res = await agentA.post('/api/grids').send({ name: "Alice's grid" });
    gridId = res.body.id;
  });

  afterEach(() => app.close());

  it("GET /api/grids/:id — B gets 404 on A's private grid", async () => {
    expect((await agentB.get(`/api/grids/${gridId}`)).status).toBe(404);
  });

  it("PATCH /api/grids/:id — B gets 404 on A's private grid", async () => {
    expect((await agentB.patch(`/api/grids/${gridId}`).send({ name: 'Hacked' })).status).toBe(404);
  });

  it("DELETE /api/grids/:id — B gets 404 on A's private grid", async () => {
    expect((await agentB.delete(`/api/grids/${gridId}`)).status).toBe(404);
  });

  it("GET /api/grids/:id/export — B gets 404 on A's private grid", async () => {
    expect((await agentB.get(`/api/grids/${gridId}/export`)).status).toBe(404);
  });

  it("B cannot copy A's private grid", async () => {
    expect((await agentB.post(`/api/grids/${gridId}/copy`).send({})).status).toBe(404);
  });

  it('B can copy a public grid (creates private copy with sourceGridId)', async () => {
    const res = await agentB.post('/api/grids/demo-blues-f/copy').send({});
    expect(res.status).toBe(201);
    expect(res.body.sourceGridId).toBe('demo-blues-f');
    expect(res.body.visibility).toBe('private');
  });
});

// ── DSL Import / Export ───────────────────────────────────────────────────

describe('import / export DSL', () => {
  let app: FastifyInstance;
  let agent: Agent;

  beforeEach(async () => {
    app = await makeApp();
    await app.ready();
    agent = supertest.agent(app.server);
    await login(agent, 'alice@example.com', 'Alice');
  });

  afterEach(() => app.close());

  it('POST /api/grids/import creates grid from DSL (201)', async () => {
    const res = await agent
      .post('/api/grids/import')
      .send({ name: 'Imported', dsl: 'Dm7 | G7 | Cmaj7 |' });
    expect(res.status).toBe(201);
    expect(res.body.content.bars).toHaveLength(3);
  });

  it('POST /api/grids/import returns 400 for empty DSL', async () => {
    const res = await agent.post('/api/grids/import').send({ name: 'Bad', dsl: '' });
    expect(res.status).toBe(400);
  });

  it('GET /api/grids/:id/export returns DSL string', async () => {
    const imp = await agent
      .post('/api/grids/import')
      .send({ name: 'Round trip', dsl: 'Dm7 | G7 | Cmaj7 |' });
    const exp = await agent.get(`/api/grids/${imp.body.id}/export`);
    expect(exp.status).toBe(200);
    expect(typeof exp.body.dsl).toBe('string');
    expect(exp.body.dsl).toContain('Dm7');
  });
});

// ── Likes ─────────────────────────────────────────────────────────────────

describe('likes', () => {
  let app: FastifyInstance;
  let agent: Agent;

  beforeEach(async () => {
    app = await makeApp();
    await app.ready();
    agent = supertest.agent(app.server);
    await login(agent, 'alice@example.com', 'Alice');
  });

  afterEach(() => app.close());

  it('POST /api/grids/:id/like increments likeCount', async () => {
    const res = await agent.post('/api/grids/demo-blues-f/like');
    expect(res.status).toBe(200);
    expect(res.body.likedByMe).toBe(true);
    expect(res.body.likeCount).toBe(1);
  });

  it('POST like is idempotent (does not double-count)', async () => {
    await agent.post('/api/grids/demo-blues-f/like');
    const res = await agent.post('/api/grids/demo-blues-f/like');
    expect(res.body.likeCount).toBe(1);
  });

  it('DELETE /api/grids/:id/like decrements likeCount', async () => {
    await agent.post('/api/grids/demo-blues-f/like');
    const res = await agent.delete('/api/grids/demo-blues-f/like');
    expect(res.status).toBe(200);
    expect(res.body.likedByMe).toBe(false);
    expect(res.body.likeCount).toBe(0);
  });

  it('DELETE like is idempotent (does not go below 0)', async () => {
    const res = await agent.delete('/api/grids/demo-blues-f/like');
    expect(res.status).toBe(200);
    expect(res.body.likeCount).toBe(0);
  });

  it('likedByMe is true in public catalog after liking', async () => {
    await agent.post('/api/grids/demo-blues-f/like');
    const catalog = await agent.get('/api/grids/public');
    const entry = catalog.body.find((g: { id: string }) => g.id === 'demo-blues-f');
    expect(entry?.likedByMe).toBe(true);
  });

  it('POST like on private/non-existent grid returns 404', async () => {
    const res = await agent.post('/api/grids/does-not-exist/like');
    expect(res.status).toBe(404);
  });
});
