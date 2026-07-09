import type { LectureDefinition } from '@jazz/plugin-sdk';

export const lecture: LectureDefinition = {
  meta: {
    id: 'theory.voice-leading',
    title: 'Голосоведение в ii–V–I',
    topic: 'voice-leading',
    level: 3,
    duration: 20,
    prerequisites: ['theory.chord-tones', 'theory.ii-v-i'],
    bonusPoints: 75,
    tags: ['голосоведение', 'гармония', 'продвинутый'],
  },
  sections: [],
};
