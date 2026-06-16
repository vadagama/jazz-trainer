import { KEYS } from '@jazz/shared';
import type { ChordSource, CardMode } from '../../generators/types.js';

/** Тональности без диезов — энгармонически дублируют бемольные (C#=Db, F#=Gb). */
export const FLAT_KEYS = KEYS.filter((k) => !k.includes('#'));

export const CARD_MODES: { value: CardMode; label: string }[] = [
  { value: 'current', label: 'Текущая' },
  { value: 'prev-current', label: 'Предыдущая + текущая' },
  { value: 'prev-current-next', label: 'Предыдущая + текущая + следующая' },
];

export const COUNT_IN_OPTS = [0, 1, 2, 4] as const;

export function sourceToLabel(s: ChordSource['type']): string {
  switch (s) {
    case 'unified':
      return 'Отдельно';
    case 'pattern':
      return 'Паттерн';
    case 'random':
      return 'Произвольная';
    case 'dsl':
      return 'DSL';
  }
}

export const SOURCE_TYPES: ChordSource['type'][] = ['unified', 'pattern', 'dsl'];
