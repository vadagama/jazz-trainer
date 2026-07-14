# Piano Extended Arrangement — план реализации

> **Дата:** 2026-07-11
> **Источник:** `docs/PIANO-EXTENDED-ARRANGEMENT.md` (vision)
> **Статус:** 🟡 План

## Задачи

| ID | Задача | Приоритет | Сложность | Слой | Модуль |
|----|--------|-----------|-----------|------|--------|
| T-001 | Транспозиция молекул: интервалы вместо MIDI | P0 | M | music-core | pianoPatternTypes.ts, pianoMolecules.ts, pianoPatternEngine.ts |
| T-002 | HumanizeParams: модель humanization (velocity variation, spread, timing) | P0 | S | music-core | pianoPatternTypes.ts |
| T-003 | Humanization: velocity variation + chord spread + humanize timing + phrasing | P0 | M | music-core | pianoInstrument.ts |
| T-004 | Humanize-настройки в StyleProfile + DTO | P0 | XS | shared, music-core | styleProfile.ts, dto.ts |
| T-005 | UI-настройки humanize в конструкторе фортепиано | P0 | S | plugins | piano-constructor plugin |
| T-006 | Новая категория молекул: `upper` | P1 | XS | music-core | pianoPatternTypes.ts |
| T-007 | Upper Structure Engine: таблица + suggestUpperStructure() | P1 | M | music-core | pianoVoicing.ts или pianoUpperStructures.ts |
| T-008 | Молекулы upper structures (6–8 шт.) | P1 | M | music-core | pianoMolecules.ts |
| T-009 | Passing chords как молекулы (8–12 шт.) | P1 | M | music-core | pianoMolecules.ts |
| T-010 | Замена applyPassingChord в Randomizer на выбор из пула | P1 | S | music-core | pianoRandomizer.ts |
| T-011 | Multi-clip pool — ритмическая вариативность в клетках | P1 | M | music-core | pianoCells.ts |
| T-012 | Расширенные клетки: multi-clip + upper + fill + accent (4–6 шт.) | P1 | M | music-core | pianoCells.ts |
| T-013 | Расширенные организмы: verse/chorus/bridge (3–5 шт.) | P1 | S | music-core | pianoOrganisms.ts |
| T-014 | Расширение pianoRhodesInteraction для категории `upper` | P2 | S | music-core | pianoRhodesInteraction.ts |
| T-015 | Расширенные настройки в UI (upper/fill on/off) | P2 | S | plugins | piano-constructor plugin |
| T-016 | Интеграционные тесты расширенных клеток | P1 | S | music-core | pianoInstrument.test.ts |
| T-017 | Музыкальная верификация: прослушивание 5 стилей | P0 | — | — | — |

### Детализация задач

---

#### T-001: Транспозиция молекул: интервалы вместо MIDI
- **Приоритет:** P0
- **Сложность:** M
- **Слой:** music-core
- **Описание:** Сейчас `PianoAtom.sound = '52'` (абсолютный MIDI). Нужно перевести на интервалы от root: `'3'`, `'b7'`, `'#11'`. Это критический enabler для upper structures и passing chords — без него новые молекулы будут работать только для Cmaj7.
- **DoD:**
  - [ ] `PianoAtom.sound` документирован как интервал от root (не MIDI)
  - [ ] 35 существующих молекул переписаны с MIDI-нот на интервалы
  - [ ] `assembleBarGeneric` (или пост-обработка в `pianoInstrument.ts`) резолвит интервал → MIDI для текущего аккорда
  - [ ] Все существующие тесты (`pianoInstrument.test.ts`, `pianoPatternEngine.test.ts`) проходят
  - [ ] Функция `intervalToMidi(root, interval)` покрыта тестами
- **Зависимости:** нет
- **Статус:** 🔴

---

#### T-002: HumanizeParams — модель humanization
- **Приоритет:** P0
- **Сложность:** S
- **Слой:** music-core
- **Описание:** Добавить тип `HumanizeParams` с полями: `timingJitterMs`, `velocityVariation`, `chordSpreadMs`, `phrasing`, `humanizeTiming`. Экспортировать из `pianoPatternTypes.ts`.
- **DoD:**
  - [ ] Тип `HumanizeParams` определён и экспортирован:
    - `timingJitterMs: number` — per-note случайный jitter (±)
    - `velocityVariation: 'off' | 'light' | 'medium' | 'strong'` — интенсивность per-note разброса velocity
    - `chordSpreadMs: number` — микро-рассыпание нот аккорда (± от центра)
    - `phrasing: 'flat' | 'gentle' | 'expressive'` — динамическая кривая фразы
    - `humanizeTiming: 'none' | 'slight-rush' | 'slight-lag' | 'medium-rush' | 'medium-lag'` — глобальный сдвиг (rush/lag)
  - [ ] `DEFAULT_HUMANIZE` константа: jitter=6ms, variation='medium', spread=8ms, phrasing='expressive', timing='slight-lag'
  - [ ] Тип добавлен в barrel-экспорт `index.ts`
  - [ ] Проходит typecheck
- **Зависимости:** нет
- **Статус:** 🔴

---

#### T-003: Humanization — velocity variation + chord spread + humanize timing + phrasing
- **Приоритет:** P0
- **Сложность:** M
- **Слой:** music-core
- **Описание:** Реализовать 4 механизма humanization. Порядок применения при планировании каждой ноты:
  1. **Humanize timing** — глобальный сдвиг всего аккорда (rush/lag), `applyHumanizeTiming()`
  2. **Phrasing** — velocity × кривая фразы, `phrasingMultiplier(barInPhrase, beat, phrasing)` → 0.88–1.04
  3. **Chord spread** — per-note микро-сдвиг тиков в пределах ±spreadMs, `applyChordSpread()`
  4. **Timing jitter** — per-note случайный jitter ±jitterMs
  5. **Velocity variation** — per-note случайное отклонение velocity (±0.03/0.06/0.10 в зависимости от уровня), `applyVelocityVariation()`
- **DoD:**
  - [ ] `applyHumanizeTiming(atTick, timing, ppq, bpm)` → сдвинутый tick
  - [ ] `phrasingMultiplier(barInPhrase, beat, phrasing)` → множитель 0.88–1.12
  - [ ] `applyChordSpread(atTick, noteIndex, totalNotes, spreadMs, ppq, bpm)` → сдвинутый tick
  - [ ] `applyVelocityVariation(baseVelocity, level)` → velocity с отклонением
  - [ ] Все функции применяются в `scheduleVoicing()` в правильном порядке
  - [ ] Тест: velocity меняется по phrasing-кривой (flat, gentle, expressive)
  - [ ] Тест: velocity variation даёт разброс в пределах заданного диапазона
  - [ ] Тест: chord spread сдвигает ноты аккорда на разные значения
  - [ ] Тест: humanize timing сдвигает весь аккорд на ожидаемый диапазон
- **Зависимости:** T-002
- **Статус:** 🔴

---

#### T-004: Humanize-настройки в StyleProfile + DTO
- **Приоритет:** P0
- **Сложность:** XS
- **Слой:** shared, music-core
- **Описание:** Добавить `humanize?: Partial<HumanizeParams>` в `PianoSettings` DTO и в `InstrumentDefaults.piano`. Обновить `getStyleProfile()`.
- **DoD:**
  - [ ] `PianoSettings` в `shared/src/dto.ts` расширен полем `humanize`
  - [ ] `StyleProfile.instrumentDefaults.piano` включает `humanize`
  - [ ] `setHumanize(params)` в `PianoInstrument` принимает partial-объект
  - [ ] Zod-схема обновлена
  - [ ] Проходит typecheck + lint
- **Зависимости:** T-002
- **Статус:** 🔴

---

#### T-005: UI-настройки humanize в конструкторе фортепиано
- **Приоритет:** P0
- **Сложность:** S
- **Слой:** plugins
- **Описание:** Добавить секцию «Humanize» в плагин-конструктор фортепиано с элементами управления для 5 параметров `HumanizeParams`. Использовать существующий `useSettings()` / `useUpdateSettings()`.
- **DoD:**
  - [ ] Секция «Humanize» в UI конструктора
  - [ ] Ползунки: Timing Jitter (ms), Chord Spread (ms)
  - [ ] Дропдауны: Velocity Variation (off/light/medium/strong), Phrasing (flat/gentle/expressive), Humanize Timing (none/slight-rush/slight-lag/medium-rush/medium-lag)
  - [ ] Изменения сохраняются через API настроек
- **Зависимости:** T-004
- **Статус:** 🔴

---

#### T-006: Новая категория молекул: `upper`
- **Приоритет:** P1
- **Сложность:** XS
- **Слой:** music-core
- **Описание:** Добавить `'upper'` в `MoleculeCategory` в `pattern/types.ts`.
- **DoD:**
  - [ ] Union-тип `MoleculeCategory` расширен значением `'upper'`
  - [ ] `pianoPatternTypes.ts` ре-экспортит новую категорию
  - [ ] Проходит typecheck
- **Зависимости:** нет
- **Статус:** 🔴

---

#### T-007: Upper Structure Engine
- **Приоритет:** P1
- **Сложность:** M
- **Слой:** music-core
- **Описание:** Новый модуль `pianoUpperStructures.ts`. Таблица upper structure triads для major, minor, dominant, half-diminished, diminished аккордов. Функция `suggestUpperStructure(chord, functionHint)` → `{ triad, intervals }` с весовым выбором.
- **DoD:**
  - [ ] Таблица US: ♭II/dom, ♭VI/dom, dim/dom, II/maj, V/maj, VI/maj, ♭III/min, IV/min
  - [ ] `suggestUpperStructure()` с весовым выбором по функции аккорда
  - [ ] Функция возвращает интервалы для 3 нот надстройки
  - [ ] Покрыто тестами: для каждого качества аккорда возвращается валидный US
  - [ ] Интегрировано в `buildPianoVoicing` (новый density `'upper'` или отдельный путь)
- **Зависимости:** T-001 (интервалы)
- **Статус:** 🔴

---

#### T-008: Молекулы upper structures (6–8 шт.)
- **Приоритет:** P1
- **Сложность:** M
- **Слой:** music-core
- **Описание:** Молекулы категории `upper`: shell (3+♭7) + upper structure triad. Для разных качеств аккордов (доминанты, мажорные, минорные). Использовать интервалы (T-001).
- **DoD:**
  - [ ] 6–8 молекул в `pianoMolecules.ts`, секция «Upper Structures»
  - [ ] Каждая молекула: shell 3+♭7 + три ноты надстройки
  - [ ] `conditions.requireDominant` / `requireMajor` для фильтрации по качеству
  - [ ] Теги: `upper`, `altered`/`lydian`/`dorian`, стиль
  - [ ] Зарегистрированы в `PIANO_MOLECULES`
  - [ ] Проходят typecheck
- **Зависимости:** T-001, T-006, T-007
- **Статус:** 🔴

---

#### T-009: Passing chords как молекулы (8–12 шт.)
- **Приоритет:** P1
- **Сложность:** M
- **Слой:** music-core
- **Описание:** Молекулы категории `fill` для проходящих аккордов: chromatic approach (сверху/снизу), diminished passing, secondary dominants, diatonic ii-V. Играются на последней доле такта с антиципацией к следующему аккорду. Использовать интервалы (T-001).
- **DoD:**
  - [ ] 8–12 молекул в `pianoMolecules.ts`, секция «Passing Chords»
  - [ ] Атомы на beat 4/4&, `chordRef: 'next'` (через интервалы)
  - [ ] Теги: `fill`, `passing`, `chromatic`/`diminished`/`secondary-dominant`
  - [ ] Зарегистрированы в `PIANO_MOLECULES`
  - [ ] Проходят typecheck
- **Зависимости:** T-001
- **Статус:** 🔴

---

#### T-010: Замена applyPassingChord в Randomizer
- **Приоритет:** P1
- **Сложность:** S
- **Слой:** music-core
- **Описание:** Удалить `applyPassingChord()` из `PianoRandomizer`. Вместо этого passing chords выбираются из пула молекул лейна `fill` в клетке — стандартный механизм.
- **DoD:**
  - [ ] `applyPassingChord` удалён из `PianoRandomizer`
  - [ ] Тесты `pianoRandomizer.test.ts` обновлены
  - [ ] Passing chords работают через лейн `fill` в клетке
- **Зависимости:** T-009
- **Статус:** 🔴

---

#### T-011: Multi-clip pool — ритмическая вариативность в клетках
- **Приоритет:** P1
- **Сложность:** M
- **Слой:** music-core
- **Описание:** Переработать существующие клетки: вместо одного клипа на 8 тактов — разбить спан на сегменты по 2 такта, каждый с 3–4 паттернами равного веса (p≈0.25–0.33). Это даёт 4^4 = 256 возможных комбинаций на 8 тактов — вариативность, исключающая повторяемость.
- **DoD:**
  - [ ] Все существующие 8-тактовые клетки переведены на multi-clip pool (4 клипа × 2 такта)
  - [ ] В каждом клипе 3–4 паттерна с равными весами
  - [ ] Паттерны не повторяют друг друга внутри одного клипа (разные `moleculeId`)
  - [ ] `validateCell` для каждой — пустой массив ошибок
  - [ ] Существующие тесты проходят
- **Зависимости:** нет (использует существующие молекулы)
- **Статус:** 🔴

---

#### T-012: Расширенные клетки: multi-clip + upper + fill + accent (4–6 шт.)
- **Приоритет:** P1
- **Сложность:** M
- **Слой:** music-core
- **Описание:** Создать 4–6 клеток с лейнами: `comping` (multi-clip pool), `upper` (на доминантах), `fill` (концы фраз), `accent` (границы фраз). По 1–2 на стиль. Настроить вероятности для естественного баланса.
- **DoD:**
  - [ ] 4–6 клеток в `pianoCells.ts`
  - [ ] Каждая использует лейны: comping (p=1.0), upper (p=0.3–0.4), fill (p=0.1–0.2), accent (p=0.15–0.2)
  - [ ] Comping-лейн: multi-clip pool (4 сегмента × 2 такта, 3–4 паттерна в каждом)
  - [ ] Upper-лейн: клипы на тактах с доминантами (3, 7)
  - [ ] Fill-лейн: клипы на концах фраз (такты 3, 7)
  - [ ] `validateCell` для каждой — пустой массив ошибок
- **Зависимости:** T-008, T-009, T-011
- **Статус:** 🔴

---

#### T-013: Расширенные организмы (3–5 шт.)
- **Приоритет:** P1
- **Сложность:** S
- **Слой:** music-core
- **Описание:** Организмы, ссылающиеся на расширенные клетки. Структура verse → chorus → bridge с разными уровнями плотности.
- **DoD:**
  - [ ] 3–5 организмов в `pianoOrganisms.ts`
  - [ ] Verse: разреженная клетка; Chorus: плотная с fills; Bridge: с upper structures
  - [ ] `sectionMap` + `defaultForm` корректны
- **Зависимости:** T-012
- **Статус:** 🔴

---

#### T-014: Расширение pianoRhodesInteraction
- **Приоритет:** P2
- **Сложность:** S
- **Слой:** music-core
- **Описание:** Дополнить правила избегания конфликтов для категории `upper`: upper structures фортепиано — приоритетнее Rhodes pads. Обновить тесты.
- **DoD:**
  - [ ] `pianoRhodesInteraction.ts` учитывает лейн `upper`
  - [ ] Тесты `pianoRhodesInteraction.test.ts` расширены
- **Зависимости:** T-012
- **Статус:** 🔴

---

#### T-015: Расширенные настройки в UI конструктора
- **Приоритет:** P2
- **Сложность:** S
- **Слой:** plugins
- **Описание:** Добавить в плагин-конструктор фортепиано переключатели для включения/выключения расширенных функций: Upper Structures, Passing Chords.
- **DoD:**
  - [ ] Чекбоксы/тумблеры: ☑ Upper Structures, ☑ Passing Chords
  - [ ] Сохраняются в настройках пользователя
  - [ ] Влияют на выбор организма/клетки (только с поддержкой нужных лейнов)
- **Зависимости:** T-004, T-013
- **Статус:** 🔴

---

#### T-016: Интеграционные тесты расширенных клеток
- **Приоритет:** P1
- **Сложность:** S
- **Слой:** music-core
- **Описание:** Тесты для новых молекул (upper, passing chords) и расширенных клеток (multi-clip pool). Проверка: `validateCell` проходит, `assembleBar` возвращает корректные hits, hits преобразуются в voicing без ошибок.
- **DoD:**
  - [ ] Тесты для upper structure молекул (T-008)
  - [ ] Тесты для passing chord молекул (T-009)
  - [ ] Тесты для multi-clip pool клеток (T-011)
  - [ ] Тесты для транспозиции интервалов → MIDI
  - [ ] Тесты для humanization (velocity variation, chord spread, humanize timing, phrasing)
  - [ ] `npm run test -- pianoInstrument` — все зелёные
- **Зависимости:** T-003, T-008, T-009, T-011, T-012
- **Статус:** 🔴

---

#### T-017: Музыкальная верификация
- **Приоритет:** P0
- **Сложность:** —
- **Слой:** —
- **Описание:** Прослушивание результата для 5 стилей (swing, bossa, funk, latin, ballad) в конструкторе фортепиано. Проверка на слух: естественность звучания, отсутствие перегрузки, музыкальность upper structures и passing chords, вариативность ритма.
- **DoD:**
  - [ ] Прослушан swing (medium tempo, 2 chorus) — проверена ритмическая вариативность
  - [ ] Прослушана bossa (medium tempo, 2 chorus)
  - [ ] Прослушан funk (medium tempo, 2 chorus)
  - [ ] Прослушан latin (medium tempo, 2 chorus)
  - [ ] Прослушана ballad (slow tempo, 1 chorus)
  - [ ] Замечания зафиксированы и приоритизированы
- **Зависимости:** T-013, T-015
- **Статус:** 🔴

## Последовательность

```
Этап 1: Enablers (T-001, T-002, T-006)
├── T-001 Транспозиция молекул (интервалы)
├── T-002 HumanizeParams (тип)
└── T-006 Новая категория upper

Этап 2: Humanization (T-003, T-004, T-005)
├── T-003 Velocity variation + chord spread + humanize timing + phrasing ← зависит от T-002
├── T-004 StyleProfile + DTO ← зависит от T-002
└── T-005 UI humanize ← зависит от T-004

Этап 3: Новые молекулы (T-007, T-008, T-009, T-010)
├── T-007 Upper Structure Engine ← зависит от T-001
├── T-008 Upper Structure молекулы (6–8) ← зависит от T-001, T-006, T-007
├── T-009 Passing chords молекулы (8–12) ← зависит от T-001
└── T-010 Randomizer cleanup ← зависит от T-009

Этап 4: Клетки + организмы (T-011, T-012, T-013)
├── T-011 Multi-clip pool — ритмическая вариативность ← не зависит (существующие молекулы)
├── T-012 Расширенные клетки ← зависит от T-008, T-009, T-011
└── T-013 Расширенные организмы ← зависит от T-012

Этап 5: Финализация (T-014, T-015)
├── T-014 Rhodes interaction ← зависит от T-012
└── T-015 UI extended settings ← зависит от T-004, T-013

Верификация
├── T-016 Интеграционные тесты ← зависит от T-003, T-008, T-009, T-011, T-012
└── T-017 Музыкальная верификация ← зависит от T-013, T-015
```

## Оценка трудоёмкости

| Этап | Задачи | Суммарная сложность | Часов |
|------|--------|---------------------|-------|
| 1. Enablers | T-001, T-002, T-006 | M + S + XS | 7–10 |
| 2. Humanization | T-003, T-004, T-005 | M + XS + S | 8–12 |
| 3. Новые молекулы | T-007, T-008, T-009, T-010 | M + M + M + S | 16–24 |
| 4. Клетки + организмы | T-011, T-012, T-013 | M + M + S | 14–20 |
| 5. Финализация | T-014, T-015 | S + S | 3–5 |
| 6. Верификация | T-016, T-017 | S + — | 3–5 |
| **Итого** | **17 задач** | | **51–76 часов** |

## Критические пути

### Путь 1 (MVP — быстрый эффект)
```
T-001 → T-003 → T-005 → T-017
T-002 ↗  T-004 ↗
```
**Результат:** humanization (velocity variation + chord spread + humanize timing + phrasing) с транспозицией. Можно выпускать после Этапов 1+2+верификация. **~18–27 часов.**

### Путь 2 (Расширенная аранжировка)
```
T-001 → T-006 → T-007 → T-008 → T-012 → T-013 → T-017
                         T-011 ↗
T-001 → T-009 → T-010 ↗
```
**Результат:** upper structures + passing chords + multi-clip pool + расширенные клетки и организмы. Полный объём Этапов 1–4. **~45–66 часов.**

### Путь 3 (Полный объём)
```
Все 17 задач
```
**Результат:** полная расширенная аранжировка с humanization, upper structures, passing chords, ритмической вариативностью и UI-настройками. **~51–76 часов.**

## Рекомендуемая последовательность поставок

| Релиз | Этапы | Часов | Ключевая ценность |
|-------|-------|-------|-------------------|
| v1.0 | 1 + 2 | 15–22 | Humanization: piano звучит «живо» (velocity variation, chord spread, timing, phrasing) |
| v1.1 | 3 + 4 | 30–44 | Upper structures, passing chords, multi-clip ритмическая вариативность |
| v1.2 | 5 | 3–5 | Rhodes interaction, UI polish |
| — | 6 | 3–5 | Тесты и верификация (идёт параллельно) |

---

*План обновлён: 2026-07-11. Источник: `docs/PIANO-EXTENDED-ARRANGEMENT.md` (vision).*
