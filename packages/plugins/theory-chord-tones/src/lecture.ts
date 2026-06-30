import type { LectureDefinition } from '@jazz/plugin-sdk';

export const lecture: LectureDefinition = {
  meta: {
    id: 'theory.chord-tones',
    title: 'Аккордовые звуки',
    topic: 'chord-tones',
    level: 1,
    duration: 15,
    prerequisites: [],
    bonusPoints: 50,
    tags: ['начинающий', 'гармония', 'импровизация'],
  },
  sections: [
    {
      id: 'context',
      title: 'Контекст',
      blocks: [
        {
          type: 'text',
          content:
            '**Аккордовые звуки** (chord tones) — это ноты, из которых состоит аккорд. Для мажорного септаккорда Cmaj7 это **C, E, G, B**. Для минорного Dm7 — **D, F, A, C**.\n\nВ джазовой импровизации аккордовые звуки — ваш фундамент. Они всегда звучат «правильно» и дают опору, от которой можно отталкиваться.',
        },
        {
          type: 'callout',
          kind: 'tip',
          content:
            '**Правило 80/20:** 80% времени играйте аккордовые звуки, 20% — проходящие. Начинающие часто делают наоборот.',
        },
      ],
    },
    {
      id: 'theory',
      title: 'Теория',
      blocks: [
        {
          type: 'text',
          content:
            '## Строение септаккорда\n\nСептаккорд состоит из четырёх звуков, расположенных по терциям:\n\n- **Тоника** (1) — основной тон\n- **Терция** (3) — определяет мажор/минор\n- **Квинта** (5) — нейтральный тон\n- **Септима** (7) — характерное напряжение\n\n## Типы септаккордов в джазе\n\n| Тип | Формула | Пример | Звучание |\n|---|---|---|---|\n| maj7 | 1-3-5-7 | Cmaj7 | Светлое, устойчивое |\n| m7 | 1-♭3-5-♭7 | Dm7 | Мягкое, минорное |\n| 7 | 1-3-5-♭7 | G7 | Напряжённое, требует разрешения |\n| m7♭5 | 1-♭3-♭5-♭7 | Bm7♭5 | Неустойчивое, «полууменьшённое» |',
        },
        {
          type: 'keyboard',
          highlight: ['C4', 'E4', 'G4', 'B4'],
          label: 'Cmaj7: C — E — G — B',
        },
      ],
    },
    {
      id: 'sound',
      title: 'Звук',
      blocks: [
        {
          type: 'text',
          content:
            'Прослушайте, как звучат аккордовые звуки. Обратите внимание на характер каждого типа септаккорда.\n\nНажмите ▶ под каждым аккордом — сначала блоком, затем арпеджио, чтобы услышать все ноты по отдельности. При воспроизведении клавиши на клавиатуре и ноты на стане будут подсвечиваться.',
        },
        {
          type: 'chord-audio',
          notes: ['C4', 'E4', 'G4', 'B4'],
          label: 'Cmaj7 — мажорный септаккорд (светлое, устойчивое звучание)',
          mode: 'block',
          showKeyboard: true,
          showStaff: true,
        },
        {
          type: 'chord-audio',
          notes: ['C4', 'E4', 'G4', 'B4'],
          label: 'Cmaj7 — арпеджио',
          mode: 'arpeggio',
          showKeyboard: true,
          showStaff: true,
        },
        {
          type: 'divider',
        },
        {
          type: 'chord-audio',
          notes: ['D4', 'F4', 'A4', 'C5'],
          label: 'Dm7 — минорный септаккорд (мягкое, минорное звучание)',
          mode: 'block',
          showKeyboard: true,
          showStaff: true,
        },
        {
          type: 'chord-audio',
          notes: ['D4', 'F4', 'A4', 'C5'],
          label: 'Dm7 — арпеджио',
          mode: 'arpeggio',
          showKeyboard: true,
          showStaff: true,
        },
        {
          type: 'divider',
        },
        {
          type: 'chord-audio',
          notes: ['G3', 'B3', 'D4', 'F4'],
          label: 'G7 — доминантсептаккорд (напряжённое, требует разрешения)',
          mode: 'block',
          showKeyboard: true,
          showStaff: true,
        },
        {
          type: 'chord-audio',
          notes: ['G3', 'B3', 'D4', 'F4'],
          label: 'G7 — арпеджио',
          mode: 'arpeggio',
          showKeyboard: true,
          showStaff: true,
        },
        {
          type: 'divider',
        },
        {
          type: 'chord-audio',
          notes: ['B3', 'D4', 'F4', 'A4'],
          label: 'Bm7♭5 — полууменьшённый (неустойчивое, «вопросительное» звучание)',
          mode: 'block',
          showKeyboard: true,
          showStaff: true,
        },
        {
          type: 'chord-audio',
          notes: ['B3', 'D4', 'F4', 'A4'],
          label: 'Bm7♭5 — арпеджио',
          mode: 'arpeggio',
          showKeyboard: true,
          showStaff: true,
        },
      ],
    },
    {
      id: 'practice',
      title: 'Практика',
      blocks: [
        {
          type: 'text',
          content:
            'Сыграйте арпеджио для каждого аккорда. Начинайте медленно, добивайтесь чистоты звука.',
        },
        {
          type: 'mini-trainer',
          exercise: {
            type: 'play-arpeggio',
            chords: ['Cmaj7', 'Dm7', 'G7', 'Cmaj7'],
            input: 'keyboard',
            feedback: 'note-by-note',
          },
        },
      ],
    },
    {
      id: 'assessment',
      title: 'Проверка',
      blocks: [
        {
          type: 'text',
          content: 'Проверьте, можете ли вы определить аккордовые звуки на слух и сыграть их.',
        },
        {
          type: 'quiz',
          quiz: {
            type: 'play-the-note',
            input: 'keyboard',
            questions: [
              { prompt: 'Сыграйте терцию аккорда Cmaj7', expectedNote: 'E4' },
              { prompt: 'Сыграйте септиму аккорда Dm7', expectedNote: 'C4' },
              { prompt: 'Сыграйте квинту аккорда G7', expectedNote: 'D4' },
            ],
          },
        },
      ],
    },
    {
      id: 'next',
      title: 'Дальше',
      blocks: [
        {
          type: 'text',
          content:
            '## Что дальше?\n\n- **Approach Notes** — научитесь подходить к аккордовым звукам через хроматизмы\n- **Arpeggios** — расширьте арпеджио на весь диапазон инструмента\n- **II-V-I** — примените аккордовые звуки в главной джазовой каденции\n\nПрактикуйте аккордовые звуки ежедневно по 10 минут — через неделю вы заметите прогресс.',
        },
        {
          type: 'callout',
          kind: 'info',
          content:
            '**Совет:** Играйте аккордовые звуки под минусовку или метроном. Это развивает чувство времени.',
        },
      ],
    },
  ],
};
