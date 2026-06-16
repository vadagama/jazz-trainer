# EXERSISES-TODO — технический долг и рефакторинг плагина `practice-cards`

> Результат валидации ветки `exercises`. Анализируется новый (untracked) плагин
> `packages/plugins/practice-cards/` — основной объём изменений ветки.
>
> **Состояние на момент анализа (2026-06-16):** `npm run typecheck` — 0 ошибок,
> `npm run lint` — 0 ошибок (только pre-existing warnings вне плагина),
> тесты плагина — 257 passed. Ветка функционально зелёная.
>
> **Scope этого документа:** только качество кода — модульность, переиспользование,
> дублирование, мёртвый код, типобезопасность. **Без предложений нового функционала.**

Уровни приоритета: 🔴 высокий (явный долг, тормозит добавление новых упражнений) ·
🟡 средний (дублирование/риск дрейфа) · 🟢 низкий (косметика, мелкие правки).

---

## Карта плагина (для контекста)

```
generators/
  types.ts            (111) — типы конфигов, PracticeBar, ExerciseSession
  chordExercise.ts    (161) — генератор аккордовых тактов
  scaleExercise.ts    (306) — генератор тактов гамм
components/
  ExerciseWizard.tsx  (351) — оркестрация 3 шагов + персист настроек
  StepTypeSelect.tsx   (89) — выбор типа упражнения
  StepChordConfig.tsx (713) — конфигуратор аккордов
  StepScaleConfig.tsx (598) — конфигуратор гамм
  StepPreview.tsx     (242) — превью (сетка тактов / компактный список функций)
  ExerciseRunner.tsx  (199) — плеер: транспорт, отображение карточек
  CardDisplay.tsx     (136) — рендер карточки (аккорд / гамма)
  ExerciseComplete.tsx (73) — экран завершения
  BackingSelector.tsx  (53) — выбор слоёв аккомпанемента
  CountInOverlay.tsx   (37) — ⚠️ НЕ ИСПОЛЬЗУЕТСЯ
  degreeFunctions.ts  (189) — утилиты ступеней + buildFunctionPreview
  unifiedChordCatalog.ts (70) — каталог ступеней для источника «Отдельно»
```

---

## 🔴 1. Дублирование между конфигураторами `StepChordConfig` ↔ `StepScaleConfig`

Самый крупный долг и главный блокер для переиспользования на новых типах упражнений
(в [StepTypeSelect.tsx](../packages/plugins/practice-cards/src/components/StepTypeSelect.tsx)
уже застаблены «Секвенции» и «Опевания» — для них код придётся копировать в третий раз).

Файлы [StepChordConfig.tsx](../packages/plugins/practice-cards/src/components/StepChordConfig.tsx)
(713 строк) и [StepScaleConfig.tsx](../packages/plugins/practice-cards/src/components/StepScaleConfig.tsx)
(598 строк) совпадают почти дословно.

**Дублируются один-в-один:**

| Что | StepChordConfig | StepScaleConfig |
|---|---|---|
| `FLAT_KEYS` | стр. 29 | стр. 39 |
| `CARD_MODES` | стр. 37–41 | стр. 49–53 |
| `COUNT_IN_OPTS` | стр. 43 | стр. 55 |
| `sourceToLabel` | стр. 45–56 | стр. 57–68 |
| `SOURCE_TYPES` | стр. 58 | стр. 70 |
| `handleSourceTypeChange` (+ `backingAllOn`) | стр. 75–101 | стр. 88–108 |
| `handleDslChange` + сброс через `useEffect` | стр. 117–146 | стр. 110–139 |
| `handlePatternChange`, `toggleKey`, `handleRepsChange`, `handleTempoChange`, `handleMetronomeVolumeChange` | стр. 148–187 | стр. 141–181 |
| derived-defaults блок (tempo, repetitions, infinite, countInBars, cardMode, metronome…) | стр. 189–198 | стр. 183–190 |
| JSX: DSL-редактор источника | стр. 395–473 | стр. 263–341 |
| JSX-карточки: Тональности, Тактов на …, Затактов, Режим карточек, Аккомпанемент, Метроном+Темп, Повторы | стр. 477–708 | стр. 430–593 |

**Рекомендация — выделить переиспользуемые единицы:**

1. **Хук `useSourceConfig`** (`components/useSourceConfig.ts`): инкапсулирует `sourceType`,
   состояние DSL (`dslText` / `dslError` / `parsedPreview`), `handleSourceTypeChange`,
   `handleDslChange`, `handlePatternChange` и эффект сброса. Оба конфигуратора используют один хук.
2. **Презентационные карточки** в `components/config/`:
   `KeysCard`, `BarsPerUnitCard` (props `label`), `CountInCard`, `CardModeCard`,
   `BackingCard`, `MetronomeTempoCard`, `RepetitionsCard`, `SourceTypeTabs`, `DslSourceEditor`.
3. **Общие константы** `components/configConstants.ts`:
   `FLAT_KEYS`, `CARD_MODES`, `COUNT_IN_OPTS`, `SOURCE_TYPES`, `sourceToLabel`.

После этого `StepChordConfig`/`StepScaleConfig` сводятся к композиции общих карточек +
своя уникальная часть (каталог аккордов / тип гаммы + направление + октавы). Третий тип
упражнения добавляется без копирования.

---

## 🔴 2. Дублирование между генераторами `chordExercise` ↔ `scaleExercise`

Файлы [chordExercise.ts](../packages/plugins/practice-cards/src/generators/chordExercise.ts) и
[scaleExercise.ts](../packages/plugins/practice-cards/src/generators/scaleExercise.ts)
повторяют один и тот же каркас генерации.

**Дублируется:**

- Тип `Rng` (chord стр. 12, scale стр. 17) и константа `INFINITE_ROUNDS = 16`
  (chord стр. 15, scale стр. 20).
- Перемешивание: `shuffleArray` есть в обоих файлах (chord стр. 143, scale стр. 23);
  в chord есть **ещё и** `shuffle` (стр. 154) — два варианта одного алгоритма Fisher–Yates
  в одном файле (in-place + иммутабельный).
- Каркас «обычный / рандом»: пары `generateChordExercise`/`generateRandomized` и
  `generateOverChords`/`generateOverChordsRandomized` + `generateStandalone`/`generateStandaloneRandomized`
  имеют идентичную форму: цикл по раундам → перемешать чанки → `expand` → `repeat`.
- Раскрытие источника: `materialForKey` (chord стр. 74) и `overChordsMaterial` (scale стр. 223)
  содержат **один и тот же** `switch` по `pattern`/`random`/`dsl` для получения символов аккордов
  из `ChordSource`; единственное отличие гаммы — добавляемый `scaleLabel`.
- Размножение/повтор: `expandAndRepeat` (chord стр. 113) vs `expandBarsPerChord` + `repeatBars`
  (scale стр. 89–108) — одна семантика, две реализации с разной трактовкой иммутабельности
  (chord мутирует массив, scale делает `slice()`).

**Рекомендация — выделить `generators/core.ts`:**

- `Rng`, `INFINITE_ROUNDS`, единственная реализация `shuffle`/`shuffleArray`.
- `expandBarsPerChord(bars, n)` и `repeatBars(bars, infinite, reps)` — общие, с переиндексацией.
- Дженерик `buildRandomized(rounds, buildRound, rng)` для рандом-каркаса.
- **Общий экстрактор символов из `ChordSource`** — функция, возвращающая `string[][]`
  (символы аккордов по тактам) для `pattern`/`random`/`dsl`. Аккордовый генератор использует
  результат напрямую, гаммовый — оборачивает в `scaleLabel`. Это убирает дублирование
  `materialForKey`/`overChordsMaterial` и централизует парсинг DSL/паттернов.

---

## 🟡 3. Дублирование «цепочки чипов» в превью

Паттерн «список с разделителем» (`{i > 0 && <разделитель>}` + чип) повторяется ~5 раз:
- [StepChordConfig.tsx](../packages/plugins/practice-cards/src/components/StepChordConfig.tsx)
  стр. 285–321 (выбранные / раскрытые), 366–385 (паттерн), 412–456 (DSL).
- [StepScaleConfig.tsx](../packages/plugins/practice-cards/src/components/StepScaleConfig.tsx)
  стр. 280–322 (DSL).
- [StepPreview.tsx](../packages/plugins/practice-cards/src/components/StepPreview.tsx)
  стр. 91–106 (`FunctionChips`).

**Рекомендация:** продвинуть `FunctionChips` (или новый `ChipSequence` с props `sep`,
`variant: 'degree' | 'chord'`) в общий модуль и переиспользовать во всех трёх местах.

---

## 🟡 4. Мёртвый код

1. **`CountInOverlay.tsx` не используется.** Поиск показал ссылки только из его собственного
   теста ([CountInOverlay.test.tsx](../packages/plugins/practice-cards/src/__tests__/CountInOverlay.test.tsx)).
   В [ExerciseRunner.tsx](../packages/plugins/practice-cards/src/components/ExerciseRunner.tsx)
   стр. 152–168 точки затакта нарисованы инлайн. → Либо адаптировать компонент в `ExerciseRunner`
   (убрать инлайн-дубль), либо удалить компонент **и** его тест.
2. **Недостижимая ветка `'random'` в источниках.** `SOURCE_TYPES` в обоих конфигураторах —
   `['unified', 'pattern', 'dsl']`, без `'random'`. Но ветка `type === 'random'` есть в
   `handleSourceTypeChange` (StepChordConfig стр. 94, StepScaleConfig стр. 101), в `isValidSource`
   ([ExerciseWizard.tsx](../packages/plugins/practice-cards/src/components/ExerciseWizard.tsx) стр. 97),
   в `materialForKey`/`overChordsMaterial`. Из UI источник «Произвольная» выбрать нельзя.
   → Решить: либо вернуть в `SOURCE_TYPES` (если задумано), либо удалить мёртвые ветки.
3. **No-op `handleKeyChange`** в [ExerciseRunner.tsx](../packages/plugins/practice-cards/src/components/ExerciseRunner.tsx)
   стр. 126 — пустой коллбэк, передаётся в `PlayerToolbar` при `showKey={false}`. Мёртвая проводка.
4. **Мёртвый тернарник** в [StepPreview.tsx](../packages/plugins/practice-cards/src/components/StepPreview.tsx)
   стр. 157–160: обе ветки `config.type === 'chords' ? chordSourceLabel[...] : chordSourceLabel[...]`
   идентичны.

---

## 🟡 5. Две конвенции расположения тестов

Тесты генераторов существуют **в двух местах одновременно**:

| Файл | Строк | `it()` |
|---|---|---|
| `src/__tests__/chordExercise.test.ts` | 147 | 12 |
| `src/generators/chordExercise.test.ts` | 116 | 5 |
| `src/__tests__/scaleExercise.test.ts` | 354 | 20 |
| `src/generators/scaleExercise.test.ts` | 179 | 7 |

Два параллельных набора на один и тот же генератор → двойная поддержка и риск дрейфа.
Похоже, версии в `src/__tests__/` — более новые/полные. → Сверить покрытие, оставить один
набор. CLAUDE.md допускает оба варианта (`src/__tests__/` **или** `src/*.test.ts`) — выбрать
**одну** конвенцию для плагина и привести все тесты к ней.

---

## 🟡 6. Персист настроек: write-only поля (рассинхрон с DTO)

`buildPracticeCardsSettings`
([ExerciseWizard.tsx](../packages/plugins/practice-cards/src/components/ExerciseWizard.tsx) стр. 58–85)
**пишет** в настройки `lastExerciseType`, `lastSource`, `lastPatternId`, `lastKeys`,
`lastRepetitions`, `lastInfinite`. Но `buildDefaults` (стр. 38–56) **не читает**
`lastExerciseType` / `lastSource` / `lastPatternId` / `lastKeys`. → Эти поля DTO
([dto.ts](../packages/shared/src/dto.ts) стр. 110–131) фактически write-only: записываются,
но не восстанавливаются. Resume-from-reconfigure работает через in-memory `initialConfig`,
а не через персист.

**Рекомендация:** либо дочитывать эти поля в `buildDefaults` (восстанавливать источник/тональности),
либо убрать их из записи и из Zod-схемы. Сейчас контракт обещает больше, чем используется.

---

## 🟡 7. Слабая типобезопасность сборки конфига в `ExerciseWizard`

- Двойной каст `as unknown as Partial<ExerciseConfig>` в `handleTypeSelect`
  ([ExerciseWizard.tsx](../packages/plugins/practice-cards/src/components/ExerciseWizard.tsx) стр. 138).
- Сборка идёт как `Partial<ExerciseConfig>`, а в генератор передаётся `config as ChordExerciseConfig`
  (стр. 152, 169) **без рантайм-валидации**. Невалидный partial молча даёт пустой буфер
  (`if (keys.length === 0) return []`), а `handlePreview` глотает исключение в пустом `catch`
  (стр. 156–158) — пользователь не видит причину.

**Рекомендация:** ввести `buildConfig(partial): ExerciseConfig`-функцию (можно на базе Zod-схемы),
которая валидирует и подставляет дефолты в одном месте, заменив разрозненные касты и
защитные `?? default` в генераторах. Ошибки — показывать, а не глотать.

---

## 🟢 8. Разрозненные дефолты и магические числа

- `INFINITE_ROUNDS = 16` — в обоих генераторах (см. п.2).
- Дефолт темпа `120`, громкости `0.5`/`0.8`, размера `'4/4'`, `barsPerChord ?? 1`
  повторяются в `ExerciseWizard` (`DEF_*`), `StepChordConfig` (стр. 189–197),
  `StepScaleConfig` (стр. 183–189), `StepPreview` (стр. 148), `ExerciseRunner`
  (стр. 78–85 — `?? 0.8` для каждого инструмента).

**Рекомендация:** единый модуль `defaults.ts` с константами (промотировать `DEF_*` из
`ExerciseWizard`), переиспользовать во всех компонентах и генераторах. Дефолты-fallback'и
конфига свести в `buildConfig` (п.7), чтобы компоненты не повторяли `?? значение`.

---

## 🟢 9. Хрупкий парсинг `scaleLabel` строкой в UI

[CardDisplay.tsx](../packages/plugins/practice-cards/src/components/CardDisplay.tsx) стр. 36–39:
`CardContent` разрезает `bar.scaleLabel` по первому пробелу, чтобы отделить корень от названия
гаммы. Генератор уже владеет структурными данными (`key` + `scaleType`), но «склеивает» их в строку,
которую UI потом «расклеивает». Парсинг строкой ломок при изменении формата меток.

**Рекомендация:** нести на `PracticeBar` структурные поля (например `scale?: { root; name; direction }`)
вместо плоского `scaleLabel`, формировать отображаемую строку в одном месте. Заодно `PracticeBar.direction`
(`'up' | 'down'`, [types.ts](../packages/plugins/practice-cards/src/generators/types.ts) стр. 100)
и `ScaleDirection` (`'up'|'down'|'both'`) перестанут жить как несвязанные типы.

---

## 🟢 10. Дублированный JSX шага 2 в `ExerciseWizard`

Блоки `step === 2` для аккордов (стр. 263–299) и гамм (стр. 301–337) — копипаста: обёртка
`playRandomlyToggle` + панель навигации «Назад / Показать превью / Быстрый старт» идентичны,
различается лишь внутренний `Step*Config`.

**Рекомендация:** обёртка `<Step2Shell onBack onPreview onQuickStart canPreview>{config}</Step2Shell>`,
внутрь которой подставляется нужный конфигуратор.

---

## 🟢 11. Несогласованная защита дефолтов в генераторах

`generateScaleExercise` дозаполняет дефолты (`?? 'major'`, `?? 'both'`, …;
[scaleExercise.ts](../packages/plugins/practice-cards/src/generators/scaleExercise.ts) стр. 44–53),
а `generateChordExercise` — нет. Поведение при «неполном» конфиге разное.
→ После введения `buildConfig` (п.7) защиту убрать из обоих генераторов: они должны принимать
уже валидный `ExerciseConfig`.

---

## Сводка по приоритетам

| # | Тема | Приоритет | Эффект |
|---|---|---|---|
| 1 | Общие карточки + `useSourceConfig` для Step-конфигураторов | 🔴 | Главный выигрыш переиспользования; разблокирует новые типы |
| 2 | `generators/core.ts` — общий каркас генерации | 🔴 | Убирает дубль логики, упрощает 3-й генератор |
| 3 | Общий `ChipSequence`/`FunctionChips` | 🟡 | −~5 копий JSX |
| 4 | Удалить мёртвый код (CountInOverlay, ветки `random`, no-op, тернарник) | 🟡 | Меньше шума и ложного контракта |
| 5 | Одна конвенция тестов | 🟡 | Конец двойной поддержке |
| 6 | Починить write-only поля персиста | 🟡 | Контракт = реальность |
| 7 | `buildConfig` + валидация | 🟡 | Типобезопасность, видимые ошибки |
| 8 | Единый модуль дефолтов | 🟢 | Один источник правды |
| 9 | Структурный `PracticeBar.scale` вместо строки | 🟢 | Убирает хрупкий парсинг |
| 10 | `Step2Shell` | 🟢 | −1 копия JSX |
| 11 | Согласовать защиту дефолтов генераторов | 🟢 | Единообразие |

> Рекомендуемый порядок: сначала #2 и #1 (ядро + UI-композиция) — они создают каркас,
> на который ложатся #3, #7, #8, #10, #11; затем #4–#6 как чистка.
