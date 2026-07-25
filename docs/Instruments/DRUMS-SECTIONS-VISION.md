# DRUMS-SECTIONS-VISION — Связка секций сетки с барабанными клетками

**Дата:** 2026-07-05
**Статус:** 🟡 Черновик
**Версия:** v1.0

## 1. Резюме (Executive Summary)

Сейчас барабанные организмы (`DrumOrganism`) определяют **собственную** последовательность секций (A → Bridge → B → …) независимо от структуры гармонической сетки. Организм крутит свой луп, игнорируя разметку секций, которую пользователь задал в редакторе (Verse A, Bridge, Chorus).

Результат — диссонанс: пользователь создал форму AABA в сетке, а барабаны играют свой flat-луп без реакции на смену секций.

**Решение:** перестроить `DrumOrganism` из «автономного генератора формы» в **SectionType → CellPool-маппинг** — реестр, который адаптируется к форме сетки. Организм читает тип текущей секции сетки и выбирает клетку из соответствующего пула. Это позволяет:

- **Одна секция в сетке → вариативность:** две и более клеток в пуле чередуются по тактам (1→2→1→2…) до конца сетки или остановки.
- **Много секций в сетке → маршрутизация:** каждая секция получает свою клетку (verse → verse-клетка, bridge → bridge-клетка).
- **Выбор организма:** пользователь в настройках барабанов выбирает организм из списка доступных для стиля. По умолчанию — «Auto» (дефолтный организм стиля).
- **Размер (time signature) прозрачен:** организм содержит клетки для разных размеров внутри себя. Пользователь не выбирает организм под размер — система сама подставляет нужную клетку по текущему размеру сетки.

## 2. Текущее состояние (As-Is)

### 2.1. Модель данных

```
GridContent                   DrumOrganism
  ├─ version: 1                 ├─ id, style, label
  ├─ bars: Bar[] (flat)         ├─ sections: OrganismSection[]
  └─ sections?: Section[]            ├─ label: 'A', 'Bridge'
       ├─ id, name                   ├─ type: SectionType (verseA, bridge…)
       ├─ type: SectionType          ├─ cellPool: string[]
       ├─ timeSignature              ├─ repeats?: number
       └─ bars: Bar[]                └─ repeatsCompleted?: number  // runtime-счётчик, не конфигурация
```

**Проблема:** `OrganismSection.type` и `Section.type` — это один и тот же `SectionType`, но они **не связаны**. Организм строит свою форму, сетка — свою.

### 2.2. Как работает сейчас

1. `setStyleProfile()` → `selectOrganismForStyle()` — детерминированно выбирает организм по стилю.
2. `buildBarLayout(organism)` — разворачивает `organism.sections` в плоский `BarSlot[]` (такт → клетка + позиция), циклически повторяя каждую секцию `repeats` раз.
3. `scheduleOrganism()` — для каждого такта в окне `resolveBar(bar)` берёт `barLayout[bar % layout.length]`.
4. Сетка со своими секциями **не участвует** в этом процессе.

### 2.3. Примеры текущих организмов

> ⚠️ **Важно про источники организмов.** В репозитории есть **два** реестра:
> - `BASE_DRUM_ORGANISMS` (`drumOrganisms.ts:119-126`) — 6 организмов, включая `swing-brushes-form`.
> - `GENERATED_DRUM_ORGANISMS` (`drumOrganismsGenerated.ts`) — **5** организмов, **без `swing-brushes-form`**.
>
> При этом итоговый экспорт `DRUM_ORGANISMS = GENERATED.length > 0 ? GENERATED : BASE` (`drumOrganisms.ts:128-135`) — **generated полностью замещает базу**. Поэтому в текущем рантайме `getOrganismsForStyle('swing')` возвращает **только** `swing-flat-16`. Чтобы `swing-brushes-form` стал доступен, его нужно явно внести в `drumOrganismsGenerated.ts` как часть миграции (см. план T-003).

| Организм | Секции | Комментарий |
|---|---|---|
| `swing-flat-16` | A: `['swing-16-verse']` ×4 | Плоский луп, игнорирует форму сетки. **В рантайме единственный swing-организм** |
| `swing-brushes-form` | A → Bridge → B | AABA форма, жёстко прописана. **Есть только в `BASE_DRUM_ORGANISMS`, в generated отсутствует → недоступен в рантайме** |
| `bossa-flat-16` | A: `['bossa-16-verse']` ×4 | Плоский луп |
| `funk-flat-16` | A: `['funk-16-verse']` ×4 | Плоский луп |

## 3. Целевая архитектура

### 3.1. Новый DrumOrganism

```typescript
interface DrumOrganism {
  id: string;
  style: DrumPatternStyle;
  label: string;

  /**
   * Ядро: SectionType → CellPool.
   * Ключ — тип секции сетки (verseA, bridge, chorus…).
   * Значение — массив ID клеток. При воспроизведении движок выбирает
   * клетку из пула, циклически перебирая элементы (для вариативности).
   *
   * Если для SectionType нет записи — fallback на 'verseA' (дефолт).
   */
  sectionMap: Partial<Record<SectionType, string[]>>;

  /**
   * Опционально: per-time-signature оверрайды sectionMap.
   * Ключ — строка размера ("3/4", "4/4", "5/4", "6/8").
   * Значение — частичный sectionMap для этого размера.
   *
   * При резолве: сначала ищем в timeSignatureOverrides[ts],
   * затем в sectionMap, затем fallback 'verseA'.
   *
   * Пользователь НЕ видит этот уровень — организм сам решает,
   * какие клетки использовать под текущий размер.
   */
  timeSignatureOverrides?: Record<string, Partial<Record<SectionType, string[]>>>;

  /**
   * Дефолтная форма — используется когда сетка НЕ имеет секций
   * (flat-режим, обратная совместимость).
   * Если отсутствует — генерируется flat-луп из sectionMap['verseA'].
   *
   * Каждый OrganismSection может содержать repeats?: number (конфигурация)
   * и repeatsCompleted?: number (runtime-счётчик, не конфигурация —
   * сохраняется только в defaultForm для flat-режима).
   */
  defaultForm?: OrganismSection[];

  /** Вес для случайного выбора (0 = только явный выбор). */
  weight: number;
}
```

### 3.2. Алгоритм воспроизведения (v3)

> **Замечание про `absoluteBar`.** В текущем коде `ScheduleWindow` содержит только `{ fromTicks, toTicks }` (`instrument.ts:12-15`) — поля `absoluteBar` нет нигде. Инструмент вычисляет такт сам: `bar = Math.floor(window.fromTicks / tpBar)` (`drumInstrument.ts:265`). В v3 `absoluteBar` — это **концепт для внедрения**: либо DrumInstrument продолжает считать его сам из `window.fromTicks`, либо TransportEngine пробрасывает готовый `barInSection` через `ScheduleContext` (Вариант A ниже). Это не существующая plumbing, а часть новой реализации.

```
┌──────────────────────────────────────────────────────────────┐
│                     DrumInstrument.schedule()                 │
├──────────────────────────────────────────────────────────────┤
│ 1. Получить текущий такт (absoluteBar):                      │
│    - либо вычислить из ScheduleWindow:                        │
│      absoluteBar = floor(window.fromTicks / tpBar)            │
│    - либо взять из ScheduleContext.barInSection (если T-006)  │
│                                                               │
│ 2. Определить секцию сетки для этого такта:                   │
│    section = gridSections.find(s => bar in s.bars)            │
│    sectionType = section?.type ?? 'verseA'                     │
│                                                               │
│ 3. Резолв клетки:                                            │
│    cells = resolveSectionCells(organism, sectionType, ts)     │
│    cellPool = organism.sectionMap[sectionType]                │
│            ?? organism.sectionMap['verseA']  // fallback      │
│    // Применить time signature override если есть:            │
│    if (organism.timeSignatureOverrides?.[ts]?.[sectionType])  │
│      cellPool = organism.timeSignatureOverrides[ts][...]      │
│                                                               │
│ 4. Выбрать клетку из пула:                                   │
│    cellIndex = sectionBarIndex % cellPool.length  // cycling  │
│    cell = DRUM_CELLS[cellPool[cellIndex]]                     │
│                                                               │
│ 5. Собрать такт:                                             │
│    barInCell = sectionBarIndex % cell.length                  │
│    hits = patternEngine.assembleBar(cell, barInCell, swing)   │
└──────────────────────────────────────────────────────────────┘
```

### 3.3. Стратегия вариативности

**Для одной секции (cellPool из 2+ клеток):**

```
Сетка: Verse A, 16 тактов
cellPool: ['swing-16-verse', 'swing-16-comp']

Такт 1  → swing-16-verse,    barInCell=0
Такт 2  → swing-16-verse,    barInCell=1
...
Такт 16 → swing-16-verse,    barInCell=15
Такт 17 → swing-16-comp,     barInCell=0   ← переключение!
...
Такт 32 → swing-16-comp,     barInCell=15
Такт 33 → swing-16-verse,    barInCell=0   ← снова переключение
```

Цикл: `cellIndex = floor(barInSection / cell.length) % cellPool.length`. То есть клетка играется **целиком** (все её такты), затем переключение на следующую.

**Для нескольких секций:**

```
Сетка: Verse A (8т) → Bridge (8т) → Verse A (8т) → Ending (4т)
sectionMap: {
  verseA:  ['swing-16-verse'],
  bridge:  ['swing-16-bridge'],
  ending:  ['swing-16-ending'],
}

Verse A, такты 1-8   → swing-16-verse   (barInCell 0..7)
Bridge,  такты 9-16  → swing-16-bridge  (barInCell 0..7)
Verse A, такты 17-24 → swing-16-verse   (barInCell 0..7, сброс счётчика!)
Ending,  такты 25-28 → swing-16-ending  (barInCell 0..3)
```

Каждая новая секция **сбрасывает** `barInSection` и `cellIndex` — клетка начинается с начала.

### 3.4. Резолв time signature

```typescript
function resolveSectionCells(
  organism: DrumOrganism,
  sectionType: SectionType,
  timeSignature: string, // "4/4", "3/4", "6/8"
): string[] {
  // 1. Применить per-time-signature оверрайд
  const tsOverride = organism.timeSignatureOverrides?.[timeSignature];
  if (tsOverride?.[sectionType]) return tsOverride[sectionType]!;

  // 2. Основной sectionMap
  if (organism.sectionMap[sectionType]) return organism.sectionMap[sectionType]!;

  // 3. Fallback
  return organism.sectionMap['verseA'] ?? [];
}
```

**Пример организма с поддержкой 3/4 и 4/4:**

```typescript
const swingStandard: DrumOrganism = {
  id: 'swing-standard',
  style: 'swing',
  label: 'Swing Standard',
  sectionMap: {
    verseA:  ['swing-16-verse', 'swing-16-comp'],
    verseB:  ['swing-16-verse2'],
    bridge:  ['swing-16-bridge'],
    chorus:  ['swing-16-chorus'],
    solo:    ['swing-16-solo'],
    intro:   ['swing-16-intro'],
    ending:  ['swing-16-ending'],
  },
  timeSignatureOverrides: {
    '3/4': {
      verseA:  ['swing-waltz-12-verse'],
      bridge:  ['swing-waltz-12-bridge'],
      chorus:  ['swing-waltz-12-chorus'],
    },
  },
  weight: 10,
};
```

Пользователь в UI видит только «Swing Standard» в выпадающем списке. Смена размера сетки с 4/4 на 3/4 автоматически подставит waltz-клетки.

> ⚠️ **Критично: гейт `is44`.** Сегодня organism-path в `DrumInstrument.schedule()` активируется **только** для 4/4 — условие `is44 = beatsPerBar === 4 && beatUnit === 4` (`drumInstrument.ts:223-231`). Для любого другого размера (включая 3/4) инструмент падает в `scheduleDegradedSwing` (`drumInstrument.ts:289`) и **игнорирует** клетки/`timeSignatureOverrides`. Чтобы `timeSignatureOverrides['3/4']` и waltz-клетки реально зазвучали, гейт `is44` нужно **снять или ослабить** (разрешить organism-path для размеров, представленных в `timeSignatureOverrides`). Без этой правки waltz-сценарий (§4.3) не работает. См. план T-005.

### 3.5. Обратная совместимость

Существующие организмы (со `sections: OrganismSection[]`) **автоматически конвертируются** при загрузке:

```typescript
function migrateOrganism(old: LegacyOrganism): DrumOrganism {
  const sectionMap: Record<string, string[]> = {};
  const defaultForm: OrganismSection[] = [];

  for (const sec of old.sections) {
    if (!sectionMap[sec.type]) sectionMap[sec.type] = [];
    for (const cellId of sec.cellPool) {
      if (!sectionMap[sec.type]!.includes(cellId)) {
        sectionMap[sec.type]!.push(cellId);
      }
    }
    defaultForm.push({ ...sec });
  }

  return {
    id: old.id,
    style: old.style,
    label: old.label,
    sectionMap,
    defaultForm,
    weight: old.weight,
  };
}
```

> **Оговорка про `repeats`.** При группировке секций одного типа в `sectionMap` информация о `repeats` **теряется** (несколько секций с одинаковым `type`, но разными `repeats`, сливаются в один pool). `repeats` сохраняется только в `defaultForm` (для flat-режима), где исходные секции копируются как есть. Это допустимо: `sectionMap` — это пулы для routing по `SectionType`, а не описание формы; форма в flat-режиме берётся из `defaultForm` целиком.

### 3.6. Интеграция с TransportEngine

`DrumInstrument` должен знать структуру секций сетки. Для этого:

1. **Новый метод** `setGridSections(sections: Section[]): void` — вызывается при загрузке/изменении сетки.
2. Если секции не переданы (flat-режим) — используется `organism.defaultForm`.
3. `ScheduleContext` расширяется полем `gridSectionType?: SectionType` — или `DrumInstrument` сам вычисляет по `absoluteBar`.

**Вариант A (рекомендуемый): TransportEngine пробрасывает sectionType в ScheduleContext**

```typescript
interface ScheduleContext {
  timeSignature: TimeSignature;
  // ...existing fields
  /** Тип секции сетки для текущего такта (если сетка имеет sections) */
  gridSectionType?: SectionType;
  /** Индекс такта внутри секции (0-based, сбрасывается на каждой новой секции) */
  barInSection?: number;
}
```

`TransportEngine` вычисляет `gridSectionType` и `barInSection` при итерации по тактам, зная структуру `GridContent.sections`.

**Вариант B: DrumInstrument получает sections при setStyleProfile**

Проще в реализации, но требует передачи секций через цепочку вызовов. Менее предпочтительно, т.к. `setStyleProfile` отвечает за стиль, а не за структуру сетки.

**Рекомендация: Вариант A** — минимальные изменения в архитектуре, `ScheduleContext` уже используется для передачи `timeSignature`.

## 4. Пользовательский опыт

### 4.1. Настройки барабанов — переориентация существующего выбора

> ⚠️ **Механизм выбора организма уже существует.** В `UserSettingsDTO` есть поле `drumsPattern: z.string().nullable().optional()` (`packages/shared/src/dto.ts:75`), а UI выпадающего списка организмов из `getOrganismsForStyle(style)` уже реализован в компоненте `DrumsTile` (`packages/plugins/core-settings/src/InstrumentTile.tsx:227-272`). Значение хранится в `drumsPattern` как id организма.
>
> Цель v3 — **переориентировать** этот существующий выбор на section-driven организмы, а **не добавлять** новый контрол `organismId`. В v2 выбор организма уже влиял на форму (через `organism.sections`), но форма бралась из организма, а не из сетки. После миграции тот же UI будет выбирать organism v3, который адаптируется к секциям сетки.

В панели настроек Drums (`DrumsTile`, `core-settings/src/InstrumentTile.tsx`) выпадающий список сохраняет ту же семантику:

```
Паттерны:  [ Swing Flat ▾ ]
           ├─ (Auto) — дефолтный организм стиля через selectOrganism()
           ├─ Swing Flat        ← organisms из getOrganismsForStyle(style)
           └─ ...
```

- **(Auto)** = `drumsPattern = null/undefined` → `selectOrganism()` с фильтром `weight > 0`.
- Список фильтруется по текущему стилю (`swing`, `bossa`, `funk`…) через `getOrganismsForStyle(style)`.
- При смене стиля выбранный организм сбрасывается на Auto (т.к. id организма привязан к стилю).
- Пользователь **не видит** per-time-signature варианты — они внутри организма (`timeSignatureOverrides`).
- Поле `drumsPattern` переиспользуется как есть (хранит id организма v3). Новый контрол `organismId` **не вводится**.

### 4.2. Сценарий 1: Одна секция в сетке

1. Пользователь создаёт сетку: Verse A, 16 тактов, аккорды Cmaj7 | Dm7 | G7 | Cmaj7.
2. Запускает плеер.
3. Барабаны играют `swing-16-verse` (16 тактов), затем `swing-16-comp` (16 тактов), затем снова `swing-16-verse` и т.д.
4. Вариативность — две клетки чередуются, партия не надоедает при циклическом воспроизведении.

### 4.3. Сценарий 2: Несколько секций в сетке

1. Пользователь создаёт форму: Intro (4т) → Verse A (8т) → Bridge (8т) → Verse A (8т) → Ending (4т).
2. Запускает плеер.
3. Барабаны:
   - Intro: `swing-16-intro` (первые 4 такта клетки)
   - Verse A: `swing-16-verse` (8 тактов)
   - Bridge: `swing-16-bridge` (8 тактов)
   - Verse A: `swing-16-verse` (8 тактов, с начала клетки)
   - Ending: `swing-16-ending` (первые 4 такта)
4. Каждая секция получает свою клетку. Смена секции = смена groove.

### 4.4. Сценарий 3: Смена размера

1. Пользователь выбрал организм «Swing Standard».
2. Создал сетку в 4/4 → играют 4/4 клетки.
3. Переключил размер на 3/4 → организм автоматически подставил `swing-waltz-*` клетки.
4. Пользователь не менял организм — система сама адаптировалась.

> ⚠️ **Предусловие:** этот сценарий **не работает без снятия гейта `is44`** (см. §3.4). В текущем коде 3/4 уходит в `scheduleDegradedSwing`, и `timeSignatureOverrides` не применяется. Сценарий становится реальным только после T-005 (ослабление гейта).

## 5. План реализации

### Этап 1: Типы и миграция (music-core, shared)

- [ ] Новый `DrumOrganism` в `drumPatternTypes.ts` (v3).
- [ ] Zod-схема `DrumOrganismV3Schema` в `shared/src/drums.ts`.
- [ ] Функция `migrateOrganism()` для авто-конвертации старых организмов.
- [ ] Обновление `drumOrganisms.ts` — все 6 организмов в новом формате.
- [ ] Обновление `DrumOrganismSchema` в Конструкторе.

### Этап 2: Новый алгоритм scheduling (music-core)

- [ ] `DrumInstrument.setGridSections(sections)` — сохранение структуры секций.
- [ ] Метод `resolveSectionCells(organism, sectionType, ts)` в `DrumPatternEngine`.
- [ ] Переработка `scheduleOrganism()` — использование `gridSectionType` из `ScheduleContext`.
- [ ] Стратегия cycling вариативности: `cellIndex = floor(barInSection / cell.length) % pool.length`.

### Этап 3: TransportEngine — проброс sectionType

- [ ] Расширение `ScheduleContext`: поля `gridSectionType?`, `barInSection?`.
- [ ] `TransportEngine` вычисляет `sectionType` и `barInSection` для каждого такта на основе `GridContent.sections`.

### Этап 4: Настройки и UI (plugin-sdk, plugins)

- [ ] `DrumInstrumentSettings.organismId?: string` (опционально, по умолчанию `undefined` = Auto).
- [ ] `useDrumSettings()` / панель настроек — выпадающий список организмов.
- [ ] `getOrganismsForStyle(style).filter(o => o.weight > 0)` для списка.
- [ ] Сохранение выбора в пользовательских настройках.

### Этап 5: Клетки для всех SectionType и размеров

- [ ] Создание недостающих клеток: `swing-16-intro`, `swing-16-ending`, `swing-16-solo`, `swing-16-chorus`.
- [ ] Waltz-клетки (3/4): `swing-waltz-12-verse`, `swing-waltz-12-bridge`, `swing-waltz-12-chorus`.
- [ ] Клетки для остальных стилей (bossa, funk, latin, ballad) — эквивалентный набор.
- [ ] Валидация через `validateCell()`.

### Этап 6: Тесты

- [ ] `drumInstrument.test.ts` — тесты grid-section-driven scheduling.
- [ ] Тест: одна секция, 2 клетки в пуле → cycling каждые cell.length тактов.
- [ ] Тест: несколько секций → правильная маршрутизация.
- [ ] Тест: смена размера → правильный timeSignatureOverride.
- [ ] Тест: fallback на verseA для неизвестного sectionType.
- [ ] Тест: flat-режим (без секций) → defaultForm.

## 6. Новые организмы (примеры)

### 6.1. Swing Standard (основной)

```typescript
{
  id: 'swing-standard',
  style: 'swing',
  label: 'Swing Standard',
  sectionMap: {
    intro:   ['swing-16-intro'],
    verseA:  ['swing-16-verse', 'swing-16-comp'],   // 2 клетки для вариативности
    verseB:  ['swing-16-verse2'],
    chorus:  ['swing-16-chorus'],
    bridge:  ['swing-16-bridge'],
    solo:    ['swing-16-solo'],
    ending:  ['swing-16-ending'],
  },
  timeSignatureOverrides: {
    '3/4': {
      verseA:  ['swing-waltz-12-verse'],
      bridge:  ['swing-waltz-12-bridge'],
    },
  },
  weight: 10,
}
```

### 6.2. Swing Brushes (альтернативный)

```typescript
{
  id: 'swing-brushes',
  style: 'swing',
  label: 'Swing Brushes',
  sectionMap: {
    verseA:  ['swing-16-brushes'],
    bridge:  ['swing-16-bridge'],
    verseB:  ['swing-16-brushes-comp'],
  },
  weight: 0,  // только явный выбор
}
```

### 6.3. Bossa Standard

```typescript
{
  id: 'bossa-standard',
  style: 'bossa',
  label: 'Bossa Nova Standard',
  sectionMap: {
    verseA:  ['bossa-16-verse', 'bossa-16-verse2'],
    bridge:  ['bossa-16-bridge'],
    solo:    ['bossa-16-solo'],
  },
  weight: 1.0,
}
```

## 7. Не войдёт в эту версию (Out of Scope)

- **Автоматическая генерация организмов** на основе секций сетки (пока организмы создаются вручную/через Конструктор).
- **MIDI-ноты для non-4/4 клеток** — существующий degraded scheduler остаётся для размеров без клеток.
- **Cross-organism transition effects** (fill при смене организма на лету).
- **Per-section пользовательский выбор клетки** — пользователь не назначает клетку на секцию вручную (это уровень организма, не индивидуальной сетки).
- **Организмы для 5/4, 6/8, 7/8** — клетки только для 4/4 и 3/4 на первом этапе.
- **Полное снятие гейта `is44` для произвольных размеров** — в рамках v3 ослабляется ровно настолько, чтобы заработали размеры из `timeSignatureOverrides` (минимум 3/4). Общий не-4/4 path по-прежнему использует `scheduleDegradedSwing`, пока клетки не созданы (см. §3.4 и план T-005).

## 8. Риски и допущения

| Риск | Вероятность | Влияние | Митигация |
|---|---|---|---|
| Не все SectionType имеют клетки | Средняя | Среднее | Fallback на `verseA`; логирование предупреждения |
| Существующие пользовательские сетки без sections | Высокая | Низкое | Flat-режим через `defaultForm` — обратная совместимость |
| Увеличение сложности TransportEngine | Низкая | Среднее | `sectionType` вычисляется один раз при построении окна |
| Конструктор барабанов нужно обновить под новый формат | Высокая | Среднее | `migrateOrganism()` на входе; UI правится отдельно |
| Пользователи ожидают «ручного» назначения клеток на секции | Средняя | Низкое | Чёткое объяснение в UI: выбор организма = выбор набора связок |

## 9. Метрики успеха

- **Функционально:** при сетке с секциями барабаны меняют groove при смене секции (проверяется на слух и автотестом).
- **Вариативность:** при одной секции и 2+ клетках в пуле — чередование каждые `cell.length` тактов.
- **Обратная совместимость:** существующие flat-сетки играют без изменений.
- **Тесты:** typecheck + lint + test (6+ новых тестов в `drumInstrument.test.ts`).
- **Конструктор:** миграция старых организмов без потери данных.

---

*Документ описывает целевую архитектуру связки «секции сетки → клетки барабанов». После принятия — декомпозиция на задачи в `PLAN.md` (или отдельный `DRUMS-SECTIONS-PLAN.md`).*
