import type { LectureDefinition } from '@jazz/plugin-sdk';

export const lecture: LectureDefinition = {
  meta: {
    id: 'theory.turnarounds',
    title: 'Обороты',
    topic: 'turnarounds',
    level: 3,
    duration: 20,
    prerequisites: ['theory.ii-v-i'],
    bonusPoints: 100,
    tags: ['гармония', 'форма', 'импровизация'],
  },
  sections: [
    {
      id: 'context',
      title: 'Контекст',
      blocks: [
        {
          type: 'text',
          content:
            '**Обороты (turnarounds)** — это гармонические последовательности, которые возвращают вас к началу формы. Они используются в конце секции (чаще всего A), чтобы создать плавный переход к повторению.\n\nСамый распространённый оборот — **I–VI–II–V**:\n- В C мажоре: Cmaj7 → Am7 → Dm7 → G7\n\nВариация: **iii–VI–II–V**:\n- В C мажоре: Em7 → Am7 → Dm7 → G7',
        },
        {
          type: 'callout',
          kind: 'info',
          content:
            '**Где встречается:** Вступление к "I Got Rhythm", "Blue Moon", "Heart and Soul" — все используют I–VI–II–V.',
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
            '## Виды оборотов\n\n### 1. I–VI–II–V (классический)\nСамый распространённый. VI ступень — это относительный минор, он добавляет минорный оттенок перед каденцией.\n\n### 2. iii–VI–II–V (с заменой)\niii заменяет I (у них два общих тона: E и G в C мажоре). Это делает начало оборота более минорным.\n\n### 3. I–♭III–II–♭II–I (хроматический)\nНисходящее хроматическое движение: C → E♭ → D → D♭ → C. Часто используется в блюзе и ритм-н-блюзе.\n\n### Turnaround vs. Cadence\n- **Каденция** (ii–V–I) — окончание, точка покоя\n- **Оборот** (I–VI–II–V) — возвращение, подготовка к повторению',
        },
        {
          type: 'diagram',
          mermaid:
            'graph LR\n    A[Cmaj7 I] --> B[Am7 VI]\n    B --> C[Dm7 II]\n    C --> D[G7 V]\n    D --> A\n    style A fill:#e8f5e9\n    style D fill:#fff3e0',
        },
        {
          type: 'keyboard',
          highlight: ['C4', 'E4', 'G4', 'B4'],
          label: 'I: Cmaj7',
        },
        {
          type: 'keyboard',
          highlight: ['A3', 'C4', 'E4', 'G4'],
          label: 'VI: Am7',
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
            'Прослушайте разницу между I–VI–II–V и iii–VI–II–V. Обратите внимание, как замена первого аккорда меняет настроение.',
        },
        {
          type: 'mini-trainer',
          exercise: {
            type: 'play-progression',
            progression: ['Cmaj7', 'Am7', 'Dm7', 'G7'],
            tempo: 100,
            input: 'keyboard',
          },
        },
        {
          type: 'divider',
        },
        {
          type: 'mini-trainer',
          exercise: {
            type: 'play-progression',
            progression: ['Em7', 'Am7', 'Dm7', 'G7'],
            tempo: 100,
            input: 'keyboard',
          },
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
            'Сыграйте арпеджио для каждого аккорда в обороте I–VI–II–V. Затем попробуйте iii–VI–II–V.',
        },
        {
          type: 'mini-trainer',
          exercise: {
            type: 'play-arpeggio',
            chords: ['Cmaj7', 'Am7', 'Dm7', 'G7'],
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
          content: 'Проверьте, можете ли вы сыграть аккорды оборота в C мажоре.',
        },
        {
          type: 'quiz',
          quiz: {
            type: 'play-the-chord',
            input: 'keyboard',
            questions: [
              { prompt: 'Сыграйте Am7 (VI ступень)', expectedNotes: ['A4', 'C5', 'E5', 'G5'] },
              { prompt: 'Сыграйте Dm7 (II ступень)', expectedNotes: ['D4', 'F4', 'A4', 'C5'] },
              { prompt: 'Сыграйте G7 (V ступень)', expectedNotes: ['G4', 'B4', 'D5', 'F5'] },
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
            '## Что дальше?\n\n- **Tritone Substitution** — замените G7 на D♭7 в обороте\n- **Rhythm Changes** — изучите форму, построенную на I–VI–II–V\n- **Modal Interchange** — заимствуйте аккорды из параллельных ладов для новых красок\n\nОбороты — это клей, который соединяет секции формы. Освоив их, вы сможете свободно ориентироваться в любом стандарте.',
        },
        {
          type: 'callout',
          kind: 'tip',
          content:
            '**Совет:** Попробуйте сыграть оборот в 12 тональностях по квинтовому кругу. Это лучшее упражнение для закрепления.',
        },
      ],
    },
  ],
};
