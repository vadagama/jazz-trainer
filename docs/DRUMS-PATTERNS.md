# Drum Patterns — атомы, молекулы, клетки и организмы

> **Статус:** 🟢 Pattern Engine — единственная система планирования (hardcoded-паттерны удалены)
> **Модули:** `drumInstrument.ts`, `drumPatternEngine.ts`, `drumMolecules.ts`, `drumCells.ts`, `drumOrganisms.ts`, `drumPatternTypes.ts`
> **Связанные документы:** `docs/DRUMS.md` (общее описание барабанов)

## 1. Концепция: четыре уровня абстракции

Барабанные паттерны организованы в четырёхуровневую иерархию:

```
Atom (L0) ──▶ Molecule (L1) ──▶ Cell (L2) ──▶ Organism (L3)
один удар      1–2 такта        8–16 тактов     макро-форма
```

| Уровень | Что это | Аналогия | Где живёт |
|---------|---------|----------|-----------|
| **Atom** | Один звук в конкретный tick с velocity и duration | Нота | `drumPatternTypes.ts` → `DrumAtom` |
| **Molecule** | Набор атомов на 1–2 такта с категорией (groove, fill, texture...) | Фраза / паттерн | `drumMolecules.ts` → `DrumMolecule` |
| **Cell** | Стабильный groove-блок 8/16 тактов с вариациями, fills и crash по расписанию | Форма секции (verse, bridge) | `drumCells.ts` → `DrumCell` |
| **Organism** | Последовательность секций (intro→verse→bridge→ending), каждая ссылается на пул клеток | Макро-форма (AABA, verse-chorus) | `drumOrganisms.ts` → `DrumOrganism` |

### 1.1. Atom

```ts
interface DrumAtom {
  sound: DrumSound;        // Какой звук
  atTick: number;          // Смещение в тиках от начала молекулы (прямое, без swing)
  velocity: number;        // Громкость 0..1
  durationTicks: number;   // Длительность в тиках
}
```

Тики считаются от начала молекулы (не такта!). PPQ = 480 ticks на четверть.
В молекуле на 1 такт 4/4: 0..1920 тиков.

### 1.2. Molecule

```ts
interface DrumMolecule {
  id: string;              // Уникальный ID: 'swing-ride-basic'
  label: string;           // Человеческое описание
  style: DrumPatternStyle; // swing | bossa | funk | latin | ballad
  bars: 1 | 2;             // Длина в тактах
  atoms: DrumAtom[];       // Набор атомов
  category: MoleculeCategory; // groove | fill | texture | accent | intro | ending
  tags: string[];          // Теги: ['ride', 'hihat', 'kick']
  weight: number;          // Вероятностный вес (чем больше, тем чаще выбирается)
  complexity: { min: 1|2|3; max: 1|2|3 }; // Допустимый диапазон сложности
  conditions?: MoleculeConditions; // Условия: requireRide, requireToms, barModulo...
}
```

**Категории молекул:**

| Категория | Назначение | Примеры |
|-----------|------------|---------|
| `groove` | Основной грув — базовая ритмическая фактура | `swing-ride-basic`, `bossa-clave-rim-1` |
| `fill` | Заполнение (fill) — в конце секции | `swing-fill-triplet-1`, `funk-fill-16ths` |
| `texture` | Текстурный слой — ghost-ноты, stir, дополнительные краски | `swing-stir-texture`, `swing-snare-ghost-phrase` |
| `accent` | Акцент — crash, ride bell, специальные удары | `swing-crash-accent`, `funk-crash-sizzle` |
| `intro` | Вступление — clicks, нарастание | `swing-intro-4clicks`, `funk-intro-4bars` |
| `ending` | Концовка — ritard, финальный crash | `swing-ending-crash`, `ballad-ending-ritard` |

### 1.3. Cell (v1.1)

Клетка — стабильный groove-блок. В отличие от v1.0, клетка **не содержит сменяющихся секций**.
Groove играет устойчиво из пула молекул (все молекулы пула звучат одновременно).
Вариации, fills и crash добавляются **поверх** грува по расписанию.

```ts
interface DrumCell {
  id: string;                    // 'swing-16-verse'
  style: DrumPatternStyle;
  length: 8 | 16 | 32;           // Общая длина в тактах
  timeSignature: [4, 4] | [5, 4];

  grooveMoleculePool: string[];  // Пул молекул для основного groove (все одновременно)

  variationEveryBars: number;    // Каждые сколько тактов вставляется вариация (0 = без)
  variationMoleculePool: string[]; // Пул вариационных молекул
  variationCount: number;        // Сколько разных вариаций (ротация по циклам)

  fillEveryBars: 8 | 16 | 32;   // Fill каждые N тактов (fill накладывается поверх грува)
  fillMoleculePool: string[];    // Пул fill-молекул
  crashType: DrumSound;          // Тип crash

  dynamicsType: 'steady' | 'crescendo' | 'decrescendo' | 'wave';
  volumeMul: number;             // Базовый множитель громкости

  textureMoleculePool?: string[]; // Текстурный пул (используется после bridge)
  weight: number;
}
```

### 1.4. Organism (L3)

Организм — макро-форма, состоящая из секций (intro, verse, bridge, chorus, ending).
Каждая секция ссылается на пул клеток (выбирается детерминированно по seed).

```ts
interface OrganismSection {
  label: string;
  type: 'intro' | 'verse' | 'chorus' | 'bridge' | 'ending';
  cellPool: string[];          // Пул ID клеток (выбор с весами)
  repeats?: number;            // Повторений клетки (по умолчанию 1)
  params?: {
    volumeMul?: number;
    switchToTexture?: boolean; // После клетки — переключить groove→texture
  };
}

interface DrumOrganism {
  id: string;                  // 'swing-aaba-32'
  style: DrumPatternStyle;
  label: string;
  sections: OrganismSection[];
  weight: number;
}
```

**Режим текстуры (texture mode):** после bridge-секции с `switchToTexture: true` организм переключает клетку на `textureMoleculePool` вместо `grooveMoleculePool`. Это создаёт контраст между verse (плотный groove) и bridge (разреженная текстура).

---

## 2. Единая система: Pattern Engine

`DrumInstrument` использует **только Pattern Engine**. Старый hardcoded-код (`scheduleSwing`, `scheduleBossa`, `scheduleFunk`, `scheduleDegradedSwing`) удалён.

### Алгоритм `scheduleWithEngine()`:

1. При первом вызове — выбрать `DrumOrganism` для стиля (weighted random по seed от BPM + swingRatio).
2. Для каждого такта в окне — отобразить номер такта на позицию в организме (`resolveBar`).
3. Для позиции — вызвать `assembleBar(cell, barInCell, barInOrganism, ...)`:
   - Определить: fill бар? crash бар? variation бар?
   - Вычислить dynamics-множитель (steady/crescendo/decrescendo/wave)
   - Собрать groove-молекулы (все одновременно) из пула
   - Наложить variation-молекулу (если variation-бар)
   - Наложить fill-молекулу (если fill-бар)
   - Добавить crash (если crash-бар)
   - Применить swing-оффсет к offbeat-восьмым
   - Разрешить артикуляции (если `useArticulations`)
4. Отправить hits в планировщик.

### Стиль → PatternStyle

Для articulation-резолюции `latin` мапится на `bossa`, `ballad` на `swing` (legacy-стили).
Для выбора организма и клеток используются полноценные `DrumPatternStyle`: `swing`, `bossa`, `funk`, `latin`, `ballad`.

### Ограничения

- **Только 4/4**: не-4/4 размеры возвращают управление без звука.
- **Детерминированность**: `assembleBar` полностью детерминирована относительно `(cell, barInCell, barInOrganism, seed)`, что гарантирует идемпотентность при под-тактовых окнах планировщика.

---

## 3. Система координат

Все позиции — в **тиках**, где **PPQ = 480** (pulses per quarter note).

### 3.1. Tick-константы в рамках одного такта 4/4

```
Такт = 1920 тиков (4 × 480)

B1 = 0        (beat 1)
B2 = 480      (beat 2)
B3 = 960      (beat 3)
B4 = 1440     (beat 4)

Восьмые внутри доли (subdivision):
_8    = 240   (восьмая на downbeat)
_8off = 240   (свинговая восьмая — swingRatio × 480 ≈ 320 для swing 0.67)

Шестнадцатые внутри доли:
_16    = 120  (16-я на downbeat)
_16e   = 120  ('e' — вторая 16-я)
_16and = 240  ('&' — третья 16-я = восьмая)
_16a   = 360  ('a' — четвёртая 16-я)
```

### 3.2. Свинговый оффсет

Swing-восьмые (`_8off`) сдвигаются динамически через `applySwing()` в `drumPatternEngine.ts`. При `swingRatio = 0.67`:

```
Прямые восьмые:   0────240────480
Свинговые:        0────────320──480
                   └── 67% ──┘└─33%─┘
```

---

## 4. Все молекулы (сводная таблица)

Всего **82 молекулы** в реестре `DRUM_MOLECULES`.

### 4.1. Swing (19 молекул)

| ID | Категория | Такты | Описание | Сложность |
|----|-----------|-------|----------|-----------|
| `swing-ride-basic` | groove | 1 | Ride ding-ding-a-ding + HH chick 2/4 | 1–3 |
| `swing-ride-variation-1` | groove | 1 | Ride с дополнительным skip на 1& | 2–3 |
| `swing-ride-variation-2` | groove | 1 | Ride с bell-акцентом на 1 | 2–3 |
| `swing-ride-skip` | groove | 1 | Ride с пропуском 2-й доли | 2–3 |
| `swing-feathering-1` | groove | 1 | BD feathering все 4 доли | 1–3 |
| `swing-feathering-2` | groove | 1 | BD только 1 и 3 | 1–3 |
| `swing-feathering-3` | groove | 1 | BD 1, 3&, 4 (синкопа) | 2–3 |
| `swing-feathering-4` | groove | 1 | BD 1, 2&, 4 | 2–3 |
| `swing-foot-chick` | groove | 1 | HH foot chick на 2 и 4 | 1–3 |
| `swing-snare-backbeat` | groove | 1 | Snare на 2 и 4 | 1–3 |
| `swing-snare-ghost-phrase` | texture | 1 | Ghost-ноты на e и a 3-й доли | 2–3 |
| `swing-stir-texture` | texture | 1 | HH foot stir на 2 и 4 | 1–3 |
| `swing-hihat-clave` | texture | 1 | HH clave-подобный рисунок | 2–3 |
| `swing-crash-accent` | accent | 1 | Crash на 1-й доле | 1–3 |
| `swing-fill-triplet-1` | fill | 1 | Триольный fill snare+BD | 1–3 |
| `swing-fill-tom-run` | fill | 1 | Tom run (нисходящий) | 2–3 |
| `swing-fill-crescendo` | fill | 1 | Fill с крещендо | 2–3 |
| `swing-intro-4clicks` | intro | 1 | 4 clicks (rim) для отсчёта | 1–3 |
| `swing-ending-crash` | ending | 1 | Финальный crash + BD | 1–3 |

### 4.2. Bossa (14 молекул)

| ID | Категория | Такты | Описание | Сложность |
|----|-----------|-------|----------|-----------|
| `bossa-clave-rim-1` | groove | 1 | Rim clave: X·X·X··· | 1–3 |
| `bossa-clave-rim-2` | groove | 1 | Rim clave вариация: X·X··X· | 1–3 |
| `bossa-clave-xstick` | groove | 1 | Cross-stick clave 2/3 | 2–3 |
| `bossa-kick-partido` | groove | 1 | BD partido alto: 1, 2& | 1–3 |
| `bossa-kick-syncopated` | groove | 1 | BD синкопа: 1, 2&, 4& | 2–3 |
| `bossa-kick-baiao` | groove | 1 | BD baião: 1, 3&, 4 | 2–3 |
| `bossa-hihat-8ths` | groove | 1 | HH восьмые (закрытые) | 1–3 |
| `bossa-hihat-chick` | groove | 1 | HH chick на 2 и 4 | 1–3 |
| `bossa-ride-bossa` | groove | 1 | Ride bossa-паттерн: восьмые | 1–3 |
| `bossa-ride-samba` | groove | 1 | Ride samba: 16-е с акцентами | 2–3 |
| `bossa-crash-accent` | accent | 1 | Crash на 1-й доле | 1–3 |
| `bossa-fill-tom-samba` | fill | 1 | Tom fill в стиле самба | 2–3 |
| `bossa-fill-rim-variation` | fill | 1 | Rim clave вариация fill | 1–3 |
| `bossa-fill-surdo` | fill | 1 | Сурдо-подобный tom fill | 2–3 |

### 4.3. Funk (19 молекул)

| ID | Категория | Такты | Описание | Сложность |
|----|-----------|-------|----------|-----------|
| `funk-kick-linear-1` | groove | 1 | BD linear: 1, 1&, 3, 3& | 1–3 |
| `funk-kick-linear-2` | groove | 1 | BD linear: 1, 2&, 3, 4& | 1–3 |
| `funk-kick-ghosted` | groove | 1 | BD с ghost-нотами на 16-х | 2–3 |
| `funk-kick-pocket` | groove | 1 | BD pocket: 1, 3 (минимал) | 1–2 |
| `funk-snare-backbeat` | groove | 1 | Snare на 2 и 4 | 1–3 |
| `funk-snare-rimshot` | texture | 1 | Snare rimshot на 2 и 4 | 2–3 |
| `funk-snare-ghost-16ths` | texture | 1 | Ghost-ноты 16-ми между backbeat | 2–3 |
| `funk-snare-buzz-phrase` | texture | 1 | Snare buzz rolls | 2–3 |
| `funk-snare-flam-accent` | texture | 1 | Flam-акценты на snare | 2–3 |
| `funk-snare-shuffle` | texture | 1 | Snare shuffle feel | 2–3 |
| `funk-hihat-16ths` | groove | 1 | HH прямые 16-е | 1–3 |
| `funk-hihat-open-offbeat` | groove | 1 | HH открытый на offbeat'ах | 2–3 |
| `funk-hihat-bark` | accent | 1 | HH bark (короткий открытый) | 2–3 |
| `funk-ride-bell` | accent | 1 | Ride bell на 1 | 2–3 |
| `funk-crash-sizzle` | accent | 1 | Crash sizzle на 1 | 2–3 |
| `funk-fill-16ths` | fill | 1 | 16-е snare fill | 1–3 |
| `funk-fill-tom-bass` | fill | 1 | Tom + BD fill | 2–3 |
| `funk-fill-buzz-flam` | fill | 1 | Fill с buzz + flam | 2–3 |
| `funk-intro-4bars` | intro | 1 | HH 16-е intro | 1–3 |

### 4.4. Latin (14 молекул)

| ID | Категория | Такты | Описание | Сложность |
|----|-----------|-------|----------|-----------|
| `latin-cascara-1` | groove | 1 | Cascara pattern v1 (ride) | 1–3 |
| `latin-cascara-2` | groove | 1 | Cascara pattern v2 | 1–3 |
| `latin-cascara-3` | groove | 1 | Cascara pattern v3 | 2–3 |
| `latin-clave-son-2-3` | groove | 2 | Clave son 2/3 (2 такта) | 1–3 |
| `latin-clave-son-3-2` | groove | 2 | Clave son 3/2 (2 такта) | 1–3 |
| `latin-clave-rumba-3-2` | groove | 2 | Clave rumba 3/2 (2 такта) | 2–3 |
| `latin-kick-tumbao` | groove | 1 | BD tumbao: 1, 2&, 4 | 1–3 |
| `latin-kick-montuno` | groove | 1 | BD montuno: синкопированный | 2–3 |
| `latin-kick-bombo` | groove | 1 | BD bombo: 1, 3 | 1–3 |
| `latin-hihat-cascara` | groove | 1 | HH cascara (восьмые с акцентами) | 1–3 |
| `latin-crash-accent` | accent | 1 | Crash на 1 | 1–3 |
| `latin-fill-timbal` | fill | 1 | Timbal-подобный fill | 2–3 |
| `latin-fill-conga` | fill | 1 | Conga-подобный tom fill | 2–3 |
| `latin-fill-bombo` | fill | 1 | Bombo fill | 2–3 |

### 4.5. Ballad (16 молекул)

| ID | Категория | Такты | Описание | Сложность |
|----|-----------|-------|----------|-----------|
| `ballad-ride-soft` | groove | 1 | Ride мягкий (только доли) | 1–3 |
| `ballad-ride-brushes` | groove | 1 | Ride «щётки» (непрерывные 8-е) | 2–3 |
| `ballad-ride-triplet` | groove | 1 | Ride триолями | 2–3 |
| `ballad-kick-feathering` | groove | 1 | BD feathering все 4 доли | 1–3 |
| `ballad-kick-two-feel` | groove | 1 | BD two-feel: 1 и 3 | 1–3 |
| `ballad-kick-waltz` | groove | 1 | BD вальсовый: 1 (сильно) | 1–3 |
| `ballad-snare-crossstick` | groove | 1 | Snare cross-stick на 2 и 4 | 1–3 |
| `ballad-snare-soft` | groove | 1 | Snare мягкий на 2 и 4 | 1–3 |
| `ballad-hihat-chick` | groove | 1 | HH chick на 2 и 4 | 1–3 |
| `ballad-hihat-sizzle` | texture | 1 | HH sizzle (полуоткрытый) | 2–3 |
| `ballad-stir-texture` | texture | 1 | HH foot stir (непрерывно) | 1–3 |
| `ballad-crash-soft` | accent | 1 | Crash мягкий (sizzle) | 1–3 |
| `ballad-fill-brush` | fill | 1 | Fill «щётки» (snare swirl) | 2–3 |
| `ballad-fill-tom-swell` | fill | 1 | Tom swell (крещендо) | 2–3 |
| `ballad-fill-triplet` | fill | 1 | Триольный fill | 2–3 |
| `ballad-ending-ritard` | ending | 1 | Замедляющаяся концовка | 1–3 |

---

## 5. Все клетки (Cells v1.1)

Клетки v1.1 — стабильные groove-блоки. В отличие от v1.0, клетка не содержит сменяющихся секций: groove играет устойчиво; вариации, fills и crash — по расписанию.

Всего **20 клеток** в реестре `DRUM_CELLS` (по 4 на стиль: verse, bridge/chorus/texture, intro, ending).

### 5.1. Swing (4 клетки)

| ID | Тактов | Groove-пул | Вариация | Fill | Crash |
|----|--------|------------|----------|------|-------|
| `swing-16-verse` | 16 | ride-basic, feathering-1, foot-chick, stir-texture, snare-ghost | snare-backbeat (каждые 4т) | fill-triplet-1 (каждые 8т) | crash |
| `swing-16-bridge` | 16 | ride-basic, feathering-1, foot-chick, snare-backbeat | stir-texture (каждые 4т) | fill-tom-run, fill-triplet-1 (каждые 8т) | crash |
| `swing-4-intro` | 8 | intro-4clicks | — | — | crash |
| `swing-8-ending` | 8 | ride-basic, feathering-1, snare-backbeat | — | fill-triplet-1, fill-tom-run (каждые 8т) | crash |

### 5.2. Bossa (4 клетки)

| ID | Тактов | Groove-пул | Вариация | Fill | Crash |
|----|--------|------------|----------|------|-------|
| `bossa-16-verse` | 16 | clave-rim-1, kick-partido, hihat-8ths | clave-rim-2, kick-syncopated (каждые 16т) | fill-tom-samba, fill-rim-variation (каждые 16т) | crash |
| `bossa-16-bridge` | 16 | clave-rim-2, ride-bossa, kick-syncopated | clave-xstick, ride-samba (каждые 8т) | fill-tom-samba, fill-surdo (каждые 16т) | crash |
| `bossa-8-intro` | 8 | clave-rim-1, kick-partido | — | — | crash |
| `bossa-8-ending` | 8 | clave-rim-1, hihat-chick, kick-partido | — | fill-rim-variation, fill-tom-samba (каждые 8т) | crash |

### 5.3. Funk (4 клетки)

| ID | Тактов | Groove-пул | Вариация | Fill | Crash |
|----|--------|------------|----------|------|-------|
| `funk-16-verse` | 16 | kick-linear-1, snare-backbeat, hihat-16ths | kick-linear-2, hihat-open-offbeat (каждые 16т) | fill-16ths, fill-tom-bass (каждые 16т) | crash_sizzle |
| `funk-16-chorus` | 16 | kick-linear-2, snare-rimshot, hihat-open-offbeat | kick-ghosted, ride-bell (каждые 4т) | fill-buzz-flam, fill-tom-bass (каждые 8т) | crash_sizzle |
| `funk-8-intro` | 8 | intro-4bars | — | — | crash |
| `funk-8-ending` | 8 | kick-linear-1, snare-backbeat, hihat-16ths | — | fill-16ths, fill-buzz-flam (каждые 8т) | crash_sizzle |

### 5.4. Latin (4 клетки)

| ID | Тактов | Groove-пул | Вариация | Fill | Crash |
|----|--------|------------|----------|------|-------|
| `latin-16-verse` | 16 | cascara-1, clave-son-2-3, kick-tumbao | cascara-2, kick-montuno (каждые 16т) | fill-timbal, fill-conga (каждые 16т) | crash |
| `latin-16-montuno` | 16 | cascara-2, clave-son-3-2, kick-montuno | cascara-3, kick-bombo (каждые 8т) | fill-timbal, fill-bombo (каждые 16т) | crash |
| `latin-8-intro` | 8 | cascara-1, clave-son-2-3 | — | — | crash |
| `latin-8-ending` | 8 | clave-son-2-3, hihat-cascara, kick-tumbao | — | fill-timbal, fill-conga (каждые 8т) | crash |

### 5.5. Ballad (4 клетки)

| ID | Тактов | Groove-пул | Вариация | Fill | Crash |
|----|--------|------------|----------|------|-------|
| `ballad-16-verse` | 16 | ride-soft, kick-two-feel, snare-crossstick | ride-brushes, stir-texture (каждые 16т) | fill-brush (каждые 16т) | crash_sizzle |
| `ballad-16-texture` | 16 | ride-brushes, kick-feathering, stir-texture | hihat-sizzle (каждые 8т) | fill-triplet (каждые 32т) | crash_sizzle |
| `ballad-8-intro` | 8 | ride-soft, kick-two-feel | — | — | crash_sizzle |
| `ballad-8-ending` | 8 | ride-soft, snare-soft, kick-feathering | — | fill-brush, fill-tom-swell (каждые 8т) | crash_sizzle |

---

## 6. Все организмы (Organisms)

Организмы собирают клетки в макро-формы. Всего **11 организмов** в реестре `DRUM_ORGANISMS`.

Два типа:
- **Формные** (weight = 0): явная форма с intro/verse/bridge/ending — выбираются только если композиция имеет выраженную структуру.
- **Flat** (weight = 1.0): verse-only loop — используются по умолчанию.

### 6.1. Формные организмы

| ID | Стиль | Секции | Тактов |
|----|-------|--------|--------|
| `swing-aaba-32` | swing | intro(8) → A1(16) → A2(16) → B(16, texture) → A3(16) → ending(8) | 80 |
| `swing-aaba-32-loop` | swing | A1(16) → A2(16) → B(16) → A3(16) | 64 |
| `funk-verse-chorus-32` | funk | intro(8) → verse(16) → chorus(16) → verse(16) → ending(8) | 64 |
| `bossa-aaba-64` | bossa | intro(8) → A1(32) → B(16) → A2(16) → ending(8) | 80 |
| `latin-aaba-32` | latin | intro(8) → A1(16) → A2(16) → B(16) → A3(16) → ending(8) | 80 |
| `ballad-aaba-32` | ballad | intro(8) → A1(16) → A2(16) → B(16, texture) → A3(16) → ending(8) | 80 |

### 6.2. Flat-организмы (по умолчанию)

| ID | Стиль | Секции | Тактов |
|----|-------|--------|--------|
| `swing-flat-16` | swing | A1(16-verse) → A2(16-bridge) → A3(16-verse) → A4(16-bridge) | 64 |
| `bossa-flat-16` | bossa | A(16-verse) ×4 | 64 |
| `funk-flat-16` | funk | A(16-verse) ×4 | 64 |
| `latin-flat-16` | latin | A(16-verse) ×4 | 64 |
| `ballad-flat-16` | ballad | A(16-verse) ×4 | 64 |

---

## 7. Визуальные сетки молекул (выборочно)

Ниже — сетки ключевых молекул. Каждая сетка: **1 такт 4/4**, горизонталь = звуки, вертикаль = доли/субдивизии.

**Обозначения:**
- ● — основной удар (velocity ≥ 0.6)
- ○ — тихий удар / ghost (velocity < 0.6)
- Пусто — нет звука

### 7.1. Swing: `swing-ride-basic` + `swing-feathering-1` + `swing-snare-backbeat` + `swing-foot-chick`

Четыре groove-молекулы, которые вместе образуют классический swing-груз:

```
Сетка: 1 такт, 16-е субдивизии
┌──────┬────┬───────┬───────┬───────┬──────┬──────┬───────┬───────┐
│ Доля │ Sub│ Tick  │  BD   │Snare │  HH  │ Ride │  Rim  │ Crash │
├──────┼────┼───────┼───────┼───────┼──────┼──────┼───────┼───────┤
│  1   │ –  │   0   │ ●0.85 │       │      │●0.85 │       │       │
│  1   │ e  │ 120   │       │       │      │      │       │       │
│  1   │ &  │ ~320  │       │       │      │●0.65 │       │       │
│  1   │ a  │ 360   │       │       │      │      │       │       │
│  2   │ –  │ 480   │ ○0.5  │ ●0.9  │●0.8  │●0.75 │       │       │
│  2   │ e  │ 600   │       │       │      │      │       │       │
│  2   │ &  │ ~800  │       │       │      │●0.65 │       │       │
│  2   │ a  │ 840   │       │       │      │      │       │       │
│  3   │ –  │ 960   │ ●0.7  │       │      │●0.8  │       │       │
│  3   │ e  │ 1080  │       │       │      │      │       │       │
│  3   │ &  │ ~1280 │       │       │      │●0.65 │       │       │
│  3   │ a  │ 1320  │       │       │      │      │       │       │
│  4   │ –  │ 1440  │ ○0.5  │ ●0.85 │●0.8  │●0.75 │       │       │
│  4   │ e  │ 1560  │       │       │      │      │       │       │
│  4   │ &  │ ~1760 │       │       │      │      │       │       │
│  4   │ a  │ 1800  │       │       │      │      │       │       │
└──────┴────┴───────┴───────┴───────┴──────┴──────┴───────┴───────┘
```

HH chick и foot chick объединены в `swing-foot-chick` (на 2 и 4).

### 7.2. Bossa: `bossa-clave-rim-1` + `bossa-kick-partido` + `bossa-hihat-8ths`

```
Сетка: 1 такт, 8-е субдивизии
┌──────┬────┬───────┬───────┬───────┬──────┬──────┬───────┬───────┐
│ Доля │ Sub│ Tick  │  BD   │Snare │  HH  │ Ride │  Rim  │ Crash │
├──────┼────┼───────┼───────┼───────┼──────┼──────┼───────┼───────┤
│  1   │ –  │   0   │ ●0.85 │       │○0.5  │      │●0.85  │       │
│  1   │ &  │ ~320  │       │       │○0.5  │      │       │       │
│  2   │ –  │ 480   │       │       │●0.8  │      │●0.75  │       │
│  2   │ &  │ ~800  │ ●0.7  │       │○0.5  │      │       │       │
│  3   │ –  │ 960   │       │       │○0.5  │      │●0.75  │       │
│  3   │ &  │ ~1280 │       │       │○0.5  │      │       │       │
│  4   │ –  │ 1440  │       │       │●0.8  │      │       │       │
│  4   │ &  │ ~1760 │       │       │○0.5  │      │       │       │
└──────┴────┴───────┴───────┴───────┴──────┴──────┴───────┴───────┘
```

Snare не используется — его роль выполняет rim (clave).

### 7.3. Funk: `funk-kick-linear-1` + `funk-snare-backbeat` + `funk-hihat-16ths`

```
Сетка: 1 такт, 16-е субдивизии
┌──────┬────┬───────┬───────┬───────┬──────┬──────┬───────┬───────┐
│ Доля │ Sub│ Tick  │  BD   │Snare │  HH  │ Ride │  Rim  │ Crash │
├──────┼────┼───────┼───────┼───────┼──────┼──────┼───────┼───────┤
│  1   │ –  │   0   │ ●0.85 │       │●0.7  │      │       │       │
│  1   │ e  │ 120   │       │       │○0.5  │      │       │       │
│  1   │ &  │ ~320  │ ●0.7  │       │○0.5  │      │       │       │
│  1   │ a  │ 360   │       │       │○0.5  │      │       │       │
│  2   │ –  │ 480   │       │ ●0.9  │●0.7  │      │       │       │
│  2   │ e  │ 600   │       │       │○0.5  │      │       │       │
│  2   │ &  │ ~800  │       │       │○0.5  │      │       │       │
│  2   │ a  │ 840   │       │       │○0.5  │      │       │       │
│  3   │ –  │ 960   │ ●0.85 │       │●0.7  │      │       │       │
│  3   │ e  │ 1080  │       │       │○0.5  │      │       │       │
│  3   │ &  │ ~1280 │ ●0.7  │       │○0.5  │      │       │       │
│  3   │ a  │ 1320  │       │       │○0.5  │      │       │       │
│  4   │ –  │ 1440  │       │ ●0.9  │●0.7  │      │       │       │
│  4   │ e  │ 1560  │       │       │○0.5  │      │       │       │
│  4   │ &  │ ~1760 │       │       │○0.5  │      │       │       │
│  4   │ a  │ 1800  │       │       │○0.5  │      │       │       │
└──────┴────┴───────┴───────┴───────┴──────┴──────┴───────┴───────┘
```

Ride не используется — groove строится на HH + BD.

### 7.4. Latin: `latin-clave-son-2-3` (2 такта!)

```
Сетка: 2 такта, 8-е субдивизии
┌──────┬────┬────────┬───────┬───────┬──────┬──────┬───────┬───────┐
│ Такт │Доля│  Tick  │  BD   │Snare │  HH  │ Ride │  Rim  │ Crash │
├──────┼────┼────────┼───────┼───────┼──────┼──────┼───────┼───────┤
│  1   │ 1  │    0   │       │       │      │      │ ●0.8  │       │
│  1   │ 1& │   240  │       │       │      │      │       │       │
│  1   │ 2  │  480   │       │       │      │      │       │       │
│  1   │ 2& │  720   │       │       │      │      │ ●0.75 │       │
│  1   │ 3  │  960   │       │       │      │      │       │       │
│  1   │ 3& │ 1200   │       │       │      │      │ ●0.8  │       │
│  1   │ 4  │ 1440   │       │       │      │      │       │       │
│  1   │ 4& │ 1680   │       │       │      │      │       │       │
│  2   │ 1  │ 1920   │       │       │      │      │       │       │
│  2   │ 1& │ 2160   │       │       │      │      │       │       │
│  2   │ 2  │ 2400   │       │       │      │      │ ●0.75 │       │
│  2   │ 2& │ 2640   │       │       │      │      │       │       │
│  2   │ 3  │ 2880   │       │       │      │      │ ●0.8  │       │
│  2   │ 3& │ 3120   │       │       │      │      │       │       │
│  2   │ 4  │ 3360   │       │       │      │      │       │       │
│  2   │ 4& │ 3600   │       │       │      │      │       │       │
└──────┴────┴────────┴───────┴───────┴──────┴──────┴───────┴───────┘
```

Son clave 2/3: `X··X··X· | ··X·X···`

### 7.5. Ballad: `ballad-ride-soft` + `ballad-kick-feathering` + `ballad-snare-crossstick`

```
Сетка: 1 такт, 8-е субдивизии
┌──────┬────┬───────┬───────┬───────┬──────┬──────┬───────┬───────┐
│ Доля │ Sub│ Tick  │  BD   │Snare │  HH  │ Ride │  Rim  │ Crash │
├──────┼────┼───────┼───────┼───────┼──────┼──────┼───────┼───────┤
│  1   │ –  │   0   │ ●0.85 │       │      │●0.6  │       │       │
│  1   │ &  │ ~320  │       │       │      │      │       │       │
│  2   │ –  │ 480   │ ○0.5  │ ●0.7  │●0.6  │●0.55 │       │       │
│  2   │ &  │ ~800  │       │       │      │      │       │       │
│  3   │ –  │ 960   │ ●0.7  │       │      │●0.55 │       │       │
│  3   │ &  │ ~1280 │       │       │      │      │       │       │
│  4   │ –  │ 1440  │ ○0.5  │ ●0.65 │●0.6  │●0.55 │       │       │
│  4   │ &  │ ~1760 │       │       │      │      │       │       │
└──────┴────┴───────┴───────┴───────┴──────┴──────┴───────┴───────┘
```

В ballad всё тише: ride 0.55–0.6, snare cross-stick вместо полноценного snare, BD feathering мягкий.

---

## 8. Как читать код: быстрая навигация

| Что нужно | Где искать |
|-----------|------------|
| Типы Atom/Molecule/Cell/Organism | `drumPatternTypes.ts` |
| Все молекулы (данные) | `drumMolecules.ts` → `DRUM_MOLECULES` |
| Все клетки (данные) | `drumCells.ts` → `DRUM_CELLS` |
| Все организмы (данные) | `drumOrganisms.ts` → `DRUM_ORGANISMS` |
| Логика сборки Cell → Hits | `drumPatternEngine.ts` → `assembleBar()` |
| Выбор организма + резолвинг бара | `drumPatternEngine.ts` → `selectOrganism()` |
| DrumInstrument (входная точка) | `drumInstrument.ts` → `schedule()` → `scheduleWithEngine()` |
| Разрешение артикуляций | `drumInstrument.ts` → `resolveDrumArticulation()` |
| Tick-константы (B1..B4, _8, _16) | `drumMolecules.ts` (в начале файла) |
| PPQ | `drumMolecules.ts` → `const PPQ = 480` |
| Тесты | `drumInstrument.test.ts` |

---

## 9. Статус и планы

| Компонент | Статус |
|-----------|--------|
| Pattern Engine (единственная система) | 🟢 Продакшен |
| DrumMolecules (82 молекулы) | 🟢 Продакшен |
| DrumCells v1.1 (20 клеток) | 🟢 Продакшен |
| DrumOrganisms (11 организмов) | 🟢 Продакшен |
| Texture mode (groove ↔ texture) | 🟢 Продакшен |
| Articulation resolution (per-velocity) | 🟢 Продакшен |
| ~~Hardcoded patterns~~ (swing, bossa, funk) | ⚪ Удалены (заменены Pattern Engine) |
| ~~Degraded swing~~ (не-4/4) | ⚪ Удалён (Pattern Engine только 4/4) |
| ~~DrumRandomizer~~ | ⚪ Удалён (логика в `assembleBar`) |

**Планы:**
1. Поддержка размеров ≠ 4/4 (сейчас silent return)
2. Humanization v2 (timing jitter, velocity variation)
3. Больше организмов для каждого стиля
4. Пользовательская конфигурация организмов через настройки

---

_См. также: `docs/DRUMS.md` (общее описание барабанов, сэмплы, настройки)_
