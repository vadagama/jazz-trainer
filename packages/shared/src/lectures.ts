import { z } from 'zod';

/**
 * Static lecture registry — metadata for all theory lectures.
 * Each theory-* plugin has a lecture.ts with full LectureDefinition;
 * this file centralises the searchable/sortable metadata subset
 * for the theory catalog page.
 */

export const LECTURE_LEVEL_LABELS = {
  1: 'Начинающий',
  2: 'Средний',
  3: 'Продвинутый',
  4: 'Эксперт',
  5: 'Мастер',
} as const;

export type LectureLevel = keyof typeof LECTURE_LEVEL_LABELS;

export interface LectureMetaStatic {
  id: string;
  title: string;
  topic: string;
  level: LectureLevel;
  duration: number;
  tags: string[];
  route: string;
  imageUrl: string;
  publishedAt: number;
}

export const LECTURES: LectureMetaStatic[] = [
  {
    id: 'theory.chord-tones',
    title: 'Аккордовые звуки',
    topic: 'chord-tones',
    level: 1,
    duration: 15,
    tags: ['начинающий', 'гармония', 'импровизация'],
    route: '/theory/chord-tones',
    imageUrl: '',
    publishedAt: 1711929600000,
  },
  {
    id: 'theory.rhythm',
    title: 'Ритм в джазе',
    topic: 'rhythm',
    level: 1,
    duration: 15,
    tags: ['начинающий', 'ритм'],
    route: '/theory/rhythm',
    imageUrl: '',
    publishedAt: 1712016000000,
  },
  {
    id: 'theory.ii-v-i',
    title: 'ii–V–I прогрессия',
    topic: 'ii-v-i',
    level: 2,
    duration: 20,
    tags: ['гармония', 'каденция', 'импровизация'],
    route: '/theory/ii-v-i',
    imageUrl: '',
    publishedAt: 1712102400000,
  },
  {
    id: 'theory.approach-notes',
    title: 'Подходные ноты',
    topic: 'approach-notes',
    level: 2,
    duration: 20,
    tags: ['средний', 'импровизация'],
    route: '/theory/approach-notes',
    imageUrl: '',
    publishedAt: 1712188800000,
  },
  {
    id: 'theory.arpeggios',
    title: 'Арпеджио',
    topic: 'arpeggios',
    level: 2,
    duration: 20,
    tags: ['средний', 'техника'],
    route: '/theory/arpeggios',
    imageUrl: '',
    publishedAt: 1712275200000,
  },
  {
    id: 'theory.blues',
    title: 'Блюз',
    topic: 'blues',
    level: 2,
    duration: 20,
    tags: ['средний', 'блюз', 'форма'],
    route: '/theory/blues',
    imageUrl: '',
    publishedAt: 1712361600000,
  },
  {
    id: 'theory.groove',
    title: 'Грув',
    topic: 'groove',
    level: 2,
    duration: 20,
    tags: ['средний', 'ритм', 'ансамбль'],
    route: '/theory/groove',
    imageUrl: '',
    publishedAt: 1712448000000,
  },
  {
    id: 'theory.secondary-dominants',
    title: 'Побочные доминанты',
    topic: 'secondary-dominants',
    level: 2,
    duration: 20,
    tags: ['средний', 'гармония', 'доминанты'],
    route: '/theory/secondary-dominants',
    imageUrl: '',
    publishedAt: 1712534400000,
  },
  {
    id: 'theory.modal-interchange',
    title: 'Ладовый обмен',
    topic: 'modal-interchange',
    level: 2,
    duration: 20,
    tags: ['средний', 'гармония', 'лады'],
    route: '/theory/modal-interchange',
    imageUrl: '',
    publishedAt: 1712620800000,
  },
  {
    id: 'theory.scales-jazz',
    title: 'Джазовые гаммы',
    topic: 'scales-jazz',
    level: 3,
    duration: 20,
    tags: ['гаммы', 'импровизация', 'продвинутый'],
    route: '/theory/scales-jazz',
    imageUrl: '',
    publishedAt: 1712707200000,
  },
  {
    id: 'theory.voicings',
    title: 'Аккордовые голосоведения',
    topic: 'voicings',
    level: 3,
    duration: 15,
    tags: ['голосоведение', 'аккорды', 'продвинутый'],
    route: '/theory/voicings',
    imageUrl: '',
    publishedAt: 1712793600000,
  },
  {
    id: 'theory.voice-leading',
    title: 'Голосоведение в ii–V–I',
    topic: 'voice-leading',
    level: 3,
    duration: 20,
    tags: ['голосоведение', 'гармония', 'продвинутый'],
    route: '/theory/voice-leading',
    imageUrl: '',
    publishedAt: 1712880000000,
  },
  {
    id: 'theory.turnarounds',
    title: 'Обороты',
    topic: 'turnarounds',
    level: 3,
    duration: 20,
    tags: ['гармония', 'форма', 'импровизация'],
    route: '/theory/turnarounds',
    imageUrl: '',
    publishedAt: 1712966400000,
  },
  {
    id: 'theory.tritone-sub',
    title: 'Тритоновая замена',
    topic: 'tritone-sub',
    level: 4,
    duration: 20,
    tags: ['гармония', 'продвинутый', 'substitution'],
    route: '/theory/tritone-sub',
    imageUrl: '',
    publishedAt: 1713052800000,
  },
  {
    id: 'theory.diminished-harmony',
    title: 'Уменьшённая гармония',
    topic: 'diminished-harmony',
    level: 4,
    duration: 20,
    tags: ['продвинутый', 'гармония', 'diminished'],
    route: '/theory/diminished-harmony',
    imageUrl: '',
    publishedAt: 1713139200000,
  },
  {
    id: 'theory.blues-advanced',
    title: 'Продвинутый блюз',
    topic: 'blues-advanced',
    level: 4,
    duration: 20,
    tags: ['продвинутый', 'блюз', 'гармония'],
    route: '/theory/blues-advanced',
    imageUrl: '',
    publishedAt: 1713225600000,
  },
  {
    id: 'theory.rhythm-changes',
    title: 'Rhythm Changes',
    topic: 'rhythm-changes',
    level: 4,
    duration: 20,
    tags: ['продвинутый', 'гармония', 'rhythm-changes'],
    route: '/theory/rhythm-changes',
    imageUrl: '',
    publishedAt: 1713312000000,
  },
  {
    id: 'theory.coltrane-changes',
    title: 'Coltrane Changes',
    topic: 'coltrane-changes',
    level: 5,
    duration: 20,
    tags: ['продвинутый', 'гармония', 'coltrane'],
    route: '/theory/coltrane-changes',
    imageUrl: '',
    publishedAt: 1713398400000,
  },
];

// ── DTO schemas ─────────────────────────────────────────────────────────────

export const LectureSummaryDTOSchema = z.object({
  id: z.string(),
  title: z.string(),
  topic: z.string(),
  level: z.number().int().min(1).max(5),
  duration: z.number().int().nonnegative(),
  tags: z.array(z.string()),
  route: z.string(),
  imageUrl: z.string(),
  publishedAt: z.number().int(),
  likeCount: z.number().int().nonnegative(),
  likedByMe: z.boolean(),
});
export type LectureSummaryDTO = z.infer<typeof LectureSummaryDTOSchema>;

export const LectureQuerySchema = z.object({
  q: z.string().optional(),
  sort: z.enum(['published', 'likes', 'duration']).optional(),
  type: z.string().optional(),
});
export type LectureQuery = z.infer<typeof LectureQuerySchema>;
