import type { LectureDefinition } from '@jazz/plugin-sdk';

export const lecture: LectureDefinition = {
  meta: {
    id: 'theory.ii-v-i',
    title: 'ii–V–I прогрессия',
    topic: 'ii-v-i',
    level: 2,
    duration: 20,
    prerequisites: ['theory.chord-tones'],
    bonusPoints: 75,
    tags: ['гармония', 'каденция', 'импровизация'],
  },
  sections: [
    {
      id: 'context',
      title: 'Контекст',
      blocks: [
        {
          type: 'text',
          content:
            '**ii–V–I** — самая важная каденция в джазе. Она встречается в 90% джазовых стандартов и является основой джазовой гармонии.\n\nВ тональности C мажор ii–V–I выглядит так:\n- **ii** = Dm7 (вторая ступень, минорный септаккорд)\n- **V** = G7 (пятая ступень, доминантсептаккорд)\n- **I** = Cmaj7 (первая ступень, мажорный септаккорд)\n\nЭта прогрессия создаёт сильное ощущение движения и разрешения — от напряжения (V7) к покою (I).',
        },
        {
          type: 'callout',
          kind: 'info',
          content:
            '**Почему это важно:** Если вы понимаете ii–V–I, вы понимаете 90% джазового языка. Все substitutions и вариации строятся на этой основе.',
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
            '## Строение ii–V–I\n\nКаждый аккорд выполняет свою функцию:\n\n- **ii (субдоминанта)** — подготавливает движение, создаёт ожидание\n- **V (доминанта)** — напряжение, которое требует разрешения\n- **I (тоника)** — разрешение, точка покоя\n\n### Голосоведение в ii–V–I\n\nПри плавном голосоведении ноты движутся минимальными шагами:\n- Септима ii переходит в терцию V\n- Терция ii переходит в септиму V\n- Септима V разрешается в терцию I\n\n```\nDm7 → G7 → Cmaj7\nC  → B  → B   (септима→терция→септима)\nF  → F  → E   (терция→септима→терция)\n```',
        },
        {
          type: 'keyboard',
          highlight: ['D4', 'F4', 'A4', 'C5'],
          label: 'ii: Dm7 (D-F-A-C)',
        },
        {
          type: 'divider',
        },
        {
          type: 'keyboard',
          highlight: ['G3', 'B3', 'D4', 'F4'],
          label: 'V: G7 (G-B-D-F)',
        },
        {
          type: 'divider',
        },
        {
          type: 'keyboard',
          highlight: ['C4', 'E4', 'G4', 'B4'],
          label: 'I: Cmaj7 (C-E-G-B)',
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
            'Прослушайте, как звучит ii–V–I. Обратите внимание на голосоведение — как одни ноты плавно переходят в другие.\n\nПопробуйте пропеть басовую линию: D → G → C.',
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
      ],
    },
    {
      id: 'practice',
      title: 'Практика',
      blocks: [
        {
          type: 'text',
          content:
            'Сыграйте ii–V–I в C мажоре. Начните с отдельных аккордов, затем играйте арпеджио каждого аккорда.',
        },
        {
          type: 'mini-trainer',
          exercise: {
            type: 'play-arpeggio',
            chords: ['Dm7', 'G7', 'Cmaj7'],
            input: 'keyboard',
            feedback: 'note-by-note',
          },
        },
        {
          type: 'divider',
        },
        {
          type: 'text',
          content:
            '### ii–V–I во всех 12 тональностях\n\nПосле того как освоили C мажор, попробуйте другие тональности:',
        },
        {
          type: 'mini-trainer',
          exercise: {
            type: 'play-progression',
            progression: ['Em7', 'A7', 'Dmaj7'],
            tempo: 80,
            input: 'keyboard',
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
          content: 'Проверьте понимание ii–V–I — определите аккорды на слух и сыграйте их.',
        },
        {
          type: 'quiz',
          quiz: {
            type: 'play-the-chord',
            input: 'keyboard',
            questions: [
              { prompt: 'Сыграйте Dm7', expectedNotes: ['D4', 'F4', 'A4', 'C5'] },
              { prompt: 'Сыграйте G7', expectedNotes: ['G4', 'B4', 'D5', 'F5'] },
              { prompt: 'Сыграйте Cmaj7', expectedNotes: ['C4', 'E4', 'G4', 'B4'] },
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
            '## Что дальше?\n\n- **Voice Leading** — углубитесь в голосоведение ii–V–I\n- **Turnarounds** — изучите I–VI–II–V и другие обороты\n- **Tritone Substitution** — узнайте, как заменить G7 на D♭7\n\nПрактикуйте ii–V–I во всех тональностях. Это ваш главный инструмент в джазовой импровизации.',
        },
        {
          type: 'callout',
          kind: 'tip',
          content:
            '**Совет:** Играйте ii–V–I с аккомпанементом (bass + drums). Это развивает чувство формы и времени.',
        },
      ],
    },
  ],
};
