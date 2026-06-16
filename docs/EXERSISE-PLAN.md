# EXERCISE PLAN — План работ по модулю «Карточки»

**На основе:** [`docs/EXERSISE-VISION.md`](./EXERSISE-VISION.md) (принято), [`docs/EXERSISE-ARCHITECTURE.md`](./EXERSISE-ARCHITECTURE.md)
**Дата:** 2026-06-15
**Статус:** 🟡 Черновик

---

## 1. Задачи (Tasks)

### T-001. Создание пакета плагина (scaffolding)

- **Родительская функция:** все (инфраструктурная)
- **Приоритет:** P0
- **Сложность:** XS (<1d)
- **Слой:** plugins
- **Плагин / Модуль:** `packages/plugins/practice-cards/`
- **Описание:**
  1. Скопировать `packages/plugins/_template/` → `packages/plugins/practice-cards/`
  2. Заменить `id`, `name`, `category`, `description` в `src/index.ts`:
     - `id: 'practice.cards'`
     - `name: 'Practice Cards'`
     - `category: 'practice'`
     - `description: 'Интерактивные карточки для тренировки аккордов и гамм'`
  3. Оставить заглушки `routes` и `navItems` (будут заполнены в T-011)
  4. Настроить `package.json`: имя пакета `@jazz/plugin-practice-cards`
  5. Добавить зависимости: `@jazz/plugin-sdk`, `@jazz/music-core`, `@jazz/ui`, `@jazz/shared`
- **Критерий готовности (DoD):** `npm run typecheck` проходит в пакете (заглушка без ошибок)
- **Зависит от задач:** —
- **Статус:** 🟢 Готово

### T-002. Модель данных и типы

- **Родительская функция:** все (инфраструктурная)
- **Приоритет:** P0
- **Сложность:** S (1–2d)
- **Слой:** plugins
- **Плагин / Модуль:** `practice-cards/src/generators/types.ts`
- **Описание:**
  Реализовать все типы согласно `EXERSISE-ARCHITECTURE.md §5`:
  1. `ChordSource` — источник контента (`pattern`, `random`, `dsl`)
  2. `CardMode` — режим отображения (`'current' | 'prev-current' | 'prev-current-next'`)
  3. `BaseExerciseConfig` — общие параметры (keys, repetitions, infinite, countInBars, cardMode, backingBass/Drums/Piano/Rhodes, metronome, tempo)
  4. `ChordExerciseConfig extends BaseExerciseConfig` — type: 'chords', source: ChordSource
  5. `ScaleType`, `ScaleDirection` — перечисления
  6. `ScaleExerciseConfig extends BaseExerciseConfig` — type: 'scales', mode: 'standalone' | 'over-chords', scaleType, direction, octaves, source?
  7. `ExerciseConfig = ChordExerciseConfig | ScaleExerciseConfig`
  8. `PracticeBar` — такт практики (`index`, `chords`, `scaleLabel?`, `direction?`)
  9. `ExerciseSession` — сессия (`type`, `bars`, `config`)
  10. Экспорт всех типов из `index.ts` плагина
- **Критерий готовности (DoD):** `typecheck` проходит; типы экспортируются из плагина
- **Зависит от задач:** T-001
- **Статус:** 🟢 Готово

### T-003. Генератор аккордовых упражнений (chordExercise)

- **Родительская функция:** 3.2 Аккордовые карточки
- **Приоритет:** P0
- **Сложность:** M (3–5d)
- **Слой:** plugins
- **Плагин / Модуль:** `practice-cards/src/generators/chordExercise.ts`
- **Описание:**
  Реализовать `generateChordExercise(config: ChordExerciseConfig): PracticeBar[]`:
  1. Получить `GridContent` через `generate()` (pattern/random) или `parseGrid()` (DSL) из `@jazz/music-core`
  2. Для каждой выбранной тональности — транспонировать `GridContent` и добавить в результат
  3. Преобразовать `GridBar[]` → `PracticeBar[]`: один `GridBar` = один `PracticeBar` с `chords: GridBar.chords.map(c => c.symbol)`
  4. Поддержка `repetitions`: дублировать массив `PracticeBar[]` N раз (для `infinite` — вернуть однократно, зацикливание в `ExerciseRunner`)
  5. Корректная обработка `ChordSource.type === 'dsl'` с вызовом `parseGrid()` и обработкой ошибок парсинга
  6. Для `ChordSource.type === 'random'` — вызов `generate()` с параметрами генерации
- **Критерий готовности (DoD):**
  - Корректно генерирует `PracticeBar[]` для pattern/random/dsl источников
  - Множественные тональности: прогрессия транспонируется корректно
  - Повторы: массив дублируется N раз
  - `typecheck` + `lint` проходят
- **Зависит от задач:** T-002
- **Статус:** 🔴 Запланировано

### T-004. Генератор упражнений по гаммам (scaleExercise)

- **Родительская функция:** 3.3 Гаммы по карточкам
- **Приоритет:** P1
- **Сложность:** M (3–5d)
- **Слой:** plugins
- **Плагин / Модуль:** `practice-cards/src/generators/scaleExercise.ts`
- **Описание:**
  Реализовать `generateScaleExercise(config: ScaleExerciseConfig): PracticeBar[]`:

  **Режим `standalone`:**
  1. Создать `PracticeBar[]` с метками направления: `[{ chords: [], scaleLabel: "C мажор", direction: "up" }, { chords: [], scaleLabel: "C мажор", direction: "down" }, ...]`
  2. Количество тактов = `octaves * (direction === 'both' ? 2 : 1)` на каждую тональность

  **Режим `over-chords`:**
  1. Получить прогрессию через `generateChordExercise()` (переиспользовать T-003)
  2. Для каждого `PracticeBar` определить лад через `chordDegreeToScale(chord)` — функция внутри модуля
  3. Добавить `scaleLabel` к каждому `PracticeBar` (например, `"D дорийский"`)

  **Функция `chordDegreeToScale`:**
  - Реализовать внутри `scaleExercise.ts` (MVP) или как кандидат на вынос в `music-core`
  - Маппинг: Imaj7→major, iim7→dorian, iiim7→phrygian, IVmaj7→lydian, V7→mixolydian, vim7→natural-minor, viim7b5→locrian
  - Использовать существующий `parseChord()` из `music-core` для извлечения ступени и качества

- **Критерий готовности (DoD):**
  - `standalone`: корректные `PracticeBar[]` с направлениями
  - `over-chords`: корректный маппинг аккорд→лад
  - `typecheck` + `lint` проходят
- **Зависит от задач:** T-002, T-003 (переиспользует логику прогрессий)
- **Статус:** 🔴 Запланировано

### T-005. CardDisplay + CountInOverlay

- **Родительская функция:** 3.4 Движок отображения карточек
- **Приоритет:** P0
- **Сложность:** M (3–5d)
- **Слой:** plugins
- **Плагин / Модуль:** `practice-cards/src/components/CardDisplay.tsx`, `CountInOverlay.tsx`
- **Описание:**

  **CardDisplay:**
  Реализовать pure presentational компонент `CardDisplay`:
  1. Принимает `CardDisplayProps { bars: PracticeBar[]; currentIndex: number; mode: CardMode }`
  2. Режимы:
     - `current` — одна карточка по центру
     - `prev-current` — две: prev (opacity 0.4, scale 0.85), current (opacity 1.0, scale 1.0, accent-рамка)
     - `prev-current-next` — три: prev (0.4, 0.85), current (1.0, 1.0, рамка), next (0.6, 0.85)
  3. Анимация смены: CSS `transform: translateX()` + `opacity`, длительность ~300ms
  4. Граничные случаи: `currentIndex=0` (нет prev), `currentIndex=last` (нет next) — отсутствующие карточки не рендерятся
  5. Multi-chord: символы разделены пробелом, при >2 аккордах — шрифт уменьшается
  6. Визуальный дизайн: фон и цвета из темы приложения, скруглённые углы, крупный шрифт
  7. Адаптив: на мобильных (<768px) режим `prev-current-next` форсируется в `current`

  **CountInOverlay:**
  1. Читает из `usePlaybackStore`: `countInActive`, `countInBeat`, `totalBeats` (time signature)
  2. Рендерит точки `● ● ● ●` по центру экрана, текущая доля подсвечена цветом темы
  3. `z-index` выше `CardDisplay`, скрывается когда `countInActive === false`

- **Критерий готовности (DoD):**
  - Все 3 режима рендерятся корректно
  - Анимация смены карточек плавная
  - Граничные случаи обработаны
  - CountInOverlay показывает точки корректно
  - `typecheck` + `lint` проходят
- **Зависит от задач:** T-002 (типы PracticeBar, CardMode)
- **Статус:** 🔴 Запланировано

### T-006. ExerciseWizard + шаги конфигурации

- **Родительская функция:** 3.1 Мастер настройки упражнения
- **Приоритет:** P0
- **Сложность:** L (1–2w)
- **Слой:** plugins
- **Плагин / Модуль:** `practice-cards/src/components/ExerciseWizard.tsx`, `StepTypeSelect.tsx`, `StepChordConfig.tsx`, `StepScaleConfig.tsx`, `StepPreview.tsx`
- **Описание:**

  **ExerciseWizard (контейнер):**
  1. Управляет состоянием: `{ step: 1|2|3, config: Partial<ExerciseConfig>, preview: PracticeBar[] | null }`
  2. Stepper в верхней части: Step 1 · Step 2 · Step 3 с подсветкой текущего
  3. Роутинг по шагам: рендерит соответствующий `Step*` компонент

  **StepTypeSelect (шаг 1):**
  1. 4 плитки с иконками: «Аккорды» 🎸, «Гаммы» 🎹, «Секвенции» (⏳ disabled), «Опевания» (⏳ disabled)
  2. При клике на активную — переход к шагу 2 с соответствующим `config.type`

  **StepChordConfig (шаг 2а):**
  1. Выбор источника (`ChordSource`): радио-группа «Паттерн» / «Произвольная» / «DSL»
     - Паттерн: выпадающий список из `listPatterns()` (8 паттернов)
     - Произвольная: нет доп. полей (random в тональности)
     - DSL: текстовое поле с валидацией на лету через `parseGrid()`, ошибки подсвечиваются
  2. Тональности: ряд кнопок-чекбоксов (C, Db, D, ..., B), выбор одной или нескольких
  3. Повторы: числовое поле (1–10) + чекбокс «∞ Бесконечно»
  4. Затактов: кнопки 0, 1, 2, 4
  5. Режим карточек: радио-группа `current` / `prev-current` / `prev-current-next`
  6. Аккомпанемент: чекбоксы Бас / Барабаны / Ф-но / Rhodes
  7. Метроном: вкл/выкл, слайдер громкости
  8. Темп: слайдер 40–300 BPM (дефолт из `useSettings()`)
  9. Кнопка «▶ Быстрый старт» (запуск с дефолтными параметрами)
  10. Кнопка «Показать инструкцию →» (шаг 3)

  **StepScaleConfig (шаг 2б):**
  1. Тип гаммы: выпадающий список (major, natural-minor, harmonic-minor, melodic-minor, dorian, mixolydian, phrygian, lydian, locrian)
  2. Контекст: радио-группа «Отдельно» / «По прогрессии»
     - «По прогрессии» — показываются поля выбора прогрессии (как в StepChordConfig: источник, тональности)
  3. Направление: радио-группа «↑ Вверх» / «↓ Вниз» / «↕ Вверх-вниз»
  4. Октав: кнопки 1 / 2
  5. Остальные параметры (повторы, затакты, карточки, темп) — общие, переиспользовать логику из StepChordConfig

  **StepPreview (шаг 3):**
  1. Вызывает соответствующий генератор для получения `PracticeBar[]`
  2. Показывает список аккордов/гамм в текстовом виде
  3. Для аккордов: символы + ноты каждого аккорда (через `parseChord()`)
  4. Для гамм: название лада + последовательность нот (текстом)
  5. Кнопка «▶ Старт» — передаёт `config` и `preview` в родительский компонент
  6. Кнопка «← Назад» — возврат к шагу 2

- **Критерий готовности (DoD):**
  - 3-шаговый stepper работает (навигация вперёд/назад)
  - Все поля конфигурации валидируются
  - Превью корректно показывает сгенерированные данные
  - «Быстрый старт» запускает упражнение с дефолтами
  - DSL-валидация на лету
  - `typecheck` + `lint` проходят
- **Зависит от задач:** T-002, T-003, T-004 (для превью в шаге 3)
- **Статус:** 🔴 Запланировано

### T-007. ExerciseRunner (оркестратор практики)

- **Родительская функция:** 3.5 Интеграция с плеером и аккомпанементом
- **Приоритет:** P0
- **Сложность:** M (3–5d)
- **Слой:** plugins
- **Плагин / Модуль:** `practice-cards/src/components/ExerciseRunner.tsx`
- **Описание:**
  Реализовать оркестратор, связывающий транспорт, карточки и плеер:
  1. Принимает `ExerciseRunnerProps { bars: PracticeBar[]; config: ExerciseConfig; onComplete: () => void; onReconfigure: () => void }`
  2. Преобразует `PracticeBar[]` → `Section[]` (формат для `usePluginTransport`):
     - Каждый `PracticeBar` → один bar в Section
     - `chords` → chord symbols для TransportEngine
  3. Вызывает `usePluginTransport({ settings, timeSignature, totalBars, sections })` с настройками из `config`
  4. Подписывается на `usePlaybackStore`:
     - `status` — для определения playing/idle/count-in
     - `currentBar` — индекс текущего такта → передаётся в `CardDisplay`
     - `countInActive`, `countInBeat` — для `CountInOverlay`
  5. Рендерит `PlayerToolbar` (из `@jazz/ui`), передавая:
     - `onPlay`, `onPause`, `onStop` — управление транспортом
     - `onBpmChange`, `onStyleChange` — изменение настроек
     - Счётчик тактов: «Такт {currentBar+1} из {totalBars}» или «Такт {currentBar+1} / ∞»
  6. Рендерит `CardDisplay` (передаёт `bars`, `currentIndex=currentBar`, `mode=config.cardMode`)
  7. Рендерит `CountInOverlay` (когда `countInActive === true`)
  8. При `status === 'idle'` после playing → вызывает `onComplete()`
  9. Управление громкостью инструментов: при `backingBass === false` — громкость баса = 0 (аналогично для остальных)
  10. Метроном: настройка громкости click-трека
  11. Infinite-режим: зацикливание `bars` (повтор с первого такта), `onComplete` не вызывается автоматически, пользователь останавливает вручную
- **Критерий готовности (DoD):**
  - Транспорт запускается, карточки синхронизированы с позицией
  - Затакт корректно отсчитывается (CountInOverlay показывает точки)
  - Инструменты вкл/выкл согласно настройкам
  - Infinite-режим: зацикливание работает, остановка через Stop
  - `typecheck` + `lint` проходят
- **Зависит от задач:** T-002, T-003, T-005, T-006 (нужны типы, генераторы, CardDisplay, wizard для получения config)
- **Статус:** 🔴 Запланировано

### T-008. ExerciseComplete + PracticeCardsPage

- **Родительская функция:** 3.1 (Wizard), 4.2 (Экран завершения)
- **Приоритет:** P1
- **Сложность:** M (3–5d)
- **Слой:** plugins
- **Плагин / Модуль:** `practice-cards/src/components/ExerciseComplete.tsx`, `PracticeCardsPage.tsx`
- **Описание:**

  **ExerciseComplete:**
  1. Принимает пропсы: `{ config: ExerciseConfig; barsCount: number; tempo: number; onRepeat: () => void; onReconfigure: () => void; onFinish: () => void }`
  2. Показывает сводку: «{barsCount} тактов в темпе {tempo} BPM, тональность {keys.join(', ')}, {тип упражнения}»
  3. Кнопки: «Повторить» (те же настройки), «Настроить заново» (шаг 2 мастера), «Закончить» (на главную / каталог)

  **PracticeCardsPage (entry-point):**
  1. Управляет состоянием экрана: `'wizard' | 'practice' | 'complete'`
  2. Хранит `config: ExerciseConfig | null` и `bars: PracticeBar[]`
  3. При `screen === 'wizard'` — рендерит `ExerciseWizard`, по «Старт» сохраняет `config` + `bars`, переключает на `'practice'`
  4. При `screen === 'practice'` — рендерит `ExerciseRunner` с `onComplete` (→ `'complete'`) и `onReconfigure` (→ `'wizard'`)
  5. При `screen === 'complete'` — рендерит `ExerciseComplete`
  6. Обработка «Быстрый старт»: wizard вызывает колбэк с дефолтным `config` + сгенерированными `bars`

- **Критерий готовности (DoD):**
  - Полный цикл: wizard → практика → завершение → повторить / настроить заново / закончить
  - Кнопка «Закончить» редиректит на главную
  - `typecheck` + `lint` проходят
- **Зависит от задач:** T-006, T-007
- **Статус:** 🔴 Запланировано

### T-009. Регистрация плагина и алиасы

- **Родительская функция:** все (инфраструктурная)
- **Приоритет:** P0
- **Сложность:** XS (<1d)
- **Слой:** plugins + web + config
- **Плагин / Модуль:** `plugin-registry`, `vite.config.ts`, `tsconfig.base.json`, `vitest.config.ts`
- **Описание:**
  1. В `packages/plugin-registry/src/index.ts`:
     - Импортировать `practiceCardsPlugin` из `@jazz/plugin-practice-cards`
     - Добавить в массив `PLUGINS`
  2. В `apps/web/vite.config.ts`: добавить vite-алиас `@jazz/plugin-practice-cards`
  3. В `tsconfig.base.json`: добавить path в `compilerOptions.paths`
  4. В `vitest.config.ts`: добавить test-алиас
  5. Обновить `src/index.ts` плагина:
     - `routes: [{ path: '/practice-cards', element: () => import('./PracticeCardsPage'), requires: 'user' }]`
     - `navItems: [{ section: 'practice', label: 'Карточки', to: '/practice-cards', icon: 'cards' }]`
- **Критерий готовности (DoD):**
  - Плагин появляется в навигации (секция «practice»)
  - Маршрут `/practice-cards` доступен
  - `typecheck` + `lint` проходят без ошибок границ (boundaries)
- **Зависит от задач:** T-008 (нужен entry-point PracticeCardsPage)
- **Статус:** 🔴 Запланировано

### T-010. Ручной ввод DSL в мастере

- **Родительская функция:** 3.6 Ручной ввод прогрессий (DSL-режим)
- **Приоритет:** P1
- **Сложность:** S (1–2d)
- **Слой:** plugins
- **Плагин / Модуль:** `practice-cards/src/components/StepChordConfig.tsx`
- **Описание:**
  Встроить DSL-режим в существующий `StepChordConfig`:
  1. При выборе `source.type === 'dsl'` — показать текстовое поле (`<textarea>`)
  2. Валидация на лету: при каждом изменении вызывать `parseGrid(dslText)` из `@jazz/music-core`
  3. При успешном парсинге — зелёная рамка, показывать распарсенные аккорды под полем
  4. При ошибке — красная рамка, сообщение об ошибке под полем
  5. Парсить `GridContent` при переходе к шагу 3 и при «Старт»
  6. Показывать пример DSL-формата под полем: `| Dm7 G7 | Cmaj7 | ...`
- **Критерий готовности (DoD):**
  - DSL парсится корректно для валидных прогрессий
  - Ошибки парсинга подсвечиваются
  - Упражнение запускается с DSL-прогрессией
  - `typecheck` + `lint` проходят
- **Зависит от задач:** T-006 (StepChordConfig уже реализован)
- **Статус:** 🔴 Запланировано

### T-011. Сохранение пользовательских настроек

- **Родительская функция:** 4.1 Интеграция пользовательских настроек
- **Приоритет:** P1
- **Сложность:** S (1–2d)
- **Слой:** plugins + shared + api
- **Плагин / Модуль:** `practice-cards/src/`, `@jazz/shared`, `apps/api`
- **Описание:**
  1. Добавить поле `practiceCards` в `UserSettingsDTO` в `packages/shared/src/dto.ts`:
     ```ts
     practiceCards?: {
       lastExerciseType?: 'chords' | 'scales';
       lastSource?: 'pattern' | 'random' | 'dsl';
       lastPatternId?: string;
       lastKeys?: Key[];
       lastTempo?: number;
       lastRepetitions?: number;
       lastInfinite?: boolean;
       cardMode?: CardMode;
       countInBars?: number;
       backingBass?: boolean;
       backingDrums?: boolean;
       backingPiano?: boolean;
       backingRhodes?: boolean;
       metronomeEnabled?: boolean;
       metronomeVolume?: number;
     };
     ```
  2. В `ExerciseWizard` (шаг 2):
     - При загрузке: читать `useSettings().practiceCards` для заполнения дефолтных значений полей
     - При «Старт» / «Быстрый старт»: сохранять текущие значения через `useUpdateSettings()`
  3. Проверить, что `PATCH /api/settings` принимает новые поля (если Zod-валидация на бэке — расширить схему)
- **Критерий готовности (DoD):**
  - Настройки сохраняются при старте упражнения
  - При повторном входе в wizard — поля заполнены предыдущими значениями
  - `typecheck` + `lint` проходят
- **Зависит от задач:** T-002 (типы), T-006 (wizard)
- **Статус:** 🔴 Запланировано

### T-012. Юнит-тесты генераторов

- **Родительская функция:** T-003, T-004 (покрытие тестами)
- **Приоритет:** P1
- **Сложность:** M (3–5d)
- **Слой:** plugins
- **Плагин / Модуль:** `practice-cards/src/generators/__tests__/`
- **Описание:**

  **`chordExercise.test.ts`:**
  1. Тест: `source.type === 'pattern'` с `patternId: 'ii-V-I-major'` → корректный `PracticeBar[]`
  2. Тест: `source.type === 'random'` с `key: 'C'` → диатонические аккорды в C
  3. Тест: `source.type === 'dsl'` с `dsl: '| Dm7 G7 | Cmaj7 |'` → 3 PracticeBar с правильными chords
  4. Тест: множественные тональности `keys: ['C', 'F']` → прогрессия транспонирована
  5. Тест: `repetitions: 3` → массив ×3
  6. Тест: `infinite: true` → массив однократный (не зациклен)
  7. Тест: ошибка парсинга DSL → выброс исключения

  **`scaleExercise.test.ts`:**
  1. Тест: `standalone`, `scaleType: 'major'`, `direction: 'both'`, `octaves: 1` → 2 PracticeBar с direction up/down
  2. Тест: `standalone`, `octaves: 2`, `direction: 'both'` → 4 PracticeBar
  3. Тест: `over-chords` с ii-V-I → Dm7="D дорийский", G7="G миксолидийский", Cmaj7="C мажор"
  4. Тест: `over-chords` с multiple keys → транспонирование + лады
  5. Тест: функция `chordDegreeToScale` для всех 7 ступеней

- **Критерий готовности (DoD):** Все тесты зелёные, покрытие генераторов >90%
- **Зависит от задач:** T-003, T-004
- **Статус:** 🔴 Запланировано

### T-013. Компонентные тесты

- **Родительская функция:** T-005, T-006, T-007, T-008 (покрытие тестами)
- **Приоритет:** P1
- **Сложность:** M (3–5d)
- **Слой:** plugins
- **Плагин / Модуль:** `practice-cards/src/components/__tests__/`
- **Описание:**

  **`CardDisplay.test.tsx`:**
  1. Тест: `mode='current'` — рендерится 1 карточка с правильным символом аккорда
  2. Тест: `mode='prev-current'` — рендерятся 2 карточки (prev + current)
  3. Тест: `mode='prev-current-next'` — рендерятся 3 карточки
  4. Тест: `currentIndex=0` (нет prev) — карточка prev не рендерится
  5. Тест: `currentIndex=last` (нет next) — карточка next не рендерится
  6. Тест: multi-chord bar `chords=["Dm7", "G7"]` — отображаются оба символа
  7. Тест: смена `currentIndex` — анимация запускается (проверить классы CSS)

  **`ExerciseWizard.test.tsx`:**
  1. Тест: stepper показывает шаги 1→2→3, хайлайт корректный
  2. Тест: выбор «Аккорды» на шаге 1 → шаг 2 показывает StepChordConfig
  3. Тест: выбор «Гаммы» на шаге 1 → шаг 2 показывает StepScaleConfig
  4. Тест: заполнение формы → шаг 3 показывает превью
  5. Тест: кнопка «Старт» → вызывает колбэк с config + bars
  6. Тест: «Быстрый старт» → запуск с дефолтами

  **`ExerciseRunner.test.tsx`:**
  1. Тест с замоканным `usePluginTransport`: рендерит `CardDisplay` + `PlayerToolbar`
  2. Тест: `status='idle'` после playing → вызывает `onComplete`
  3. Тест: `infinite: true` — `onComplete` не вызывается при завершении цикла
  4. Тест: счётчик тактов показывает «Такт 3 из 12»
  5. Тест: инструменты отключены (`backingBass: false`) → громкость баса = 0

- **Критерий готовности (DoD):** Все тесты зелёные, покрытие компонентов >80%
- **Зависит от задач:** T-005, T-006, T-007, T-008
- **Статус:** 🔴 Запланировано

### T-014. Финальная верификация

- **Родительская функция:** все (инфраструктурная)
- **Приоритет:** P0
- **Сложность:** S (1–2d)
- **Слой:** plugins + web
- **Плагин / Модуль:** все
- **Описание:**
  1. Прогнать `npm run typecheck` — весь проект, без ошибок
  2. Прогнать `npm run lint` — без ошибок, особенно правило `boundaries/dependencies`
  3. Прогнать `npm run test` — все существующие + новые тесты зелёные
  4. Ручное функциональное тестирование по чек-листу из метрик успеха (`EXERSISE-VISION.md §7`):
     - Wizard проходится за <60 секунд
     - Карточки сменяются синхронно с началом такта
     - Аккомпанемент играет в выбранном стиле и темпе
     - Отключение всех инструментов — только метроном
     - Счётчик тактов корректен (в т.ч. «∞»)
     - Переключение режима карточек (1/2/3) работает
     - DSL-ввод парсится
     - Множественные тональности — последовательное проигрывание
     - Панель плеера переиспользована
     - Экран завершения показывает корректные данные
  5. Проверить, что существующие тесты `music-core/generator`, `music-core/dsl`, `core-player` не затронуты и зелёные
- **Критерий готовности (DoD):** Все проверки пройдены, багов P0 нет
- **Зависит от задач:** все предыдущие
- **Статус:** 🔴 Запланировано

---

## 2. Последовательность (Ordering)

Рекомендуемый порядок выполнения с учётом зависимостей:

```
Фаза 1: Фундамент (дни 1–2)
─────────────────────────
T-001 → T-002
  └─ Создание пакета + все типы

Фаза 2: Ядро (дни 2–8)
─────────────────────────
T-003 (chordExercise)    ───┐
T-005 (CardDisplay)      ───┤ параллельно
                            │
Фаза 3: Мастер (дни 8–16)  │
─────────────────────────   │
T-004 (scaleExercise)   ─┐  │
T-006 (Wizard)          ─┤──┘ (T-006 ждёт T-003 для превью)
                         │
Фаза 4: Интеграция (дни 16–21)
──────────────────────────────
T-007 (Runner)          ─┐
T-008 (Page+Complete)   ─┤ последовательно (T-008 ждёт T-007)
                         │
Фаза 5: Подключение (день 21)
──────────────────────────────
T-009 (Регистрация)

Фаза 6: Допиливание (дни 22–25)
────────────────────────────────
T-010 (DSL)             ───┐
T-011 (Settings)        ───┤ параллельно
                            │
Фаза 7: Качество (дни 25–30) │
─────────────────────────    │
T-012 (Generator tests) ─┐   │
T-013 (Component tests) ─┤───┘ параллельно
                          │
Фаза 8: Выпуск (дни 30–32)
──────────────────────────
T-014 (Верификация)
```

---

## 3. Оценка суммарной трудоёмкости

| Сложность | Количество | Задачи                                          |
| --------- | ---------- | ----------------------------------------------- |
| XS (<1d)  | 2          | T-001, T-009                                    |
| S (1–2d)  | 4          | T-002, T-010, T-011, T-014                      |
| M (3–5d)  | 7          | T-003, T-004, T-005, T-007, T-008, T-012, T-013 |
| L (1–2w)  | 1          | T-006                                           |
| XL (>2w)  | 0          | —                                               |

**Суммарно (соло):**

- XS: 2 × 0.5d = 1d
- S: 4 × 1.5d = 6d
- M: 7 × 4d = 28d
- L: 1 × 8d = 8d
- **Итого: ~43 рабочих дня ≈ 8.5 недель (соло)**

**С учётом параллелизации (2 разработчика):**

- Критический путь: T-001 → T-002 → T-003 → T-006 → T-007 → T-008 → T-009 → T-014
  = 0.5 + 1.5 + 4 + 8 + 4 + 4 + 0.5 + 1.5 = 24d ≈ **5 недель**
- Параллельно на втором разработчике: T-005, T-004, T-010, T-011, T-012, T-013
- **Оценка: 4–5 недель с 2 разработчиками** — соответствует горизонту VISION (3–4 недели с запасом)

---

## 4. Критические пути

**Главный критический путь** (блокирует запуск плагина):

```
T-001 → T-002 → T-003 → T-006 → T-007 → T-008 → T-009 → T-014
```

- **T-003 (chordExercise)** — блокирует T-006 (Wizard не может показать превью)
- **T-006 (Wizard)** — самый объёмный компонент, блокирует T-007 (Runner получает config от Wizard)
- **T-007 (Runner)** — блокирует T-008 (Page использует Runner)
- **T-008 (Page)** — блокирует T-009 (регистрация требует entry-point)

**Вторичный путь** (не блокирует запуск, но нужен для полного MVP):

```
T-004 (scaleExercise) → T-006 (StepScaleConfig)
```

- Может выполняться параллельно с T-006 (мастер может работать с chord-упражнениями без scaleExercise)

**Пути без зависимостей от критического** (можно делать параллельно):

- T-005 (CardDisplay) — после T-002, параллельно с T-003
- T-010 (DSL), T-011 (Settings) — после T-006, параллельно с T-007/T-008
- T-012 (Generator tests) — после T-003/T-004, параллельно с T-007+
- T-013 (Component tests) — после T-005/T-006/T-007, в конце

---

_Документ создан 2026-06-15. Декомпозирует функции из EXERSISE-VISION.md на задачи, опираясь на техническую архитектуру из EXERSISE-ARCHITECTURE.md._
