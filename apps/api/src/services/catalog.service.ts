import { eq, and, desc, asc, like, inArray, sql } from 'drizzle-orm';
import type { FastifyRequest } from 'fastify';
import type {
  CatalogEntry,
  CatalogQuery,
  CatalogQueryParsed,
  CatalogStats,
  CatalogTag,
  CreateCatalogEntryInput,
  UpdateCatalogEntryInput,
  BatchActionInput,
  CreateCatalogTagInput,
  UpdateCatalogTagInput,
  MergeCatalogTagsInput,
  CompositionContent,
} from '@jazz/shared';
import { harmonyCompositions, compositionLikes, users, catalogTags } from '../db/schema.js';
import type { HarmonyCompositionRecord, CatalogTagRecord } from '../db/schema.js';
import type { DrizzleDb } from '../db/index.js';
import { withAuditSync } from './audit.service.js';
import { publishComposition } from './compositions.service.js';

// ── helpers ────────────────────────────────────────────────────────────────

function parseContent(raw: string): CompositionContent {
  return JSON.parse(raw) as CompositionContent;
}

function parseTags(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Split comma-separated query param into a cleaned array. */
function splitCsv(v: string | undefined): string[] {
  if (!v) return [];
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function toCatalogEntry(
  row: HarmonyCompositionRecord,
  publisherName: string,
  likedByMe: boolean,
  includeContent = false,
): CatalogEntry {
  const content = parseContent(row.content);
  return {
    id: row.id,
    name: row.name,
    timeSignature: row.timeSignature as CatalogEntry['timeSignature'],
    key: row.key as CatalogEntry['key'],
    barsCount: content.bars.length,
    likeCount: row.likeCount,
    likedByMe,
    updatedAt: row.updatedAt,
    description: row.description,
    difficulty: row.difficulty as CatalogEntry['difficulty'],
    tags: parseTags(row.tags),
    author: row.author,
    recommendedStyle: row.recommendedStyle as CatalogEntry['recommendedStyle'],
    recommendedTempo: row.recommendedTempo,
    catalogPublishedAt: row.catalogPublishedAt,
    copyCount: row.copyCount,
    featured: row.featured,
    featuredOrder: row.featuredOrder,
    moderationStatus: row.moderationStatus as CatalogEntry['moderationStatus'],
    publisherId: row.userId,
    publisherName,
    visibility: row.visibility as CatalogEntry['visibility'],
    ...(includeContent ? { content } : {}),
  };
}

function normalizeQuery(q: CatalogQuery): CatalogQueryParsed {
  return {
    ...q,
    style: splitCsv(q.style),
    timeSignature: splitCsv(q.timeSignature),
    difficulty: splitCsv(q.difficulty),
    key: splitCsv(q.key),
    tags: splitCsv(q.tags),
  };
}

// ── public read ────────────────────────────────────────────────────────────

export function getCatalog(
  db: DrizzleDb,
  query: CatalogQuery,
  currentUserId?: string,
): CatalogEntry[] {
  const q = normalizeQuery(query);
  const { sort = 'popular', limit = 20, offset = 0 } = q;

  // build dynamic WHERE: only approved + public
  const conditions = [
    eq(harmonyCompositions.visibility, 'public'),
    eq(harmonyCompositions.moderationStatus, 'approved'),
  ];

  if (q.style.length) conditions.push(inArray(harmonyCompositions.recommendedStyle, q.style));
  if (q.timeSignature.length)
    conditions.push(inArray(harmonyCompositions.timeSignature, q.timeSignature));
  if (q.difficulty.length)
    conditions.push(inArray(harmonyCompositions.difficulty, q.difficulty));
  if (q.key.length) conditions.push(inArray(harmonyCompositions.key, q.key));
  if (q.author) conditions.push(like(harmonyCompositions.author, `%${q.author}%`));
  if (q.publisherId) conditions.push(eq(harmonyCompositions.userId, q.publisherId));
  if (q.tempoMin !== undefined)
    conditions.push(sql`${harmonyCompositions.recommendedTempo} >= ${q.tempoMin}`);
  if (q.tempoMax !== undefined)
    conditions.push(sql`${harmonyCompositions.recommendedTempo} <= ${q.tempoMax}`);

  // featured always on top when sort != explicit; otherwise respected by 'featured' sort
  const orderBy =
    sort === 'name_asc'
      ? [asc(harmonyCompositions.name)]
      : sort === 'newest'
        ? [desc(harmonyCompositions.catalogPublishedAt)]
        : sort === 'updated'
          ? [desc(harmonyCompositions.updatedAt)]
          : sort === 'copies'
            ? [desc(harmonyCompositions.copyCount)]
            : [desc(harmonyCompositions.likeCount)]; // 'popular' default

  // Always pin featured above the rest (stable secondary order)
  orderBy.unshift(desc(harmonyCompositions.featured));

  let rows = db
    .select()
    .from(harmonyCompositions)
    .where(and(...conditions))
    .orderBy(...orderBy)
    .all();

  // in-memory filters that SQL can't express cleanly: tags (JSON array), bars, q text
  if (q.tags.length) {
    const want = new Set(q.tags);
    rows = rows.filter((r) => {
      const tags = parseTags(r.tags);
      return tags.some((t) => want.has(t));
    });
  }
  if (q.barsMin !== undefined || q.barsMax !== undefined) {
    rows = rows.filter((r) => {
      const bc = parseContent(r.content).bars.length;
      if (q.barsMin !== undefined && bc < q.barsMin) return false;
      if (q.barsMax !== undefined && bc > q.barsMax) return false;
      return true;
    });
  }
  if (q.q) {
    const needle = q.q.toLowerCase();
    rows = rows.filter((r) => {
      const tags = parseTags(r.tags);
      return (
        r.name.toLowerCase().includes(needle) ||
        r.author.toLowerCase().includes(needle) ||
        (r.description ?? '').toLowerCase().includes(needle) ||
        tags.some((t) => t.toLowerCase().includes(needle))
      );
    });
  }

  rows = rows.slice(offset, offset + limit);

  // resolve publisher names + likedByMe in bulk
  const publisherIds = [...new Set(rows.map((r) => r.userId))];
  const nameMap = new Map<string, string>();
  if (publisherIds.length) {
    for (const r of rows) {
      if (!nameMap.has(r.userId)) {
        const u = db.select({ name: users.name }).from(users).where(eq(users.id, r.userId)).get();
        nameMap.set(r.userId, u?.name ?? 'Unknown');
      }
    }
  }

  const likedSet = currentUserId
    ? new Set(
        db
          .select({ id: compositionLikes.compositionId })
          .from(compositionLikes)
          .where(eq(compositionLikes.userId, currentUserId))
          .all()
          .map((l) => l.id),
      )
    : new Set<string>();

  return rows.map((r) => toCatalogEntry(r, nameMap.get(r.userId) ?? 'Unknown', likedSet.has(r.id)));
}

export function getCatalogById(
  db: DrizzleDb,
  id: string,
  currentUserId?: string,
): CatalogEntry | null {
  const row = db
    .select()
    .from(harmonyCompositions)
    .where(
      and(
        eq(harmonyCompositions.id, id),
        eq(harmonyCompositions.visibility, 'public'),
        eq(harmonyCompositions.moderationStatus, 'approved'),
      ),
    )
    .get();
  if (!row) return null;

  const u = db.select({ name: users.name }).from(users).where(eq(users.id, row.userId)).get();
  const publisherName = u?.name ?? 'Unknown';

  let likedByMe = false;
  if (currentUserId) {
    const like = db
      .select()
      .from(compositionLikes)
      .where(
        and(
          eq(compositionLikes.compositionId, id),
          eq(compositionLikes.userId, currentUserId),
        ),
      )
      .get();
    likedByMe = !!like;
  }
  return toCatalogEntry(row, publisherName, likedByMe, true);
}

export function getFeatured(db: DrizzleDb, currentUserId?: string): CatalogEntry[] {
  const rows = db
    .select()
    .from(harmonyCompositions)
    .where(
      and(
        eq(harmonyCompositions.featured, true),
        eq(harmonyCompositions.visibility, 'public'),
        eq(harmonyCompositions.moderationStatus, 'approved'),
      ),
    )
    .orderBy(asc(harmonyCompositions.featuredOrder), desc(harmonyCompositions.likeCount))
    .all();

  const nameMap = new Map<string, string>();
  for (const r of rows) {
    if (!nameMap.has(r.userId)) {
      const u = db.select({ name: users.name }).from(users).where(eq(users.id, r.userId)).get();
      nameMap.set(r.userId, u?.name ?? 'Unknown');
    }
  }
  const likedSet = currentUserId
    ? new Set(
        db
          .select({ id: compositionLikes.compositionId })
          .from(compositionLikes)
          .where(eq(compositionLikes.userId, currentUserId))
          .all()
          .map((l) => l.id),
      )
    : new Set<string>();

  return rows.map((r) => toCatalogEntry(r, nameMap.get(r.userId) ?? 'Unknown', likedSet.has(r.id)));
}

// ── tags ──────────────────────────────────────────────────────────────────

export function getCatalogTags(db: DrizzleDb, includeHidden = false): CatalogTag[] {
  const rows = db.select().from(catalogTags).all();
  const visible = includeHidden ? rows : rows.filter((r) => !r.hidden);

  // compute usage counts
  const allComps = db
    .select({ tags: harmonyCompositions.tags })
    .from(harmonyCompositions)
    .all();
  const counts = new Map<string, number>();
  for (const c of allComps) {
    for (const t of parseTags(c.tags)) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }

  return visible.map((r) => toTagDTO(r, counts.get(r.value) ?? 0));
}

function toTagDTO(r: CatalogTagRecord, usageCount: number): CatalogTag {
  return {
    id: r.id,
    value: r.value,
    category: r.category as CatalogTag['category'],
    description: r.description,
    hidden: r.hidden,
    usageCount,
  };
}

// ── stats ──────────────────────────────────────────────────────────────────

export function getCatalogStats(db: DrizzleDb, full = false): CatalogStats {
  const publicApproved = db
    .select()
    .from(harmonyCompositions)
    .where(
      and(
        eq(harmonyCompositions.visibility, 'public'),
        eq(harmonyCompositions.moderationStatus, 'approved'),
      ),
    )
    .all();

  const byStyle: Record<string, number> = {};
  const byDifficulty: Record<string, number> = {};
  for (const r of publicApproved) {
    const s = r.recommendedStyle ?? 'swing';
    byStyle[s] = (byStyle[s] ?? 0) + 1;
    byDifficulty[r.difficulty] = (byDifficulty[r.difficulty] ?? 0) + 1;
  }

  const topByLikes = [...publicApproved]
    .sort((a, b) => b.likeCount - a.likeCount)
    .slice(0, 10)
    .map((r) => ({ id: r.id, name: r.name, author: r.author, likeCount: r.likeCount }));

  const base: CatalogStats = {
    total: publicApproved.length,
    approved: publicApproved.length,
    rejected: full
      ? db
          .select({ count: sql<number>`count(*)` })
          .from(harmonyCompositions)
          .where(
            and(
              eq(harmonyCompositions.visibility, 'public'),
              eq(harmonyCompositions.moderationStatus, 'rejected'),
            ),
          )
          .get()?.count ?? 0
      : 0,
    featured: publicApproved.filter((r) => r.featured).length,
    byStyle,
    byDifficulty,
    topByLikes,
    topByCopies: [],
  };

  if (full) {
    base.topByCopies = [...publicApproved]
      .sort((a, b) => b.copyCount - a.copyCount)
      .slice(0, 10)
      .map((r) => ({ id: r.id, name: r.name, author: r.author, copyCount: r.copyCount }));
  }
  return base;
}

// ── editor: publish / update / unpublish ──────────────────────────────────

export function publishCatalogEntry(
  db: DrizzleDb,
  userId: string,
  input: CreateCatalogEntryInput,
): CatalogEntry | null {
  const now = Date.now();
  const id = input.sourceCompositionId ?? crypto.randomUUID();
  const publisher = db.select({ name: users.name }).from(users).where(eq(users.id, userId)).get();

  // if sourceCompositionId given, load content from it
  let content = input.content;
  if (input.sourceCompositionId) {
    const src = db
      .select()
      .from(harmonyCompositions)
      .where(
        and(
          eq(harmonyCompositions.id, input.sourceCompositionId),
          eq(harmonyCompositions.userId, userId),
        ),
      )
      .get();
    if (!src) return null;
    content = parseContent(src.content);
  }

  db.insert(harmonyCompositions)
    .values({
      id,
      userId,
      name: input.name,
      timeSignature: input.timeSignature,
      key: input.key,
      visibility: 'public',
      content: JSON.stringify(content),
      sourceCompositionId: input.sourceCompositionId ?? null,
      likeCount: 0,
      description: input.description ?? null,
      difficulty: input.difficulty,
      tags: JSON.stringify(input.tags),
      author: input.author,
      recommendedStyle: input.recommendedStyle,
      recommendedTempo: input.recommendedTempo,
      catalogPublishedAt: Math.floor(now / 1000),
      copyCount: 0,
      featured: false,
      featuredOrder: null,
      moderationStatus: 'approved',
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return toCatalogEntry(
    db.select().from(harmonyCompositions).where(eq(harmonyCompositions.id, id)).get()!,
    publisher?.name ?? 'Unknown',
    false,
  );
}

export function updateCatalogEntry(
  db: DrizzleDb,
  userId: string,
  id: string,
  input: UpdateCatalogEntryInput,
  isAdmin: boolean,
): CatalogEntry | null {
  const existing = db
    .select()
    .from(harmonyCompositions)
    .where(eq(harmonyCompositions.id, id))
    .get();
  if (!existing) return null;
  // ownership: publisher or admin
  if (!isAdmin && existing.userId !== userId) return null;

  const patch: Partial<HarmonyCompositionRecord> = { updatedAt: Date.now() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.author !== undefined) patch.author = input.author;
  if (input.description !== undefined) patch.description = input.description;
  if (input.difficulty !== undefined) patch.difficulty = input.difficulty;
  if (input.tags !== undefined) patch.tags = JSON.stringify(input.tags);
  if (input.recommendedStyle !== undefined) patch.recommendedStyle = input.recommendedStyle;
  if (input.recommendedTempo !== undefined) patch.recommendedTempo = input.recommendedTempo;
  if (input.timeSignature !== undefined) patch.timeSignature = input.timeSignature;
  if (input.key !== undefined) patch.key = input.key;
  if (input.content !== undefined) patch.content = JSON.stringify(input.content);

  db.update(harmonyCompositions).set(patch).where(eq(harmonyCompositions.id, id)).run();
  const publisher = db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, existing.userId))
    .get();
  return toCatalogEntry(
    { ...existing, ...patch } as HarmonyCompositionRecord,
    publisher?.name ?? 'Unknown',
    false,
  );
}

export function unpublishCatalogEntry(
  db: DrizzleDb,
  userId: string,
  id: string,
  isAdmin: boolean,
): boolean {
  const existing = db
    .select()
    .from(harmonyCompositions)
    .where(eq(harmonyCompositions.id, id))
    .get();
  if (!existing) return false;
  if (!isAdmin && existing.userId !== userId) return false;
  db.delete(harmonyCompositions).where(eq(harmonyCompositions.id, id)).run();
  return true;
}

// ── admin: moderate / feature ─────────────────────────────────────────────

export function rejectCatalogEntry(
  db: DrizzleDb,
  request: FastifyRequest,
  id: string,
): boolean {
  const existing = db
    .select()
    .from(harmonyCompositions)
    .where(eq(harmonyCompositions.id, id))
    .get();
  if (!existing) return false;
  return withAuditSync(
    db,
    request,
    'catalog:reject',
    'catalog_entry',
    id,
    { before: { moderationStatus: existing.moderationStatus } },
    () => {
      db.update(harmonyCompositions)
        .set({ moderationStatus: 'rejected', updatedAt: Date.now() })
        .where(eq(harmonyCompositions.id, id))
        .run();
      return { ok: true };
    },
  ).ok;
}

export function approveCatalogEntry(
  db: DrizzleDb,
  request: FastifyRequest,
  id: string,
): boolean {
  const existing = db
    .select()
    .from(harmonyCompositions)
    .where(eq(harmonyCompositions.id, id))
    .get();
  if (!existing) return false;
  return withAuditSync(
    db,
    request,
    'catalog:approve',
    'catalog_entry',
    id,
    { before: { moderationStatus: existing.moderationStatus } },
    () => {
      db.update(harmonyCompositions)
        .set({ moderationStatus: 'approved', updatedAt: Date.now() })
        .where(eq(harmonyCompositions.id, id))
        .run();
      return { ok: true };
    },
  ).ok;
}

export function toggleFeatured(
  db: DrizzleDb,
  request: FastifyRequest,
  id: string,
): { featured: boolean } | null {
  const existing = db
    .select()
    .from(harmonyCompositions)
    .where(eq(harmonyCompositions.id, id))
    .get();
  if (!existing) return null;

  // cap featured at 10
  const featuredCount = db
    .select({ count: sql<number>`count(*)` })
    .from(harmonyCompositions)
    .where(eq(harmonyCompositions.featured, true))
    .get()?.count ?? 0;
  if (!existing.featured && featuredCount >= 10) {
    return null; // cap reached
  }

  const newFeatured = !existing.featured;
  // assign featuredOrder: max + 1 when enabling; null when disabling
  let newOrder = existing.featuredOrder;
  if (newFeatured && existing.featuredOrder === null) {
    const maxOrder = db
      .select({ max: sql<number>`COALESCE(MAX(featured_order), 0)` })
      .from(harmonyCompositions)
      .get()?.max ?? 0;
    newOrder = maxOrder + 1;
  }
  if (!newFeatured) newOrder = null;

  return withAuditSync(
    db,
    request,
    'catalog:feature',
    'catalog_entry',
    id,
    { before: { featured: existing.featured, featuredOrder: existing.featuredOrder } },
    () => {
      db.update(harmonyCompositions)
        .set({ featured: newFeatured, featuredOrder: newOrder, updatedAt: Date.now() })
        .where(eq(harmonyCompositions.id, id))
        .run();
      return { featured: newFeatured };
    },
  );
}

export function reorderFeatured(
  db: DrizzleDb,
  id: string,
  order: number,
): boolean {
  const existing = db
    .select()
    .from(harmonyCompositions)
    .where(eq(harmonyCompositions.id, id))
    .get();
  if (!existing || !existing.featured) return false;
  db.update(harmonyCompositions)
    .set({ featuredOrder: order })
    .where(eq(harmonyCompositions.id, id))
    .run();
  return true;
}

export function deleteCatalogEntry(
  db: DrizzleDb,
  request: FastifyRequest,
  id: string,
): boolean {
  const existing = db
    .select()
    .from(harmonyCompositions)
    .where(eq(harmonyCompositions.id, id))
    .get();
  if (!existing) return false;
  return withAuditSync(
    db,
    request,
    'catalog:delete',
    'catalog_entry',
    id,
    { before: { name: existing.name, author: existing.author } },
    () => {
      db.delete(harmonyCompositions).where(eq(harmonyCompositions.id, id)).run();
      return { ok: true };
    },
  ).ok;
}

// ── admin: batch ──────────────────────────────────────────────────────────

export function batchAction(
  db: DrizzleDb,
  request: FastifyRequest,
  input: BatchActionInput,
): { affected: number } {
  let affected = 0;
  for (const id of input.ids) {
    const existing = db
      .select()
      .from(harmonyCompositions)
      .where(eq(harmonyCompositions.id, id))
      .get();
    if (!existing) continue;

    if (input.action === 'delete') {
      db.delete(harmonyCompositions).where(eq(harmonyCompositions.id, id)).run();
      affected++;
      continue;
    }

    if (input.action === 'addTag' && input.tag) {
      const tags = parseTags(existing.tags);
      if (!tags.includes(input.tag)) tags.push(input.tag);
      db.update(harmonyCompositions)
        .set({ tags: JSON.stringify(tags), updatedAt: Date.now() })
        .where(eq(harmonyCompositions.id, id))
        .run();
      affected++;
      continue;
    }

    if (input.action === 'removeTag' && input.tag) {
      const tags = parseTags(existing.tags).filter((t) => t !== input.tag);
      db.update(harmonyCompositions)
        .set({ tags: JSON.stringify(tags), updatedAt: Date.now() })
        .where(eq(harmonyCompositions.id, id))
        .run();
      affected++;
      continue;
    }

    // Опубликовать — для public-записей: устанавливает moderationStatus = approved
    if (input.action === 'publish') {
      if (existing.visibility === 'public') {
        db.update(harmonyCompositions)
          .set({ moderationStatus: 'approved', updatedAt: Date.now() })
          .where(eq(harmonyCompositions.id, id))
          .run();
        affected++;
      }
      continue;
    }

    // Снять с публикации — для public-записей: устанавливает moderationStatus = rejected
    if (input.action === 'unpublish') {
      if (existing.visibility === 'public') {
        db.update(harmonyCompositions)
          .set({ moderationStatus: 'rejected', updatedAt: Date.now() })
          .where(eq(harmonyCompositions.id, id))
          .run();
        affected++;
      }
      continue;
    }

    // Добавить в каталог — для private-записей: создаёт публичную копию со статусом «Не опубликовано»
    if (input.action === 'addToCatalog') {
      if (existing.visibility === 'private') {
        const result = publishComposition(db, existing.userId, id);
        if (result) {
          db.update(harmonyCompositions)
            .set({ moderationStatus: 'rejected' })
            .where(eq(harmonyCompositions.id, result.id))
            .run();
          affected++;
        }
      }
      continue;
    }
  }

  withAuditSync(
    db,
    request,
    `catalog:batch:${input.action}`,
    'catalog_entry',
    input.ids.join(','),
    { reason: `Batch ${input.action} on ${input.ids.length} entries` },
    () => ({ affected }),
  );

  return { affected };
}

// ── admin: tag CRUD ───────────────────────────────────────────────────────

export function createCatalogTag(
  db: DrizzleDb,
  request: FastifyRequest,
  input: CreateCatalogTagInput,
): CatalogTag | null {
  const existing = db
    .select({ id: catalogTags.id })
    .from(catalogTags)
    .where(eq(catalogTags.value, input.value))
    .get();
  if (existing) return null; // duplicate value

  const id = crypto.randomUUID();
  withAuditSync(
    db,
    request,
    'catalog:tag:create',
    'catalog_tag',
    id,
    {},
    () => {
      db.insert(catalogTags)
        .values({
          id,
          value: input.value,
          category: input.category,
          description: input.description ?? null,
          hidden: false,
        })
        .run();
      return { ok: true };
    },
  );
  return toTagDTO(
    db.select().from(catalogTags).where(eq(catalogTags.id, id)).get()!,
    0,
  );
}

export function updateCatalogTag(
  db: DrizzleDb,
  request: FastifyRequest,
  id: string,
  input: UpdateCatalogTagInput,
): CatalogTag | null {
  const existing = db.select().from(catalogTags).where(eq(catalogTags.id, id)).get();
  if (!existing) return null;

  // if renaming value, cascade-update in all compositions
  const before = { ...existing };
  if (input.value !== undefined && input.value !== existing.value) {
    // check duplicate
    const dup = db
      .select({ id: catalogTags.id })
      .from(catalogTags)
      .where(eq(catalogTags.value, input.value))
      .get();
    if (dup) return null;
    // cascade rename in compositions (JSON arrays)
    const comps = db.select().from(harmonyCompositions).all();
    for (const c of comps) {
      const tags = parseTags(c.tags);
      if (tags.includes(existing.value)) {
        const newTags = tags.map((t) => (t === existing.value ? input.value! : t));
        db.update(harmonyCompositions)
          .set({ tags: JSON.stringify(newTags) })
          .where(eq(harmonyCompositions.id, c.id))
          .run();
      }
    }
  }

  return withAuditSync(
    db,
    request,
    'catalog:tag:update',
    'catalog_tag',
    id,
    { before },
    () => {
      const patch: Partial<CatalogTagRecord> = {};
      if (input.value !== undefined) patch.value = input.value;
      if (input.category !== undefined) patch.category = input.category;
      if (input.description !== undefined) patch.description = input.description;
      if (input.hidden !== undefined) patch.hidden = input.hidden;
      db.update(catalogTags).set(patch).where(eq(catalogTags.id, id)).run();
      return db.select().from(catalogTags).where(eq(catalogTags.id, id)).get()!;
    },
  )
    ? toTagDTO(
        db.select().from(catalogTags).where(eq(catalogTags.id, id)).get()!,
        0,
      )
    : null;
}

export function deleteCatalogTag(
  db: DrizzleDb,
  request: FastifyRequest,
  id: string,
): boolean {
  const existing = db.select().from(catalogTags).where(eq(catalogTags.id, id)).get();
  if (!existing) return false;

  return withAuditSync(
    db,
    request,
    'catalog:tag:delete',
    'catalog_tag',
    id,
    { before: { value: existing.value } },
    () => {
      // remove the tag value from all compositions
      const comps = db.select().from(harmonyCompositions).all();
      for (const c of comps) {
        const tags = parseTags(c.tags);
        if (tags.includes(existing.value)) {
          const newTags = tags.filter((t) => t !== existing.value);
          db.update(harmonyCompositions)
            .set({ tags: JSON.stringify(newTags) })
            .where(eq(harmonyCompositions.id, c.id))
            .run();
        }
      }
      db.delete(catalogTags).where(eq(catalogTags.id, id)).run();
      return { ok: true };
    },
  ).ok;
}

export function mergeCatalogTags(
  db: DrizzleDb,
  request: FastifyRequest,
  input: MergeCatalogTagsInput,
): { merged: number } {
  const target = db.select().from(catalogTags).where(eq(catalogTags.id, input.targetId)).get();
  if (!target) return { merged: 0 };

  let merged = 0;
  for (const sourceId of input.sourceIds) {
    if (sourceId === input.targetId) continue;
    const source = db.select().from(catalogTags).where(eq(catalogTags.id, sourceId)).get();
    if (!source) continue;

    // replace source value with target value in all compositions
    const comps = db.select().from(harmonyCompositions).all();
    for (const c of comps) {
      const tags = parseTags(c.tags);
      if (tags.includes(source.value)) {
        const newTags = tags
          .map((t) => (t === source.value ? target.value : t))
          .filter((t, i, arr) => arr.indexOf(t) === i); // dedupe
        db.update(harmonyCompositions)
          .set({ tags: JSON.stringify(newTags) })
          .where(eq(harmonyCompositions.id, c.id))
          .run();
      }
    }
    db.delete(catalogTags).where(eq(catalogTags.id, sourceId)).run();
    merged++;
  }

  withAuditSync(
    db,
    request,
    'catalog:tag:merge',
    'catalog_tag',
    input.targetId,
    { before: { sourceIds: input.sourceIds } },
    () => ({ merged }),
  );
  return { merged };
}

// ── admin: list ALL entries (including rejected) for moderation ───────────

export function getAllCatalogEntriesForModeration(db: DrizzleDb): CatalogEntry[] {
  const rows = db
    .select()
    .from(harmonyCompositions)
    .where(eq(harmonyCompositions.visibility, 'public'))
    .orderBy(desc(harmonyCompositions.catalogPublishedAt))
    .all();

  const nameMap = new Map<string, string>();
  for (const r of rows) {
    if (!nameMap.has(r.userId)) {
      const u = db.select({ name: users.name }).from(users).where(eq(users.id, r.userId)).get();
      nameMap.set(r.userId, u?.name ?? 'Unknown');
    }
  }

  return rows.map((r) => toCatalogEntry(r, nameMap.get(r.userId) ?? 'Unknown', false));
}

/**
 * Return user's private compositions formatted as CatalogEntry for admin moderation view.
 * These appear with moderationStatus: 'rejected' (Скрыто) and publisherName = owner.
 */
export function getUserPrivateCompositionsForCatalog(
  db: DrizzleDb,
  userId: string,
): CatalogEntry[] {
  const owner = db.select({ name: users.name }).from(users).where(eq(users.id, userId)).get();
  const publisherName = owner?.name ?? 'Unknown';

  const rows = db
    .select()
    .from(harmonyCompositions)
    .where(
      and(
        eq(harmonyCompositions.userId, userId),
        eq(harmonyCompositions.visibility, 'private'),
      ),
    )
    .orderBy(desc(harmonyCompositions.updatedAt))
    .all();

  return rows.map((r) => ({
    ...toCatalogEntry(r, publisherName, false),
    moderationStatus: 'rejected' as const,
  }));
}
