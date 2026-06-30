import { eq, and } from 'drizzle-orm';
import type { LectureSummaryDTO, LectureQuery, LikeResponse } from '@jazz/shared';
import { LECTURES } from '@jazz/shared';
import { lectureLikes } from '../db/schema.js';
import type { DrizzleDb } from '../db/index.js';

// ── Static lecture data ─────────────────────────────────────────────────────

function staticLecture(id: string) {
  return LECTURES.find((l) => l.id === id) ?? null;
}

// ── Public listing ──────────────────────────────────────────────────────────

export function getLectures(
  db: DrizzleDb,
  query: LectureQuery,
  currentUserId?: string,
): LectureSummaryDTO[] {
  const { q, sort = 'published', type } = query;

  let items = [...LECTURES];

  // search
  if (q) {
    const lower = q.toLowerCase();
    items = items.filter(
      (l) =>
        l.title.toLowerCase().includes(lower) ||
        l.tags.some((t) => t.toLowerCase().includes(lower)) ||
        l.topic.toLowerCase().includes(lower),
    );
  }

  // filter by type (topic)
  if (type) {
    items = items.filter((l) => l.topic === type);
  }

  // sort
  if (sort === 'duration') {
    items.sort((a, b) => a.duration - b.duration);
  } else {
    // default: by publishedAt desc
    items.sort((a, b) => {
      if (sort === 'likes') {
        // we'll sort by likeCount later after we merge likes
        return 0;
      }
      return b.publishedAt - a.publishedAt;
    });
  }

  // attach likes
  let likedSet = new Set<string>();
  if (currentUserId) {
    const rows = db
      .select({ lectureId: lectureLikes.lectureId })
      .from(lectureLikes)
      .where(eq(lectureLikes.userId, currentUserId))
      .all();
    likedSet = new Set(rows.map((r) => r.lectureId));
  }

  // count likes per lecture
  const likeCountMap = new Map<string, number>();
  for (const item of items) {
    const count = db
      .select()
      .from(lectureLikes)
      .where(eq(lectureLikes.lectureId, item.id))
      .all().length;
    likeCountMap.set(item.id, count);
  }

  const result: LectureSummaryDTO[] = items.map((item) => ({
    id: item.id,
    title: item.title,
    topic: item.topic,
    level: item.level,
    duration: item.duration,
    tags: item.tags,
    route: item.route,
    imageUrl: item.imageUrl,
    publishedAt: item.publishedAt,
    likeCount: likeCountMap.get(item.id) ?? 0,
    likedByMe: likedSet.has(item.id),
  }));

  // sort by likes if requested (after merging counts)
  if (sort === 'likes') {
    result.sort((a, b) => b.likeCount - a.likeCount);
  }

  return result;
}

// ── Likes ──────────────────────────────────────────────────────────────────

export function likeLecture(db: DrizzleDb, userId: string, lectureId: string): LikeResponse | null {
  if (!staticLecture(lectureId)) return null;

  const existing = db
    .select()
    .from(lectureLikes)
    .where(and(eq(lectureLikes.lectureId, lectureId), eq(lectureLikes.userId, userId)))
    .get();

  if (!existing) {
    db.insert(lectureLikes).values({ lectureId, userId, createdAt: Date.now() }).run();
  }

  const count = db
    .select()
    .from(lectureLikes)
    .where(eq(lectureLikes.lectureId, lectureId))
    .all().length;

  return { likeCount: count, likedByMe: true };
}

export function unlikeLecture(
  db: DrizzleDb,
  userId: string,
  lectureId: string,
): LikeResponse | null {
  if (!staticLecture(lectureId)) return null;

  const existing = db
    .select()
    .from(lectureLikes)
    .where(and(eq(lectureLikes.lectureId, lectureId), eq(lectureLikes.userId, userId)))
    .get();

  if (existing) {
    db.delete(lectureLikes)
      .where(and(eq(lectureLikes.lectureId, lectureId), eq(lectureLikes.userId, userId)))
      .run();
  }

  const count = db
    .select()
    .from(lectureLikes)
    .where(eq(lectureLikes.lectureId, lectureId))
    .all().length;

  return { likeCount: count, likedByMe: false };
}
