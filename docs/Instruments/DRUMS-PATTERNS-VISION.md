# DRUMS-PATTERNS-VISION — Архитектура барабанных паттернов и рандомизации

> **Дата:** 2026-07-03
> **Версия:** 1.2
> **Статус:** 🟢 Реализовано (verse-only loop), 🟡 Черновик (intro/ending/bridge)
> **Связанные документы:** `DRUMS-VISION.md` (сэмплы и артикуляции), `DRUMS.md` (текущая реализация), `STYLES.md` (стили и ансамбли)

## 1. Резюме

**Проблема:** Текущая реализация барабанных паттернов — плоская: каждый стиль реализован как один жёстко заданный цикл (`scheduleSwing()`, `scheduleBossa()`, `scheduleFunk()`), который повторяется каждый такт. Вариативность достигается только постфактум через `DrumRandomizer` (ride variation, ghost notes, fills). Это приводит к механистичному, «драм-машинному» звучанию: нет структурного развития на протяжении формы (8–32 такта), нет стиле-специфичных нюансов для latin и ballad, нет многотактовых фраз, нет иерархической организации.

**Дополнительная проблема (v1.1):** В архитектуре v1.0 клетки содержали секции разных типов (groove → build → peak → fill → crash), сменяющиеся каждые 2–4 такта. Это создавало «суету» — слишком частую и хаотичную смену манеры игры, неестественную для живого барабанщика.

**Цель:** Построить четырёхуровневую архитектуру паттернов:

- **Атомы** — отдельные звуки и их артикуляции (kick, snare_center, hihat_closed, ride_bow, …). Уже частично реализованы через `DrumSound` + `resolveDrumArticulation()`.
- **Молекулы** — детерминированные группы звуков в рамках 1–2 тактов, образующие узнаваемые ритмические фигуры (ride-паттерн, clave, backbeat, ghost-note фраза).
- **Клетки** — стабильные groove-блоки на 8, 16 или 32 такта с периодическими вариациями (каждые N тактов), fills и crash по расписанию (каждые 8/16/32 тактов). Внутри клетки манера игры не меняется хаотично — groove играет устойчиво, смена происходит только по расписанию.
- **Организмы** — композиционная форма произведения: intro → A1 → A2 → B → ending. Каждая часть формы назначает свою клетку. Именно организм управляет макро-структурой и сменой «манеры игры».

Рандомизация (`DrumRandomizer`) оперирует на уровне клетки (микро-вариации внутри groove). Молекулы — детерминированные наборы. Организм — структурный каркас, не рандомизируется.

**Горизонт:** Новая подсистема в `music-core/audio/` — `DrumPatternEngine`, переиспользующая существующие `DrumInstrument`, `DrumRandomizer` и `resolveDrumArticulation()`.

## 2. Текущее состояние (as-is)

### 2.1. Архитектура паттернов

```
DrumInstrument.schedule(style)
├── scheduleSwing()    ← жёсткий цикл: ride + bass drum + snare на 2/4
├── scheduleBossa()    ← жёсткий цикл: rim clave + bass drum + hihat
├── scheduleFunk()     ← жёсткий цикл: 16-е hihat + syncopated bass drum
└── (latin/ballad)     → деградируют до scheduleSwing()

     ↓ post-hoc

DrumRandomizer.apply(hits, ctx)
├── Ride variation      ← velocity ±15%,偶尔 пропуск
├── Bass drum variation ← velocity ±30%, ghost-kick
├── Snare ghost notes   ← тихие ноты на 'e' и 'a'
└── Fills               ← заменяют beat 4 каждые N тактов
```

### 2.2. Ограничения

| Аспект | Сейчас | Проблема |
|--------|--------|----------|
| **Структура** | Один цикл на стиль, повторяется каждый такт | Нет развития; слушатель слышит «loop» |
| **Latin** | Деградирует до swing | Босса — не латино; нужны cascara, montuno, songo |
| **Ballad** | Деградирует до swing | Нужны brushes-текстуры, разреженный kick, мягкий ride |
| **Вариативность** | Постфактум (randomizer меняет готовые hits) | Нет выбора альтернативных молекул; вариации случайны, а не музыкальны |
| **Многотактовость** | Только fills каждые N тактов | Нет фразировки на 4–8 тактов; нет нарастания/спада |
| **Crash** | Каждые `crashFrequency` тактов на beat 1 | Нет связи crash с fills; нет вариантов crash (sizzle, splash) |
| **Fills** | Только на beat 4, стиль-специфичные | Нет томовых fills перед crash; нет buzz/flam в fills |
| **Ghost notes** | Случайные на 'e' и 'a' | Нет стиле-специфичных ghost-фраз; нет buzz/flam ghost |
| **Humanize** | Только timing jitter ±2–7 мс | Нет velocity-вариаций внутри молекулы; нет микро-сдвигов |

### 2.3. Что уже есть и будет переиспользовано

- `DrumInstrument` — класс инструмента, `schedule()`, `updateSettings()`
- `DrumInstrumentSettings` — все per-sound настройки (включая артикуляции из DRUMS-VISION)
- `DrumRandomizer` — вероятностные операции, fills, ghost notes
- `resolveDrumArticulation()` — map velocity+style → артикуляция
- `barGrooveOffset()` — детерминированный groove на бар
- `StyleProfile` / `getStyleProfile()` — per-instrument per-style defaults

## 3. Целевая архитектура: атомы → молекулы → клетки → организмы

> **Принцип разделения ответственности:**
> - **Атом** = один звук (что звучит)
> - **Молекула** = ритмическая фигура на 1–2 такта (как звучит один фрагмент)
> - **Клетка** = стабильный groove-блок на 8/16/32 такта с вариациями, fills и crash по расписанию (как звучит одна часть формы)
> - **Организм** = композиционная форма: intro → A1 → A2 → B → ending (как звучит всё произведение)
>
> Ключевое изменение относительно v1.0: **раньше клетка содержала «секции» разных типов (groove → build → peak → fill), которые сменялись каждые 2–4 такта — это создавало суету. Теперь клетка — стабильный блок с одной манерой игры; смена манеры происходит только при переходе к другой части формы — это ответственность организма.**

### 3.1. Уровень 0: Атомы

**Атом** — один звук с артикуляцией и параметрами.

```ts
interface DrumAtom {
  sound: DrumSound;        // 'kick', 'snare_center', 'ride_bow', 'snare_buzz', ...
  atTick: number;          // смещение от начала молекулы/такта в тиках
  velocity: number;        // 0–1
  durationTicks: number;
  /** Артикуляция уже разрешена (не legacy 'snare'/'ride') */
}
```

Атомы не существуют самостоятельно — они всегда часть молекулы. Разрешение артикуляции (`snare` → `snare_center`/`snare_buzz`/`snare_rimshot`) происходит на уровне `DrumPatternEngine` **до** сборки молекулы — в зависимости от стиля, velocity-контекста и вероятностных настроек.

### 3.2. Уровень 1: Молекулы

**Молекула** — именованная ритмическая фигура из 1–2 тактов, состоящая из атомов.

```ts
interface DrumMolecule {
  /** Уникальный ID, например 'swing-ride-basic', 'funk-kick-syncopated-1' */
  id: string;
  /** Человекочитаемое описание */
  label: string;
  /** Стиль, к которому принадлежит */
  style: DrumStyle;
  /** Длительность в тактах (1 или 2) */
  bars: 1 | 2;
  /** Список атомов с tick-смещениями от начала молекулы */
  atoms: DrumAtom[];
  /** Категория: groove, fill, texture, accent, intro, ending */
  category: 'groove' | 'fill' | 'texture' | 'accent' | 'intro' | 'ending';
  /** Теги для фильтрации: 'ride', 'hihat', 'snare', 'kick', 'tom', 'crash', 'ghost', 'buzz', 'flam' */
  tags: string[];
  /** Вес для случайного выбора (чем выше, тем чаще выбирается) */
  weight: number;
  /** Минимальная/максимальная сложность (1–3), при которой молекула доступна */
  complexity: { min: 1 | 2 | 3; max: 1 | 2 | 3 };
  /** Условия применения: только если rideEnabled, только для fills и т.д. */
  conditions?: MoleculeConditions;
}

interface MoleculeConditions {
  requireRide?: boolean;
  requireHihat?: boolean;
  requireSnare?: boolean;
  requireCrash?: boolean;
  requireToms?: boolean;
  requireStir?: boolean;
  /** Молекула только для barIndex, кратного N */
  barModulo?: number;
  /** Молекула только для первых/последних N тактов формы */
  barRange?: { first?: number; last?: number };
}
```

**Молекулы — это данные, не код.** Они хранятся в статических словарях (аналог `DRUM_SAMPLE_FILES`) и загружаются при инициализации. Новые молекулы добавляются без изменения кода.

#### Примеры молекул

##### Swing

| ID | Описание | Тактов | Категория |
|----|----------|--------|-----------|
| `swing-ride-basic` | Ride ding-ding-a-ding + hihat chick 2/4 | 1 | groove |
| `swing-ride-variation-1` | Ride с дополнительным skip на 1& | 1 | groove |
| `swing-ride-variation-2` | Ride с bell-акцентом на 1 (если rideBellEnabled) | 1 | groove |
| `swing-feathering-1` | Bass drum feathering (все 4 доли) | 1 | groove |
| `swing-feathering-2` | Bass drum только 1 и 3 | 1 | groove |
| `swing-feathering-3` | Bass drum 1, 3&, 4 (syncopated) | 1 | groove |
| `swing-snare-backbeat` | Snare на 2 и 4 | 1 | groove |
| `swing-snare-ghost-phrase` | Ghost-ноты на 'e' и 'a' 3-й доли | 1 | texture |
| `swing-stir-texture` | Stir на 2 и 4 (джазовая текстура) | 1 | texture |
| `swing-crash-accent` | Crash на 1-й доле | 1 | accent |
| `swing-fill-triplet-1` | Триольный fill snare + tom | 1 | fill |
| `swing-fill-tom-run` | Томовый run 16-ми | 1 | fill |
| `swing-intro-4clicks` | 4 клика stick-click перед входом | 1 | intro |
| `swing-ending-crash` | Финальный crash + release | 1 | ending |

##### Bossa Nova

| ID | Описание | Тактов | Категория |
|----|----------|--------|-----------|
| `bossa-clave-rim-1` | Базовый clave: rim на 1, 2, 3 | 1 | groove |
| `bossa-clave-rim-2` | Clave с вариацией: rim на 1, 2&, 3, 4 | 1 | groove |
| `bossa-clave-xstick` | Cross-stick вариант clave | 1 | groove |
| `bossa-kick-partido` | Partido alto kick: 1, 2&, 3& | 1 | groove |
| `bossa-kick-syncopated` | Синкопированный kick: 1, 2&, 3, 4& | 1 | groove |
| `bossa-hihat-8ths` | Восьмые hihat (закрытый + полуоткрытый) | 1 | groove |
| `bossa-hihat-chick` | Hihat chick на 2 и 4 | 1 | groove |
| `bossa-ride-bossa` | Ride bossa-паттерн (1, 1&, 2&, 3, 3&, 4&) | 1 | groove |
| `bossa-fill-tom-samba` | Томовый fill в стиле samba | 1 | fill |
| `bossa-fill-rim-variation` | Вариация clave с дополнительными rim | 1 | fill |
| `bossa-crash-accent` | Crash на 1-й доле | 1 | accent |

##### Funk

| ID | Описание | Тактов | Категория |
|----|----------|--------|-----------|
| `funk-kick-linear-1` | Linear kick: 1, 1&, 2&, 3, 3e | 1 | groove |
| `funk-kick-linear-2` | Linear kick: 1, 1a, 2&, 3&, 4 | 1 | groove |
| `funk-kick-ghosted` | Kick с ghost-нотами на 'e' и 'a' | 1 | groove |
| `funk-snare-backbeat` | Snare accent на 2 и 4 | 1 | groove |
| `funk-snare-rimshot` | Rimshot на 2 и 4 (accent) | 1 | groove |
| `funk-snare-ghost-16ths` | Ghost-ноты 16-ми между backbeat'ами | 1 | texture |
| `funk-snare-buzz-phrase` | Buzz-roll фраза (2 такта) | 2 | texture |
| `funk-snare-flam-accent` | Flam на 4-й доле → переход | 1 | accent |
| `funk-hihat-16ths` | Закрытый hihat 16-ми | 1 | groove |
| `funk-hihat-open-offbeat` | Открытый hihat на offbeat'ах | 1 | groove |
| `funk-hihat-bark` | Hihat bark (короткий открытый) на 1& | 1 | accent |
| `funk-ride-bell` | Ride bell на 1 и 3 | 1 | groove |
| `funk-crash-sizzle` | Sizzle crash на 1-й доле | 1 | accent |
| `funk-fill-16ths` | 16-е snare fill + crash | 1 | fill |
| `funk-fill-tom-bass` | Tom + kick fill перед crash | 1 | fill |
| `funk-fill-buzz-flam` | Fill с buzz + flam | 1 | fill |
| `funk-intro-4bars` | 4-тактовое intro (kick build-up) | 2 | intro |

##### Latin

| ID | Описание | Тактов | Категория |
|----|----------|--------|-----------|
| `latin-cascara-1` | Cascara на ride/rim: 1, 1&, 2, 2&, 3, 3a, 4 | 1 | groove |
| `latin-cascara-2` | Cascara вариация с акцентами | 1 | groove |
| `latin-clave-son-2-3` | Son clave 2-3 | 2 | groove |
| `latin-clave-son-3-2` | Son clave 3-2 | 2 | groove |
| `latin-clave-rumba-3-2` | Rumba clave 3-2 | 2 | groove |
| `latin-kick-tumbao` | Tumbao kick: 1, 2&, 3, 4 | 1 | groove |
| `latin-kick-montuno` | Montuno kick: синкопированный | 1 | groove |
| `latin-hihat-cascara` | Hihat + cascara комбинация | 1 | groove |
| `latin-crash-accent` | Crash на 1 | 1 | accent |
| `latin-fill-timbal` | Timbal-style fill | 1 | fill |
| `latin-fill-conga` | Conga-style томовый fill | 1 | fill |

##### Ballad

| ID | Описание | Тактов | Категория |
|----|----------|--------|-----------|
| `ballad-ride-soft` | Мягкий ride (только доли, без swing-восьмых) | 1 | groove |
| `ballad-ride-brushes` | Ride + stir (имитация щёток) | 1 | groove |
| `ballad-kick-feathering` | Bass drum feathering (очень мягко) | 1 | groove |
| `ballad-kick-two-feel` | Kick на 1 и 3 (two-feel) | 1 | groove |
| `ballad-snare-crossstick` | Cross-stick на 2 и 4 (вместо snare) | 1 | groove |
| `ballad-snare-soft` | Snare на 2 и 4 (мягко) | 1 | groove |
| `ballad-hihat-chick` | Hihat chick на 2 и 4 (очень тихо) | 1 | groove |
| `ballad-stir-texture` | Stir текстурный слой | 1 | texture |
| `ballad-crash-soft` | Мягкий crash (sizzle) на 1 | 1 | accent |
| `ballad-fill-brush` | Мягкий fill (snare ghost + cross-stick) | 1 | fill |
| `ballad-fill-tom-swell` | Томовый swell (крещендо) | 2 | fill |
| `ballad-ending-ritard` | Замедляющийся ending | 2 | ending |

### 3.3. Уровень 2: Клетки

**Клетка** — стабильный groove-блок длиной 8, 16 или 32 такта. В отличие от v1.0, клетка **не содержит сменяющихся секций** (groove → build → peak → fill → crash). Вместо этого клетка определяет **одну манеру игры** на всю свою длину:

- **Базовый groove** играет устойчиво, без резких смен
- **Вариации** происходят по расписанию (каждые N тактов), а не хаотично
- **Fill** играется строго по расписанию (каждые 8, 16 или 32 такта) перед crash
- **Crash** — также по расписанию, вместе с fill
- После завершения клетки (возврат на долю 1) **можно сменить манеру** — например, перейти от groove к texture. Это делает организм (см. §3.4)

```ts
interface DrumCell {
  /** Уникальный ID, например 'swing-16-restrained' */
  id: string;
  /** Стиль */
  style: DrumStyle;
  /** Длина в тактах */
  length: 8 | 16 | 32;
  /** Размер: 4/4 или 5/4 */
  timeSignature: [4, 4] | [5, 4];

  // ── Основной groove ──
  /** Пул молекул для основного groove (выбирается при старте клетки) */
  grooveMoleculePool: string[];

  // ── Вариации ──
  /** Каждые сколько тактов вставляется вариация (0 = без вариаций) */
  variationEveryBars: number;
  /** Пул вариационных молекул (ride variation, kick syncopation, etc.) */
  variationMoleculePool: string[];
  /** Сколько разных вариаций использовать (из пула) */
  variationCount: number;

  // ── Fill и Crash ──
  /** Fill каждые N тактов (8, 16, 32). Fill всегда предшествует crash */
  fillEveryBars: 8 | 16 | 32;
  /** Пул fill-молекул */
  fillMoleculePool: string[];
  /** Тип crash */
  crashType: DrumSound;

  // ── Динамика ──
  /** Тип динамической кривой внутри клетки */
  dynamicsType: 'steady' | 'crescendo' | 'decrescendo' | 'wave';
  /** Базовый множитель громкости клетки */
  volumeMul: number;

  // ── Текстура (опционально) ──
  /** Пул текстурных молекул для переключения groove→texture */
  textureMoleculePool?: string[];

  /** Вес для случайного выбора */
  weight: number;
}
```

**Ключевые отличия от v1.0:**

| Аспект | v1.0 (старая клетка) | v1.1 (новая клетка) |
|--------|----------------------|---------------------|
| Структура | Секции разных типов: groove→build→peak→fill→crash | Единый groove-блок с вариациями и fills по расписанию |
| Смена манеры | Каждые 2–4 такта (внутри клетки) | Только при смене клетки (организм управляет) |
| Intro/ending | Как тип секции внутри клетки | Как отдельная клетка, назначаемая организмом |
| Build | Как тип секции внутри клетки | Реализуется через `dynamicsType: 'crescendo'` или отдельную build-клетку |
| Рандомизация | Секции перемешиваются (`sectionShuffle`) | `DrumRandomizer` работает внутри стабильного groove (ride variation, ghost notes) |

#### Примеры клеток

##### Swing — 16 тактов (verse, стабильный groove)

```ts
{
  id: 'swing-16-verse',
  style: 'swing',
  length: 16,
  timeSignature: [4, 4],
  grooveMoleculePool: ['swing-ride-basic', 'swing-feathering-1', 'swing-snare-backbeat'],
  variationEveryBars: 16,       // вариация раз в длину клетки (= длина композиции)
  variationMoleculePool: ['swing-ride-variation-1', 'swing-feathering-2', 'swing-stir-texture'],
  variationCount: 1,            // одна вариация на цикл (groove → stir texture)
  fillEveryBars: 16,            // fill + crash в конце клетки
  fillMoleculePool: ['swing-fill-triplet-1'],
  crashType: 'crash',
  dynamicsType: 'steady',
  volumeMul: 0.9,
  textureMoleculePool: ['swing-stir-texture'],  // для textureMode
  weight: 1.0,
}
```

##### Swing — 16 тактов (эмоциональный groove для bridge)

```ts
{
  id: 'swing-16-emotional',
  style: 'swing',
  length: 16,
  timeSignature: [4, 4],
  grooveMoleculePool: ['swing-ride-variation-2', 'swing-feathering-3', 'swing-snare-ghost-phrase'],
  variationEveryBars: 4,
  variationMoleculePool: ['swing-stir-texture'],  // текстурная вариация
  variationCount: 2,
  fillEveryBars: 8,             // fill каждые 8 тактов
  fillMoleculePool: ['swing-fill-tom-run', 'swing-fill-triplet-1'],
  crashType: 'crash',
  dynamicsType: 'wave',         // нарастание и спад
  volumeMul: 1.0,
  textureMoleculePool: ['swing-stir-texture'],  // можно переключить groove→texture
  weight: 0.7,
}
```

##### Bossa Nova — 16 тактов (verse)

```ts
{
  id: 'bossa-16-verse',
  style: 'bossa',
  length: 16,
  timeSignature: [4, 4],
  grooveMoleculePool: ['bossa-clave-rim-1', 'bossa-kick-partido', 'bossa-hihat-8ths'],
  variationEveryBars: 8,        // редкие вариации в bossa
  variationMoleculePool: ['bossa-clave-rim-2', 'bossa-kick-syncopated'],
  variationCount: 1,
  fillEveryBars: 16,
  fillMoleculePool: ['bossa-fill-tom-samba', 'bossa-fill-rim-variation'],
  crashType: 'crash',
  dynamicsType: 'steady',
  volumeMul: 0.9,
  weight: 1.0,
}
```

##### Funk — 16 тактов (verse, с частыми fills)

```ts
{
  id: 'funk-16-verse',
  style: 'funk',
  length: 16,
  timeSignature: [4, 4],
  grooveMoleculePool: ['funk-kick-linear-1', 'funk-snare-backbeat', 'funk-hihat-16ths'],
  variationEveryBars: 4,
  variationMoleculePool: ['funk-kick-linear-2', 'funk-hihat-open-offbeat'],
  variationCount: 2,
  fillEveryBars: 8,             // fill каждые 8 тактов (funk — плотный стиль)
  fillMoleculePool: ['funk-fill-16ths', 'funk-fill-tom-bass'],
  crashType: 'crash_sizzle',
  dynamicsType: 'steady',
  volumeMul: 0.95,
  weight: 1.0,
}
```

##### Latin — 16 тактов (verse)

```ts
{
  id: 'latin-16-verse',
  style: 'latin',
  length: 16,
  timeSignature: [4, 4],
  grooveMoleculePool: ['latin-cascara-1', 'latin-clave-son-2-3', 'latin-kick-tumbao'],
  variationEveryBars: 8,
  variationMoleculePool: ['latin-cascara-2', 'latin-kick-montuno'],
  variationCount: 1,
  fillEveryBars: 16,
  fillMoleculePool: ['latin-fill-timbal', 'latin-fill-conga'],
  crashType: 'crash',
  dynamicsType: 'steady',
  volumeMul: 0.9,
  weight: 1.0,
}
```

##### Ballad — 16 тактов (verse, очень мягко)

```ts
{
  id: 'ballad-16-verse',
  style: 'ballad',
  length: 16,
  timeSignature: [4, 4],
  grooveMoleculePool: ['ballad-ride-soft', 'ballad-kick-two-feel', 'ballad-snare-crossstick'],
  variationEveryBars: 8,
  variationMoleculePool: ['ballad-ride-brushes', 'ballad-stir-texture'],
  variationCount: 1,
  fillEveryBars: 32,            // ballad — очень редкие fills
  fillMoleculePool: ['ballad-fill-brush'],
  crashType: 'crash_sizzle',
  dynamicsType: 'crescendo',
  volumeMul: 0.7,
  weight: 1.0,
}
```

### 3.4. Уровень 3: Организмы

**Организм** — композиционная форма произведения, состоящая из клеток. Это верхний уровень иерархии, отвечающий за макро-структуру.

Организм определяет:
- **Форму:** intro → A1 → A2 → B → ending (повторяет структуру произведения)
- **Какая клетка играет в каждой части формы**
- **Смену манеры игры** — именно организм решает, когда перейти от сдержанного groove к эмоциональному, от groove к texture и т.д.

```ts
interface DrumOrganism {
  /** Уникальный ID, например 'swing-aaba-32' */
  id: string;
  /** Стиль */
  style: DrumStyle;
  /** Человекочитаемое название */
  label: string;
  /** Секции организма (части формы) */
  sections: OrganismSection[];
  /** Вес для случайного выбора */
  weight: number;
}

interface OrganismSection {
  /** Метка секции: 'intro', 'A1', 'A2', 'B', 'ending' */
  label: string;
  /** Тип секции (определяет поведение) */
  type: 'intro' | 'verse' | 'chorus' | 'bridge' | 'ending';
  /** Пул ID клеток, из которых выбирается (с весами) */
  cellPool: string[];
  /** Количество повторений клетки (по умолчанию 1) */
  repeats?: number;
  /** Параметры секции организма */
  params?: {
    /** Множитель громкости для всей секции */
    volumeMul?: number;
    /** После завершения клетки — переключить groove→texture (на следующем цикле) */
    switchToTexture?: boolean;
  };
}
```

**Типы секций организма и их поведение:**

| Тип | Поведение | Пример клеток |
|-----|-----------|---------------|
| `intro` | Играется однократно в начале. Использует специальные intro-клетки (4 клика, нарастание). **Intro-молекулы задействуются только здесь.** | `swing-4-intro`, `funk-8-intro` |
| `verse` | Основная часть формы (A1, A2). Сдержанный groove с периодическими вариациями. Может повторяться (`repeats: 2`). | `swing-16-restrained`, `bossa-16-verse` |
| `chorus` | Припев. Более плотный groove, возможен build-up через `dynamicsType: 'crescendo'` в клетке. | `swing-16-peak`, `funk-16-chorus` |
| `bridge` | Бридж (B). Эмоциональный groove, текстурные элементы. **Эмоциональный грув — только здесь.** После завершения может переключиться groove→texture (`switchToTexture`). | `swing-16-emotional`, `ballad-16-texture` |
| `ending` | Играется однократно в конце. Использует ending-клетки (замедление, финальный crash). **Ending-молекулы задействуются только здесь.** | `swing-8-ending`, `ballad-16-ending` |

#### Примеры организмов

##### Swing — Flat Loop (verse-only, без intro/ending/bridge) — **по умолчанию**

```ts
{
  id: 'swing-flat-16',
  style: 'swing',
  label: 'Swing Flat (16-тактовый loop)',
  sections: [
    { label: 'A', type: 'verse', cellPool: ['swing-16-verse'], repeats: 4 },
  ],
  weight: 1.0,  // приоритетный выбор
}
```

> **Правило вариаций:** `variationEveryBars` = длина клетки = длина цикла композиции.
> Для 16-тактовой композиции — вариация каждые 16 тактов (раз в цикл).
> Для 24-тактовой — вариация каждые 24 такта.
> Вариация срабатывает на barInCell % variationEveryBars === 0 (начало нового цикла).
> Для swing: groove → stir texture (через `textureMoleculePool` + `settings.textureMode`).

##### Swing — AABA 32 такта (стандартная джазовая форма) — будущее

```ts
{
  id: 'swing-aaba-32',
  style: 'swing',
  label: 'Swing AABA (32 такта)',
  sections: [
    { label: 'intro',  type: 'intro',   cellPool: ['swing-4-intro'] },
    { label: 'A1',     type: 'verse',   cellPool: ['swing-16-restrained'], repeats: 1 },
    { label: 'A2',     type: 'verse',   cellPool: ['swing-16-restrained'], repeats: 1 },
    { label: 'B',      type: 'bridge',  cellPool: ['swing-16-emotional'], repeats: 1,
      params: { switchToTexture: true } },  // после B → texture на следующем цикле
    { label: 'A3',     type: 'verse',   cellPool: ['swing-16-restrained'], repeats: 1 },
    { label: 'ending', type: 'ending',  cellPool: ['swing-8-ending'] },
  ],
  weight: 1.0,
}
```

##### Swing — AABA 32 такта (без intro/ending, для циклического плеера)

```ts
{
  id: 'swing-aaba-32-loop',
  style: 'swing',
  label: 'Swing AABA (loop)',
  sections: [
    { label: 'A1', type: 'verse',  cellPool: ['swing-16-restrained'], repeats: 1 },
    { label: 'A2', type: 'verse',  cellPool: ['swing-16-restrained'], repeats: 1 },
    { label: 'B',  type: 'bridge', cellPool: ['swing-16-emotional'], repeats: 1 },
    { label: 'A3', type: 'verse',  cellPool: ['swing-16-restrained'], repeats: 1 },
  ],
  weight: 1.0,
}
```

##### Funk — Verse-Chorus 32 такта

```ts
{
  id: 'funk-verse-chorus-32',
  style: 'funk',
  label: 'Funk Verse-Chorus (32 такта)',
  sections: [
    { label: 'intro',  type: 'intro',   cellPool: ['funk-8-intro'] },
    { label: 'A1',     type: 'verse',   cellPool: ['funk-16-verse'], repeats: 1 },
    { label: 'B',      type: 'chorus',  cellPool: ['funk-16-chorus'], repeats: 1,
      params: { volumeMul: 1.1 } },  // припев чуть громче
    { label: 'A2',     type: 'verse',   cellPool: ['funk-16-verse'], repeats: 1 },
    { label: 'ending', type: 'ending',  cellPool: ['funk-8-ending'] },
  ],
  weight: 1.0,
}
```

##### Bossa Nova — AABA 64 такта (расширенная форма)

```ts
{
  id: 'bossa-aaba-64',
  style: 'bossa',
  label: 'Bossa AABA (64 такта)',
  sections: [
    { label: 'intro',  type: 'intro',   cellPool: ['bossa-8-intro'] },
    { label: 'A1',     type: 'verse',   cellPool: ['bossa-16-verse'], repeats: 2 },  // 32 такта verse
    { label: 'B',      type: 'bridge',  cellPool: ['bossa-16-bridge'], repeats: 1 },
    { label: 'A2',     type: 'verse',   cellPool: ['bossa-16-verse'], repeats: 1 },
    { label: 'ending', type: 'ending',  cellPool: ['bossa-8-ending'] },
  ],
  weight: 1.0,
}
```

## 4. DrumPatternEngine — движок сборки

### 4.1. Интерфейс

```ts
interface DrumPatternEngine {
  /** Выбрать организм для заданного стиля и длины формы */
  selectOrganism(style: DrumStyle, formLength: number, seed: number): DrumOrganism;

  /** Получить клетку для секции организма */
  selectCellForSection(
    section: OrganismSection,
    style: DrumStyle,
    seed: number,
    settings: DrumInstrumentSettings,
  ): DrumCell;

  /** Собрать hits для конкретного такта внутри клетки */
  assembleBar(
    cell: DrumCell,
    barInCell: number,        // 0..cell.length-1
    barInOrganism: number,    // абсолютный индекс такта в организме
    settings: DrumInstrumentSettings,
    swingRatio: number,       // 0.5 (straight) – 0.75 (heavy swing)
    seed: number,
  ): DrumHit[];

  /** Получить доступные организмы для стиля */
  getOrganisms(style: DrumStyle): DrumOrganism[];

  /** Получить доступные клетки для стиля */
  getCells(style: DrumStyle): DrumCell[];

  /** Получить молекулу по ID */
  getMolecule(id: string): DrumMolecule;
}
```

### 4.2. Алгоритм `assembleBar()`

> **Инвариант идемпотентности.** `assembleBar()` (и вся диспетчеризация в
> `DrumInstrument.schedule()`) обязана быть **чистой функцией от `(cell, barInCell,
> barInOrganism, seed)`**. Планировщик транспорта режет такты на под-тактовые окна
> и может вызвать `schedule()` для одного и того же абсолютного такта несколько раз.
> Позиция в организме (`barInCell`, номер секции) должна выводиться **детерминированно
> из абсолютного номера такта**, а не из мутабельного счётчика: иначе один такт
> «разъезжается» на несколько разных под-паттернов → «суета». `barInCell` всегда лежит
> в диапазоне `0..cell.length-1`.

```
Вход: cell, barInCell (0..cell.length-1), barInOrganism, settings, swingRatio, seed

1. Определить, какой это такт относительно цикла вариаций:
   isVariationBar = cell.variationEveryBars > 0 && cell.variationCount > 0
                    && barInCell % cell.variationEveryBars === 0 && barInOrganism > 0

2. Собрать groove:
   - grooveMoleculePool — это ВЗАИМОДОПОЛНЯЮЩИЕ СЛОИ (ride + kick + snare + …),
     они играют ОДНОВРЕМЕННО (все молекулы пула, а не «одна псевдослучайно»).
     Альтернативы (варианты одной манеры) кладутся в variationMoleculePool.
   - Если isVariationBar: добавить ПОВЕРХ грува вариационную молекулу из
     cell.variationMoleculePool (ротация по циклам). Количество — cell.variationCount.
   - Веса молекул учитываются; отключённые звуки исключают молекулы с require* и
     отдельные атомы через isAtomEnabled().

3. Определить, нужен ли fill на этом такте:
   isFillBar = cell.fillEveryBars > 0 && (barInCell + 1) % cell.fillEveryBars === 0
   - Если isFillBar: добавить одну fill-молекулу ПОВЕРХ грува (не заменяя его).
     Fill-молекулы живут на 4-й доле (§7.3) — доли 1–3 сохраняют groove.

4. Определить, нужен ли crash:
   isCrashBar = cell.fillEveryBars > 0 && barInCell % cell.fillEveryBars === 0
                && barInOrganism > 0
   - Если isCrashBar: добавить crash-атом на beat 1 с типом cell.crashType

5. Применить динамическую кривую (dynamicsType):
   - 'steady': volumeMul постоянен
   - 'crescendo': volumeMul растёт от 0.85 до 1.0 по длине клетки
   - 'decrescendo': volumeMul падает от 1.0 до 0.85
   - 'wave': volumeMul волной (0.9 → 1.0 → 0.9)

6. Применить swingRatio к tick'ам внутри молекул:
   - offbeat-восьмые сдвигаются: tick = beatStart + swingRatio * beatDuration

7. Разрешить артикуляции через resolveDrumArticulation() (если useArticulations=true)

8. Применить DrumRandomizer для микро-вариаций (ride variation, ghost notes, velocity variation)
   — рандомизация работает в рамках стабильного groove, не меняя структуру

9. Применить humanize: timing jitter + velocity variation + bar groove offset.
   ⚠️ Humanize работает по МУЗЫКАЛЬНОЙ velocity (atom × volumeMul × dynMul), а не
   по финальному уровню. Классификация ноты (accent / backbeat / ghost / weak),
   пороги drop и категорийные множители зависят от музыкальной роли, а не от
   микшера.

10. ПОСЛЕДНИМ шагом применить микшерные громкости: velocity *= master.volume ×
    per-sound volume (по финальному, пост-артикуляционному звуку). Если это сделать
    раньше (до humanize), акценты утапливаются ниже порогов 0.75/0.4 и humanize
    ошибочно трактует бэкбит как ghost, а downbeat-бочку как «weak» → сильное
    «плавание» динамики и случайные пропадания бочки.

11. Вернуть массив DrumHit[]
```

### 4.3. Интеграция с DrumInstrument

`DrumInstrument` делегирует построение паттернов `DrumPatternEngine`. Добавляется управление организмом.

> **⚠️ Псевдокод ниже — иллюстрация уровней иерархии, а НЕ образец реализации
> планирования.** Мутабельные `currentSectionIndex` / `barInSection`, инкрементируемые
> в цикле `schedule()`, **несовместимы с под-тактовыми окнами планировщика** (см. инвариант
> идемпотентности в §4.2): один такт обрабатывается несколькими окнами и счётчик
> «убегает». Рабочая реализация вычисляет позицию детерминированно из абсолютного
> номера такта: организм разворачивается в плоский layout секций
> (`resolveBar(bar)`), `posInOrg = bar % organismTotalLength`, `barInCell = (posInOrg -
> sectionStart) % cell.length`. Состояние между вызовами `schedule()` не хранится
> (кроме одноразового выбора организма).

```ts
class DrumInstrument implements Instrument {
  private patternEngine: DrumPatternEngine;
  private currentOrganism: DrumOrganism | null = null;
  private currentCell: DrumCell | null = null;
  private currentSectionIndex: number = 0;
  private barInSection: number = 0;
  private organismSeed: number = 0;

  schedule(window: ScheduleWindow, ctx: ScheduleContext): void {
    // При старте или смене формы — выбрать организм
    if (!this.currentOrganism || this.formChanged(ctx)) {
      this.organismSeed = this.generateSeed(ctx);
      this.currentOrganism = this.patternEngine.selectOrganism(
        this.currentStyle, ctx.formLength, this.organismSeed
      );
      this.currentSectionIndex = 0;
      this.barInSection = 0;
      this.selectNextCell(ctx);
    }

    for (let bar = firstBar; bar <= lastBar; bar++) {
      // Проверить, не закончилась ли текущая клетка
      if (this.barInSection >= this.currentCell.length) {
        this.advanceSection(ctx);
        this.barInSection = 0;
      }

      const hits = this.patternEngine.assembleBar(
        this.currentCell,
        this.barInSection,
        bar,
        this.settings,
        ctx.swingRatio,
        this.organismSeed + bar,
      );
      this.barInSection++;
      // ... schedule hits через scheduleHits()
    }
  }

  private selectNextCell(ctx: ScheduleContext): void {
    const section = this.currentOrganism.sections[this.currentSectionIndex];
    this.currentCell = this.patternEngine.selectCellForSection(
      section, this.currentStyle,
      this.organismSeed + this.currentSectionIndex * 1000,
      this.settings,
    );
  }

  private advanceSection(ctx: ScheduleContext): void {
    const section = this.currentOrganism.sections[this.currentSectionIndex];
    section.repeatsCompleted = (section.repeatsCompleted || 0) + 1;

    if (section.repeatsCompleted >= (section.repeats || 1)) {
      // Переход к следующей секции организма
      this.currentSectionIndex++;
      if (this.currentSectionIndex >= this.currentOrganism.sections.length) {
        // Организм завершён — начать заново (loop) или остановить
        this.currentSectionIndex = 0;  // loop
      }
      // Применить switchToTexture для bridge-секции
      if (section.params?.switchToTexture && this.currentCell.textureMoleculePool) {
        // На следующем цикле groove заменяется на texture
        this.settings.textureMode = true;
      }
    }
    this.selectNextCell(ctx);
  }
}
```

## 5. Настройки рандомизации

### 5.1. Уровни рандомизации

Рандомизация действует на трёх уровнях:

| Уровень | Что варьирует | Настройка |
|---------|---------------|-----------|
| **Молекулярный** | Выбор молекул из пула (groove, variation), ghost-ноты внутри молекул | `randomizationLevel` |
| **Клеточный** | Выбор конкретной клетки из пула секции организма, выбор вариаций | `cellVariationRandomization` |
| **Микро** | Humanize (timing, velocity), `DrumRandomizer` (ride variation, ghost notes) | `humanizeIntensity` |

> **v1.1 изменение:** «Клеточная рандомизация» больше не означает перестановку секций внутри клетки (секций больше нет). Теперь это выбор клетки из пула и выбор вариационных молекул.

### 5.2. Расширение DrumInstrumentSettings

```ts
interface DrumInstrumentSettings {
  // ... существующие поля ...

  // ── Молекулярная рандомизация ──
  /** Интенсивность: 'off' | 'subtle' | 'moderate' | 'high' */
  randomizationLevel: 'off' | 'subtle' | 'moderate' | 'high';

  // ── Организм ──
  /** Автоматический выбор организма под форму */
  autoOrganism: boolean;
  /** Конкретный ID организма (если autoOrganism=false) */
  organismId?: string;

  // ── Клеточная рандомизация ──
  /** Разрешено ли варьировать выбор клетки из пула */
  cellVariationRandomization: boolean;
  /** Длина клетки: 8, 16, 32, или 'auto' (по длине секции организма) */
  cellLength: 8 | 16 | 32 | 'auto';

  // ── Вариации (внутри клетки) ──
  /** Интервал вариаций: каждые 4, 8 тактов, или 'auto' (из клетки) */
  variationInterval: 4 | 8 | 'auto';
  /** Количество разных вариаций */
  variationCount: number;

  // ── Crash ──
  /** Частота crash: каждые 8, 16, 32 такта, или 'never'. По умолчанию — из клетки */
  crashFrequency: 'never' | 8 | 16 | 32 | 'auto';
  /** Тип crash: обычный, sizzle, splash */
  crashType: 'crash' | 'crash_sizzle' | 'splash' | 'auto';

  // ── Fills ──
  /** Частота fills: каждые 8, 16, 32 такта, или 'auto' (из клетки) */
  fillFrequency: 'never' | 8 | 16 | 32 | 'auto';
  /** Сложность fills */
  fillComplexity: 'simple' | 'medium' | 'complex';
  /** Использовать томы в fills */
  tomFillsEnabled: boolean;
  /** Использовать buzz в fills (funk) */
  buzzFillsEnabled: boolean;
  /** Использовать flam в fills (funk) */
  flamFillsEnabled: boolean;
  /** Fill за 1 такт до crash (всегда true в новой модели) */
  preCrashFill: boolean;

  // ── Ghost notes, buzz, flam ──
  /** Ghost notes на snare */
  snareGhosts: boolean;
  /** Интенсивность ghost notes (0–1) */
  ghostIntensity: number;
  /** Buzz-roll в ghost notes (funk/jazz) */
  buzzEnabled: boolean;
  /** Flam-акценты (funk/jazz) */
  flamEnabled: boolean;
  /** Вероятность flam на акцентированной snare (0–1) */
  flamProbability: number;
  /** Вероятность buzz на ghost snare (0–1) */
  buzzProbability: number;

  // ── Ride ──
  /** Вариации ride-паттерна */
  rideVariation: boolean;

  // ── Bass drum ──
  /** Вариации bass drum */
  bassDrumVariation: boolean;

  // ── Stir (джазовая текстура) ──
  /** Включить stir (hi-hat щёткой) */
  stirEnabled: boolean;
  stirVolume: number;
  /** Stir только в ballad и swing */
  stirStyleFilter: DrumStyle[];

  // ── Переключение groove → texture ──
  /** Режим текстуры (устанавливается организмом после bridge) */
  textureMode: boolean;
}
```

### 5.3. Таблица вероятностей молекулярной рандомизации

| Уровень | Шанс выбора alt-молекулы | Шанс ghost-вариации | Шанс пропуска ride |
|---------|--------------------------|---------------------|---------------------|
| `off` | 0% | 0% | 0% |
| `subtle` | 10% | 15% | 5% |
| `moderate` | 25% | 30% | 10% |
| `high` | 40% | 50% | 20% |

## 6. Наследование свинга (swing ratio)

### 6.1. Как swing влияет на паттерны

`swingRatio` (0.5–0.75) передаётся из `ScheduleContext` и влияет на позиционирование offbeat-восьмых:

- **0.5** — straight (ровные восьмые): `1&` = 50% от доли
- **0.66** — классический swing: `1&` = 66% от доли (триольный swing)
- **0.75** — тяжёлый swing: `1&` = 75% от доли

### 6.2. Что сдвигается

| Стиль | Сдвигаются | Не сдвигаются |
|-------|-----------|---------------|
| **Swing** | Ride skip-ноты, hihat offbeat, bass drum syncopation | Snare на 2 и 4, crash, kick на 1 и 3 |
| **Bossa** | Hihat восьмые, bass drum 2& | Rim clave (строгая доля), crash |
| **Funk** | Hihat 1&, bass drum syncopation | Snare на 2 и 4, 16-е 'e' и 'a' |
| **Latin** | Cascara offbeat, hihat восьмые | Clave (строгая доля) |
| **Ballad** | Ride offbeat (если есть) | Всё остальное (ballad ≈ straight) |

### 6.3. Реализация

```ts
function applySwing(tick: number, beatStart: number, beatDuration: number, swingRatio: number): number {
  const offsetInBeat = tick - beatStart;
  // Только offbeat-восьмые: вторая половина доли
  if (offsetInBeat >= beatDuration / 3 && offsetInBeat <= beatDuration * 2 / 3) {
    return beatStart + Math.round(swingRatio * beatDuration);
  }
  return tick;
}
```

Swing наследуется **всеми инструментами** через `ScheduleContext.swingRatio`. Барабаны не исключение — они используют то же значение, что и Bass, Piano, Rhodes.

## 7. Crash и филы: интеграция с клеткой

> **v1.1 изменение:** Crash и fill больше не независимые сущности с собственным расписанием. Они **встроены в клетку** и срабатывают по её внутреннему расписанию. Организм определяет макро-форму, клетка — ритмическое наполнение.

### 7.1. Crash

Crash располагается на beat 1 такта, кратного `cell.fillEveryBars`. Всегда следует после fill-такта. Конфигурация — часть клетки:

```ts
Crash-конфигурация теперь встроена в DrumCell (cell.fillEveryBars, cell.crashType). Интерфейс CrashConfig удалён.
```

**Логика crash (в `assembleBar`):**

- `barInCell === 0` И `barInOrganism % cell.fillEveryBars === 0` → crash на beat 1
- Предыдущий такт (N-1) — fill с crescendo → crash

### 7.2. Филы (fills)

Fill занимает последний такт перед crash. Всегда предшествует crash (нет fill без crash, нет crash без fill). Конфигурация — часть клетки:

- `cell.fillEveryBars` — интервал fill (8, 16, 32)
- `cell.fillMoleculePool` — пул fill-молекул

Интерфейс FillConfig удалён — все параметры встроены в DrumCell и DrumInstrumentSettings.

**Fill-молекулы по стилям:**

| Стиль | simple | medium | complex |
|-------|--------|--------|---------|
| **Swing** | Snare восьмые на beat 4 | Snare + kick триоли | Tom run 16-е + crash |
| **Bossa** | Rim вариация | Rim + syncopated kick | Tom samba fill |
| **Funk** | Snare 16-е | Snare + tom 16-е | Snare + tom + buzz + flam |
| **Latin** | Cascara вариация | Timbal fill | Конговый fill + crash |
| **Ballad** | Snare ghost | Cross-stick + мягкий том | Томовый swell |

### 7.3. Fill → Crash цепочка

```
Такт N-1 (fill)                Такт N (crash)
┌──────────────────┐          ┌──────────────────┐
│ beat 1–3: groove │          │ beat 1: CRASH    │
│ beat 4: FILL     │  ───→   │ beat 2–4: groove │
│  tom run ↑       │          │  (клетка          │
│  velocity cres.  │          │   продолжается)   │
└──────────────────┘          └──────────────────┘
```

Fill-молекулы имеют нарастающую velocity (crescendo) к концу такта, создавая естественное напряжение перед crash.

## 8. Ghost notes, buzz и flam

### 8.1. Ghost notes

Ghost notes — тихие (velocity 0.15–0.35) удары по snare на слабых долях ('e' и 'a' 16-х, или swing-восьмых). Новая механика:

**Текущая проблема:** ghost notes добавляются случайно, без фразировки. Это звучит как «рассыпанный песок», а не как музыкальная фраза.

**Решение:** ghost notes организуются в **молекулы** — короткие фразы из 2–4 ghost-нот, которые вставляются между основными snare-ударами:

```ts
// Пример ghost-фразы для swing:
// Такт с ghost-нотами на 3e, 3a, 4e
const swingGhostPhrase: DrumAtom[] = [
  { sound: 'snare', atTick: beat3Tick + sub16th,       velocity: 0.2, durationTicks: 60 },  // 3e
  { sound: 'snare', atTick: beat3Tick + sub16th * 3,    velocity: 0.25, durationTicks: 60 }, // 3a
  { sound: 'snare', atTick: beat4Tick + sub16th,        velocity: 0.3, durationTicks: 60 },  // 4e (crescendo к следующему backbeat)
];
```

**Настройки:**

| Параметр | Описание | Значения |
|----------|----------|----------|
| `snareGhosts` | Включить ghost notes | `boolean` |
| `ghostIntensity` | Интенсивность (0–1) | влияет на частоту и velocity |
| `ghostStyle` | Стиль ghost-фраз | `'sparse' \| 'medium' \| 'dense' \| 'funk'` |

**Стили ghost-фраз:**

| ghostStyle | Характер | Пример |
|------------|----------|--------|
| `sparse` | 1–2 ghost-ноты на такт, только 'e' | Swing ballad |
| `medium` | 2–4 ghost-ноты, 'e' и 'a' | Swing medium |
| `dense` | 4–6 ghost-нот, включая offbeat | Swing up-tempo |
| `funk` | 16-е ghost-сетки с акцентами | Funk |

### 8.2. Buzz (buzz-roll)

Buzz — прессовый удар (multiple bounce), маркируется как `snare_buzz` в артикуляциях. Используется в:

- **Jazz:** текстурные buzz-фразы на слабых долях (замена dig)
- **Funk:** buzz как заполнение между ghost-нотами, buzz на 'a' перед backbeat'ом

**Настройки:**

| Параметр | Описание | Значения |
|----------|----------|----------|
| `buzzEnabled` | Включить buzz | `boolean` |
| `buzzProbability` | Вероятность замены ghost на buzz (0–1) | `0.3` по умолчанию |
| `buzzMinVelocity` | Минимальная velocity для buzz | `0.15` |

**Алгоритм замены ghost → buzz:**

```
Для каждой ghost-ноты:
  Если buzzEnabled и velocity < 0.35 и random() < buzzProbability:
    sound = 'snare_buzz' (через resolveDrumArticulation)
    velocity *= 0.8  (buzz тише ghost)
```

### 8.3. Flam

Flam — форшлаг (основной удар + тихий предудар). Используется в:

- **Funk:** flam на backbeat (2 и 4) для акцента
- **Jazz:** flam на 4-й доле перед crash

**Настройки:**

| Параметр | Описание | Значения |
|----------|----------|----------|
| `flamEnabled` | Включить flam | `boolean` |
| `flamProbability` | Вероятность flam на акцентированной snare (0–1) | `0.2` по умолчанию |
| `flamMinVelocity` | Минимальная velocity для flam | `0.75` |

**Алгоритм замены snare → flam:**

```
Для каждого snare-удара:
  Если flamEnabled и velocity > flamMinVelocity и random() < flamProbability:
    sound = 'snare_flam'
    Добавить предудар (grace note) на −20 тиков с velocity 0.3
```

### 8.4. Все вместе: пример фанк-такта с ghost, buzz и flam

```
Beat:   1    e    &    a    2    e    &    a    3    e    &    a    4    e    &    a
Kick:   ●              ○                   ●                        ○
Snare:            ○         ●F                       ●                   ○    ●F
                     (ghost)  (flam)                 (backbeat)    (ghost)   (flam)
Buzz:                  ○                                            ○
                       (buzz)                                     (buzz)
HH:     ●    ●    ●    ●    ●    ●    ●    ●    ●    ●    ●    ●    ●    ●    ●    ●

F = flam (форшлаг)
```

## 9. Per-sound настройки включения и громкости

### 9.1. Текущее состояние

Уже реализовано в `DrumInstrumentSettings`:

- `bassDrumEnabled` / `bassDrumVolume`
- `snareEnabled` / `snareVolume`
- `hihatEnabled` / `hihatVolume` / `hihatOpenness`
- `rideEnabled` / `rideVolume`
- `crashEnabled` / `crashVolume`
- `rimEnabled` / `rimVolume`
- `tomEnabled` / `tomVolume`
- `stirEnabled` / `stirVolume`
- Артикуляции: `snareBuzzEnabled` / `snareBuzzVolume`, `snareFlamEnabled` / `snareFlamVolume`, и т.д.

### 9.2. Что нужно добавить

Для полного контроля:

```ts
interface DrumInstrumentSettings {
  // ... существующие ...

  // ── Новые per-sound ──
  /** Ride bell (отдельная настройка, не через rideEnabled) */
  rideBellEnabled: boolean;
  rideBellVolume: number;
  /** Hihat foot chick */
  hihatFootEnabled: boolean;
  hihatFootVolume: number;
  /** Splash cymbal */
  splashEnabled: boolean;
  splashVolume: number;
  /** Sizzle crash (funk) */
  crashSizzleEnabled: boolean;
  crashSizzleVolume: number;

  // ── Групповые mute ──
  /** Mute всех ghost-звуков (snare ghost, buzz) */
  ghostMute: boolean;
  /** Mute всех fills */
  fillsMute: boolean;
  /** Mute crash */
  crashMute: boolean;
}
```

### 9.3. Применение в молекулах

При сборке молекулы `DrumPatternEngine` проверяет `*Enabled` для каждого атома:

```ts
function isAtomEnabled(atom: DrumAtom, s: DrumInstrumentSettings): boolean {
  switch (atom.sound) {
    case 'kick':              return s.bassDrumEnabled;
    case 'snare_center':
    case 'snare_edge':
    case 'snare_dig':         return s.snareEnabled;
    case 'snare_buzz':        return s.snareEnabled && s.snareBuzzEnabled;
    case 'snare_flam':        return s.snareEnabled && s.snareFlamEnabled;
    case 'snare_rimshot':     return s.snareEnabled && s.snareRimshotEnabled;
    case 'snare_crossstick':  return s.snareEnabled && s.snareCrossstickEnabled;
    case 'snare_muted':       return s.snareEnabled && s.snareMutedEnabled;
    case 'hihat_closed':
    case 'hihat_open':        return s.hihatEnabled;
    case 'hihat_foot':        return s.hihatEnabled && s.hihatFootEnabled;
    case 'hihat_stir':        return s.stirEnabled;
    case 'ride_bow':          return s.rideEnabled;
    case 'ride_bell':         return s.rideEnabled && s.rideBellEnabled;
    case 'crash':             return s.crashEnabled;
    case 'crash_sizzle':      return s.crashEnabled && s.crashSizzleEnabled;
    case 'splash':            return s.splashEnabled;
    case 'tom_hi':
    case 'tom_lo':
    case 'tom_mhi':
    case 'tom_mlow':          return s.tomEnabled;
    default:                  return true;
  }
}
```

## 10. Humanize алгоритмы

### 10.1. Текущее состояние

```ts
const HUMANIZE_PARAMS: Record<HumanizeIntensity, { timingMs: number }> = {
  off:  { timingMs: 0 },
  low:  { timingMs: 2 },
  med:  { timingMs: 4 },
  high: { timingMs: 7 },
};
```

Только timing jitter. Применяется к каждому отдельному hit'у.

### 10.2. Расширенный humanize

```ts
interface HumanizeParams {
  /** Timing jitter в миллисекундах (±) */
  timingMs: number;
  /** Velocity variation в долях (± от исходной velocity) */
  velocityVar: number;
  /** Микро-сдвиг внутри молекулы: ± от base tick (в тиках) */
  microShiftTicks: number;
  /** Bar groove: детерминированный сдвиг всего такта (± тики) */
  barGrooveTicks: number;
  /** Вероятность «пропуска» слабого звука (имитация неидеального drumming) */
  dropProbability: number;
}

const HUMANIZE_PRESETS: Record<HumanizeIntensity, HumanizeParams> = {
  off:  { timingMs: 0, velocityVar: 0,    microShiftTicks: 0, barGrooveTicks: 0, dropProbability: 0    },
  low:  { timingMs: 2, velocityVar: 0.03, microShiftTicks: 2, barGrooveTicks: 3, dropProbability: 0.01 },
  med:  { timingMs: 4, velocityVar: 0.06, microShiftTicks: 4, barGrooveTicks: 5, dropProbability: 0.02 },
  high: { timingMs: 7, velocityVar: 0.10, microShiftTicks: 6, barGrooveTicks: 8, dropProbability: 0.05 },
};
```

### 10.3. Алгоритм применения

```ts
function humanizeHit(
  hit: DrumHit,
  params: HumanizeParams,
  rng: () => number,
): DrumHit {
  // 1. Timing jitter (преобразуем мс → тики на основе BPM)
  const jitterTicks = (rng() - 0.5) * 2 * msToTicks(params.timingMs, bpm);

  // 2. Velocity variation
  const velVar = (rng() - 0.5) * 2 * params.velocityVar;

  // 3. Micro-shift (для ghost-нот и ride — больше, для kick и snare backbeat — меньше)
  const isWeakSound = hit.velocity < 0.4 || hit.sound.includes('ghost');
  const microShift = isWeakSound
    ? (rng() - 0.5) * 2 * params.microShiftTicks * 1.5
    : (rng() - 0.5) * 2 * params.microShiftTicks * 0.5;

  // 4. Random drop (только для слабых звуков)
  if (isWeakSound && rng() < params.dropProbability) {
    hit.velocity = 0; // будет отфильтрован
  }

  return {
    ...hit,
    atTick: hit.atTick + jitterTicks + microShift,
    velocity: clamp(hit.velocity + velVar, 0, 1),
  };
}
```

### 10.4. Bar groove (уже существует)

`barGrooveOffset()` уже реализован и даёт детерминированный сдвиг всего такта. В новой архитектуре он остаётся и применяется после humanize отдельных hit'ов:

```
barGrooveOffset(bar) → сдвиг в пределах ±barGrooveTicks
  ↓
все hit'ы в такте сдвигаются одинаково (как drummer rushing/dragging)
```

### 10.5. Velocity-зависимый humanize

Разные звуки получают разную амплитуду jitter:

| Категория звука | Timing jitter | Velocity variation | Micro-shift |
|-----------------|---------------|-------------------|-------------|
| Kick (сильная доля) | ×0.5 | ×0.3 | ×0.3 |
| Kick (слабая доля) | ×1.0 | ×0.7 | ×1.0 |
| Snare backbeat | ×0.3 | ×0.2 | ×0.2 |
| Snare ghost | ×1.5 | ×1.0 | ×1.5 |
| Hihat (ровные) | ×0.7 | ×0.5 | ×0.7 |
| Ride | ×1.0 | ×0.5 | ×1.0 |
| Crash | ×0.2 | ×0.1 | ×0.1 |
| Tom | ×1.0 | ×1.0 | ×1.0 |
| Stir | ×1.2 | ×0.8 | ×1.2 |

## 11. Специфика стилей

### 11.1. Swing

| Характеристика | Значение |
|----------------|----------|
| **Основа groove** | Ride ding-ding-a-ding + hihat chick 2/4 |
| **Kick** | Feathering (все 4 доли), разная velocity |
| **Snare** | Backbeat 2/4, ghost notes на 'e'/'a' |
| **Swing ratio** | 0.60–0.70 (классический swing) |
| **Артикуляции** | Stir, snare_dig, snare_edge, ride_bow, splash |
| **Особенности** | Stir-текстура на 2/4; splash как accent; ride — главный голос |
| **Crash** | Каждые 16–32 такта (редко), sizzle в ballad |
| **Fills** | Триольные, snare + kick; томовые run'ы на complex |
| **Динамика** | Мягкая, нет резких перепадов |
| **Пример организма** | `swing-aaba-32` (intro → A1 → A2 → B → A3 → ending) |

### 11.2. Bossa Nova

| Характеристика | Значение |
|----------------|----------|
| **Основа groove** | Rim clave (1, 2, 3) или cross-stick |
| **Kick** | Partido alto: 1, 2&; вариация 1, 2&, 3& |
| **Snare** | НЕ ИСПОЛЬЗУЕТСЯ (snareEnabled=false) |
| **Hihat** | Восьмые (закрытый + полуоткрытый) |
| **Swing ratio** | 0.5 (straight! Bossa — не swing) |
| **Артикуляции** | Rim/cross-stick, hihat_closed/open, tom |
| **Особенности** | Нет backbeat; ритмическая основа — clave; бразильская эстетика |
| **Crash** | Каждые 16 тактов |
| **Fills** | Томовые samba-fills, rim вариации |
| **Динамика** | Ровная, циклическая |
| **Пример организма** | `bossa-aaba-64` (intro → A1×2 → B → A2 → ending) |

### 11.3. Funk

| Характеристика | Значение |
|----------------|----------|
| **Основа groove** | 16-е hihat + syncopated kick |
| **Kick** | Linear patterns, много синкоп, ghost-kick |
| **Snare** | Backbeat 2/4 (accent), rimshot на сильных, ghost-сетки 16-х |
| **Hihat** | Закрытый 16-е, открытый на offbeat, bark-акценты |
| **Swing ratio** | 0.5 (straight 16ths, но может быть slight swing ~0.55) |
| **Артикуляции** | snare_rimshot, snare_buzz, snare_flam, snare_muted, ride_bell, crash_sizzle |
| **Особенности** | Максимальная плотность; buzz + flam + ghost — ключевая фишка |
| **Crash** | Каждые 8–16 тактов, часто sizzle crash |
| **Fills** | 16-е snare, томовые run'ы, buzz-flam fills |
| **Динамика** | Агрессивная, контрастная |
| **Пример организма** | `funk-verse-chorus-32` (intro → A1 → B(chorus) → A2 → ending) |

### 11.4. Latin

| Характеристика | Значение |
|----------------|----------|
| **Основа groove** | Cascara + clave (son или rumba) |
| **Kick** | Tumbao (1, 2&, 3, 4) или montuno |
| **Snare** | Не используется (как правило); rim/cross-stick вместо snare |
| **Hihat** | Cascara-паттерн или ровные восьмые |
| **Swing ratio** | 0.5 (straight) |
| **Артикуляции** | rim, cross-stick, tom (для timbal-эффектов) |
| **Особенности** | 2-тактовые clave-паттерны (2-3 или 3-2); cascara на ride/rim |
| **Crash** | Каждые 16–32 такта |
| **Fills** | Timbal/conga fills, cascara вариации |
| **Динамика** | Циклическая, полиритмическая |
| **Пример организма** | `latin-aaba-32` (intro → A1 → A2 → B(montuno) → A3 → ending) |

### 11.5. Ballad

| Характеристика | Значение |
|----------------|----------|
| **Основа groove** | Мягкий ride (только доли) + stir-текстура |
| **Kick** | Feathering (очень мягко) или two-feel (1 и 3) |
| **Snare** | Cross-stick на 2/4 или мягкий snare |
| **Hihat** | Chick на 2/4 (очень тихо) |
| **Swing ratio** | 0.55–0.65 (soft swing) |
| **Артикуляции** | stir, cross-stick, crash_sizzle |
| **Особенности** | Минимальная плотность; stir — ключевая текстура; общая громкость ×0.6 |
| **Crash** | Редко (каждые 32 такта), sizzle |
| **Fills** | Мягкие (brush-style), томовые swells |
| **Динамика** | Очень мягкая, с gradual build-up |
| **Пример организма** | `ballad-aaba-32` (intro → A1 → A2 → B(texture) → A3 → ending) |

## 12. Out of Scope

- ❌ **Drag-and-drop редактор молекул/клеток в UI** — молекулы и клетки создаются разработчиком в коде/конфигах. Визуальный редактор — future.
- ❌ **AI-генерация молекул** — все молекулы авторские, закладываются вручную.
- ❌ **User-generated молекулы** — пользователь не может создавать свои молекулы через UI.
- ❌ **Half-time / double-time переключение** — глобальное изменение feel'а формы (half-time ballad, double-time swing) — future.
- ❌ **Odd meters (3/4, 7/8)** — 4/4 и 5/4 поддерживаются через `cell.timeSignature`; нестандартные размеры (3/4, 7/8) — отдельная задача.
- ❌ **MIDI-экспорт молекул/клеток** — экспорт в MIDI-файл — future.
- ❌ **Синхронизация молекул с другими инструментами** — барабаны независимы; синхронизация fills с bass/piano — future.
- ❌ **Blast beat / metal паттерны** — не в домене Jazz Trainer.

## 13. Риски и допущения

| Риск | Вероятность | Влияние | Митигация |
|------|------------|---------|-----------|
| Сложность авторского наполнения молекулами (30–50 молекул на стиль) | Высокая | Задержка | Начать с MVP: 10–15 молекул на стиль. Остальные добавлять итеративно |
| Молекулы не стыкуются друг с другом (артефакты на границах) | Средняя | Звуковые щелчки/провалы | Каждая молекула включает «хвост» предыдущего звука (ride/snare release). Тестирование на стыках |
| Переусложнение: `DrumPatternEngine` дублирует логику `DrumRandomizer` | Средняя | Раздувание кода | `DrumRandomizer` остаётся для микро-вариаций (post-hoc). `DrumPatternEngine` — для структурных решений |
| Клетки звучат «заскриптовано» без достаточной рандомизации | Высокая | Пользователь слышит повтор | Высокий `randomizationLevel` + `DrumRandomizer` внутри клетки + множество вариационных молекул + выбор клетки из пула организма |
| Производительность: сборка cell каждый такт | Низкая | Заметная задержка при старте | Кеширование собранной клетки; ассемблирование только при смене формы/настроек |
| Swing в bossa/latin — специфика стиля теряется | Средняя | Bossa звучит как swing | `swingRatio` форсируется в 0.5 для bossa/latin через `perStyleDefaults` |

## 14. Метрики успеха

- [ ] 5 стилей имеют ≥10 groove-молекул каждый (swing, bossa, funk, latin, ballad)
- [ ] 5 стилей имеют ≥3 fill-молекул каждый
- [ ] 5 стилей имеют ≥5 клеток (8, 16, 32 такта) каждый
- [ ] 5 стилей имеют ≥2 организмов каждый (AABA, verse-chorus, loop)
- [ ] Организм: корректно переключает клетки при смене секций формы (intro → verse → bridge → ending)
- [ ] Рандомизация на уровне клетки: `DrumRandomizer` работает внутри стабильного groove (ride variation, ghost notes)
- [ ] Вариации: срабатывают каждые N тактов согласно `cell.variationEveryBars`
- [ ] Crash: срабатывает на beat 1 согласно `cell.fillEveryBars`, всегда после fill
- [ ] Fills: используются томы, buzz и flam согласно настройкам; fill всегда предшествует crash
- [ ] Переключение groove→texture: работает после bridge-секции (`switchToTexture`)
- [ ] Ghost notes: организованы в фразы (молекулы), а не случайные одиночные ноты
- [ ] Buzz: корректно заменяет ghost-ноты с вероятностью `buzzProbability`
- [ ] Flam: корректно заменяет акцентированные snare с вероятностью `flamProbability`
- [ ] Humanize: 5 параметров (timing jitter, velocity var, micro-shift, bar groove, drop probability) с 4 пресетами
- [ ] Swing ratio корректно применяется ко всем стилям (включая bossa=0.5 и latin=0.5)
- [ ] Per-sound enable/volume: все существующие настройки сохраняются, новые (`rideBellEnabled`, `hihatFootEnabled` и др.) добавляются
- [ ] `DrumPatternEngine` переиспользует существующие `DrumInstrument`, `DrumRandomizer`, `resolveDrumArticulation()`
- [ ] Обратная совместимость: старые `drums`/`modern-kit` манифесты работают без `DrumPatternEngine` (flat-режим)
- [ ] Все существующие тесты `drumInstrument.test.ts` и `drumRandomizer.test.ts` проходят
- [ ] Клетки поддерживают размер 5/4 через `cell.timeSignature`

---

*Следующий шаг: обсуждение и уточнение архитектуры → декомпозиция на задачи → создание `DRUMS-PATTERNS-PLAN.md`.*
