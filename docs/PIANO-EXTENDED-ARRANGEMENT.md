# Piano Extended Arrangement — видение

> **Статус:** 🟡 Проект (vision)
> **Связанные модули:** `pianoInstrument.ts`, `pianoVoicing.ts`, `pianoComping.ts`, `pianoRandomizer.ts`, `pianoMolecules.ts`, `pianoCells.ts`, `pianoOrganisms.ts`, `pianoPatternTypes.ts`, `pianoPatternEngine.ts`
> **Дата:** 2026-07-11

## 0. Проблема: однообразие аранжировки

Текущий фортепианный движок генерирует **музыкально корректный**, но **монотонный** аккомпанемент. Все молекулы играют один и тот же блок-аккорд (reference voicing E3-B3-D4). После 2–3 chorus'ов звучание становится предсказуемым.

### Корневые причины

| Причина | Где | Следствие |
|---|---|---|
| Все ноты в аккорде имеют одинаковый velocity | `pianoInstrument.ts:234-240` — jitter применяется глобально | Звучит механистично, «midi-like» |
| Все ноты аккорда извлекаются строго одновременно | `pianoMolecules.ts:42-44` — `voicingAtoms()` отдаёт ноты в одном тике | Нет живого «рассыпания» аккорда |
| Один клип на весь спан — один паттерн на все 8 тактов | `pianoCells.ts:15` — `lengthBars: 8` с одним pool | Нет вариативности внутри фразы |
| Passing chords — примитивные | `pianoRandomizer.ts:125-147` — только `4& → next` | Нет хроматических/диатонических подходов, нет diminished |
| Нет надстроек (upper structures) | `pianoVoicing.ts:48-85` — только shell/rootless/quartal | Нет tension voicings (9, 11, 13 явно), нет upper structure triads |
| Humanization — минимальный | `pianoInstrument.ts:234-240` — ±6ms jitter, ±0.05 velocity | Нет per-note артикуляции, нет dynamic phrasing |
| Randomizer — только ритмические вариации | `pianoRandomizer.ts:49-60` | Нет вариаций плотности/регистра/артикуляции |

## 1. Целевая картина

Расширенная аранжировка фортепиано должна звучать как **живой джазовый пианист**:
- **Velocity variation** — каждая нота аккорда имеет индивидуальную громкость (слабое/среднее/сильное варьирование)
- **Timing spread** — ноты аккорда извлекаются с микро-сдвигом, а не строго одновременно
- **Humanize timing** — пианист может слегка запаздывать или спешить относительно сетки
- **Ритмическая вариативность** — внутри одной клетки несколько клипов с вероятностным выбором паттерна на каждый такт
- **Фразировка** — velocity меняется по музыкальной кривой внутри фразы
- **Надстройки (Upper Structure Triads)** — tension-voicings на доминантах и мажорных аккордах
- **Проходящие аккорды** — хроматические, diminished, secondary dominant подходы

```
                         ┌──────────────────────────────┐
                         │     PianoOrganism (L3)        │
                         │  verse → chorus → bridge      │
                         └────────────┬─────────────────┘
                                      │ sectionMap
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│  PianoCell    │           │  PianoCell    │           │  PianoCell    │
│  verse-sparse │           │ chorus-dense  │           │ bridge-fills  │
│  (8 тактов)   │           │ (8 тактов)    │           │ (8 тактов)    │
└──────┬────────┘           └──────┬────────┘           └──────┬────────┘
       │ lanes                     │ lanes                     │ lanes
       ├─ comping: 4 паттерна     ├─ comping: 4 паттерна     ├─ comping: 3 паттерна
       │  (p=0.25 каждый)         │  (p=0.25 каждый)         │  (p=0.33 каждый)
       ├─ upper (p=0.4)           ├─ upper (p=0.4)           ├─ upper (p=0.3)
       ├─ fill (p=0.15)           ├─ fill (p=0.2)            └─ fill (p=0.25)
       └─ accent (p=0.2)          └─ accent (p=0.2)
```

## 2. Новые категории молекул

Добавить в `MoleculeCategory`:

| Категория | Описание | Пример |
|---|---|---|
| `groove` | Ритмический компинг (уже есть) | charleston, basie-2-4 |
| `fill` | Мелодическая вставка / проходящий аккорд | chromatic approach, diminished passing |
| `texture` | Паузы, длинные ноты (уже есть) | rest, whole-note |
| `accent` | Акценты/антиципации (уже есть) | anticipation-4and |
| **`upper`** (новое) | Надстройки / upper structure triads | US-ii/V, US-bVI/V |

## 3. Расширение модели молекул

### 3.1. Надстройки (Upper Structure Triads)

Надстройки — трезвучия, играемые поверх гармонического фундамента. Классические пары:

| Аккорд | Upper Structure | Состав | Звучание |
|---|---|---|---|
| Cmaj7 | D/C (II/C) | D-F#-A → 9, #11, 13 | Лидийский |
| Cmaj7 | G/C (V/C) | G-B-D → 5, 7, 9 | Мягкий maj |
| C7 | D♭/C7 (♭II/C7) | D♭-F-A♭ → ♭9, 11, ♭13 | Альтерированный |
| C7 | A♭/C7 (♭VI/C7) | A♭-C-E♭ → ♭13, 1, #9 | Доминантовый tension |
| Cm7 | E♭/Cm7 (♭III/Cm7) | E♭-G-B♭ → ♭3, 5, ♭7 | Основной минор |
| Cm7 | F/Cm7 (IV/Cm7) | F-A-C → 11, 13, 1 | Дорийский цвет |

Молекула надстройки:

```ts
{
  id: 'piano-upper-flatII-dom-swing',
  label: 'Upper Structure ♭II over dominant',
  bars: 1,
  atoms: [
    // Shell: 3 и ♭7 (E и B♭ для C7)
    atom('3', B1, 0.40, PPQ / 2),   // E
    atom('b7', B1, 0.40, PPQ / 2),  // B♭
    // ♭II triad (D♭-F-A♭ = ♭9, 11, ♭13)
    atom('b9', B1 + _8off, 0.48, PPQ / 2),  // D♭
    atom('11', B1 + _8off, 0.46, PPQ / 2),  // F
    atom('b13', B1 + _8off, 0.44, PPQ / 2), // A♭
  ],
  category: 'upper',
  tags: ['altered', 'dominant', 'tension'],
  complexity: { min: 2, max: 3 },
  conditions: { requireDominant: true },
}
```

### 3.2. Проходящие аккорды (Passing Chords)

Заменить примитивный `applyPassingChord` в `PianoRandomizer` на систему молекул категории `fill`:

**Типы проходящих аккордов:**

| Тип | Подход | Пример для Cmaj7 |
|---|---|---|
| **Хроматический сверху** | ♭IIm7 → I | D♭m7 → Cmaj7 |
| **Хроматический снизу** | VII7 → I | B7 → Cmaj7 |
| **Диатонический** | ii7 → V7 → I | Dm7 → G7 → Cmaj7 |
| **Diminished** | #Idim7 → ii7 | C#dim7 → Dm7 |
| **Dominant chain** | V7/ii → ii7 | A7 → Dm7 |

Каждый — отдельная 1-тактовая молекула категории `fill`, играемая с `probability` как отдельный лейн в клетке.

## 4. Расширение клеток (Cells) — ритмическая вариативность

### 4.1. Проблема: один паттерн на всю фразу

Текущие клетки используют один клип на весь спан (например, `{ startBar: 0, lengthBars: 8, pool: [один паттерн] }`). Это значит, что все 8 тактов звучат одинаково.

### 4.2. Решение: multi-clip pool с вероятностным выбором

Разбиваем спан на несколько клипов, каждый со своим пулом паттернов. Движок на каждом такте взвешенно выбирает молекулу из активного клипа:

```ts
// Было: один клип, один паттерн на 8 тактов
{ name: 'comping', probability: 1.0, clips: [
  { startBar: 0, lengthBars: 8, pool: [
    { moleculeId: 'piano-charleston-swing', weight: 10 },
  ]},
]},

// Стало: 4 клипа по 2 такта, каждый с 3–4 паттернами с равной вероятностью
{ name: 'comping', probability: 1.0, clips: [
  { startBar: 0, lengthBars: 2, pool: [
    { moleculeId: 'piano-charleston-swing', weight: 25 },
    { moleculeId: 'piano-basie-2-4-swing', weight: 25 },
    { moleculeId: 'piano-kelly-push-swing', weight: 25 },
    { moleculeId: 'piano-garland-swing', weight: 25 },
  ]},
  { startBar: 2, lengthBars: 2, pool: [
    { moleculeId: 'piano-charleston-swing', weight: 25 },
    { moleculeId: 'piano-offbeat-comp-swing', weight: 25 },
    { moleculeId: 'piano-garland-swing', weight: 25 },
    { moleculeId: 'piano-anticipation-4and-swing', weight: 25 },
  ]},
  { startBar: 4, lengthBars: 2, pool: [
    { moleculeId: 'piano-basie-2-4-swing', weight: 25 },
    { moleculeId: 'piano-kelly-push-swing', weight: 25 },
    { moleculeId: 'piano-charleston-swing', weight: 25 },
    { moleculeId: 'piano-offbeat-comp-swing', weight: 25 },
  ]},
  { startBar: 6, lengthBars: 2, pool: [
    { moleculeId: 'piano-garland-swing', weight: 25 },
    { moleculeId: 'piano-charleston-swing', weight: 25 },
    { moleculeId: 'piano-anticipation-4and-swing', weight: 25 },
    { moleculeId: 'piano-basie-2-4-swing', weight: 25 },
  ]},
]},
```

При вероятности 0.25 у каждого из 4 паттернов, каждый 2-тактовый блок будет звучать по-разному. На 8 тактах это даёт 4^4 = 256 возможных комбинаций — вариативность, исключающая повторяемость.

### 4.3. Роли лейнов (lane names)

| Лейн | Роль | Вероятность |
|---|---|---|
| `comping` | Основной ритмический компинг | 0.8–1.0 |
| `fill` | Проходящие аккорды / fills | 0.1–0.3 |
| `upper` | Надстройки (upper structure) | 0.1–0.4 |
| `accent` | Акценты / антиципации | 0.15–0.3 |

### 4.4. Пример расширенной клетки

```ts
const swingVerseExtended: PianoCell = {
  id: 'piano-swing-verse-extended',
  style: 'swing',
  length: 8,
  velocity: 0.8,
  dynamics: { type: 'wave', amount: 0.15 },
  lanes: [
    // Comping: 4 клипа по 2 такта, в каждом 4 паттерна с равным весом
    { name: 'comping', probability: 1.0, clips: [
      { startBar: 0, lengthBars: 2, pool: [
        { moleculeId: 'piano-charleston-swing', weight: 25 },
        { moleculeId: 'piano-basie-2-4-swing', weight: 25 },
        { moleculeId: 'piano-kelly-push-swing', weight: 25 },
        { moleculeId: 'piano-garland-swing', weight: 25 },
      ]},
      { startBar: 2, lengthBars: 2, pool: [
        { moleculeId: 'piano-charleston-swing', weight: 25 },
        { moleculeId: 'piano-offbeat-comp-swing', weight: 25 },
        { moleculeId: 'piano-garland-swing', weight: 25 },
        { moleculeId: 'piano-anticipation-4and-swing', weight: 25 },
      ]},
      { startBar: 4, lengthBars: 2, pool: [
        { moleculeId: 'piano-basie-2-4-swing', weight: 25 },
        { moleculeId: 'piano-kelly-push-swing', weight: 25 },
        { moleculeId: 'piano-charleston-swing', weight: 25 },
        { moleculeId: 'piano-offbeat-comp-swing', weight: 25 },
      ]},
      { startBar: 6, lengthBars: 2, pool: [
        { moleculeId: 'piano-garland-swing', weight: 25 },
        { moleculeId: 'piano-charleston-swing', weight: 25 },
        { moleculeId: 'piano-anticipation-4and-swing', weight: 25 },
        { moleculeId: 'piano-basie-2-4-swing', weight: 25 },
      ]},
    ]},
    // Upper structures: на доминантах (40% шанс в тактах с V7)
    { name: 'upper', probability: 0.4, clips: [
      { startBar: 3, lengthBars: 1, pool: [
        { moleculeId: 'piano-upper-flatII-dom-swing', weight: 5 },
        { moleculeId: 'piano-upper-flatVI-dom-swing', weight: 3 },
      ]},
      { startBar: 7, lengthBars: 1, pool: [
        { moleculeId: 'piano-upper-flatII-dom-swing', weight: 5 },
        { moleculeId: 'piano-upper-dim-dom-swing', weight: 3 },
      ]},
    ]},
    // Fills: концы фраз (15% шанс)
    { name: 'fill', probability: 0.15, clips: [
      { startBar: 3, lengthBars: 1, pool: [
        { moleculeId: 'piano-fill-chromatic-approach-swing', weight: 4 },
        { moleculeId: 'piano-fill-dim-passing-swing', weight: 3 },
      ]},
      { startBar: 7, lengthBars: 1, pool: [
        { moleculeId: 'piano-fill-pentatonic-approach-swing', weight: 4 },
        { moleculeId: 'piano-fill-chromatic-descend-swing', weight: 3 },
      ]},
    ]},
    // Accent: границы фраз (20% шанс)
    { name: 'accent', probability: 0.2, clips: [
      { startBar: 0, lengthBars: 1, pool: [
        { moleculeId: 'piano-accent-anticipation-swing', weight: 1 },
      ]},
      { startBar: 4, lengthBars: 1, pool: [
        { moleculeId: 'piano-accent-anticipation-swing', weight: 1 },
      ]},
    ]},
  ],
};
```

## 5. Humanization

### 5.1. Текущее состояние

```ts
// pianoInstrument.ts:234-240
if (this.humanize) {
  atTicks += Math.round((Math.random() * 2 - 1) * maxJitterTicks); // ±6 ms
  velocity += (Math.random() * 2 - 1) * 0.05;                     // ±0.05
}
```

Это **глобальный** humanization — одинаковый для всех нот. Живой пианист играет с **per-note** нюансами: ноты аккорда не извлекаются с одинаковой громкостью и не строго одновременно.

### 5.2. Целевая модель

```ts
interface HumanizeParams {
  /** Timing jitter per note in ms (scaled to ticks by tempo). */
  timingJitterMs: number;
  /** Per-note velocity variation intensity. */
  velocityVariation: 'off' | 'light' | 'medium' | 'strong';
  /** Micro-spread between notes of a chord (arpeggiation of block chords). */
  chordSpreadMs: number;
  /** Dynamic phrasing: velocity curve over a 4-bar phrase. */
  phrasing: 'flat' | 'gentle' | 'expressive';
  /** Humanize timing offset: subtle rush or lag feel. */
  humanizeTiming: 'none' | 'slight-rush' | 'slight-lag' | 'medium-rush' | 'medium-lag';
}

const DEFAULT_HUMANIZE: HumanizeParams = {
  timingJitterMs: 6,
  velocityVariation: 'medium',
  chordSpreadMs: 8,
  phrasing: 'expressive',
  humanizeTiming: 'slight-lag',
};
```

### 5.3. Velocity variation (per-note)

Каждая нота аккорда получает индивидуальное отклонение velocity. Интенсивность задаётся уровнем:

| Уровень | Диапазон отклонения | Характер |
|---|---|---|
| `off` | 0 | Все ноты строго одинаковой громкости |
| `light` | ±0.03 | Едва заметное различие |
| `medium` | ±0.06 | Ощутимая неровность, «живой» характер |
| `strong` | ±0.10 | Выраженная артикуляция, выделение отдельных голосов |

```ts
function applyVelocityVariation(baseVelocity: number, level: string): number {
  const ranges: Record<string, number> = {
    off: 0,
    light: 0.03,
    medium: 0.06,
    strong: 0.10,
  };
  const range = ranges[level] ?? 0.06;
  return clamp(baseVelocity + (Math.random() * 2 - 1) * range, 0, 1);
}
```

### 5.4. Chord spread (микро-рассыпание аккорда)

Ноты аккорда не извлекаются строго одновременно — каждая получает случайный микро-сдвиг в пределах `chordSpreadMs`:

```ts
function applyChordSpread(atTick: number, noteIndex: number, totalNotes: number, spreadMs: number, ppq: number, bpm: number): number {
  // Каждая нота получает индивидуальный сдвиг в пределах ±spreadMs
  const spreadTicks = Math.round((spreadMs / 1000) * (bpm / 60) * ppq);
  return atTick + Math.round((Math.random() * 2 - 1) * spreadTicks);
}
```

### 5.5. Humanize timing (запаздывание/спешка)

Пианист может иметь тенденцию слегка опережать или отставать от сетки. Это **глобальный** сдвиг всего аккорда (в отличие от per-note chord spread):

| Параметр | Описание | Сдвиг |
|---|---|---|
| `none` | Строго по сетке | 0 ms |
| `slight-rush` | Едва заметная спешка | −3..−8 ms |
| `slight-lag` | Едва заметное запаздывание | +3..+8 ms |
| `medium-rush` | Ощутимая спешка | −8..−15 ms |
| `medium-lag` | Ощутимое запаздывание | +8..+15 ms |

```ts
function applyHumanizeTiming(atTick: number, timing: string, ppq: number, bpm: number): number {
  const ranges: Record<string, [number, number]> = {
    none: [0, 0],
    'slight-rush': [-8, -3],
    'slight-lag': [3, 8],
    'medium-rush': [-15, -8],
    'medium-lag': [8, 15],
  };
  const [min, max] = ranges[timing] ?? [0, 0];
  const offsetMs = min + Math.random() * (max - min);
  const offsetTicks = Math.round((offsetMs / 1000) * (bpm / 60) * ppq);
  return atTick + offsetTicks;
}
```

### 5.6. Phrasing (динамическая фразировка)

Velocity меняется не случайно, а по музыкальной кривой внутри фразы:

```
Такт 1      Такт 2      Такт 3      Такт 4
 ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
█       ████    ██████         ████
█       █  █    █    █         █  █
█       █  █    █    █         █  █
flat     crescendo  peak       decrescendo
```

```ts
function phrasingMultiplier(barInPhrase: number, beat: number, phrasing: string): number {
  switch (phrasing) {
    case 'expressive':
      return 0.88 + 0.08 * Math.sin((barInPhrase / 4) * Math.PI);
    case 'gentle':
      return 0.95 + 0.05 * Math.sin((barInPhrase / 4) * Math.PI);
    default:
      return 1.0;
  }
}
```

### 5.7. Порядок применения humanization

При планировании каждой ноты, параметры применяются в порядке:

1. **Humanize timing** (глобальный сдвиг всего аккорда — rush/lag)
2. **Phrasing** (velocity × кривая фразы)
3. **Chord spread** (per-note микро-сдвиг тиков)
4. **Timing jitter** (per-note случайный jitter)
5. **Velocity variation** (per-note случайное отклонение velocity)

### 5.8. Настройки humanize в StyleProfile

```ts
interface PianoSettings {
  profile: CompingProfileId;
  voicingDensity: PianoVoicingDensity;
  humanize: HumanizeParams;
}
```

## 6. Генератор надстроек (Upper Structure Engine)

Алгоритмический выбор надстройки в зависимости от функции аккорда:

```ts
function suggestUpperStructure(
  chord: ChordSymbol,
  functionHint: 'tonic' | 'subdominant' | 'dominant' | 'passing',
): UpperStructureType | null {
  switch (chord.quality) {
    case 'dominant':
      if (functionHint === 'dominant') {
        // Альтерированные доминанты: ♭II, ♭VI, dim
        return weightedPick([
          { type: 'flatII', weight: 4 },  // ♭9, 11, ♭13
          { type: 'flatVI', weight: 3 },  // ♭13, 1, #9
          { type: 'dim', weight: 2 },     // diminished colours
        ]);
      }
      return null;
    case 'major':
      return weightedPick([
        { type: 'II', weight: 5 },     // 9, #11, 13 (лидийский)
        { type: 'V', weight: 3 },      // 5, 7, 9 (мягкий)
        { type: 'VI', weight: 2 },     // 13, 1, 3
      ]);
    // ...
  }
}
```

## 7. План реализации (фазы)

### Фаза A: Humanization (минимальный объём, максимальный эффект)

**Файлы:** `pianoInstrument.ts`, `pianoPatternTypes.ts`

1. Добавить `HumanizeParams` в `pianoPatternTypes.ts`
2. Реализовать `velocityVariation` (per-note, уровни off/light/medium/strong)
3. Реализовать `chordSpread` (микро-рассыпание нот аккорда)
4. Реализовать `humanizeTiming` (rush/lag, глобальный сдвиг)
5. Реализовать `phrasing` (velocity curves)
6. Добавить настройки в `PianoSettings`

**Оценка:** 4–6 часов

### Фаза B: Новые категории молекул

**Файлы:** `pianoMolecules.ts`, `pianoPatternTypes.ts`, `pianoPatternEngine.ts`

1. Добавить категорию `upper` в `MoleculeCategory`
2. Создать 8–12 молекул верхних надстроек (upper structure triads)
3. Создать 8–12 молекул проходящих аккордов (категория `fill`)
4. Адаптировать `assembleBar` для транспозиции молекул (интервалы → MIDI)

**Оценка:** 8–12 часов

### Фаза C: Upper Structure Engine

**Файлы:** `pianoVoicing.ts` (или новый `pianoUpperStructures.ts`)

1. Таблица upper structure triads для всех quality аккордов
2. Функция `suggestUpperStructure(chord, hint) → intervals`
3. Генерация конкретных нот с учётом регистра
4. Интеграция в `buildPianoVoicing` (отдельный путь для `density === 'upper'`)

**Оценка:** 6–8 часов

### Фаза D: Расширенные клетки — ритмическая вариативность

**Файлы:** `pianoCells.ts`, `pianoOrganisms.ts`

1. Переработать существующие клетки: multi-clip pool с 3–4 паттернами на каждый 2-тактовый блок
2. Создать 3–5 новых клеток с лейнами `comping` + `upper` + `fill` + `accent`
3. Создать 3–5 расширенных организмов
4. Настроить веса для естественного баланса

**Оценка:** 6–10 часов

### Фаза E: Проходящие аккорды как молекулы

**Файлы:** `pianoMolecules.ts`, `pianoRandomizer.ts`

1. Создать 8–12 молекул passing chords (хроматические, diminished, secondary dominants)
2. Заменить `applyPassingChord` в Randomizer на выбор из пула
3. Passing chords учитывают следующий аккорд для выбора подхода

**Оценка:** 4–6 часов

## 8. Риски и ограничения

| Риск | Серьёзность | Митигация |
|---|---|---|
| Слишком много лейнов → перегруженное звучание | Средняя | Лимит на одновременные лейны, low probability для fill/upper |
| Верхние надстройки конфликтуют с Rhodes | Средняя | Расширить `pianoRhodesInteraction.ts` для категории `upper` |
| Humanization замедляет scheduling | Низкая | Все вычисления — чистые функции, кеширование phrasing |
| Passing chords вне тональности | Средняя | Валидация: passing chord проверяет общие тона с целевым |
| Молекулы верхних надстроек требуют разных нот для разных аккордов | Высокая | **Транспозиция молекул**: atom хранит не MIDI номер, а интервал от root. Движок резолвит в конкретные ноты при `assembleBar`. |

### Ключевой инсайт: транспозиция молекул

Текущие молекулы жёстко привязаны к Cmaj7 (reference voicing E3-B3-D4). Для надстроек это не работает — нужны **относительные** heights:

```ts
// Было: абсолютный MIDI
atom('52', B1, 0.35, PPQ), // E3

// Стало: интервал от root + октава
atom('3', B1, 0.35, PPQ),  // major 3rd in octave 3
```

Транспозиция происходит на уровне `scheduleVoicing`: для каждого `Atom` с `sound: интервал`, движок вычисляет абсолютную ноту как `rootMidi + interval + octave*12`.

> **Решение:** `PianoAtom.sound` становится `string` — **интервал** от root (например, `'3'`, `'b7'`, `'9'`, `'#11'`). Движок резолвит в MIDI при `assembleBar` с учётом текущего аккорда.

## 9. Пример: как это звучит

### До (текущее состояние)

```
Такт 1: [блок-аккорд E3-B3-D4] ...тишина... [блок-аккорд E3-B3-D4 на 2&]
Такт 2: [блок-аккорд A3-C4-E4] ...тишина... [блок-аккорд A3-C4-E4 на 2&]
...
(одинаково все 32 такта, все ноты с одним velocity, строго одновременно)
```

### После (расширенная аранжировка)

```
Такт 1: comping: charleston (D4 на 1, G4 на 2&) — ноты с микро-разбросом 6ms, velocity чуть разный
Такт 2: comping: basie-2-4 (G4-B4 на 1, C5-E5 на 3) — другой паттерн из пула
Такт 3: comping: offbeat (F4-A4-C5 на 2&, 3&, 4&) + upper: US ♭II/V (D♭-F-A♭ на 3-й доле)
Такт 4: comping: garland (D4 на 1, E4-G4 на 3&) — снова другой паттерн
Такт 5: comping: charleston + fill: chromatic approach B4-A4-G#4 перед переходом
...
(каждый такт — новый выбор из пула, ноты «живые», фразировка дышит)
```

## 10. Настройки в UI (конструктор фортепиано)

В плагин-конструктор фортепиано добавить:

```
┌─ Piano Settings ──────────────────────────────┐
│                                                │
│  Voicing Density:  [shell2 ▾]                  │
│  Comping Profile:  [swing-sparse ▾]            │
│  Randomization:    [moderate ▾]                │
│                                                │
│  ── Humanize ──────────────────────────────    │
│  Timing Jitter:      [══════●═════] 6 ms       │
│  Velocity Variation: [medium ▾]                │
│  Chord Spread:       [══════●═════] 8 ms       │
│  Phrasing:           [expressive ▾]            │
│  Humanize Timing:    [slight-lag ▾]            │
│                                                │
│  ── Extended (on/off) ─────────────────────    │
│  ☑ Upper Structures   ☑ Passing Chords          │
│                                                │
└────────────────────────────────────────────────┘
```

---

*Документ обновлён: 2026-07-11*
*Связанные документы: `docs/PIANO.md` (текущая реализация), `docs/RHODES.md` (комплементарный слой)*
