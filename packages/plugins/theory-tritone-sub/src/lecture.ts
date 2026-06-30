import type { LectureDefinition } from '@jazz/plugin-sdk';

export const lecture: LectureDefinition = {
  meta: {
    id: 'theory.tritone-sub',
    title: 'Тритоновая замена',
    topic: 'tritone-sub',
    level: 4,
    duration: 20,
    prerequisites: ['theory.ii-v-i'],
    bonusPoints: 100,
    tags: ['гармония', 'продвинутый', 'substitution'],
  },
  sections: [
    {
      id: 'context',
      title: 'Контекст',
      blocks: [
        {
          type: 'text',
          content:
            '**Тритоновая замена** (tritone substitution) — один из самых элегантных гармонических приёмов в джазе. Суть: любой доминантсептаккорд можно заменить на доминантсептаккорд, отстоящий на тритон.\n\nВ ii–V–I в C мажоре:\n- Вместо Dm7 → **G7** → Cmaj7\n- Играем Dm7 → **D♭7** → Cmaj7\n\nПочему это работает? У G7 и D♭7 общий тритон: **B–F** (терция и септима).',
        },
        {
          type: 'callout',
          kind: 'info',
          content:
            '**Тритон** — интервал в три тона (6 полутонов). В аккорде G7 тритон образуется между терцией (B) и септимой (F). В D♭7 эти же ноты — септима и терция, только поменявшиеся местами: F = терция D♭7, B = септима D♭7.',
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
            '## Механика тритоновой замены\n\n1. Возьмите доминантсептаккорд (например, G7: G–B–D–F)\n2. Найдите тритон (B–F)\n3. Постройте доминантсептаккорд, в котором те же ноты — терция и септима (D♭7: D♭–F–A♭–B)\n\n### Хроматическое движение баса\n\nТритоновая замена создаёт красивое хроматическое движение в басу:\n- Dm7 (D) → D♭7 (D♭) → Cmaj7 (C)\n- Полутоновый спуск: D → D♭ → C\n\n### Замена в обороте I–VI–II–V\n\n```\nОригинал:  Cmaj7 → Am7 → Dm7 → G7\nЗамена:    Cmaj7 → Am7 → Dm7 → D♭7\n```',
        },
        {
          type: 'keyboard',
          highlight: ['G3', 'B3', 'D4', 'F4'],
          label: 'G7: G-B-D-F (тритон B-F)',
        },
        {
          type: 'keyboard',
          highlight: ['Db3', 'F3', 'Ab3', 'B3'],
          label: 'D♭7: D♭-F-A♭-B (тот же тритон B-F)',
        },
        {
          type: 'diagram',
          mermaid:
            'graph TD\n    subgraph Оригинал\n        A1[Dm7] --> A2[G7]\n        A2 --> A3[Cmaj7]\n    end\n    subgraph Замена\n        B1[Dm7] --> B2[Db7]\n        B2 --> B3[Cmaj7]\n    end\n    A2 -.->|tritone| B2\n    style B2 fill:#fff3e0\n    style A3 fill:#e8f5e9\n    style B3 fill:#e8f5e9',
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
            'Сравните звучание оригинального ii–V–I и с тритоновой заменой. Обратите внимание на хроматическое движение баса и неожиданное, но плавное разрешение.',
        },
        {
          type: 'mini-trainer',
          exercise: {
            type: 'play-progression',
            progression: ['Dm7', 'G7', 'Cmaj7'],
            tempo: 80,
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
            progression: ['Dm7', 'Db7', 'Cmaj7'],
            tempo: 80,
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
            'Потренируйтесь находить тритоновую замену для разных доминант. Правило: отсчитайте 6 полутонов от корня доминанты.',
        },
        {
          type: 'mini-trainer',
          exercise: {
            type: 'play-arpeggio',
            chords: ['Dm7', 'Db7', 'Cmaj7'],
            input: 'keyboard',
            feedback: 'note-by-note',
          },
        },
        {
          type: 'text',
          content:
            '### Тритоновая замена в разных тональностях\n\nНайдите замену для доминанты в этих тональностях:\n- F мажор: Gm7 → C7 → Fmaj7 → замена C7 на ___\n- B♭ мажор: Cm7 → F7 → B♭maj7 → замена F7 на ___',
        },
      ],
    },
    {
      id: 'assessment',
      title: 'Проверка',
      blocks: [
        {
          type: 'text',
          content: 'Проверьте, можете ли вы найти и сыграть тритоновую замену.',
        },
        {
          type: 'quiz',
          quiz: {
            type: 'play-the-chord',
            input: 'keyboard',
            questions: [
              {
                prompt: 'Сыграйте G7 (оригинальная доминанта)',
                expectedNotes: ['G4', 'B4', 'D5', 'F5'],
              },
              {
                prompt: 'Сыграйте D♭7 (тритоновая замена G7)',
                expectedNotes: ['Db4', 'F4', 'Ab4', 'B4'],
              },
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
            '## Что дальше?\n\n- **Secondary Dominants** — применяйте доминанты к любой ступени\n- **Modal Interchange** — заимствуйте аккорды из параллельных ладов\n- **Diminished Harmony** — изучите уменьшённые аккорды как связующие\n\nТритоновая замена — ваш первый шаг в мир гармонических substitutions. Используйте её экономно: одна замена на квадрат звучит эффектно, три — перегруженно.',
        },
        {
          type: 'callout',
          kind: 'tip',
          content:
            '**Совет:** Слушайте записи Билла Эванса — он мастер тритоновых замен. Обратите внимание, как он использует их для перегармонизации стандартов.',
        },
      ],
    },
  ],
};
