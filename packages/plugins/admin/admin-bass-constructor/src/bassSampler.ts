/**
 * Bass sampler URL builders + articulation labels (bass-специфичные).
 *
 * Аналог pianoSampler.ts. Бас имеет 4 артикуляции звукоизвлечения:
 *  - `regular` → обычные ноты (Sneakybass `pluck` / darkblack `reg`)
 *  - `muted`   → приглушённые (Sneakybass `mute` / darkblack `ghost`)
 *  - `rel`     → супер-короткие акценты (electric-only: darkblack `rel`)
 *  - `stac`    → резкое стаккато (electric-only: darkblack `stac`)
 *
 * Какую ступень играть, решает движок (BassStepEngine), а не молекула —
 * поэтому строки сетки конструктора = артикуляции (4), а не step×articulation.
 *
 * Для каждого варианта × артикуляции строится отдельный Tone.Sampler (свой
 * набор нот-якорей). Имена файлов/якорей берутся из music-core.
 */
import {
  buildBassPluckUrls,
  buildBassMuteUrls,
  buildBassRegUrls,
  buildBassArticUrls,
  type BassVariant,
} from '@jazz/music-core';
import type { BassArticulation } from '@jazz/music-core';

/** Базовый URL для encoded bass sample store (aac primary). */
export const BASS_SAMPLER_BASE_URL = '/samples/aac/bass/';

/**
 * Артикуляции по варианту. Upright = {regular, muted} (← pluck ∪ reg, mute ∪ ghost).
 * Electric добавляет rel и stac (electric-only сэмплы).
 */
export const UPRIGHT_ARTICULATIONS: readonly BassArticulation[] = ['regular', 'muted'];
export const ELECTRIC_ARTICULATIONS: readonly BassArticulation[] = ['regular', 'muted', 'rel', 'stac'];

/** Все 4 артикуляции (для preview, который грузит все сэмплеры). */
export const ALL_BASS_ARTICULATIONS: readonly BassArticulation[] = ['regular', 'muted', 'rel', 'stac'];

/** Список артикуляций для варианта. */
export function articulationsForVariant(variant: BassVariant): readonly BassArticulation[] {
  return variant === 'upright' ? UPRIGHT_ARTICULATIONS : ELECTRIC_ARTICULATIONS;
}

// ─── Articulation labels ─────────────────────────────────────────────────────

/** Русские метки артикуляций (виды звукоизвлечения). */
const ARTICULATION_LABELS: Record<BassArticulation, string> = {
  regular: 'Обычные',
  muted: 'Приглуш.',
  rel: 'REL',
  stac: 'Стаккато',
};

/** Русские описания артикуляций для тултипов. */
const ARTICULATION_DESCRIPTIONS: Record<BassArticulation, string> = {
  regular: 'Обычные ноты — полный тон (walking quarters, фундамент)',
  muted: 'Приглушённые/ghost — демфированные синкопы и подходы',
  rel: 'Супер-короткие release-хвосты для быстрых акцентов (electric)',
  stac: 'Резкое стаккато для offbeat/montuno ударов (electric)',
};

/** Короткая метка артикуляции (помещается в колонку строк). */
export function articulationLabel(artic: string): string {
  return ARTICULATION_LABELS[artic as BassArticulation] ?? artic;
}

/** Полное описание артикуляции для тултипа. */
export function articulationDescription(artic: string): string {
  return ARTICULATION_DESCRIPTIONS[artic as BassArticulation] ?? artic;
}

// ─── MIDI helpers ────────────────────────────────────────────────────────────

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToName(midi: number): string {
  const pc = ((midi % 12) + 12) % 12;
  return `${NOTE_NAMES[pc]}${Math.floor(midi / 12) - 1}`;
}

export function nameToMidi(name: string): number {
  const m = /^([A-G])(#?)(\d+)$/.exec(name);
  if (!m) return -1;
  const semitones: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const base = semitones[m[1]!]! + (m[2] === '#' ? 1 : 0);
  return (parseInt(m[3]!, 10) + 1) * 12 + base;
}

// ─── Sampler URL builders per variant × articulation ─────────────────────────
//
// Каждый builder возвращает { [anchorNote]: relativePath } для Tone.Sampler.
// Anchor-ноты и форматы имён берутся из music-core, чтобы не было расхождений
// с реальным движком. Round-robin фиксирован на rr1 (preview не нуждается в RR).

/** Upright: regular → pluck-якоря, muted → mute-якоря (Sneakybass). */
function buildUprightSamplerUrls(artic: 'regular' | 'muted'): Record<string, string> {
  return artic === 'regular' ? buildBassPluckUrls(1) : buildBassMuteUrls(1);
}

/** Electric: regular → reg, muted → ghost, rel → rel, stac → stac (darkblack). */
function buildElectricSamplerUrls(artic: BassArticulation): Record<string, string> {
  switch (artic) {
    case 'regular':
      return buildBassRegUrls(1);
    case 'muted':
      return buildBassArticUrls('ghost', 1);
    case 'rel':
      return buildBassArticUrls('rel', 1);
    case 'stac':
      return buildBassArticUrls('stac', 1);
    default:
      return buildBassRegUrls(1);
  }
}

/** Универсальный builder: вариант + артикуляция → NoteMap. */
export function buildBassSamplerUrls(
  variant: BassVariant,
  artic: BassArticulation,
): Record<string, string> {
  if (variant === 'upright') {
    if (artic === 'regular' || artic === 'muted') return buildUprightSamplerUrls(artic);
    // electric-only артикуляции на upright — fallback на regular.
    return buildUprightSamplerUrls('regular');
  }
  return buildElectricSamplerUrls(artic);
}

/**
 * Карта URL-builders по варианту: `{ [variant]: { [artic]: () => NoteMap } }`.
 * Используется useBassPreview для создания одного Tone.Sampler на артикуляцию.
 */
export const SAMPLER_URL_BUILDERS: Record<
  BassVariant,
  Record<BassArticulation, () => Record<string, string>>
> = {
  upright: {
    regular: () => buildBassSamplerUrls('upright', 'regular'),
    muted: () => buildBassSamplerUrls('upright', 'muted'),
    // fallback на upright-сэмплы — electric-артикуляций на upright нет
    rel: () => buildBassSamplerUrls('upright', 'regular'),
    stac: () => buildBassSamplerUrls('upright', 'muted'),
  },
  electric: {
    regular: () => buildBassSamplerUrls('electric', 'regular'),
    muted: () => buildBassSamplerUrls('electric', 'muted'),
    rel: () => buildBassSamplerUrls('electric', 'rel'),
    stac: () => buildBassSamplerUrls('electric', 'stac'),
  },
};
