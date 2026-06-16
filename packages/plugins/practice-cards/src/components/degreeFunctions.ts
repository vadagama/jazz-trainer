import {
  keyToPitchClass,
  parseDegreeGrid,
  spellPitchClass,
  scaleLabel,
  PATTERNS,
} from '@jazz/music-core';
import type { DegreeStep, PatternDef, PatternStep } from '@jazz/music-core';
import type { Key } from '@jazz/shared';

import type { ExerciseConfig } from '../generators/types.js';

/** Римские обозначения всех 12 ступеней (бемольные для хроматических). */
export const ROMAN_BY_DEGREE: Record<number, string> = {
  0: 'I',
  1: '♭II',
  2: 'II',
  3: '♭III',
  4: 'III',
  5: 'IV',
  6: '♭V',
  7: 'V',
  8: '♭VI',
  9: 'VI',
  10: '♭VII',
  11: 'VII',
};

/** Красиво показать ступень: ведущий b/# → ♭/♯ (внутренние альтерации качества не трогаем). */
export function prettyDegree(symbol: string): string {
  return symbol.replace(/^b/, '♭').replace(/^#/, '♯');
}

/** Раскрыть ступень в конкретный аккорд для тональности. */
export function expandDegree(step: DegreeStep, key: Key): string {
  const pc = (keyToPitchClass(key) + step.degree) % 12;
  return spellPitchClass(pc, key) + step.quality;
}

/** Сжатая римская подпись функции: ступень + короткое качество. */
export function degreeLabel(degree: number, quality: string): string {
  const roman = ROMAN_BY_DEGREE[((degree % 12) + 12) % 12] ?? degree.toString();
  const shortQuality = quality
    .replace('maj7', 'Maj')
    .replace('m7b5', 'ø')
    .replace('m7', 'm')
    .replace('7b9', '7♭9');
  return `${roman}${shortQuality}`;
}

/**
 * Последовательность ступеней паттерна для превью.
 * - Фиксированные паттерны → их `steps`.
 * - Генерируемые (`build`) → результат при `defaultBars`.
 * - Случайные (результат зависит от seed) → `'random'`: точную последовательность показать нельзя.
 */
export function patternSequence(def: PatternDef): PatternStep[] | 'random' | null {
  if (def.steps && def.steps.length) return def.steps;
  if (!def.build) return null;
  const bars = def.defaultBars;
  const a = def.build({ bars, random: () => 0 });
  const b = def.build({ bars, random: () => 0.999 });
  const isRandom = a.some((s, i) => s.degree !== b[i]?.degree || s.quality !== b[i]?.quality);
  return isRandom ? 'random' : a;
}

// ---------------------------------------------------------------------------
// Превью функций для компактного отображения (бесконечный / рандом-режим)
// ---------------------------------------------------------------------------

/** Символ направления: up → ↑, down → ↓, both → ↕. */
export function directionSymbol(direction: string): string {
  switch (direction) {
    case 'up':
      return '↑';
    case 'down':
      return '↓';
    case 'both':
      return '↕';
    default:
      return direction;
  }
}

/**
 * Компактное описание того, что будет играть, без раскрытия в полный буфер тактов.
 * Используется на превью, когда сетка тактов бессмысленна (бесконечный буфер или
 * перемешанный рандом-порядок).
 */
export type FunctionPreview =
  /** Набор выбранных функций (источник «Отдельно» / unified). */
  | { kind: 'chord-set'; labels: string[] }
  /** Зафиксированная последовательность функций (паттерн / DSL). */
  | { kind: 'chord-sequence'; labels: string[] }
  /** Случайный паттерн — точную последовательность показать нельзя. */
  | { kind: 'chord-random' }
  /** Гаммы «Отдельно»: названия гамм с направлением. */
  | { kind: 'scale-standalone'; scaleLabels: string[]; direction: string }
  /** Гаммы поверх прогрессии: ступени + гамма с направлением. */
  | { kind: 'scale-over-chords'; chordLabels: string[]; scaleLabel: string; direction: string }
  /** Нечего показать (пустой выбор / неподдержанный источник). */
  | { kind: 'empty' };

/** Построить компактное превью функций по конфигурации упражнения. */
export function buildFunctionPreview(config: ExerciseConfig): FunctionPreview {
  // ── Scales: all source types show direction ───────────────────────────
  if (config.type === 'scales') {
    const dirSymbol = directionSymbol(config.direction ?? 'both');
    const source = config.source;
    const scaleName = scaleLabel(config.keys?.[0] ?? 'C', config.scaleType);

    if (source.type === 'unified') {
      const labels = (config.keys ?? []).map(
        (key) => `${scaleLabel(key, config.scaleType)} ${dirSymbol}`,
      );
      return labels.length
        ? { kind: 'scale-standalone', scaleLabels: labels, direction: dirSymbol }
        : { kind: 'empty' };
    }

    // Pattern / DSL: show chord progression + scale with direction
    let chordLabels: string[] = [];

    if (source.type === 'pattern') {
      const def = PATTERNS.find((p) => p.id === source.patternId);
      if (def) {
        const seq = patternSequence(def);
        if (seq === 'random') {
          return {
            kind: 'scale-over-chords',
            chordLabels: ['произв.'],
            scaleLabel: `${scaleName} ${dirSymbol}`,
            direction: dirSymbol,
          };
        }
        if (seq) {
          chordLabels = seq.map((s) => degreeLabel(s.degree, s.quality));
        }
      }
    } else if (source.type === 'dsl') {
      const result = parseDegreeGrid(source.dsl);
      if (result.ok && result.value) {
        chordLabels = result.value.bars.flatMap((bar) =>
          bar.slots.map((s) => prettyDegree(s.symbol)),
        );
      }
    }

    if (chordLabels.length > 0) {
      return {
        kind: 'scale-over-chords',
        chordLabels,
        scaleLabel: `${scaleName} ${dirSymbol}`,
        direction: dirSymbol,
      };
    }

    return { kind: 'empty' };
  }

  // ── Chords ────────────────────────────────────────────────────────────
  const source = config.source;
  if (!source) return { kind: 'empty' };

  switch (source.type) {
    case 'unified': {
      const labels = source.symbols.map(prettyDegree);
      return labels.length ? { kind: 'chord-set', labels } : { kind: 'empty' };
    }
    case 'pattern': {
      const def = PATTERNS.find((p) => p.id === source.patternId);
      if (!def) return { kind: 'empty' };
      const seq = patternSequence(def);
      if (seq === 'random') return { kind: 'chord-random' };
      if (!seq) return { kind: 'empty' };
      return { kind: 'chord-sequence', labels: seq.map((s) => degreeLabel(s.degree, s.quality)) };
    }
    case 'dsl': {
      const result = parseDegreeGrid(source.dsl);
      if (!result.ok || !result.value) return { kind: 'empty' };
      const labels = result.value.bars.flatMap((bar) =>
        bar.slots.map((s) => prettyDegree(s.symbol)),
      );
      return labels.length ? { kind: 'chord-sequence', labels } : { kind: 'empty' };
    }
    case 'random':
      return { kind: 'chord-random' };
  }
}
