# EXERCISE SEQUENCES PLAN — План работ по упражнению «Секвенции»

**На основе:** [`docs/EXERSISE-SEQUENCES-VISION.md`](./EXERSISE-SEQUENCES-VISION.md), [`docs/EXERSISE-SEQUENCES-ARCHITECTURE.md`](./EXERSISE-SEQUENCES-ARCHITECTURE.md)
**Дата:** 2026-07-19
**Статус:** 🟡 Черновик

---

## 1. Задачи (Tasks)

### T-001. Доменный модуль `sequences.ts` в `music-core`

- **Родительская функция:** 3.4 Доменный модуль секвенций
- **Приоритет:** P0
- **Сложность:** M (3–5d)
- **Слой:** `music-core`
- **Модуль:** `packages/music-core/src/chords/sequences.ts`
- **Описание:**
  1. Определить типы:
     ```ts
     export type SequenceType = '1235' | '1234' | '1357' | '1531' | 'pentatonic' | 'all';
     export type ConcreteSequenceType = Exclude<SequenceType, 'all'>;
     export type SequenceNoteRole = 'pattern' | 'root';
     export interface SequenceNote {
       name: string;      // например "Eb"
       pc: number;        // pitch class 0–11
       role: SequenceNoteRole;
     }
     export type Rng = () => number;
     ```
  2. Определить каталог паттернов:
     ```ts
     export const SEQUENCE_PATTERNS: Record<ConcreteSequenceType, readonly number[]> = {
       '1235': [0, 1, 2, 4],
       '1234': [0, 1, 2, 3],
       '1357': [0, 2, 4, 6],
       '1531': [0, 4, 2, 0],
       pentatonic: [0, 1, 2, 4, 5],
     };
     export const CONCRETE_SEQUENCE_TYPES: ConcreteSequenceType[] = [
       '1235', '1234', '1357', '1531', 'pentatonic',
     ];
     ```
  3. Реализовать `resolveSequencePattern(startPc, type, key, scaleType): SequenceNote[]`:
     - Получить `scalePcs = scalePitchClasses(tonicPc, scaleType)` — переиспользовать из `enclosures.ts`.
     - Найти `startIdx` — индекс стартовой pc в `scalePcs` (fallback на ближайшую диатоническую снизу).
     - Для каждого `idx` в `SEQUENCE_PATTERNS[type]`:
       - `targetIdx = (startIdx + idx) % 7`.
       - При переносе через октаву (`startIdx + idx >= 7`) добавить `+12` к pc.
       - Имя ноты через `spellPitchClass(pc, key)`.
       - Роль: `idx === 0 ? 'root' : 'pattern'`.
  4. Реализовать `buildSequenceCycle(tonicPc, type, key, scaleType, startDegrees): SequenceNote[][]`:
     - Для каждой стартовой ступени вычислить её pc (`scalePcs[startDegree - 1]`) и вызвать `resolveSequencePattern`.
     - Вернуть массив массивов нот.
  5. Реализовать `randomSequenceType(rng): ConcreteSequenceType`.
  6. Реэкспортировать публичные типы/функции из `music-core/src/chords/index.ts`.
- **Критерий готовности (DoD):**
  - `typecheck` в `music-core` проходит.
  - Юнит-тесты `music-core/src/chords/sequences.test.ts` покрывают все 5 `ConcreteSequenceType` для ступеней `1-7` в нескольких тональностях (`C`, `F`, `Bb`, `D`).
  - Граничные случаи: стартовая ступень 7 (паттерн уходит в следующую октаву), минорные лады, бемольные/диезные тональности.
- **Зависит от задач:** —
- **Статус:** 🔴 Запланировано

### T-002. Расширение типов `PracticeBar` и `ExerciseConfig`

- **Родительская функция:** 3.5 Отображение секвенций в карточках
- **Приоритет:** P0
- **Сложность:** S (1–2d)
- **Слой:** `plugins`
- **Модуль:** `practice-cards/src/generators/types.ts`
- **Описание:**
  1. Импортировать из `@jazz/music-core`: `SequenceType`, `ConcreteSequenceType`, `SequenceNote`, `TargetDegree`.
  2. Добавить `SequenceDirection = 'up' | 'down' | 'both'`.
  3. Добавить `SequenceExerciseConfig extends BaseExerciseConfig`:
     ```ts
     export interface SequenceExerciseConfig extends BaseExerciseConfig {
       type: 'sequences';
       source: ChordSource;
       sequenceType: SequenceType;
       startDegrees: TargetDegree[];
       scaleType: ScaleType;
       direction: SequenceDirection;
     }
     ```
  4. Обновить `ExerciseConfig = ChordExerciseConfig | ScaleExerciseConfig | EnclosureExerciseConfig | SequenceExerciseConfig`.
  5. Обновить `ExerciseSession.type` до `'chords' | 'scales' | 'enclosures' | 'sequences'`.
  6. Расширить `PracticeBar` опциональным полем:
     ```ts
     sequence?: {
       type: ConcreteSequenceType;
       startDegree: number;
       notes: SequenceNote[];
       direction: 'up' | 'down';
     };
     ```
- **Критерий готовности (DoD):** `typecheck` в `practice-cards` проходит; discriminated union корректен.
- **Зависит от задач:** T-001
- **Статус:** 🔴 Запланировано

### T-003. Генератор `sequenceExercise.ts`

- **Родительская функция:** 3.3 Генератор упражнений по секвенциям
- **Приоритет:** P0
- **Сложность:** M (3–5d)
- **Слой:** `plugins`
- **Модуль:** `practice-cards/src/generators/sequenceExercise.ts`
- **Описание:**
  1. Реализовать `generateSequenceExercise(config: SequenceExerciseConfig, rng: Rng = Math.random): PracticeBar[]` (скелет копируется из `enclosureExercise.ts`).
  2. **Режим `unified` (standalone):**
     - Для каждой тональности из `keys` построить тонический аккорд через `buildTonicChord(key, scaleType)`.
     - Для каждой стартовой ступени из `startDegrees`:
       - `concreteType = sequenceType === 'all' ? randomSequenceType(rng) : sequenceType`.
       - Стартовая pc = `scalePitchClasses(keyToPitchClass(key), scaleType)[startDegree - 1]`.
       - `notes = resolveSequencePattern(startPc, concreteType, key, scaleType)`.
       - Такт: `{ chords: [tonicChord], sequence: { type, startDegree, notes, direction } }`.
     - `direction: 'both'` → сначала обход вверх (по порядку ступеней), затем вниз (обратный порядок).
  3. **Режим `pattern` / `random` / `dsl` (over-chords):**
     - Получить чанки аккордов через `extractChordsFromSource(source, key)`.
     - Для каждого аккорда `i`:
       - `startDegree = startDegrees[i % startDegrees.length]` (циклически).
       - `resolvedScaleType = scaleTypeForSymbol(symbol, key, fallback)` (как в `enclosureExercise.ts`).
       - `startPc = resolveChordTonePitchClass(symbol, startDegree, resolvedScaleType)`.
       - `notes = resolveSequencePattern(startPc, concreteType, key, resolvedScaleType)`.
       - Такт: `{ chords: chunk.chords, sequence: { type, startDegree, notes, direction } }`.
  4. Поддержать `playRandomly`, `barsPerChord`, `repetitions`, `infinite` через утилиты `core.ts` (`repeatBars`, `expandBarsPerChord`, `shuffle`, `INFINITE_ROUNDS`, `toPracticeBars`).
- **Критерий готовности (DoD):**
  - Корректно генерирует `PracticeBar[]` для всех 4 `source.type`.
  - `unified` даёт ровно `keys.length × startDegrees.length` тактов (×2 для `direction: 'both'`, до `barsPerChord`).
  - `over-chords` даёт длину прогрессии × число тональностей × повторы.
  - `typecheck` + `lint` проходят.
- **Зависит от задач:** T-001, T-002
- **Статус:** 🔴 Запланировано

### T-004. UI-шаг `StepSequenceConfig.tsx`

- **Родительская функция:** 3.2 Мастер настройки секвенций
- **Приоритет:** P0
- **Сложность:** M (3–5d)
- **Слой:** `plugins`
- **Модуль:** `practice-cards/src/components/StepSequenceConfig.tsx`
- **Описание:**
  1. Создать компонент по образцу `StepEnclosureConfig.tsx`.
  2. **Тип секвенции:** `Select` с 6 опциями (5 паттернов + «Случайная»):
     - `1235` → «1-2-3-5 (бибоп)»
     - `1234` → «1-2-3-4»
     - `1357` → «1-3-5-7 (арпеджио)»
     - `1531` → «1-5-3-1»
     - `pentatonic` → «Пентатоника»
     - `all` → «Случайная»
  3. **Стартовые ступени:** чекбоксы `1-7`. Валидация: хотя бы одна выбрана.
  4. **Направление:** radio-кнопки `up` / `down` / `both`.
  5. **Лад для секвенций:** `Select` из `SCALE_TYPES` / `SCALE_LABELS`.
  6. Общие карточки: `BarsPerUnitCard` (лейбл «Тактов на секвенцию»), `KeysCard`, `CountInCard`, `CardModeCard`, `BackingCard`, `MetronomeTempoCard`, `RepetitionsCard`.
  7. При изменении источника типа `unified` — подсказка: «Отдельная отработка на тоническом аккорде выбранной тональности».
- **Критерий готовности (DoD):**
  - Все поля рендерятся и изменяют `config`.
  - Валидация ступеней: если ни одна не выбрана — кнопка «Показать инструкцию» disabled.
  - `typecheck` + `lint` проходят.
- **Зависит от задач:** T-002
- **Статус:** 🔴 Запланировано

### T-005. Расширение `CardDisplay` для секвенций

- **Родительская функция:** 3.5 Отображение секвенций в карточках
- **Приоритет:** P0
- **Сложность:** S (1–2d)
- **Слой:** `plugins`
- **Модуль:** `practice-cards/src/components/CardDisplay.tsx`
- **Описание:**
  1. В `CardContent` добавить ветку **перед** `scaleLabel` (приоритет: `enclosure` → `sequence` → `scaleLabel` → аккорды):
     ```tsx
     if (bar.sequence) {
       const patternNotes = bar.sequence.notes
         .filter((n) => n.role === 'pattern')
         .map((n) => n.name);
       const root = bar.sequence.notes.find((n) => n.role === 'root');
       return (
         <div className="flex flex-col items-center gap-1">
           <span className="text-xl font-semibold text-muted-foreground">
             Ступень {bar.sequence.startDegree}
           </span>
           {bar.chords[0] && (
             <span className="text-6xl font-bold text-foreground">{bar.chords[0]}</span>
           )}
           <span className="text-3xl font-semibold text-foreground">
             {root && <span className="text-primary">{root.name}</span>}
             {patternNotes.length > 0 && ` ${patternNotes.join(' ')}`}
           </span>
         </div>
       );
     }
     ```
  2. Убедиться, что `GhostCard` с sequence-контентом не ломает лейаут.
- **Критерий готовности (DoD):**
  - Карточка секвенции отображает 3 строки: «Ступень N» → аккорд → ноты паттерна (корень выделен `text-primary`).
  - Существующие режимы аккордов, гамм и опеваний не сломаны.
  - `typecheck` + `lint` проходят.
- **Зависит от задач:** T-002
- **Статус:** 🔴 Запланировано

### T-006. Активация плитки и роутинг в wizard

- **Родительская функция:** 3.1 Активация плитки «Секвенции»
- **Приоритет:** P0
- **Сложность:** S (1–2d)
- **Слой:** `plugins`
- **Модуль:** `practice-cards/src/components/StepTypeSelect.tsx`, `ExerciseWizard.tsx`
- **Описание:**
  1. В `StepTypeSelect`:
     - Расширить `StepTypeSelectProps.onSelect` до `'chords' | 'scales' | 'enclosures' | 'sequences'`.
     - У плитки `sequences` заменить `icon: '⏳'` → `'🎯'`, убрать «(скоро)» из описания, `disabled: true` → `disabled: false`.
     - В `onClick` добавить ветку `if (tile.type === 'sequences') onSelect('sequences');`.
  2. В `ExerciseWizard`:
     - `type ExerciseKind = 'chords' | 'scales' | 'enclosures' | 'sequences'`.
     - Импортировать `generateSequenceExercise`, `StepSequenceConfig`, `SequenceExerciseConfig`.
     - При `handleTypeSelect('sequences')` инициализировать `config` с дефолтами секвенций.
     - Добавить ветку `{step === 2 && kind === 'sequences' && <Step2Shell>...<StepSequenceConfig/>...</Step2Shell>}`.
     - В `handlePreview` / `handleQuickStart` / `handleStart` добавить ветку `generateSequenceExercise`.
     - Обновить `buildPracticeCardsSettings` для сохранения sequence-полей.
     - Обновить `buildConfig` для сборки `SequenceExerciseConfig` с дефолтами.
     - Обновить `buildInitialConfig` для восстановления sequence-настроек.
     - Обновить `buildDefaults` для чтения `lastSequence*`.
     - Обновить `isValidSource`: `unified` валиден для `sequences` без symbols.
     - Обновить `step2Label`: добавить `'Секвенции'`.
- **Критерий готовности (DoD):**
  - Плитка активна, не показывает «скоро».
  - Выбор плитки открывает `StepSequenceConfig`.
  - «Старт» и «Быстрый старт» вызывают `generateSequenceExercise`.
  - `typecheck` + `lint` проходят.
- **Зависит от задач:** T-003, T-004
- **Статус:** 🔴 Запланировано

### T-007. Превью и экран завершения

- **Родительская функция:** 4.1 Превью секвенций, 4.2 Экран завершения
- **Приоритет:** P1
- **Сложность:** S (1–2d)
- **Слой:** `plugins`
- **Модуль:** `practice-cards/src/components/StepPreview.tsx`, `degreeFunctions.ts`, `ExerciseComplete.tsx`
- **Описание:**
  1. В `degreeFunctions.ts`:
     - Добавить вариант `{ kind: 'sequences'; labels: string[] }` в `FunctionPreview`.
     - В `buildFunctionPreview` добавить ветку `if (config.type === 'sequences')`:
       - `unified` → `${key}: ступени ${degrees}`.
       - `pattern` / `dsl` → степени прогрессии через `degreeLabel`.
       - `random` → `['произв.']`.
  2. В `StepPreview`:
     - Расширить `explainPlayback` для `config.type === 'sequences'`.
     - В `summary.typeLabel` добавить `sequences ? 'секвенций'`.
     - Добавить compact-рендер `{fnPreview.kind === 'sequences' && <ChipSequence labels={fnPreview.labels} />}`.
     - В `BarChip` добавить ветку `if (bar.sequence)` (отображение корневой ноты паттерна).
  3. В `ExerciseComplete` добавить `sequences: 'Секвенции'` в `TYPE_LABEL`.
- **Критерий готовности (DoD):**
  - Превью показывает стартовые ступени в формате `C: ступени 1-5`.
  - Экран завершения показывает «Секвенции».
  - `typecheck` + `lint` проходят.
- **Зависит от задач:** T-002, T-003, T-006
- **Статус:** 🔴 Запланировано

### T-008. Сохранение настроек секвенций

- **Родительская функция:** 3.6 Сохранение настроек
- **Приоритет:** P1
- **Сложность:** S (1–2d)
- **Слой:** `plugins` + `shared`
- **Модуль:** `packages/shared/src/dto.ts`, `practice-cards/src/defaults.ts`, `practice-cards/src/components/ExerciseWizard.tsx`
- **Описание:**
  1. В `UserSettingsDTOSchema.practiceCards`:
     - `lastExerciseType: z.enum(['chords', 'scales', 'enclosures', 'sequences']).optional()`.
     - `lastSequenceType: z.enum(['1235', '1234', '1357', '1531', 'pentatonic', 'all']).optional()`.
     - `lastSequenceStartDegrees: z.array(z.enum(['1', '2', '3', '4', '5', '6', '7'])).optional()`.
     - `lastSequenceScaleType: z.enum([...9 ладов...]).optional()`.
  2. В `defaults.ts` добавить `DEF_SEQUENCE_TYPE = '1235'`, `DEF_SEQUENCE_START_DEGREES = [1, 2, 3, 4, 5]`, `DEF_SEQUENCE_DIRECTION = 'up'`.
  3. В `ExerciseWizard.buildDefaults` читать `lastSequence*`, в `buildPracticeCardsSettings` — сохранять.
- **Критерий готовности (DoD):**
  - Настройки секвенций сохраняются при старте.
  - При повторном открытии wizard — поля заполнены предыдущими значениями.
  - `typecheck` + `lint` проходят.
- **Зависит от задач:** T-002, T-006
- **Статус:** 🔴 Запланировано

### T-009. Юнит-тесты `music-core/sequences.test.ts`

- **Родительская функция:** T-001
- **Приоритет:** P1
- **Сложность:** S (1–2d)
- **Слой:** `music-core`
- **Модуль:** `packages/music-core/src/chords/sequences.test.ts`
- **Описание:**
  1. Для каждого `ConcreteSequenceType` протестировать стартовые ступени `1, 3, 5` в `C` мажоре:
     - `1235` от 1: `[C, D, E, G]` (pc `[0, 2, 4, 7]`).
     - `1235` от 3: `[E, F, G, B]` (pc `[4, 5, 7, 11]`).
     - `1357` от 1: `[C, E, G, B]` (pc `[0, 4, 7, 11]`).
     - `1531` от 1: `[C, G, E, C]` (pc `[0, 7, 4, 0]`).
     - `pentatonic` от 1: `[C, D, E, G, A]` (pc `[0, 2, 4, 7, 9]`).
  2. Проверить стартовую ступень 7 (паттерн уходит в следующую октаву).
  3. Проверить минорный лад (`natural-minor`, `dorian`) — ступени берутся из лада.
  4. Проверить корректность имён в бемольных тональностях (`F`, `Bb`, `Eb`) и диезных (`D`, `G`).
  5. Проверить `buildSequenceCycle` для ступеней `1-5` — длина массива 5.
  6. Проверить `randomSequenceType` — тип возвращается из допустимого множества.
- **Критерий готовности (DoD):** Все тесты зелёные, покрытие `sequences.ts` >90%.
- **Зависит от задач:** T-001
- **Статус:** 🔴 Запланировано

### T-010. Юнит-тесты `practice-cards/sequenceExercise.test.ts`

- **Родительская функция:** T-003
- **Приоритет:** P1
- **Сложность:** M (3–5d)
- **Слой:** `plugins`
- **Модуль:** `practice-cards/src/generators/sequenceExercise.test.ts`
- **Описание:**
  1. `unified`, `sequenceType='1235'`, `startDegrees=[1, 2, 3]`, `keys=['C']`, `direction='up'` → 3 `PracticeBar` с корректными `sequence.notes`.
  2. `unified`, `direction='both'` → 6 `PracticeBar` (вверх + вниз).
  3. `unified`, `keys=['C', 'F']` → 6 `PracticeBar` (3 на каждую тональность).
  4. `pattern` с ii-V-I, `startDegrees=[1]` → все аккорды имеют `startDegree === 1`.
  5. `pattern` с ii-V-I, `startDegrees=[1, 3, 5]` → ступени циклически `1, 3, 5, 1, 3, 5...`.
  6. `sequenceType='all'` — тип паттерна варьируется между тактами.
  7. `playRandomly` — порядок тональностей/паттернов перемешан.
  8. `barsPerChord=2` — каждый паттерн размножен в 2 такта.
  9. `repetitions=3` — буфер повторён 3 раза.
- **Критерий готовности (DoD):** Все тесты зелёные, покрытие `sequenceExercise.ts` >90%.
- **Зависит от задач:** T-003
- **Статус:** 🔴 Запланировано

### T-011. Компонентные тесты

- **Родительская функция:** T-004, T-005, T-006
- **Приоритет:** P1
- **Сложность:** S (1–2d)
- **Слой:** `plugins`
- **Модуль:** `practice-cards/src/components/__tests__/`
- **Описание:**
  1. `CardDisplay.test.tsx`: `sequence.notes` рендерятся, корневая нота выделена `text-primary`.
  2. `StepTypeSelect.test.tsx`: плитка «Секвенции» не disabled, при клике вызывается `'sequences'`.
  3. `ExerciseWizard.test.tsx`: выбор «Секвенции» → шаг 2 показывает `StepSequenceConfig`; заполнение формы → превью.
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
  1. `pnpm typecheck` — весь проект без ошибок.
  2. `pnpm lint` — без ошибок, особенно `boundaries/dependencies`.
  3. `pnpm test` — все существующие + новые тесты зелёные.
  4. Ручное функциональное тестирование по чек-листу метрик успеха (`EXERSISE-SEQUENCES-VISION.md` §7).
  5. Проверить, что существующие тесты `scaleExercise`, `enclosureExercise`, `chordExercise` не затронуты.
  6. Проверить `plugin-contract.test.ts` / `CardDisplay.test.tsx` — не утверждают ли исчерпывающий список типов (если да — расширить).
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
T-003 (sequenceExercise)
  └─ Зависит от T-001, T-002

Фаза 3: UI мастера (дни 7–11)
─────────────────────────────
T-004 (StepSequenceConfig)
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
T-010 (sequenceExercise tests)
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
| S (1–2d) | 7 | T-002, T-005, T-006, T-007, T-008, T-009, T-011 |
| M (3–5d) | 3 | T-001, T-003, T-004, T-010 |
| L (1–2w) | 0 | — |
| XL (>2w) | 0 | — |

**Суммарно (соло):**

- S: 7 × 1.5d = 10.5d
- M: 4 × 4d = 16d
- **Итого: ~26.5 рабочих дня ≈ 5 недель (соло)**

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
- T-010 (sequenceExercise tests) — после T-003.
- T-011 (component tests) — после T-004, T-005, T-006.

---

_Документ создан 2026-07-19. Декомпозирует функции из EXERSISE-SEQUENCES-VISION.md на задачи, опираясь на техническую архитектуру из EXERSISE-SEQUENCES-ARCHITECTURE.md._
