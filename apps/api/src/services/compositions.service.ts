import { eq, and, desc, asc, like, sql } from 'drizzle-orm';
import type {
  HarmonyCompositionDTO,
  HarmonyCompositionSummaryDTO,
  PublicCompositionDTO,
  PublicCompositionSummaryDTO,
  CreateCompositionInput,
  UpdateCompositionInput,
  PublicCompositionsQuery,
  CompositionContent,
} from '@jazz/shared';
import { parseGrid, serializeGrid } from '@jazz/music-core';
import { harmonyCompositions, compositionLikes, users } from '../db/schema.js';
import type { HarmonyCompositionRecord } from '../db/schema.js';
import type { DrizzleDb } from '../db/index.js';

// ── DTO mapping ────────────────────────────────────────────────────────────

function barsCount(content: CompositionContent): number {
  return content.bars.length;
}

function parseContent(raw: string): CompositionContent {
  return JSON.parse(raw) as CompositionContent;
}

function toSummaryDTO(
  g: HarmonyCompositionRecord,
): HarmonyCompositionSummaryDTO {
  const content = parseContent(g.content);
  return {
    id: g.id,
    name: g.name,
    timeSignature:
      g.timeSignature as HarmonyCompositionSummaryDTO['timeSignature'],
    key: g.key as HarmonyCompositionSummaryDTO['key'],
    barsCount: barsCount(content),
    visibility: g.visibility as HarmonyCompositionSummaryDTO['visibility'],
    updatedAt: g.updatedAt,
    recommendedStyle: g.recommendedStyle as HarmonyCompositionSummaryDTO['recommendedStyle'],
    recommendedTempo: g.recommendedTempo,
  };
}

function toDTO(g: HarmonyCompositionRecord): HarmonyCompositionDTO {
  return {
    ...toSummaryDTO(g),
    content: parseContent(g.content),
    sourceCompositionId: g.sourceCompositionId ?? null,
    createdAt: g.createdAt,
    moderationStatus: g.moderationStatus as HarmonyCompositionDTO['moderationStatus'],
  };
}

function toPublicSummaryDTO(
  g: HarmonyCompositionRecord,
  likedByMe: boolean,
): PublicCompositionSummaryDTO {
  const content = parseContent(g.content);
  return {
    id: g.id,
    name: g.name,
    timeSignature: g.timeSignature as PublicCompositionSummaryDTO['timeSignature'],
    key: g.key as PublicCompositionSummaryDTO['key'],
    barsCount: barsCount(content),
    likeCount: g.likeCount,
    likedByMe,
    updatedAt: g.updatedAt,
  };
}

function toPublicDTO(
  g: HarmonyCompositionRecord,
  ownerName: string,
  likedByMe: boolean,
): PublicCompositionDTO {
  return {
    ...toPublicSummaryDTO(g, likedByMe),
    content: parseContent(g.content),
    owner: { name: ownerName },
    recommendedStyle: g.recommendedStyle as PublicCompositionDTO['recommendedStyle'],
    recommendedTempo: g.recommendedTempo,
  };
}

// ── Empty default content ─────────────────────────────────────────────────

function emptyContent(): CompositionContent {
  return { version: 1, bars: [] };
}

// ── User's own compositions (CRUD) ────────────────────────────────────────

export function getUserCompositions(
  db: DrizzleDb,
  userId: string,
): HarmonyCompositionSummaryDTO[] {
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
  return rows.map(toSummaryDTO);
}

export function getOwnComposition(
  db: DrizzleDb,
  userId: string,
  compositionId: string,
): HarmonyCompositionDTO | null {
  const row = db
    .select()
    .from(harmonyCompositions)
    .where(
      and(
        eq(harmonyCompositions.id, compositionId),
        eq(harmonyCompositions.userId, userId),
      ),
    )
    .get();
  return row ? toDTO(row) : null;
}

export function createComposition(
  db: DrizzleDb,
  userId: string,
  input: CreateCompositionInput,
): HarmonyCompositionDTO {
  const now = Date.now();
  const id = crypto.randomUUID();
  const content = input.content ?? emptyContent();
  const row: HarmonyCompositionRecord = {
    id,
    userId,
    name: input.name,
    timeSignature: input.timeSignature ?? '4/4',
    key: input.key ?? 'C',
    visibility: 'private',
    content: JSON.stringify(content),
    sourceCompositionId: null,
    likeCount: 0,
    description: null,
    difficulty: 'intermediate',
    tags: '[]',
    author: '',
    recommendedStyle: null,
    recommendedTempo: null,
    catalogPublishedAt: Math.floor(now / 1000),
    copyCount: 0,
    featured: false,
    featuredOrder: null,
    moderationStatus: 'approved',
    createdAt: now,
    updatedAt: now,
  };
  db.insert(harmonyCompositions).values(row).run();
  return toDTO(row);
}

export function updateComposition(
  db: DrizzleDb,
  userId: string,
  compositionId: string,
  input: UpdateCompositionInput,
): HarmonyCompositionDTO | null {
  const existing = db
    .select()
    .from(harmonyCompositions)
    .where(
      and(
        eq(harmonyCompositions.id, compositionId),
        eq(harmonyCompositions.userId, userId),
      ),
    )
    .get();
  if (!existing) return null;
  return applyCompositionPatch(db, existing, input);
}

function applyCompositionPatch(
  db: DrizzleDb,
  record: HarmonyCompositionRecord,
  input: UpdateCompositionInput,
): HarmonyCompositionDTO {
  const now = Date.now();
  const patch: Partial<typeof record> = { updatedAt: now };
  if (input.name !== undefined) patch.name = input.name;
  if (input.timeSignature !== undefined) patch.timeSignature = input.timeSignature;
  if (input.key !== undefined) patch.key = input.key;
  if (input.visibility !== undefined) patch.visibility = input.visibility;
  if (input.content !== undefined) patch.content = JSON.stringify(input.content);
  if (input.recommendedStyle !== undefined) patch.recommendedStyle = input.recommendedStyle;
  if (input.recommendedTempo !== undefined) patch.recommendedTempo = input.recommendedTempo;

  // When editing a published catalog composition, mark as modified
  if (
    record.visibility === 'public' &&
    record.moderationStatus === 'approved'
  ) {
    patch.moderationStatus = 'modified';
  }

  db.update(harmonyCompositions)
    .set(patch)
    .where(eq(harmonyCompositions.id, record.id))
    .run();
  return toDTO({ ...record, ...patch } as HarmonyCompositionRecord);
}

/** Update a public composition without ownership check (moderator fallback). */
export function updateCompositionAsModerator(
  db: DrizzleDb,
  compositionId: string,
  input: UpdateCompositionInput,
): HarmonyCompositionDTO | null {
  const existing = db
    .select()
    .from(harmonyCompositions)
    .where(eq(harmonyCompositions.id, compositionId))
    .get();
  if (!existing || existing.visibility !== 'public') return null;
  return applyCompositionPatch(db, existing, input);
}

export function deleteComposition(
  db: DrizzleDb,
  userId: string,
  compositionId: string,
): boolean {
  const existing = db
    .select()
    .from(harmonyCompositions)
    .where(
      and(
        eq(harmonyCompositions.id, compositionId),
        eq(harmonyCompositions.userId, userId),
      ),
    )
    .get();
  if (!existing) return false;
  db.delete(harmonyCompositions)
    .where(eq(harmonyCompositions.id, compositionId))
    .run();
  return true;
}

// ── Copy ──────────────────────────────────────────────────────────────────

export function copyComposition(
  db: DrizzleDb,
  userId: string,
  sourceId: string,
  newName?: string,
): HarmonyCompositionDTO | null {
  // source can be own private OR any public composition
  const source = db
    .select()
    .from(harmonyCompositions)
    .where(
      and(
        eq(harmonyCompositions.id, sourceId),
        sql`(${harmonyCompositions.userId} = ${userId} OR ${harmonyCompositions.visibility} = 'public')`,
      ),
    )
    .get();
  if (!source) return null;

  const now = Date.now();
  const id = crypto.randomUUID();
  const row: HarmonyCompositionRecord = {
    id,
    userId,
    name: newName ?? `${source.name} (copy)`,
    timeSignature: source.timeSignature,
    key: source.key,
    visibility: 'private',
    content: source.content,
    sourceCompositionId: sourceId,
    likeCount: 0,
    description: source.description,
    difficulty: source.difficulty,
    tags: source.tags,
    author: source.author,
    recommendedStyle: source.recommendedStyle,
    recommendedTempo: source.recommendedTempo,
    catalogPublishedAt: Math.floor(now / 1000),
    copyCount: 0,
    featured: false,
    featuredOrder: null,
    moderationStatus: 'approved',
    createdAt: now,
    updatedAt: now,
  };
  db.insert(harmonyCompositions).values(row).run();
  // increment copyCount on the source (popularity metric)
  db.update(harmonyCompositions)
    .set({ copyCount: source.copyCount + 1 })
    .where(eq(harmonyCompositions.id, sourceId))
    .run();
  return toDTO(row);
}

// ── Publish (create public copy) ───────────────────────────────────────────

export function publishComposition(
  db: DrizzleDb,
  userId: string,
  sourceId: string,
): { id: string; name: string } | null {
  const source = db
    .select()
    .from(harmonyCompositions)
    .where(
      and(
        eq(harmonyCompositions.id, sourceId),
        eq(harmonyCompositions.userId, userId),
      ),
    )
    .get();
  if (!source) return null;

  const now = Date.now();
  const id = crypto.randomUUID();
  db.insert(harmonyCompositions)
    .values({
      id,
      userId,
      name: source.name,
      timeSignature: source.timeSignature,
      key: source.key,
      visibility: 'public',
      content: source.content,
      sourceCompositionId: sourceId,
      likeCount: 0,
      description: source.description,
      difficulty: source.difficulty,
      tags: source.tags,
      author: source.author,
      recommendedStyle: source.recommendedStyle,
      recommendedTempo: source.recommendedTempo,
      catalogPublishedAt: Math.floor(now / 1000),
      copyCount: 0,
      featured: false,
      featuredOrder: null,
      moderationStatus: 'approved',
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return { id, name: source.name };
}

// ── DSL import / export ───────────────────────────────────────────────────

export interface ImportCompositionInput {
  name: string;
  timeSignature?: string;
  key?: string;
  dsl: string;
}

export interface ImportError {
  code: 'PARSE_ERROR';
  message: string;
  position: number;
}

export type ImportResult =
  | { ok: true; composition: HarmonyCompositionDTO }
  | { ok: false; errors: ImportError[] };

export function importComposition(
  db: DrizzleDb,
  userId: string,
  input: ImportCompositionInput,
): ImportResult {
  const result = parseGrid(input.dsl);
  if (!result.ok || !result.value) {
    return {
      ok: false,
      errors: result.errors.map((e) => ({
        code: 'PARSE_ERROR' as const,
        message: e.message,
        position: e.position,
      })),
    };
  }
  const composition = createComposition(db, userId, {
    name: input.name,
    timeSignature:
      (input.timeSignature as HarmonyCompositionSummaryDTO['timeSignature']) ??
      '4/4',
    key: (input.key as HarmonyCompositionSummaryDTO['key']) ?? 'C',
    content: result.value,
  });
  return { ok: true, composition };
}

export function exportCompositionDsl(
  db: DrizzleDb,
  userId: string,
  compositionId: string,
): string | null {
  const row = db
    .select()
    .from(harmonyCompositions)
    .where(
      and(
        eq(harmonyCompositions.id, compositionId),
        eq(harmonyCompositions.userId, userId),
      ),
    )
    .get();
  if (!row) return null;
  const content = parseContent(row.content);
  return serializeGrid(content);
}

// ── Public catalog ─────────────────────────────────────────────────────────

export function getPublicCompositions(
  db: DrizzleDb,
  query: PublicCompositionsQuery,
  currentUserId?: string,
): PublicCompositionSummaryDTO[] {
  const { q, sort, limit = 20, offset = 0 } = query;

  const rows = db
    .select()
    .from(harmonyCompositions)
    .where(
      q
        ? and(
            eq(harmonyCompositions.visibility, 'public'),
            like(harmonyCompositions.name, `%${q}%`),
          )
        : eq(harmonyCompositions.visibility, 'public'),
    )
    .orderBy(
      sort === 'likes'
        ? desc(harmonyCompositions.likeCount)
        : sort === 'name'
          ? asc(harmonyCompositions.name)
          : desc(harmonyCompositions.updatedAt),
    )
    .limit(limit)
    .offset(offset)
    .all();

  if (!currentUserId) {
    return rows.map((g) => toPublicSummaryDTO(g, false));
  }

  const likedSet = new Set(
    db
      .select({ compositionId: compositionLikes.compositionId })
      .from(compositionLikes)
      .where(eq(compositionLikes.userId, currentUserId))
      .all()
      .map((r) => r.compositionId),
  );

  return rows.map((g) => toPublicSummaryDTO(g, likedSet.has(g.id)));
}

export function getPublicCompositionById(
  db: DrizzleDb,
  compositionId: string,
  currentUserId?: string,
): PublicCompositionDTO | null {
  const row = db
    .select()
    .from(harmonyCompositions)
    .where(
      and(
        eq(harmonyCompositions.id, compositionId),
        eq(harmonyCompositions.visibility, 'public'),
      ),
    )
    .get();
  if (!row) return null;

  const owner = db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, row.userId))
    .get();
  const ownerName = owner?.name ?? 'Unknown';

  let likedByMe = false;
  if (currentUserId) {
    const like = db
      .select()
      .from(compositionLikes)
      .where(
        and(
          eq(compositionLikes.compositionId, compositionId),
          eq(compositionLikes.userId, currentUserId),
        ),
      )
      .get();
    likedByMe = !!like;
  }

  return toPublicDTO(row, ownerName, likedByMe);
}

// ── Likes ──────────────────────────────────────────────────────────────────

export interface LikeResult {
  likeCount: number;
  likedByMe: boolean;
}

export function likeComposition(
  db: DrizzleDb,
  userId: string,
  compositionId: string,
): LikeResult | null {
  const composition = db
    .select()
    .from(harmonyCompositions)
    .where(
      and(
        eq(harmonyCompositions.id, compositionId),
        eq(harmonyCompositions.visibility, 'public'),
      ),
    )
    .get();
  if (!composition) return null;

  const existing = db
    .select()
    .from(compositionLikes)
    .where(
      and(
        eq(compositionLikes.compositionId, compositionId),
        eq(compositionLikes.userId, userId),
      ),
    )
    .get();

  if (!existing) {
    db.insert(compositionLikes)
      .values({ compositionId, userId, createdAt: Date.now() })
      .run();
    const newCount = composition.likeCount + 1;
    db.update(harmonyCompositions)
      .set({ likeCount: newCount })
      .where(eq(harmonyCompositions.id, compositionId))
      .run();
    return { likeCount: newCount, likedByMe: true };
  }

  return { likeCount: composition.likeCount, likedByMe: true };
}

export function unlikeComposition(
  db: DrizzleDb,
  userId: string,
  compositionId: string,
): LikeResult | null {
  const composition = db
    .select()
    .from(harmonyCompositions)
    .where(
      and(
        eq(harmonyCompositions.id, compositionId),
        eq(harmonyCompositions.visibility, 'public'),
      ),
    )
    .get();
  if (!composition) return null;

  const existing = db
    .select()
    .from(compositionLikes)
    .where(
      and(
        eq(compositionLikes.compositionId, compositionId),
        eq(compositionLikes.userId, userId),
      ),
    )
    .get();

  if (existing) {
    db.delete(compositionLikes)
      .where(
        and(
          eq(compositionLikes.compositionId, compositionId),
          eq(compositionLikes.userId, userId),
        ),
      )
      .run();
    const newCount = Math.max(0, composition.likeCount - 1);
    db.update(harmonyCompositions)
      .set({ likeCount: newCount })
      .where(eq(harmonyCompositions.id, compositionId))
      .run();
    return { likeCount: newCount, likedByMe: false };
  }

  return { likeCount: composition.likeCount, likedByMe: false };
}
