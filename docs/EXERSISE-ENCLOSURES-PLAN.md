# EXERCISE ENCLOSURES PLAN — План работ по упражнению «Опевания"

**На основе:** [`docs/EXERSISE-ENCLOSURES-VISION.md`](./EXERSISE-ENCLOSURES-VISION.md), [`docs/EXERSISE-ENCLOSURES-ARCHITECTURE.md`](./EXERSISE-ENCLOSURES-ARCHITECTURE.md)
**Дата:** 2026-07-19
**Статус:** 🟡 Черновик

---

## 1. Задачи (Tasks)

### T-001. Доменный модуль `enclosures.ts` в `music-core`

- **Родительская функция:** 3.4 Доменный модуль опеваний
- **Приоритет:** P0
- **Сложность:** M (3–5d)
- **Слой:** `music-core`
- **Модуль:** `packages/music-core/src/chords/enclosures.ts`
- **Описание:**
  1. Определить типы:
     ```ts
     export type EnclosureType =
       | 'diatonic-upper'
       | 'diatonic-lower'
       | 'chromatic-upper'
       | 'chromatic-lower'
       | 'full-diatonic'
       | 'full-chromatic'
       | 'all';
     export type ConcreteEnclosureType = Exclude<EnclosureType, 'all'>;
     export type TargetDegree = 1 | 3 | 5 | 7;
     export type EnclosureNoteRole = 'approach' | 'target';
     export interface EnclosureNote {
       name: string;      // например "Eb"
       pc: number;        // pitch class 0–11
       role: EnclosureNoteRole;
     }
     ```
  2. Реализовать `resolveEnclosure(targetPc, type, key): EnclosureNote[]`:
     - Для `diatonic-upper` — диатоническая ступень выше цели из лада, соответствующего аккорду.
     - Для `diatonic-lower` — диатоническая ступень ниже.
     - Для `chromatic-upper` — хроматический сосед сверху (`target + 1`).
     - Для `chromatic-lower` — хроматический сосед снизу (`target - 1`).
     - Для `full-diatonic` — `diatonic-upper` → `diatonic-lower` → target.
     - Для `full-chromatic` — `chromatic-upper` → `chromatic-lower` → target.
     - Имена нот выбирать через `spellPitchClass` в таблице выбранной тональности `key`.
  3. Реализовать `randomEnclosureType(rng): ConcreteEnclosureType`.
  4. Реализовать вспомогательную `scalePitchClasses(tonic, scaleType): number[]` (использовать `SCALE_INTERVALS`).
  5. Реэкспортировать публичные типы/функции из `music-core/src/chords/index.ts`.
- **Критерий готовности (DoD):**
  - `typecheck` в `music-core` проходит.
  - Юнит-тесты `music-core/src/chords/enclosures.test.ts` покрывают все 6 `ConcreteEnclosureType` для ступеней `1, 3, 5, 7` в нескольких тональностях.
  - Граничные случаи: цель на границе октавы, бемольные тональности, тональности с диезами.
- **Зависит от задач:** —
- **Статус:** 🔴 Запланировано

### T-002. Расширение типов `PracticeBar` и `ExerciseConfig`

- **Родительская функция:** 3.5 Отображение опеваний в карточках
- **Приоритет:** P0
- **Сложность:** S (1–2d)
- **Слой:** `plugins`
- **Модуль:** `practice-cards/src/generators/types.ts`
- **Описание:**
  1. Добавить `EnclosureExerciseConfig extends BaseExerciseConfig`:
     ```ts
     export interface EnclosureExerciseConfig extends BaseExerciseConfig {
       type: 'embellishments';
       source: ChordSource;
       enclosureType: EnclosureType;
       targetDegrees: TargetDegree[];
       octaves: 1 | 2;
     }
     ```
  2. Обновить `ExerciseConfig = ChordExerciseConfig | ScaleExerciseConfig | EnclosureExerciseConfig`.
  3. Обновить `ExerciseSession.type` до `'chords' | 'scales' | 'embellishments'`.
  4. Расширить `PracticeBar`:
     ```ts
     export interface PracticeBar {
       index: number;
       chords: string[];
       scaleLabel?: string;
       direction?: 'up' | 'down';
       enclosureDegree?: TargetDegree;
       enclosureType?: ConcreteEnclosureType;
       enclosureNotes?: EnclosureNote[];
     }
     ```
  5. Реэкспортировать `EnclosureType`, `ConcreteEnclosureType`, `TargetDegree`, `EnclosureNote` из `@jazz/music-core` через `practice-cards/src/generators/types.ts`.
- **Критерий готовности (DoD):** `typecheck` в `practice-cards` проходит; discriminated union корректен.
- **Зависит от задач:** T-001
- **Статус:** 🔴 Запланировано

### T-003. Генератор `enclosureExercise.ts`

- **Родительская функция:** 3.3 Генератор упражнений по опеваниям
- **Приоритет:** P0
- **Сложность:** M (3–5d)
- **Слой:** `plugins`
- **Модуль:** `practice-cards/src/generators/enclosureExercise.ts`
- **Описание:**
  1. Реализовать `generateEnclosureExercise(config: EnclosureExerciseConfig, rng: Rng = Math.random): PracticeBar[]`.
  2. **Режим `unified`:**
     - Для каждой тональности из `keys` построить тонический аккорд через `buildTonicChord(key, scaleType)`, где `scaleType` определяется по тональности (major для мажорных ключей, natural-minor для минорных — или использовать `chordDegreeToScale` для ступени 1).
     - Для каждой выбранной `targetDegree` построить оборот выбранного типа (или случайного при `enclosureType === 'all'`).
     - Поддержать `octaves`: повторить набор оборотов для 2 октав, транспонируя целевую ноту на октаву вверх.
  3. **Режим `pattern` / `random` / `dsl`:**
     - Получить чанки аккордов через `extractChordsFromSource(source, key)`.
     - Для каждого аккорда случайно выбрать ступень из `targetDegrees` (при `length === 1` — всегда эту ступень).
     - Определить pitch class целевой ступени на основе корня аккорда и качества.
     - Построить оборот через `resolveEnclosure`.
  4. Поддержать `playRandomly`, `barsPerChord`, `repetitions`, `infinite` через утилиты `core.ts` (`repeatBars`, `expandBarsPerChord`, `shuffle`, `buildRandomized`).
- **Критерий готовности (DoD):**
  - Корректно генерирует `PracticeBar[]` для всех 4 `source.type`.
  - `unified` даёт ровно `keys.length × targetDegrees.length × octaves` тактов (до `barsPerChord`).
  - `over-chords` даёт ровно длину прогрессии × число тональностей × повторы.
  - `typecheck` + `lint` проходят.
- **Зависит от задач:** T-001, T-002
- **Статус:** 🔴 Запланировано

### T-004. UI-шаг `StepEnclosureConfig.tsx`

- **Родительская функция:** 3.2 Мастер настройки опеваний
- **Приоритет:** P0
- **Сложность:** M (3–5d)
- **Слой:** `plugins`
- **Модуль:** `practice-cards/src/components/StepEnclosureConfig.tsx`
- **Описание:**
  1. Создать компонент по образцу `StepScaleConfig.tsx`.
  2. **Тип опевания:** `Select` с 7 опциями (6 типов + «Все случайно»).
  3. **Целевые ступени:** 4 чекбокса `1, 3, 5, 7`. Валидация: хотя бы одна выбрана.
  4. **Октавы:** кнопки `1` / `2`.
  5. **Источник:** переиспользовать `SourceCard` + `useSourceConfig` + `buildSourcePayload` (как у гамм).
  6. Общие карточки: `KeysCard`, `BarsPerUnitCard`, `CountInCard`, `CardModeCard`, `BackingCard`, `MetronomeTempoCard`, `RepetitionsCard`, рандомизация.
  7. При изменении источника типа `unified` — подсказка: «Отдельная отработка на тоническом аккорде выбранной тональности».
- **Критерий готовности (DoD):**
  - Все поля рендерятся и изменяют `config`.
  - Валидация ступеней: если ни одна не выбрана — кнопка «Показать инструкцию» disabled.
  - `typecheck` + `lint` проходят.
- **Зависит от задач:** T-002
- **Статус:** 🔴 Запланировано

### T-005. Расширение `CardDisplay` для опеваний

- **Родительская функция:** 3.5 Отображение опеваний в карточках
- **Приоритет:** P0
- **Сложность:** S (1–2d)
- **Слой:** `plugins`
- **Модуль:** `practice-cards/src/components/CardDisplay.tsx`
- **Описание:**
  1. В `CardContent` добавить ветку перед `scaleLabel` (приоритет: `enclosureNotes` → `scaleLabel` → аккорды):
     ```tsx
     if (bar.enclosureNotes && bar.enclosureNotes.length > 0) {
       const target = bar.enclosureNotes.find((n) => n.role === 'target');
       return (
         <div className="flex flex-col items-center gap-1">
           <span className="text-7xl font-bold leading-none text-foreground">
             {bar.chords[0] ?? ''}
           </span>
           <span className="text-2xl font-semibold leading-tight text-foreground">
             Ступень {bar.enclosureDegree}
           </span>
           <span className="mt-1 text-3xl font-medium leading-tight">
             {bar.enclosureNotes.map((n, i) => (
               <span
                 key={i}
                 className={n.role === 'target' ? 'text-primary font-bold' : 'text-muted-foreground'}
               >
                 {n.name}
                 {i < bar.enclosureNotes!.length - 1 && <span className="mx-1">·</span>}
               </span>
             ))}
           </span>
         </div>
       );
     }
     ```
  2. Убедиться, что `GhostCard` с enclosure-контентом не ломает лейаут (текст 3xl в уменьшенной карточке — проверить на мобильных).
- **Критерий готовности (DoD):**
  - Карточка опевания отображает 3 строки.
  - Целевая нота выделяется `text-primary font-bold`.
  - Существующие режимы аккордов и гамм не сломаны.
  - `typecheck` + `lint` проходят.
- **Зависит от задач:** T-002
- **Статус:** 🔴 Запланировано

### T-006. Активация плитки и роутинг в wizard

- **Родительская функция:** 3.1 Активация плитки «Опевания»
- **Приоритет:** P0
- **Сложность:** S (1–2d)
- **Слой:** `plugins`
- **Модуль:** `practice-cards/src/components/StepTypeSelect.tsx`, `ExerciseWizard.tsx`
- **Описание:**
  1. В `StepTypeSelect`:
     - Расширить `TileDef.type` и `onSelect` до `'chords' | 'scales' | 'embellishments'`.
     - У плитки `embellishments` заменить `icon: '⏳'` → `'🎵'`, `disabled: true` → `disabled: false`.
     - В `onClick` обрабатывать `'embellishments'`.
  2. В `ExerciseWizard`:
     - `type ExerciseKind = 'chords' | 'scales' | 'embellishments'`.
     - При `handleTypeSelect('embellishments')` инициализировать `config` с дефолтами опеваний.
     - Добавить ветку `{step === 2 && kind === 'embellishments' && <StepEnclosureConfig ... />}`.
     - В `handlePreview` / `handleQuickStart` / `handleStart` добавить ветку `generateEnclosureExercise`.
     - Обновить `buildPracticeCardsSettings` для сохранения enclosure-полей.
     - Обновить `buildConfig` для сборки `EnclosureExerciseConfig`.
     - Обновить `buildInitialConfig` для восстановления enclosure-настроек.
- **Критерий готовности (DoD):**
  - Плитка активна.
  - Выбор плитки открывает `StepEnclosureConfig`.
  - «Старт» и «Быстрый старт» вызывают `generateEnclosureExercise`.
  - `typecheck` + `lint` проходят.
- **Зависит от задач:** T-003, T-004
- **Статус:** 🔴 Запланировано

### T-007. Превью и экран завершения

- **Родительская функция:** 4.1 Превью опеваний, 4.2 Экран завершения
- **Приоритет:** P1
- **Сложность:** S (1–2d)
- **Слой:** `plugins`
- **Модуль:** `practice-cards/src/components/StepPreview.tsx`, `degreeFunctions.ts`, `ExerciseComplete.tsx`
- **Описание:**
  1. В `degreeFunctions.ts` добавить ветки `enclosure-standalone` и `enclosure-over-chords` в `FunctionPreview` и `buildFunctionPreview`.
  2. В `StepPreview`:
     - Расширить `explainPlayback` для `config.type === 'embellishments'`.
     - В `BarChip` отображать `enclosureDegree` и ноты оборота при наличии.
  3. В `ExerciseComplete` добавить `embellishments: 'Опевания'` в `TYPE_LABEL`.
- **Критерий готовности (DoD):**
  - Превью показывает обороты в формате `Cmaj7 · 3 (E) → Eb · F · E`.
  - Экран завершения показывает «Опевания».
  - `typecheck` + `lint` проходят.
- **Зависит от задач:** T-002, T-003, T-006
- **Статус:** 🔴 Запланировано

### T-008. Сохранение настроек опеваний

- **Родительская функция:** 3.6 Сохранение настроек
- **Приоритет:** P1
- **Сложность:** S (1–2d)
- **Слой:** `plugins` + `shared`
- **Модуль:** `packages/shared/src/dto.ts`, `practice-cards/src/defaults.ts`, `practice-cards/src/components/ExerciseWizard.tsx`
- **Описание:**
  1. В `UserSettingsDTOSchema.practiceCards`:
     - `lastExerciseType: z.enum(['chords', 'scales', 'embellishments']).optional()`.
     - `lastEnclosureType: z.enum(['diatonic-upper', 'diatonic-lower', 'chromatic-upper', 'chromatic-lower', 'full-diatonic', 'full-chromatic', 'all']).optional()`.
     - `lastEnclosureDegrees: z.array(z.union([z.literal(1), z.literal(3), z.literal(5), z.literal(7)])).optional()`.
     - `lastEnclosureOctaves: z.union([z.literal(1), z.literal(2)]).optional()`.
  2. В `defaults.ts` добавить `DEF_ENCLOSURE_TYPE`, `DEF_ENCLOSURE_DEGREES`, `DEF_ENCLOSURE_OCTAVES`.
  3. В `ExerciseWizard.buildDefaults` читать `lastEnclosure*`, в `buildPracticeCardsSettings` — сохранять.
- **Критерий готовности (DoD):**
  - Настройки опеваний сохраняются при старте.
  - При повторном открытии wizard — поля заполнены предыдущими значениями.
  - `typecheck` + `lint` проходят.
- **Зависит от задач:** T-002, T-006
- **Статус:** 🔴 Запланировано

### T-009. Юнит-тесты `music-core/enclosures.test.ts`

- **Родительская функция:** T-001
- **Приоритет:** P1
- **Сложность:** S (1–2d)
- **Слой:** `music-core`
- **Модуль:** `packages/music-core/src/chords/enclosures.test.ts`
- **Описание:**
  1. Для каждого `ConcreteEnclosureType` протестировать ступени `1, 3, 5, 7` для `Cmaj7`, `Dm7`, `G7`.
  2. Проверить, что последняя нота — `target`, остальные — `approach`.
  3. Проверить корректность имён в бемольных тональностях (`F`, `Bb`, `Eb`) и диезных (`D`, `G`).
  4. Проверить `randomEnclosureType` на равномерность (тип возвращается из допустимого множества).
- **Критерий готовности (DoD):** Все тесты зелёные, покрытие `enclosures.ts` >90%.
- **Зависит от задач:** T-001
- **Статус:** 🔴 Запланировано

### T-010. Юнит-тесты `practice-cards/enclosureExercise.test.ts`

- **Родительская функция:** T-003
- **Приоритет:** P1
- **Сложность:** M (3–5d)
- **Слой:** `plugins`
- **Модуль:** `practice-cards/src/generators/enclosureExercise.test.ts`
- **Описание:**
  1. `unified`, `enclosureType='full-chromatic'`, `targetDegrees=[3, 7]`, `keys=['C']`, `octaves=1` → 2 `PracticeBar` с корректными `enclosureNotes`.
  2. `unified`, `octaves=2` → 4 `PracticeBar`.
  3. `pattern` с ii-V-I, `targetDegrees=[3]` → все аккорды имеют ступень 3.
  4. `pattern` с ii-V-I, `targetDegrees=[3, 7]` → ступени случайно `3` или `7`.
  5. `enclosureType='all'` — тип оборота варьируется между тактами.
  6. `playRandomly` — порядок тональностей/оборотов перемешан.
  7. `barsPerChord=2` — каждый оборот размножен в 2 такта.
  8. `repetitions=3` — буфер повторён 3 раза.
- **Критерий готовности (DoD):** Все тесты зелёные, покрытие `enclosureExercise.ts` >90%.
- **Зависит от задач:** T-003
- **Статус:** 🔴 Запланировано

### T-011. Компонентные тесты

- **Родительская функция:** T-004, T-005, T-006
- **Приоритет:** P1
- **Сложность:** S (1–2d)
- **Слой:** `plugins`
- **Модуль:** `practice-cards/src/components/__tests__/`
- **Описание:**
  1. `CardDisplay.test.tsx`: `enclosureNotes` рендерятся, целевая нота выделена.
  2. `StepTypeSelect.test.tsx`: плитка «Опевания» не disabled, при клике вызывается `'embellishments'`.
  3. `ExerciseWizard.test.tsx`: выбор «Опевания» → шаг 2 показывает `StepEnclosureConfig`; заполнение формы → превью.
- **Критерий готовности (DoD):** Все тесты зелёные.
- **Зависит от задач:** T-004, T-005, T-006
- **Статус:** 🔴 Запланировано

### T-012. Финальная верификация

- **Родительская функция:** все
- **Приоритет:** P0
- **Сложность:** S (1–2d)
- **Слой:** весь проект
- **Модуль:** —
- **Описание:**
  1. `npm run typecheck` — весь проект без ошибок.
  2. `npm run lint` — без ошибок, особенно `boundaries/dependencies`.
  3. `npm run test` — все существующие + новые тесты зелёные.
  4. Ручное функциональное тестирование по чек-листу метрик успеха (`EXERSISE-ENCLOSURES-VISION.md` §7).
  5. Проверить, что существующие тесты `scaleExercise` и `chordExercise` не затронуты.
- **Критерий готовности (DoD):** Все проверки пройдены, багов P0 нет.
- **Зависит от задач:** все предыдущие
- **Статус:** 🔴 Запланировано

---

## 2. Последовательность (Ordering)

```
Фаза 1: Фундамент (дни 1–3)
────────────────────────────
T-001 → T-002
  └─ Домен в music-core + типы в practice-cards

Фаза 2: Ядро генерации (дни 3–7)
────────────────────────────────
T-003 (enclosureExercise)
  └─ Зависит от T-001, T-002

Фаза 3: UI мастера (дни 7–11)
─────────────────────────────
T-004 (StepEnclosureConfig)
T-006 (Активация плитки + роутинг)
  └─ Зависят от T-002, T-003

Фаза 4: Отображение и превью (дни 11–13)
─────────────────────────────────────────
T-005 (CardDisplay)
T-007 (Превью + ExerciseComplete)
  └─ Зависят от T-002, T-003, T-006

Фаза 5: Настройки (дни 13–14)
─────────────────────────────
T-008 (UserSettingsDTO + defaults)
  └─ Зависит от T-002, T-006

Фаза 6: Тестирование (дни 14–17)
────────────────────────────────
T-009 (music-core tests)
T-010 (enclosureExercise tests)
T-011 (component tests)
  └─ Параллельно

Фаза 7: Верификация (дни 17–18)
───────────────────────────────
T-012 (typecheck + lint + test + ручные проверки)
```

---

## 3. Оценка суммарной трудоёмкости

| Сложность | Количество | Задачи |
| --- | --- | --- |
| XS (<1d) | 0 | — |
| S (1–2d) | 5 | T-002, T-005, T-006, T-007, T-008, T-009, T-011 |
| M (3–5d) | 3 | T-001, T-003, T-010 |
| L (1–2w) | 0 | — |
| XL (>2w) | 0 | — |

**Суммарно (соло):**

- S: 7 × 1.5d = 10.5d
- M: 3 × 4d = 12d
- **Итого: ~22.5 рабочих дня ≈ 4.5 недель (соло)**

**С учётом параллелизации (2 разработчика):**

- Критический путь: T-001 → T-002 → T-003 → T-004 → T-006 → T-005 → T-007 → T-012
  = 4 + 1.5 + 4 + 4 + 1.5 + 1.5 + 1.5 + 1.5 = 19.5d ≈ **4 недели**
- Параллельно: T-008, T-009, T-010, T-011
- **Оценка: 3–4 недели с 2 разработчиками** — соответствует горизонту VISION (2–3 недели с запасом).

---

## 4. Критические пути

**Главный критический путь** (блокирует запуск упражнения):

```
T-001 → T-002 → T-003 → T-004 → T-006 → T-005 → T-012
```

- **T-001** — блокирует T-002 (типы зависят от доменных функций).
- **T-003** — блокирует T-006 (wizard не может генерировать превью).
- **T-004** — блокирует T-006 (роутинг на несуществующий компонент).
- **T-006** — блокирует T-005 (CardDisplay нужны данные от генератора через wizard).

**Вторичный путь** (не блокирует запуск, но нужен для полноты):

```
T-007 → T-008
```

**Пути без зависимостей от критического** (можно делать параллельно):

- T-009 (music-core tests) — после T-001.
- T-010 (enclosureExercise tests) — после T-003.
- T-011 (component tests) — после T-004, T-005, T-006.

---

_Документ создан 2026-07-19. Декомпозирует функции из EXERSISE-ENCLOSURES-VISION.md на задачи, опираясь на техническую архитектуру из EXERSISE-ENCLOSURES-ARCHITECTURE.md._
