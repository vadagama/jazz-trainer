# MELODIC-PLUGIN.md — Спецификация мелодического инструмента-плагина

> **Цель:** Пошаговое руководство по созданию нового pitched-инструмента для
> аранжировки Jazz Trainer. Покрывает паттерн `Instrument`-класса, манифест,
> сэмплы, плагинную регистрацию и интеграцию со `StyleProfile`.
>
> **Аудитория:** Разработчики и AI-агенты, добавляющие инструмент в аранжировку.
>
> **Статус:** 🟢 Актуально (валидировано на Rhodes, Guitar, Vibraphone, Organ, Clarinet, Upright Piano)

---

## 1. Что такое мелодический инструмент в Jazz Trainer

Мелодический (pitched) инструмент — это `Instrument`, который:
- Получает гармонию из `ChordTimeline` (сетка аккордов)
- Строит **voicing'и** (наборы нот) для каждого аккорда
- Планирует ноты в будущее через `ScheduleContext.scheduleEvent()` — **не играет сам**
- Поддерживает **5 стилей** (swing, bossa, funk, latin, ballad) через `setStyleProfile()`
- Имеет `SampleManifest.layers` (набор нот → имена файлов)

**Ключевое правило:** `Instrument.schedule()` вызывается транспортным движком каждые ~50 мс.
Инструмент **не** должен содержать браузерного кода (Tone.js, Web Audio). Только чистая логика.

### Семейство `pitched`

```ts
family: 'pitched'  // → sdk понимает, что нужен Tone.Sampler (полифонический),
                   //   а не Tone.Players (oneshots). Влияет на UI (voicing-контролы).
```

---

## 2. Глобальные константы: стили и секции

Все инструменты обязаны поддерживать **5 стилей** и работать с **8 типами секций** grid-сетки.

### 2.1. Стили (`Style`)

```ts
// packages/shared/src/constants.ts — канонический источник
export const STYLES = ['swing', 'bossa', 'funk', 'latin', 'ballad'] as const;
export type Style = (typeof STYLES)[number];
```

| Стиль   | Темп  | Swing | Характер                               |
| ------- | ----- | ----- | -------------------------------------- |
| `swing` | 140   | 0.67  | Ride-heavy, walking bass, rootless     |
| `bossa` | 120   | 0.5   | Straight ритм, nylon-гитара, shell2    |
| `funk`  | 100   | 0.5   | Синкопы, electric bass, rootless4      |
| `latin` | 160   | 0.5   | Cascara/clave, montuno-бас, quartal    |
| `ballad`| 60    | 0.58  | Brushes, two-feel, мягкие voicing      |

**Правило:** `perStyleDefaults` в `InstrumentManifest` **обязан** содержать записи для
всех 5 стилей. Даже если инструмент не используется в стиле — запись `{ ...OFF }`
обязательна в `StyleProfile.instrumentDefaults`.

### 2.2. Типы секций (`SectionType`)

```ts
// packages/shared/src/music.ts — канонический источник
export const SECTION_TYPES = [
  'intro',
  'verseA',
  'verseB',
  'verseC',
  'chorus',
  'bridge',
  'solo',
  'ending',
] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

export const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  intro: 'Вступление',
  verseA: 'Куплет A',
  verseB: 'Куплет B',
  verseC: 'Куплет C',
  chorus: 'Припев',
  bridge: 'Бридж',
  solo: 'Соло',
  ending: 'Концовка',
};
```

Для pitched-инструментов с pattern-engine (organism-driven планирование):
`sectionMap` в организме должен покрывать все 8 типов секций — даже если некоторые
ссылаются на универсальную fallback-клетку. Иначе grid-секция неизвестного типа
получит `undefined` в `resolveSectionCells()`.

---

## 3. Контракт `Instrument` (что нужно реализовать)

```ts
// packages/music-core/src/audio/instrument.ts
interface Instrument {
  setTimeline(timeline: ChordTimeline): void;        // гармония
  setStyleProfile(profile: StyleProfile): void;      // стиль + per-instrument defaults
  schedule(window: ScheduleWindow, ctx: ScheduleContext): void;  // главный метод
  dispose(): void;                                    // очистка
}
```

### 3.1. `schedule(window, ctx)` — сердце инструмента

Вызывается каждый цикл планирования (~50 мс). **Не блокирует, не ждёт.**

```
window.fromTicks … window.toTicks  → окно, в которое нужно запланировать события
ctx.timeSignature                   → размер такта (4/4, 3/4, ...)
ctx.bpm                             → темп
ctx.swingRatio                      → 0.5 (ровно) … 0.67 (сильный свинг)
ctx.scheduleEvent(instrId, payload, atTick, velocity, durationTicks)  → запись ноты
```

**Типичный паттерн `schedule()`:**

```ts
schedule(window: ScheduleWindow, ctx: ScheduleContext): void {
  const sig = ctx.timeSignature;
  const tpBar = ticksPerBar(sig);
  const tpBeat = ticksPerBeat(sig);

  // 1. Если перемотка назад — сбросить голосоведение
  if (this.lastScheduledTick >= 0 && window.fromTicks < this.lastScheduledTick - tpBeat) {
    this.prevVoicing = null;
  }

  // 2. Humanization jitter
  const maxJitter = this.humanize ? Math.round(0.006 * (ctx.bpm / 60) * 480) : 0;

  // 3. Цикл по тактам в окне
  const firstBar = Math.floor(window.fromTicks / tpBar);
  const lastBar  = Math.floor((window.toTicks - 1) / tpBar);

  for (let bar = firstBar; bar <= lastBar; bar++) {
    const barStart = bar * tpBar;
    const chord = this.timeline.getChordAtTick(barStart, sig);
    if (!chord) continue;

    // 4. Построить voicing (с голосоведением)
    const voicing = buildVoicing(chord, this.density, this.prevVoicing);
    this.prevVoicing = voicing;

    // 5. Запланировать ноты по паттерну
    for (const event of pattern) {
      const eventTicks = barStart + (event.beat - 1) * tpBeat;
      if (eventTicks < window.fromTicks || eventTicks >= window.toTicks) continue;

      let atTicks = eventTicks;
      let velocity = event.velocity * this.baseVelocity;
      if (this.humanize) { /* ± jitter */ }

      ctx.scheduleEvent('my-instrument', { notes: voicing }, atTicks, velocity, duration);
      this.lastScheduledTick = eventTicks;
    }
  }
}
```

### 3.2. Обязательные методы поддержки

| Метод | Назначение |
|---|---|
| `setTimeline(t)` | Получить новую сетку аккордов |
| `setStyleProfile(p)` | Стиль + `instrumentDefaults` из `StyleProfile` |
| `reset()` | Сбросить `prevVoicing`, счётчики — опционально, но **рекомендовано** |
| `dispose()` | Очистить ссылки |

---

## 4. Voicing: как строить ноты аккорда

Voicing — главный строительный блок pitched-инструмента. Преобразует `ChordSymbol` в массив нот.

### 4.1. Использовать готовый движок Grand Piano

Для инструментов, играющих аккордовые текстуры (Rhodes, Vibraphone, Organ), **рекомендуется** переиспользовать `buildPianoVoicing()`:

```ts
import { buildPianoVoicing, type PianoVoicingDensity } from './pianoVoicing.js';

const voicing = buildPianoVoicing(
  chord,          // ChordSymbol
  this.density,   // 'shell2' | 'rootless3' | 'rootless4' | 'quartal'
  this.prevVoicing, // предыдущий voicing для voice leading (null при старте)
);
```

Плотности:
| `density`    | Нот | Что входит       |
|-------------|-----|------------------|
| `shell2`    | 2   | 3-й + 7-й тон    |
| `rootless3` | 3   | 3 + 7 + 9 (color)|
| `rootless4` | 4   | 3 + 7 + 9 + 13   |
| `quartal`   | 3–4 | Квартовые стеки  |

### 4.2. Собственный voicing-движок

Для инструментов со специфической аппликатурой (Guitar, Clarinet) — свой генератор:

```ts
// Пример: гитарный voicing (guitarInstrument.ts)
function buildGuitarVoicing(chord: ChordSymbol, voicing: GuitarVoicing): string[] {
  const rootMidi = chordRootMidi(chord, 2);
  const intervals = chordIntervals(chord, voicing);
  const notes: number[] = [];
  for (const interval of intervals) {
    let midi = rootMidi + interval;
    while (midi < MIN_MIDI) midi += 12;   // в диапазон
    while (midi > MAX_MIDI) midi -= 12;
    if (!notes.includes(midi)) notes.push(midi);
  }
  notes.sort((a, b) => a - b);
  return notes.map(midiToNote);
}
```

**Правила хорошего voicing'а:**
- Диапазон инструмента: `MIN_MIDI` … `MAX_MIDI`
- Избегать дубликатов pitch-классов
- Предпочитать close-voiced стеки в среднем регистре
- Голосоведение: запоминать `prevVoicing` и минимизировать движение

---

## 5. Архитектура Instrument-класса — пошаговый рецепт

### Минимальный скелет

```ts
// packages/music-core/src/audio/myInstrument.ts
import { ticksPerBar, ticksPerBeat } from '../time/timeSignature.js';
import type { Instrument, ScheduleContext, ScheduleWindow } from './instrument.js';
import type { ChordTimeline } from './chordTimeline.js';
import { type Style } from '@jazz/shared';
import { getStyleProfile, type StyleProfile } from '../styleProfile.js';

const PPQ = 480;

export class MyInstrument implements Instrument {
  // ─── Состояние ──────────────────────────────────────────────────
  private timeline: ChordTimeline;
  private baseVelocity = 1.0;
  private humanize = true;
  private prevVoicing: readonly string[] | null = null;
  private lastScheduledTick = -1;
  private style: Style = 'swing';

  constructor(timeline: ChordTimeline) {
    this.timeline = timeline;
  }

  // ─── Сеттеры (вызываются хостом) ─────────────────────────────────
  setTimeline(t: ChordTimeline) { this.timeline = t; }

  setStyleProfile(profile: StyleProfile) {
    this.style = profile.id;
    // Читаем per-instrument defaults:
    const pat = profile.instrumentDefaults.myInstrument.pattern;
    this.pattern = pat ?? DEFAULT_PATTERN[profile.id] ?? 'default';
  }

  setBaseVelocity(v: number) {
    this.baseVelocity = Math.max(0, Math.min(2, v));
  }

  setHumanize(on: boolean) { this.humanize = on; }

  reset() {
    this.prevVoicing = null;
    this.lastScheduledTick = -1;
  }

  // ─── Планирование ───────────────────────────────────────────────
  schedule(window: ScheduleWindow, ctx: ScheduleContext): void {
    const sig = ctx.timeSignature;
    const tpBar = ticksPerBar(sig);
    const tpBeat = ticksPerBeat(sig);

    if (this.lastScheduledTick >= 0 && window.fromTicks < this.lastScheduledTick - tpBeat) {
      this.prevVoicing = null;
    }

    const maxJitter = this.humanize ? Math.round(0.006 * (ctx.bpm / 60) * PPQ) : 0;

    const firstBar = Math.floor(window.fromTicks / tpBar);
    const lastBar  = Math.floor((window.toTicks - 1) / tpBar);

    for (let bar = firstBar; bar <= lastBar; bar++) {
      // ... построить и запланировать ноты (см. §3.1)
    }
  }

  dispose() {
    this.prevVoicing = null;
    this.lastScheduledTick = -1;
  }
}
```

### Что можно добавить (опционально)

| Возможность | Где посмотреть |
|---|---|
| Несколько режимов (pads, stabs, inserts) | `OrganInstrument`, `VibraphoneInstrument` |
| Комплементарный слой (layer mode) | `RhodesInstrument.setLayerMode()` |
| Sub-bar chord resolution | `RhodesInstrument.schedule()` — `getChordAtTick(eventTicks)` |
| Стиле-специфичные паттерны (guitar) | `GuitarInstrument.scheduleBossaComping()` / `scheduleFunkChops()` |
| Арпеджио / cycling через voicing | `VibraphoneInstrument.scheduleInserts()` |
| Контрапункт / мелодические линии | `ClarinetInstrument` — монофонический, contourUp/down |

---

## 6. Манифест и сэмплы

### 6.1. SampleManifest для pitched-инструмента

```ts
// sampleRegistry.ts
import type { NoteMap } from '@jazz/music-core';

const MY_LAYERS: Record<string, NoteMap> = {
  soft: {                    // velocity-слой (тихий)
    C3: 'my_inst_c3_soft.m4a',
    E3: 'my_inst_e3_soft.m4a',
    G3: 'my_inst_g3_soft.m4a',
    C4: 'my_inst_c4_soft.m4a',
    // ... анкерные ноты через квинту/терцию
  },
  loud: {                    // velocity-слой (громкий)
    C3: 'my_inst_c3_loud.m4a',
    // ...
  },
};
```

**Правила:**
- Анкерные ноты — **через квинту (C/G)** или **малую терцию** — Tone.js интерполирует ±2 пт
- Минимум 1 velocity-слой, рекомендовано 2–3
- `release` — время затухания сэмпла в секундах (для Tone.Sampler)
- `baseUrl` — путь к AAC, `fallbackBaseUrl` — путь к MP3

### 6.2. InstrumentManifest

```ts
// manifest.ts
import type { InstrumentManifest, SampleManifest } from '@jazz/music-core';
import { MyInstrument } from './myInstrument.js';
import { ChordTimeline } from '@jazz/music-core';
import { MY_LAYERS, MY_SAMPLER_BASE_URL } from './sampleRegistry.js';

const MY_SAMPLE_MANIFEST: SampleManifest = {
  baseUrl: MY_SAMPLER_BASE_URL,            // '/samples/aac/my-instrument/'
  fallbackBaseUrl: '/samples/mp3/my-instrument/',
  layers: MY_LAYERS,
  release: 1.5,
};

export const myManifest: InstrumentManifest = {
  id: 'my-instrument',          // уникальный ID — используется в scheduleEvent()
  name: 'My Instrument',        // читаемое имя в UI
  family: 'pitched',            // дискриминатор
  settingsPrefix: 'myInstr',    // префикс настроек в DTO
  createInstrument: () => new MyInstrument(new ChordTimeline()),
  sampleManifest: MY_SAMPLE_MANIFEST,
  defaultSettings: {
    enabled: false,
    volume: 0.7,
    pattern: 'default',
    voicingDensity: 'rootless3',
  },
  perStyleDefaults: {
    swing:  { pattern: 'pads',    voicingDensity: 'rootless3' },
    bossa:  { pattern: 'pads',    voicingDensity: 'shell2' },
    funk:   { pattern: 'stabs',   voicingDensity: 'rootless4' },
    latin:  { pattern: 'inserts', voicingDensity: 'rootless3' },
    ballad: { pattern: 'pads',    voicingDensity: 'shell2' },
  },
};
```

| Поле | Обязательно | Описание |
|---|---|---|
| `id` | ✅ | Уникальный ID. Используется в `ctx.scheduleEvent(id, ...)`. |
| `name` | ✅ | Имя для UI |
| `family` | ✅ | `'pitched'` |
| `settingsPrefix` | ✅ | Ключ для `user_settings` (напр. `'organ'`) |
| `createInstrument` | ✅ | Фабрика `() => new MyInstrument(new ChordTimeline())` |
| `sampleManifest` | ✅ | Описание сэмплов (см. §6.1) |
| `defaultSettings` | ❌ | Настройки по умолчанию |
| `perStyleDefaults` | ❌ | Per-style оверрайды. **Должны покрывать все 5 стилей** (см. §2.1). |

---

## 7. Плагинная обёртка (если выносим из music-core)

Новые инструменты **рекомендуется** создавать как плагины в `packages/plugins/instruments/<имя>/`.

### 7.1. Структура плагина

```
packages/plugins/instruments/my-instrument/
  src/
    index.ts           ← definePlugin + contributes.instruments
    manifest.ts        ← InstrumentManifest
    sampleRegistry.ts  ← слои сэмплов
  package.json
  tsconfig.json
```

### 7.2. `src/index.ts`

```ts
import { definePlugin } from '@jazz/plugin-sdk';
import { myManifest } from './manifest.js';

export { myManifest } from './manifest.js';

export default definePlugin({
  manifest: {
    id: 'instrument.my-instrument',
    name: 'My Instrument',
    apiVersion: 1 as const,
    category: 'core' as const,
    description: 'Краткое описание инструмента.',
  },
  contributes: {
    instruments: [{ manifest: myManifest }],
  },
});
```

### 7.3. Регистрация

В `packages/plugin-registry/src/index.ts`:

```ts
import myInstrument from '@jazz/plugin-my-instrument';
// добавить myInstrument в массив PLUGINS
```

Добавить алиасы в 3 файла (по образцу соседних):
- `apps/web/vite.config.ts`
- `tsconfig.base.json`
- `vitest.config.ts`

---

## 8. Интеграция со StyleProfile

### 8.1. Добавить ID в допустимые

В `packages/music-core/src/styleProfile.ts`:

```ts
export type InstrumentId =
  | 'my-instrument'   // ← добавить
  | (string & {});
```

### 8.2. Добавить группу в UI

Там же, в `INSTRUMENT_GROUPS` (если новый тип инструмента):

```ts
{
  id: 'my-group',
  name: 'My Group',
  order: 7,
  settingsPrefix: 'myInstr',
  variants: [
    { instrumentId: 'my-instrument', name: 'My Instrument' },
  ],
}
```

Либо добавить variant в существующую группу (`winds`, `synth`, etc.).

### 8.3. InstrumentDefaults для всех 5 стилей

`StyleProfile.instrumentDefaults` должен содержать запись для инструмента
в **каждом из 5 стилей** (swing, bossa, funk, latin, ballad). Даже если
инструмент не используется в стиле — запись `{ enabled: false, volume: 0 }`
обязательна (через вспомогательную константу `OFF`).

```ts
// В styleProfile.ts, внутри каждого *_PROFILE:
instrumentDefaults: {
  // ...
  'my-instrument': { enabled: false, volume: 0.55, pattern: 'pads' },
  // ...
}
```

Доступ из `schedule()`:

```ts
setStyleProfile(profile: StyleProfile): void {
  const defs = instrumentDefaultsFor(profile, 'my-instrument');
  if (defs.pattern) this.pattern = defs.pattern as MyPattern;
  if (defs.voicing) this.density = defs.voicing as VoicingDensity;
}
```

Типизация `instrumentDefaults` — открытая (`Record<InstrumentId, InstrumentStyleDefaults>`),
новые ключи не ломают компиляцию.

---

## 9. Где размещать код

| Что | Где |
|---|---|
| Класс `Instrument` | `packages/music-core/src/audio/<имя>Instrument.ts` |
| Voicing-логика | Там же или отдельный `<имя>Voicing.ts` |
| Манифест | `packages/music-core/src/audio/<имя>Manifest.ts` (или в плагине) |
| SampleRegistry | `packages/music-core/src/audio/<имя>SampleRegistry.ts` (или в плагине) |
| Плагинная обёртка | `packages/plugins/instruments/<имя>/src/index.ts` |
| Сэмплы (AAC) | `apps/web/public/samples/aac/<имя>/` |
| Сэмплы (MP3 fallback) | `apps/web/public/samples/mp3/<имя>/` |

**На данный момент (2026-07):** часть инструментов (Rhodes, Guitar, Vibraphone, Organ, Clarinet) живут целиком в `music-core`. Миграция в плагины — по мере необходимости. **Новые инструменты** следует сразу создавать как плагины.

---

## 10. Чек-лист: добавить новый мелодический инструмент

- [ ] **1.** Создать класс `XxxInstrument implements Instrument` в `music-core/src/audio/`
- [ ] **2.** Реализовать `schedule()` — цикл по тактам, voicing, scheduleEvent
- [ ] **3.** Реализовать `setStyleProfile()` — чтение per-instrument defaults
- [ ] **4.** Добавить `reset()` — сброс `prevVoicing` при перемотке
- [ ] **5.** Опционально: несколько паттернов (pads/stabs/inserts)
- [ ] **6.** Подготовить сэмплы: AAC + MP3 fallback, анкерные ноты, минимум 1 velocity-слой
- [ ] **7.** Создать `sampleRegistry.ts` — слои `{ soft: NoteMap, loud: NoteMap }`
- [ ] **8.** Создать `manifest.ts` — `InstrumentManifest` с `family: 'pitched'`, `perStyleDefaults` для **всех 5 стилей**
- [ ] **9.** Экспортировать манифест из `music-core/src/audio/index.ts`
- [ ] **10.** Создать плагин-обёртку в `packages/plugins/instruments/<имя>/`
- [ ] **11.** Зарегистрировать в `plugin-registry` + добавить vite/tsconfig/vitest-алиасы
- [ ] **12.** Добавить `InstrumentId` в `styleProfile.ts`
- [ ] **13.** Добавить группу/вариант в `INSTRUMENT_GROUPS`
- [ ] **14.** Добавить `instrumentDefaults` для инструмента во **все 5 StyleProfile** (swing/bossa/funk/latin/ballad)
- [ ] **15.** Написать тесты: scheduling, per-style defaults (все 5 стилей), humanization
- [ ] **16.** Запустить `npm run typecheck && npm run lint && npm run test`

---

## 11. Эталонные реализации

| Инструмент | Файл | Особенности |
|---|---|---|
| **Rhodes** | `rhodesInstrument.ts` | Комплементарный слой (`setLayerMode`), sub-bar chord resolution, conflict avoidance с Grand Piano |
| **Guitar** | `guitarInstrument.ts` | Собственный voicing-движок, стиле-специфичные паттерны (bossa, funk, Freddie Green), два режима (comp/fingerstyle) |
| **Vibraphone** | `vibraphoneInstrument.ts` | Два паттерна (pads/inserts), cycling arpeggio, переиспользует `buildPianoVoicing` |
| **Organ** | `organInstrument.ts` | Три паттерна (pads/stabs/pads-stabs), offbeat-акценты, переиспользует `buildPianoVoicing` |
| **Clarinet** | `clarinetInstrument.ts` | Монофонический, counterpoint + melodicPhrases, contour direction toggle |
| **Upright Piano** | `packages/plugins/instruments/upright-piano/` | Плагинная модель, 3 velocity-слоя, `contributes.instruments` |
| **Bass (upright + electric)** | `packages/plugins/instruments/bass/` + `music-core/src/audio/bass*.ts` | Pattern-engine pitched (2-й после piano), `atom.sound` = `${step}-${articulation}`, один плагин → 2 инструмента, авто-переключение варианта по стилю, диапазон B1–C4 |

---

_См. также: `docs/ARCHITECTURE_BASE.md` (архитектура), `docs/PIANO.md` (фортепиано), `docs/INSTRUMENT-PLUGIN.md` (целевая архитектура плагинов), `docs/RHYTHMIC-PLUGIN.md` (ритмические инструменты)_
