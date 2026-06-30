import type { LectureDefinition } from '@jazz/plugin-sdk';

export const lecture: LectureDefinition = {
  meta: {
    id: 'theory.voicings',
    title: 'Аккордовые голосоведения',
    topic: 'voicings',
    level: 3,
    duration: 15,
    prerequisites: ['theory.chord-tones', 'theory.chords'],
    bonusPoints: 75,
    tags: ['голосоведение', 'аккорды', 'продвинутый'],
  },
  sections: [],
};
