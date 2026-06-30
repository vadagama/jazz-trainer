import type { LectureDefinition } from '@jazz/plugin-sdk';

export const lecture: LectureDefinition = {
  meta: {
    id: 'theory.scales-jazz',
    title: 'Джазовые гаммы',
    topic: 'scales-jazz',
    level: 3,
    duration: 20,
    prerequisites: ['theory.chord-tones'],
    bonusPoints: 75,
    tags: ['гаммы', 'импровизация', 'продвинутый'],
  },
  sections: [],
};
