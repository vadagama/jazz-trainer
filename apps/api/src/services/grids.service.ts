import { eq, and, desc, asc, like, sql } from 'drizzle-orm';
import type {
  HarmonyGridDTO,
  HarmonyGridSummaryDTO,
  PublicGridDTO,
  PublicGridSummaryDTO,
  CreateGridInput,
  UpdateGridInput,
  PublicGridsQuery,
  GridContent,
} from '@jazz/shared';
import { parseGrid, serializeGrid } from '@jazz/music-core';
import { harmonyGrids, gridLikes, users } from '../db/schema.js';
import type { HarmonyGridRecord } from '../db/schema.js';
import type { DrizzleDb } from '../db/index.js';

// ── DTO mapping ────────────────────────────────────────────────────────────

function barsCount(content: GridContent): number {
  return content.bars.length;
}

function parseContent(raw: string): GridContent {
  return JSON.parse(raw) as GridContent;
}

function toSummaryDTO(g: HarmonyGridRecord): HarmonyGridSummaryDTO {
  const content = parseContent(g.content);
  return {
    id: g.id,
    name: g.name,
    timeSignature: g.timeSignature as HarmonyGridSummaryDTO['timeSignature'],
    key: g.key as HarmonyGridSummaryDTO['key'],
    barsCount: barsCount(content),
    visibility: g.visibility as HarmonyGridSummaryDTO['visibility'],
    updatedAt: g.updatedAt,
  };
}

function toDTO(g: HarmonyGridRecord): HarmonyGridDTO {
  return {
    ...toSummaryDTO(g),
    content: parseContent(g.content),
    sourceGridId: g.sourceGridId ?? null,
    createdAt: g.createdAt,
  };
}

function toPublicSummaryDTO(
  g: HarmonyGridRecord,
  likedByMe: boolean,
): PublicGridSummaryDTO {
  const content = parseContent(g.content);
  return {
    id: g.id,
    name: g.name,
    timeSignature: g.timeSignature as PublicGridSummaryDTO['timeSignature'],
    key: g.key as PublicGridSummaryDTO['key'],
    barsCount: barsCount(content),
    likeCount: g.likeCount,
    likedByMe,
    updatedAt: g.updatedAt,
  };
}

function toPublicDTO(
  g: HarmonyGridRecord,
  ownerName: string,
  likedByMe: boolean,
): PublicGridDTO {
  return {
    ...toPublicSummaryDTO(g, likedByMe),
    content: parseContent(g.content),
    owner: { name: ownerName },
  };
}

// ── Empty default content ─────────────────────────────────────────────────

function emptyContent(): GridContent {
  return { version: 1, bars: [] };
}

// ── User's own grids (CRUD) ────────────────────────────────────────────────

export function getUserGrids(db: DrizzleDb, userId: string): HarmonyGridSummaryDTO[] {
  const rows = db
    .select()
    .from(harmonyGrids)
    .where(eq(harmonyGrids.userId, userId))
    .orderBy(desc(harmonyGrids.updatedAt))
    .all();
  return rows.map(toSummaryDTO);
}

export function getOwnGrid(
  db: DrizzleDb,
  userId: string,
  gridId: string,
): HarmonyGridDTO | null {
  const row = db
    .select()
    .from(harmonyGrids)
    .where(and(eq(harmonyGrids.id, gridId), eq(harmonyGrids.userId, userId)))
    .get();
  return row ? toDTO(row) : null;
}

export function createGrid(
  db: DrizzleDb,
  userId: string,
  input: CreateGridInput,
): HarmonyGridDTO {
  const now = Date.now();
  const id = crypto.randomUUID();
  const content = input.content ?? emptyContent();
  const row = {
    id,
    userId,
    name: input.name,
    timeSignature: input.timeSignature ?? '4/4',
    key: input.key ?? 'C',
    visibility: 'private' as const,
    content: JSON.stringify(content),
    sourceGridId: null,
    likeCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(harmonyGrids).values(row).run();
  return toDTO(row);
}

export function updateGrid(
  db: DrizzleDb,
  userId: string,
  gridId: string,
  input: UpdateGridInput,
): HarmonyGridDTO | null {
  const existing = db
    .select()
    .from(harmonyGrids)
    .where(and(eq(harmonyGrids.id, gridId), eq(harmonyGrids.userId, userId)))
    .get();
  if (!existing) return null;

  const now = Date.now();
  const patch: Partial<typeof existing> = { updatedAt: now };
  if (input.name !== undefined) patch.name = input.name;
  if (input.timeSignature !== undefined) patch.timeSignature = input.timeSignature;
  if (input.key !== undefined) patch.key = input.key;
  if (input.visibility !== undefined) patch.visibility = input.visibility;
  if (input.content !== undefined) patch.content = JSON.stringify(input.content);

  db.update(harmonyGrids).set(patch).where(eq(harmonyGrids.id, gridId)).run();
  return toDTO({ ...existing, ...patch } as HarmonyGridRecord);
}

export function deleteGrid(db: DrizzleDb, userId: string, gridId: string): boolean {
  const existing = db
    .select()
    .from(harmonyGrids)
    .where(and(eq(harmonyGrids.id, gridId), eq(harmonyGrids.userId, userId)))
    .get();
  if (!existing) return false;
  db.delete(harmonyGrids).where(eq(harmonyGrids.id, gridId)).run();
  return true;
}

// ── Copy ──────────────────────────────────────────────────────────────────

export function copyGrid(
  db: DrizzleDb,
  userId: string,
  sourceId: string,
  newName?: string,
): HarmonyGridDTO | null {
  // source can be own private OR any public grid
  const source = db
    .select()
    .from(harmonyGrids)
    .where(
      and(
        eq(harmonyGrids.id, sourceId),
        sql`(${harmonyGrids.userId} = ${userId} OR ${harmonyGrids.visibility} = 'public')`,
      ),
    )
    .get();
  if (!source) return null;

  const now = Date.now();
  const id = crypto.randomUUID();
  const row = {
    id,
    userId,
    name: newName ?? `${source.name} (copy)`,
    timeSignature: source.timeSignature,
    key: source.key,
    visibility: 'private' as const,
    content: source.content,
    sourceGridId: sourceId,
    likeCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(harmonyGrids).values(row).run();
  return toDTO(row);
}

// ── DSL import / export ───────────────────────────────────────────────────

export interface ImportGridInput {
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
  | { ok: true; grid: HarmonyGridDTO }
  | { ok: false; errors: ImportError[] };

export function importGrid(
  db: DrizzleDb,
  userId: string,
  input: ImportGridInput,
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
  const grid = createGrid(db, userId, {
    name: input.name,
    timeSignature: (input.timeSignature as HarmonyGridSummaryDTO['timeSignature']) ?? '4/4',
    key: (input.key as HarmonyGridSummaryDTO['key']) ?? 'C',
    content: result.value,
  });
  return { ok: true, grid };
}

export function exportGridDsl(
  db: DrizzleDb,
  userId: string,
  gridId: string,
): string | null {
  const row = db
    .select()
    .from(harmonyGrids)
    .where(and(eq(harmonyGrids.id, gridId), eq(harmonyGrids.userId, userId)))
    .get();
  if (!row) return null;
  const content = parseContent(row.content);
  return serializeGrid(content);
}

// ── Public catalog ─────────────────────────────────────────────────────────

export function getPublicGrids(
  db: DrizzleDb,
  query: PublicGridsQuery,
  currentUserId?: string,
): PublicGridSummaryDTO[] {
  const { q, sort, limit = 20, offset = 0 } = query;

  const rows = db
    .select()
    .from(harmonyGrids)
    .where(
      q
        ? and(eq(harmonyGrids.visibility, 'public'), like(harmonyGrids.name, `%${q}%`))
        : eq(harmonyGrids.visibility, 'public'),
    )
    .orderBy(
      sort === 'likes'
        ? desc(harmonyGrids.likeCount)
        : sort === 'name'
          ? asc(harmonyGrids.name)
          : desc(harmonyGrids.updatedAt),
    )
    .limit(limit)
    .offset(offset)
    .all();

  if (!currentUserId) {
    return rows.map((g) => toPublicSummaryDTO(g, false));
  }

  const likedSet = new Set(
    db
      .select({ gridId: gridLikes.gridId })
      .from(gridLikes)
      .where(eq(gridLikes.userId, currentUserId))
      .all()
      .map((r) => r.gridId),
  );

  return rows.map((g) => toPublicSummaryDTO(g, likedSet.has(g.id)));
}

export function getPublicGridById(
  db: DrizzleDb,
  gridId: string,
  currentUserId?: string,
): PublicGridDTO | null {
  const row = db
    .select()
    .from(harmonyGrids)
    .where(and(eq(harmonyGrids.id, gridId), eq(harmonyGrids.visibility, 'public')))
    .get();
  if (!row) return null;

  const owner = db.select({ name: users.name }).from(users).where(eq(users.id, row.userId)).get();
  const ownerName = owner?.name ?? 'Unknown';

  let likedByMe = false;
  if (currentUserId) {
    const like = db
      .select()
      .from(gridLikes)
      .where(and(eq(gridLikes.gridId, gridId), eq(gridLikes.userId, currentUserId)))
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

export function likeGrid(
  db: DrizzleDb,
  userId: string,
  gridId: string,
): LikeResult | null {
  const grid = db
    .select()
    .from(harmonyGrids)
    .where(and(eq(harmonyGrids.id, gridId), eq(harmonyGrids.visibility, 'public')))
    .get();
  if (!grid) return null;

  const existing = db
    .select()
    .from(gridLikes)
    .where(and(eq(gridLikes.gridId, gridId), eq(gridLikes.userId, userId)))
    .get();

  if (!existing) {
    db.insert(gridLikes).values({ gridId, userId, createdAt: Date.now() }).run();
    const newCount = grid.likeCount + 1;
    db.update(harmonyGrids).set({ likeCount: newCount }).where(eq(harmonyGrids.id, gridId)).run();
    return { likeCount: newCount, likedByMe: true };
  }

  return { likeCount: grid.likeCount, likedByMe: true };
}

export function unlikeGrid(
  db: DrizzleDb,
  userId: string,
  gridId: string,
): LikeResult | null {
  const grid = db
    .select()
    .from(harmonyGrids)
    .where(and(eq(harmonyGrids.id, gridId), eq(harmonyGrids.visibility, 'public')))
    .get();
  if (!grid) return null;

  const existing = db
    .select()
    .from(gridLikes)
    .where(and(eq(gridLikes.gridId, gridId), eq(gridLikes.userId, userId)))
    .get();

  if (existing) {
    db.delete(gridLikes).where(and(eq(gridLikes.gridId, gridId), eq(gridLikes.userId, userId))).run();
    const newCount = Math.max(0, grid.likeCount - 1);
    db.update(harmonyGrids).set({ likeCount: newCount }).where(eq(harmonyGrids.id, gridId)).run();
    return { likeCount: newCount, likedByMe: false };
  }

  return { likeCount: grid.likeCount, likedByMe: false };
}
