# RHYTHMIC-PLUGIN.md — Спецификация ритмического инструмента-плагина

> **Цель:** Пошаговое руководство по созданию нового unpitched-инструмента для
> аранжировки Jazz Trainer: барабанные киты, перкуссия и другие ритмические звуки.
> Покрывает два подхода: **pattern-engine** (organism → cell → molecule → atom) и
> **простой scheduling** (один класс `Instrument`).
>
> **Аудитория:** Разработчики и AI-агенты, добавляющие ритмический инструмент.
>
> **Статус:** 🟢 Актуально (валидировано на jazz-drum-kit, funk-drum-kit, percussion)

---

## 1. Что такое ритмический инструмент в Jazz Trainer

Ритмический (unpitched) инструмент — это `Instrument`, который:
- Планирует **отдельные звуки** (kick, snare, hihat, conga, clave, …) — не ноты
- Не зависит от гармонии (нет `ChordTimeline`)
- Может использовать **pattern-engine** (organism → cell → molecule → atom) для стиле-зависимых грувов
- Или реализовать **прямой scheduling** (простой список событий на такт)
- Имеет `SampleManifest.velocityOneshots` или `SampleManifest.oneshots`

**Два семейства:**

| `family` | Тип сэмплов | Примеры |
|---|---|---|
| `'drums'` | `velocityOneshots` (звук → velocity-слой → [RR]) | jazz-drum-kit, funk-drum-kit |
| `'percussion'` | `oneshots` (звук → [RR]) | percussion (conga, clave, shaker…) |

---

## 2. Глобальные константы: стили и секции

Все инструменты обязаны поддерживать **5 стилей** и organism-driven инструменты —
работать с **8 типами секций** grid-сетки.

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
всех 5 стилей. И organism-driven реестры (молекулы, клетки, организмы) должны
иметь материал для каждого из 5 стилей — `getOrganismsForStyle()` для неизвестного
стиля возвращает `undefined`.

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

**Правило для organism-driven инструментов:** `sectionMap` в организме **должен**
покрывать все 8 типов секций — даже если некоторые ссылаются на универсальную
fallback-клетку. Иначе `resolveSectionCells()` вернёт пустой массив для неизвестного
типа секции, и такт будет тишиной.

**Рекомендованный минимум `sectionMap`:**

```ts
sectionMap: {
  intro:   ['intro-4bar'],
  verseA:  ['swing-verse', 'swing-verse-alt'],
  verseB:  ['swing-verse'],          // fallback: та же клетка что verseA
  verseC:  ['swing-verse'],          // fallback
  chorus:  ['swing-chorus'],
  bridge:  ['swing-bridge'],
  solo:    ['swing-solo'],
  ending:  ['ending-2bar'],
}
```

---

## 3. Pattern-engine: organism → cell → molecule → atom

Для барабанных китов — **рекомендованный подход**. Обеспечивает стиле-зависимые
грувы без хардкода паттернов в классе `Instrument`.

### 3.1. Четыре уровня

```
DrumOrganism  (sectionMap + defaultForm)
  └─ sectionMap[sectionType] → cellPool (cycling)
       └─ DrumCell (таймлайн 8/16/32 тактов)
            └─ DrumLane (роль: ride / kick / snare / hihat / fill / accent …)
                 └─ DrumClip (спан тактов + пул молекул)
                      └─ DrumMolecule (1–2 такта паттерна)
                           └─ DrumAtom (один удар: sound + atTick + velocity)
```

| Уровень | Где живёт | Тип (generic) |
|---|---|---|
| Atom | `drumMolecules.ts` | `Atom<DrumSound>` |
| Molecule | `drumMolecules.ts` | `Molecule<DrumPatternStyle, DrumSound>` |
| Cell | `drumCells.ts` | `Cell<DrumPatternStyle>` |
| Organism | `drumOrganisms.ts` | `Organism<DrumPatternStyle>` |

### 3.2. Generic pattern-engine

`packages/music-core/src/audio/pattern/` — инструмент-агностичное ядро:

- `pattern/types.ts` — `Atom<TSound>`, `Hit<TSound>`, `Molecule<TStyle, TSound>`, `Cell<TStyle>`, `Organism<TStyle>`, `Lane`, `Clip`, `OrganismSection`
- `pattern/engine.ts` — `applySwing()`, `dynamicsMultiplier()`, `assembleBar()`, `resolveSectionCells()`

**Правило:** новый ритмический инструмент создаёт **тонкую обёртку** над generic-ядром:
свои типы-алиасы + реестры молекул/клеток/организмов.

---

## 4. Подход А: Pattern-engine (для барабанных китов)

### 4.1. Шаг 1: Типы

```ts
// packages/music-core/src/audio/<имя>PatternTypes.ts
import type { Atom, Molecule, Cell, Organism } from './pattern/types.js';

// Звуки инструмента (артикуляции)
export type MySound =
  | 'kick'
  | 'snare_center'
  | 'snare_edge'
  | 'hihat_closed'
  | 'hihat_open'
  | 'ride_bow'
  | 'crash'
  // ...

// Стили паттернов — обязательно все 5 (см. §2.1)
export type MyPatternStyle = 'swing' | 'bossa' | 'funk' | 'latin' | 'ballad';

// Алиасы для generic-типов
export type MyAtom = Atom<MySound>;
export type MyMolecule = Molecule<MyPatternStyle, MySound>;
export type MyCell = Cell<MyPatternStyle>;
export type MyOrganism = Organism<MyPatternStyle>;
export type MyHit = Hit<MySound>;
```

### 4.2. Шаг 2: Молекулы

```ts
// packages/music-core/src/audio/<имя>Molecules.ts
import type { MyMolecule, MyPatternStyle, MySound } from './<имя>PatternTypes.js';

export const MY_MOLECULES: Record<string, MyMolecule> = {
  'swing-ride-basic': {
    id: 'swing-ride-basic',
    label: 'Ride basic',
    style: 'swing',                      // один из 5 стилей
    bars: 1,
    category: 'groove',
    conditions: { requireRide: true },
    tags: [],
    weight: 1,
    atoms: [
      { sound: 'ride_bow', atTick: 0,   velocity: 0.6, durationTicks: 240 },
      { sound: 'ride_bow', atTick: 240, velocity: 0.5, durationTicks: 240 },
      { sound: 'ride_bow', atTick: 480, velocity: 0.6, durationTicks: 240 },
      { sound: 'ride_bow', atTick: 720, velocity: 0.5, durationTicks: 240 },
      // ... — тики прямые (без swing), engine.applySwing() применяет swing при сборке
    ],
  },
  // ... молекулы для всех 5 стилей: swing, bossa, funk, latin, ballad
};
```

**Правила написания молекул:**
- `atTick` — **прямые тики** (без swing). Swing применяется движком при `assembleBar()`
- PPQ = 480. Такт 4/4 = 1920 тиков, одна четверть = 480, восьмая = 240
- `bars: 1 | 2` — длина молекулы в тактах
- `category`: `'groove'` (ритм), `'fill'` (переход), `'texture'` (пауза/фон), `'accent'` (акцент), `'intro'`, `'ending'`
- `conditions` — опциональные требования к звукам кита (`requireRide`, `requireHihat`, …)
- **Молекулы должны быть для всех 5 стилей** — `style: 'swing' | 'bossa' | 'funk' | 'latin' | 'ballad'`

### 4.3. Шаг 3: Клетки

```ts
// packages/music-core/src/audio/<имя>Cells.ts
import type { MyCell, MyPatternStyle } from './<имя>PatternTypes.js';

export const MY_CELLS: Record<string, MyCell> = {
  'swing-verse': {
    id: 'swing-verse',
    style: 'swing',
    label: 'Swing verse',
    length: 16,          // длина в тактах
    velocity: 0.75,      // базовая velocity клетки
    dynamics: { type: 'static' },
    lanes: [
      {
        name: 'ride',
        probability: 1.0,
        clips: [
          {
            startBar: 0,
            lengthBars: 16,
            pool: ['swing-ride-basic', 'swing-ride-variation'], // cycling пул молекул
          },
        ],
      },
      {
        name: 'kick',
        probability: 1.0,
        clips: [
          { startBar: 0, lengthBars: 8,  pool: ['swing-feathering-1'] },
          { startBar: 8, lengthBars: 8,  pool: ['swing-feathering-2'] },
        ],
      },
      // ... snare, hihat, fills
    ],
  },
  // ... клетки для всех 5 стилей
};
```

**Правила клеток:**
- `length` — длина клетки в тактах (8, 16, 32)
- `lanes[].clips` — непересекающиеся временные отрезки с пулами молекул
- `pool` cycling: каждый повтор такта берёт следующую молекулу из пула
- `probability: 0..1` — шанс, что лейн играет (для вариативности)

### 4.4. Шаг 4: Организмы

```ts
// packages/music-core/src/audio/<имя>Organisms.ts
import type { MyOrganism, MyPatternStyle } from './<имя>PatternTypes.js';

export const MY_ORGANISMS: Record<string, MyOrganism> = {
  'swing-aaba': {
    id: 'swing-aaba',
    style: 'swing',
    label: 'Swing AABA',
    // sectionMap покрывает ВСЕ 8 типов секций (см. §2.2)
    sectionMap: {
      intro:   ['intro-4bar'],
      verseA:  ['swing-verse', 'swing-verse-alt'],
      verseB:  ['swing-verse'],          // fallback: та же клетка
      verseC:  ['swing-verse'],          // fallback
      chorus:  ['swing-chorus'],
      bridge:  ['swing-bridge'],
      solo:    ['swing-solo'],
      ending:  ['ending-2bar'],
    },
    defaultForm: [
      { type: 'verseA', repeats: 2, label: 'Verse A' },
      { type: 'bridge', repeats: 1, label: 'Bridge' },
      { type: 'verseA', repeats: 1, label: 'Verse A2' },
    ],
    timeSignatureOverrides: {
      '3/4': {
        verseA: ['swing-verse-3-4'],
        verseB: ['swing-verse-3-4'],
        verseC: ['swing-verse-3-4'],
        bridge: ['swing-bridge-3-4'],
      },
    },
  },
  // ... организмы для всех 5 стилей
};
```

**Правила организмов:**
- `sectionMap` — пулы клеток по типам секций. **Обязательно покрывать все 8**: `intro`, `verseA`, `verseB`, `verseC`, `chorus`, `bridge`, `solo`, `ending`
- `defaultForm` — макро-форма (fallback, когда нет grid-секций)
- `timeSignatureOverrides` — клетки для нестандартных размеров
- Размер 4/4 без override → стандартный резолв
- Размер не 4/4 без override → degraded swing (четверти по сильным долям)
- **Организмы нужны для всех 5 стилей** — `getOrganismsForStyle(style)` должен возвращать непустой массив

### 4.5. Шаг 5: PatternEngine (тонкая обёртка)

```ts
// packages/music-core/src/audio/<имя>PatternEngine.ts
import { resolveSectionCells, assembleBar, applySwing } from './pattern/engine.js';
import { MY_CELLS } from './<имя>Cells.js';
import { MY_MOLECULES } from './<имя>Molecules.js';
import type { MyCell, MyOrganism, MyHit, MyMolecule, MyPatternStyle } from './<имя>PatternTypes.js';

export class MyPatternEngine {
  // selectCellForSectionType, resolveBarSlot, assembleOrganism — см. drumPatternEngine.ts
}
```

См. эталон: `drumPatternEngine.ts` (~120 строк, 90% делегирования в generic `engine.ts`).

### 4.6. Шаг 6: Instrument-класс

```ts
// packages/music-core/src/audio/<имя>Instrument.ts
export class MyInstrument implements Instrument {
  private organism: MyOrganism | null = null;
  private patternEngine = new MyPatternEngine();

  setStyleProfile(profile: StyleProfile): void {
    const style = profile.id;
    // Выбрать организм для стиля — getOrganismsForStyle возвращает массив
    this.organism = getOrganismsForStyle(style)[0] ?? null;
  }

  setGridSections(sections: Section[]): void {
    this.gridSections = sections;
  }

  schedule(window: ScheduleWindow, ctx: ScheduleContext): void {
    if (!this.organism) return;

    // Для каждого такта в окне — определить секцию, выбрать клетку, собрать hits
    for (let bar = firstBar; bar <= lastBar; bar++) {
      const section = this.gridSections
        ? findSectionForBar(bar, this.gridSections)
        : null;

      const hits = this.patternEngine.resolveBarSlot(
        this.organism, bar, section?.type, ctx.timeSignature
      );

      for (const hit of hits) {
        ctx.scheduleEvent(this.instrumentId, { sound: hit.sound },
          barStart + hit.atTick, hit.velocity, hit.durationTicks);
      }
    }
  }
}
```

---

## 5. Подход Б: Простой scheduling (для простых инструментов)

> **Примечание:** percussion ранее использовал этот подход, но мигрировал на
> Pattern-engine (Approach А) — см. `packages/plugins/instruments/percussion/`.
> Approach Б остаётся для гипотетических простых инструментов с фиксированными
> паттернами, не требующими organism/cell/molecule иерархии.

Для инструментов с фиксированными паттернами (не organism-driven):

### 5.1. Типовая структура

```ts
export class MyPercussionInstrument implements Instrument {
  private style: Style = 'swing';
  private pattern: MyPattern = 'default';

  setStyleProfile(profile: StyleProfile): void {
    this.style = profile.id;
    this.pattern = profile.instrumentDefaults.myPerc.pattern ?? 'default';
  }

  schedule(window: ScheduleWindow, ctx: ScheduleContext): void {
    const sig = ctx.timeSignature;
    const tpBar = ticksPerBar(sig);
    const tpBeat = ticksPerBeat(sig);

    const maxJitter = this.humanize ? Math.round(0.004 * (ctx.bpm / 60) * 480) : 0;

    const firstBar = Math.floor(window.fromTicks / tpBar);
    const lastBar  = Math.floor((window.toTicks - 1) / tpBar);

    for (let bar = firstBar; bar <= lastBar; bar++) {
      const events = this.getPattern(this.pattern); // массив { sound, beatPos, velocity }

      for (const ev of events) {
        const eventTicks = bar * tpBar + Math.round(ev.beatPos * tpBeat);
        if (eventTicks < window.fromTicks || eventTicks >= window.toTicks) continue;

        let atTicks = eventTicks;
        let vel = ev.velocity * this.baseVolume;
        if (this.humanize) { /* ± jitter */ }

        ctx.scheduleEvent('my-perc', { sound: ev.sound }, atTicks, vel, 120);
      }
    }
  }
}
```

См. эталон: `PercussionInstrument` (теперь использует Pattern-engine — Approach А; этот раздел оставлен как теоретический шаблон для будущих простых инструментов).

---

## 6. Манифест и сэмплы

### 6.1. SampleManifest для unpitched-инструмента

**С velocity-слоями (drums):**

```ts
const MY_SAMPLE_MANIFEST: SampleManifest = {
  baseUrl: '/samples/aac/drums/my-kit/',
  fallbackBaseUrl: '/samples/mp3/drums/my-kit/',
  velocityOneshots: {
    kick: {
      vl1: ['kick_vl1_rr1.m4a', 'kick_vl1_rr2.m4a', 'kick_vl1_rr3.m4a', 'kick_vl1_rr4.m4a'],
      vl2: ['kick_vl2_rr1.m4a', 'kick_vl2_rr2.m4a', 'kick_vl2_rr3.m4a', 'kick_vl2_rr4.m4a'],
    },
    snare_center: { /* ... */ },
    // ...
  },
  velocityLayers: ['vl1', 'vl2', 'vl3', 'vl4'],  // от тихого к громкому
  rrCount: 4,
};
```

**Без velocity-слоёв (percussion):**

```ts
const MY_SAMPLE_MANIFEST: SampleManifest = {
  baseUrl: '/samples/aac/percussion/my-perc/',
  fallbackBaseUrl: '/samples/mp3/percussion/my-perc/',
  oneshots: {
    conga_high: ['conga_high_rr1.m4a', 'conga_high_rr2.m4a'],
    clave:      ['clave_rr1.m4a', 'clave_rr2.m4a'],
    // ...
  },
  rrCount: 2,
};
```

### 6.2. ArticulationMap

Для китов с наследием абстрактных ролей:

```ts
// sampleRegistry.ts
export const MY_ARTICULATION_MAP: Partial<Record<DrumSound, DrumSound>> = {
  bassDrum: 'kick',          // legacy → конкретный ключ сэмпла
  snare:    'snare_center',
  hihat:    'hihat_closed',
  ride:     'ride_bow',
  // ...
};
```

Передаётся через `contributes.instruments`:

```ts
contributes: {
  instruments: [{ manifest: myManifest, articulationMap: MY_ARTICULATION_MAP }],
},
```

### 6.3. InstrumentManifest

```ts
export const myKitManifest: InstrumentManifest = {
  id: 'my-kit',
  name: 'My Drum Kit',
  family: 'drums',              // 'drums' или 'percussion'
  settingsPrefix: 'drums',
  createInstrument: () => new MyInstrument(),
  sampleManifest: MY_SAMPLE_MANIFEST,
  defaultSettings: {
    enabled: true,
    volume: 0.7,
    kickEnabled: true,
    kickVolume: 0.75,
    snareEnabled: true,
    snareVolume: 0.8,
    hihatEnabled: true,
    hihatVolume: 0.7,
    // ... per-sound on/off + volume
    useArticulations: true,       // включить артикуляции (если поддерживаются)
  },
  perStyleDefaults: {
    swing:  { pattern: 'swing',  volume: 0.7 },
    bossa:  { pattern: 'bossa',  snareEnabled: false, rimEnabled: true },
    funk:   { pattern: 'funk',   volume: 0.75, tomEnabled: true },
    latin:  { pattern: 'funk',   tomEnabled: true },
    ballad: { pattern: 'swing',  volume: 0.55 },
  },
};
```

---

## 7. Плагинная обёртка

### 7.1. Структура

```
packages/plugins/instruments/my-drum-kit/
  src/
    index.ts           ← definePlugin + contributes.instruments + articulationMap
    manifest.ts        ← InstrumentManifest
    sampleRegistry.ts  ← velocityOneshots + articulationMap
    manifest.test.ts   ← тест per-style defaults (все 5 стилей)
  package.json
```

### 7.2. `src/index.ts`

```ts
import { definePlugin } from '@jazz/plugin-sdk';
import { myKitManifest } from './manifest.js';
import { MY_ARTICULATION_MAP } from './sampleRegistry.js';

export { myKitManifest } from './manifest.js';
export { MY_SAMPLE_FILES, MY_ARTICULATION_MAP } from './sampleRegistry.js';

export default definePlugin({
  manifest: {
    id: 'instrument.my-drum-kit',
    name: 'My Drum Kit',
    apiVersion: 1 as const,
    category: 'core' as const,
    description: 'Описание кита — источник сэмплов, velocity-слои, RR.',
  },
  contributes: {
    instruments: [{ manifest: myKitManifest, articulationMap: MY_ARTICULATION_MAP }],
  },
});
```

### 7.3. Регистрация

Добавить в `packages/plugin-registry/src/index.ts` + алиасы в 3 файла (см. рецепт в `CLAUDE.md`).

---

## 8. Валидация клеток (опционально)

Для organism-driven инструментов — `validateCell()`:

```ts
// <имя>CellValidator.ts
export function validateCell(cell: MyCell): CellValidationError[] {
  const errors: CellValidationError[] = [];

  if (cell.lanes.length < 1 || cell.lanes.length > MAX_LANES)
    errors.push({ code: 'lane-count', detail: `…` });
  if (cell.velocity < 0 || cell.velocity > 1)
    errors.push({ code: 'velocity-range', detail: `…` });

  for (const lane of cell.lanes) {
    // Проверить clips: overlap, bounds, пустые пулы, неизвестные moleculeId
  }
  return errors;
}
```

См. эталон: `drumCellValidator.ts` (55 строк).

---

## 9. Конструктор (admin)

Organism-driven инструменты **могут** получить свой конструктор в `admin-constructor-shared`.
Для этого нужно:

1. Создать стратегию (`ConstructorStrategy`) — см. `drumStrategy.ts` / `pianoStrategy.ts`
2. Создать MoleculeEditor (step-grid/piano-roll)
3. Создать плагин-обёртку в `packages/plugins/admin-<имя>-constructor/`
4. Зарегистрировать в `plugin-registry`

См. эталоны: `admin-drum-constructor/` (unpitched), `admin-piano-constructor/` (pitched).

---

## 10. Per-sound настройки и gate-фильтрация

Барабанные киты поддерживают kit-level gates — настройки включения/громкости для каждого звука:

```ts
// В defaultSettings манифеста:
{
  kickEnabled: true,
  kickVolume: 0.75,
  snareBuzzEnabled: false,  // артикуляция, отсутствующая в данном ките — выключена
  // ...
}
```

Фильтрация происходит на уровне хоста (`useTransport.ts`), **не** в `schedule()`.
Инструмент планирует все звуки — хост решает, играть ли их.

---

## 11. Чек-лист: добавить новый ритмический инструмент

### Подход А — Pattern-engine (drum kit)

- [ ] **1.** Определить `MySound` (артикуляции) и `MyPatternStyle` (все 5 стилей: swing, bossa, funk, latin, ballad)
- [ ] **2.** Создать type-алиасы: `MyAtom`, `MyMolecule`, `MyCell`, `MyOrganism`, `MyHit`
- [ ] **3.** Написать молекулы для **всех 5 стилей** (1–2 такта, прямые тики, `bars: 1|2`)
- [ ] **4.** Написать клетки для **всех 5 стилей** (8/16/32 такта, лейны с clips и пулами молекул)
- [ ] **5.** Написать организмы для **всех 5 стилей** (sectionMap покрывает **все 8 типов секций** + defaultForm + timeSignatureOverrides)
- [ ] **6.** Создать `XxxPatternEngine` — тонкая обёртка над generic `pattern/engine.ts`
- [ ] **7.** Опционально: `validateCell()` для конструктора
- [ ] **8.** Создать `XxxInstrument implements Instrument` — `setStyleProfile()` выбирает организм, `schedule()` резолвит секции
- [ ] **9.** Подготовить сэмплы: `velocityOneshots` с velocity-слоями + RR
- [ ] **10.** Создать `sampleRegistry.ts` — `velocityOneshots` + `articulationMap`
- [ ] **11.** Создать `manifest.ts` — `InstrumentManifest` с `family: 'drums'`, `perStyleDefaults` для **всех 5 стилей**
- [ ] **12.** Создать плагин-обёртку: `definePlugin` + `contributes.instruments`
- [ ] **13.** Зарегистрировать в `plugin-registry` + алиасы
- [ ] **14.** Добавить `InstrumentId` и `instrumentDefaults` в `styleProfile.ts` (все 5 стилей)
- [ ] **15.** Написать тесты: per-style defaults (все 5 стилей), organism-driven scheduling, validateCell

### Подход Б — Простой scheduling (percussion)

- [ ] **1.** Определить `MySound` (звуки) и паттерны
- [ ] **2.** Создать `XxxInstrument implements Instrument` — `schedule()` с фиксированными паттернами
- [ ] **3.** Подготовить сэмплы: `oneshots` (плоский список [RR])
- [ ] **4.** Создать `sampleRegistry.ts`
- [ ] **5.** Создать `manifest.ts` — `InstrumentManifest` с `family: 'percussion'`, `perStyleDefaults` для **всех 5 стилей**
- [ ] **6.** Создать плагин-обёртку
- [ ] **7.** Зарегистрировать + алиасы
- [ ] **8.** Добавить `InstrumentId` и `instrumentDefaults` в `styleProfile.ts` (все 5 стилей)
- [ ] **9.** Написать тесты

---

## 12. Эталонные реализации

| Инструмент | Файл | Подход | Особенности |
|---|---|---|---|
| **Jazz Drum Kit** | `packages/plugins/instruments/jazz-drum-kit/` | Pattern-engine | 4 velocity-слоя, 15+ артикуляций (stir, splash, dig, edge), `articulationMap`, kit-level gates, per-style defaults для всех 5 стилей |
| **Funk Drum Kit** | `packages/plugins/instruments/funk-drum-kit/` | Pattern-engine | 2–5 velocity-слоёв, 15+ артикуляций (buzz, flam, rimshot, bell, sizzle), per-style оверрайды для funk-артикуляций |
| **Percussion** | `packages/plugins/instruments/percussion/` | Pattern-engine | 16 звуков (conga, clave, shaker, …), 3 стиля (latin/bossa/funk), per-sound gates. Funk — ровный бит (humanize off). Engine: `PercussionInstrument` в `music-core` |

---

_См. также: `docs/ARCHITECTURE_BASE.md` (архитектура), `docs/DRUMS.md` (барабаны), `docs/DRUMS-PATTERNS.md` (атомы/молекулы/клетки), `docs/INSTRUMENT-PLUGIN.md` (целевая архитектура плагинов), `docs/MELODIC-PLUGIN.md` (мелодические инструменты)_
