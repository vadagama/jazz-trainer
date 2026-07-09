# План работ — Drum Sections (Связка секций сетки с барабанными клетками)

**На основе:** `docs/DRUMS-SECTIONS-VISION.md` v1.0
**Дата:** 2026-07-05
**Статус:** 🟢 Этап A + B выполнены, Этап C (T-011, T-012) выполнен

## 1. Задачи (Tasks)

### T-001. Перепроектировать тип DrumOrganism (v3)

- **Родительская функция:** §3.1 Новый DrumOrganism
- **Приоритет:** P0 — блокирует все остальные задачи
- **Сложность:** S (1–2d)
- **Слой:** music-core + shared
- **Модуль:** `packages/music-core/src/audio/drumPatternTypes.ts`, `packages/shared/src/drums.ts`
- **Описание:**
  - Добавить `interface DrumOrganismV3` с полями `sectionMap`, `timeSignatureOverrides?`, `defaultForm?` (рядом с существующим `DrumOrganism`, без удаления старого).
  - `sectionMap: Partial<Record<SectionType, string[]>>`.
  - `timeSignatureOverrides?: Record<string, Partial<Record<SectionType, string[]>>>`.
  - `defaultForm?: OrganismSection[]` — обратная совместимость для flat-режима.
  - `OrganismSection` определяется **локально** в `packages/music-core/src/audio/drumPatternTypes.ts:146` (не импортируется из shared). Из `@jazz/shared` импортируется только `SectionType` (уже импортирован в `drumPatternTypes.ts:1`).
  - Zod-схема `DrumOrganismV3Schema` в `shared/src/drums.ts`: валидация sectionMap (ключи — валидные SectionType), валидация timeSignatureOverrides (ключи — валидные размеры).
  - Экспортировать `DrumOrganismV3` и `DrumOrganismV3DTO` типы.
- **Критерий готовности (DoD):** typecheck + lint + test (схема принимает/отклоняет корректно). Старый `DrumOrganism` не сломан.
- **Зависит от задач:** —
- **Статус:** 🔴 Запланировано

### T-002. Функция миграции старых организмов

- **Родительская функция:** §3.5 Обратная совместимость
- **Приоритет:** P0 — без неё 6 существующих организмов сломаны
- **Сложность:** XS (<1d)
- **Слой:** music-core
- **Модуль:** `packages/music-core/src/audio/drumOrganisms.ts`
- **Описание:**
  - Функция `migrateOrganism(old: DrumOrganism): DrumOrganismV3`.
  - Группирует `old.sections` по `type` → собирает уникальные cellId в `sectionMap[type]`.
  - Копирует исходные `sections` в `defaultForm` для flat-режима.
  - Сохраняет `id`, `style`, `label`, `weight`.
  - **Подшаг (M5): unit-тест миграции v2 → v3** — живёт в music-core (рядом с `migrateOrganism`), т.к. shared не должен зависеть от music-core. Тест: `swing-flat-16` → `sectionMap.verseA` содержит уникальные cellId, `defaultForm` сохраняет исходные секции с `repeats`.
- **Критерий готовности (DoD):** typecheck + lint + unit-тест миграции (swing-flat-16 → sectionMap с verseA, defaultForm сохранён). Тест миграции выполняется в music-core, не в shared.
- **Зависит от задач:** T-001
- **Статус:** 🔴 Запланировано

### T-003. Обновить 6 базовых организмов на v3-формат

- **Родительская функция:** §3.1 Новый DrumOrganism
- **Приоритет:** P1 — рабочие организмы нужны для тестирования scheduling
- **Сложность:** S (1–2d)
- **Слой:** music-core
- **Модуль:** `packages/music-core/src/audio/drumOrganisms.ts`, `packages/music-core/src/audio/drumOrganismsGenerated.ts`
- **Описание:**
  - Конвертировать `swing-flat-16`, `swing-brushes-form`, `bossa-flat-16`, `funk-flat-16`, `latin-flat-16`, `ballad-flat-16` в v3 через `migrateOrganism()`.
  - **Использовать только существующие клетки** (см. T-011 для новых): на этом этапе доступны `swing-16-verse`, `swing-16-bridge`, `swing-16-brushes`, `swing-16-brushes-comp`, `bossa-16-verse`, `funk-16-verse`, `latin-16-verse`, `ballad-16-verse` и т.д. **Не ссылаться** на несозданные `swing-16-comp/intro/ending/solo/chorus` — они появятся в T-011 и будут прилинкованы к `sectionMap` отдельным подшагом в T-011.
  - Для `swing-brushes-form`: sectionMap с verseA/bridge/verseB из `swing-16-brushes`, `swing-16-bridge`, `swing-16-brushes-comp`; `defaultForm` сохраняет AABA последовательность.
  - `DRUM_ORGANISMS` реестр теперь типизирован как `Record<string, DrumOrganismV3>`.
  - `getOrganismsForStyle()` возвращает `DrumOrganismV3[]`.
  - **Подшаг (C1): обновить `drumOrganismsGenerated.ts`.** В текущем репозитории `GENERATED_DRUM_ORGANISMS` содержит 5 организмов (без `swing-brushes-form`) и **полностью замещает** `BASE_DRUM_ORGANISMS` (`drumOrganisms.ts:128-135`). Поэтому регенерировать generated-файл так, чтобы он включал все 6 организмов v3 — иначе `swing-brushes-form` останется недоступен в рантайме.
- **Критерий готовности (DoD):** typecheck + lint, миграция не теряет данные. `getOrganismsForStyle('swing')` возвращает **2** организма (`swing-flat-16`, `swing-brushes-form`) — проверка идёт через итоговый экспорт `DRUM_ORGANISMS` (generated), а не через `BASE_DRUM_ORGANISMS`. Если generated не обновлён — DoD невыполним.
- **Зависит от задач:** T-002
- **Статус:** 🔴 Запланировано

### T-004. DrumPatternEngine: resolveSectionCells и выбор клетки

- **Родительская функция:** §3.2 Алгоритм воспроизведения, §3.4 Резолв time signature
- **Приоритет:** P0 — ядро новой логики
- **Сложность:** S (1–2d)
- **Слой:** music-core
- **Модуль:** `packages/music-core/src/audio/drumPatternEngine.ts`
- **Описание:**
  - Метод `resolveSectionCells(organism, sectionType, timeSignatureStr): string[]` — трёхуровневый фолбэк: timeSignatureOverrides → sectionMap → verseA.
  - Метод `selectCellForSectionType(organism, sectionType, timeSignature, barInSection, seed): { cell: DrumCell; barInCell: number }`:
    - Получает cellPool через `resolveSectionCells`.
    - Если pool пуст — fallback на любую клетку стиля.
    - Вычисляет `cellIndex = floor(barInSection / cellLength) % pool.length` (cycling).
    - `barInCell = barInSection % cellLength`.
    - Детерминированный seed для воспроизводимости.
  - Обновить сигнатуру `selectOrganism()` — принимать `DrumOrganismV3`.
  - Устаревший `selectCellForSection(section: OrganismSection, …)` пометить `@deprecated`.
- **Критерий готовности (DoD):** typecheck + lint + unit-тест: pool из 2 клеток cycling каждые cell.length тактов; fallback на verseA; timeSignatureOverride приоритетнее sectionMap.
- **Зависит от задач:** T-001, T-003
- **Статус:** 🔴 Запланировано

### T-005. DrumInstrument: новый scheduling с grid-секциями

- **Родительская функция:** §3.2 Алгоритм воспроизведения, §3.3 Стратегия вариативности, §3.4 Резолв time signature
- **Приоритет:** P0 — центральная задача
- **Сложность:** M (3–5d)
- **Слой:** music-core
- **Модуль:** `packages/music-core/src/audio/drumInstrument.ts`
- **Описание:**
  - Новое поле `private gridSections: Section[] | null = null`.
  - Метод `setGridSections(sections: Section[] | null): void` — сохраняет секции, вызывает `invalidateBarLayout()`.
  - Удалить `barLayout: BarSlot[]` и `buildBarLayout()` (больше не нужны).
  - Удалить `resolveBar()` (заменяется на section-driven resolve).
  - Новый приватный метод `resolveBarSlot(absoluteBar: number, ctx: ScheduleContext): BarSlot | null`:
    - `absoluteBar` вычисляется **внутри** `DrumInstrument` из `window.fromTicks`: `Math.floor(window.fromTicks / tpBar)` (как сегодня, `drumInstrument.ts:265-266`). Поле `absoluteBar` не передаётся извне — его нет ни в `ScheduleWindow` (`{fromTicks, toTicks}`), ни в `ScheduleContext`. Альтернативно — использовать `ctx.barInSection`, если T-006 пробрасывает его.
    - Если `gridSections` есть: найти секцию по `absoluteBar` (по `flatBarIndex`), определить `barInSection`.
    - Если `gridSections` нет: использовать `organism.defaultForm` как раньше.
    - Вызвать `patternEngine.selectCellForSectionType(...)`.
  - Переработать `scheduleOrganism()`: заменить `this.resolveBar(bar)` на `this.resolveBarSlot(bar, ctx)`.
  - `selectOrganismForStyle()` — больше не строит `barLayout` (только выбирает организм).
  - Обработка `ScheduleContext.gridSectionType` и `ScheduleContext.barInSection` (если TransportEngine уже пробросил — использовать; иначе вычислить самостоятельно).
  - **Подшаг (C5): ослабить гейт `is44`** (`drumInstrument.ts:223-231`). Сегодня organism-path активируется только при `beatsPerBar === 4 && beatUnit === 4`, иначе — `scheduleDegradedSwing`. Расширить условие так, чтобы organism-path работал для размеров, представленных в `organism.timeSignatureOverrides` (минимум 3/4), и_FALLBACK_ на degraded swing только когда клеток для размера действительно нет. Без этого `timeSignatureOverrides['3/4']` и waltz-клетки (T-012) никогда не зазвучат.
- **Критерий готовности (DoD):** typecheck + lint + test:
  - Одна секция, 2 клетки → cycling.
  - Три секции → правильная маршрутизация.
  - Flat-режим (без sections) → defaultForm.
  - Смена gridSections на лету (остановка → новые секции → запуск).
  - При размере 3/4 с `timeSignatureOverrides['3/4']` — organism-path используется (не degraded swing).
- **Зависит от задач:** T-004
- **Статус:** 🔴 Запланировано

### T-006. TransportEngine: проброс sectionType в ScheduleContext

- **Родительская функция:** §3.6 Интеграция с TransportEngine
- **Приоритет:** P1 — улучшает архитектуру, но DrumInstrument может вычислить сам
- **Сложность:** S (1–2d)
- **Слой:** music-core
- **Модуль:** `packages/music-core/src/audio/transportEngine.ts`, `packages/music-core/src/audio/instrument.ts`
- **Описание:**
  - Расширить `ScheduleContext` в `instrument.ts`:
    ```typescript
    export interface ScheduleContext {
      // ...existing fields
      /** Тип секции сетки для текущего такта (если сетка имеет sections). */
      gridSectionType?: import('@jazz/shared').SectionType;
      /** Индекс такта внутри секции, 0-based. */
      barInSection?: number;
    }
    ```
  - `TransportEngine` получает новое поле `private sections: Section[] | null = null` и метод `setSections(sections: Section[] | null)`.
  - В `scheduleWindow()`: перед итерацией инструментов вычислить `currentSection` по `positionTicks` → `absoluteBar`, найти секцию, содержащую этот бар. Заполнить `ctx.gridSectionType`, `ctx.barInSection`.
  - Интеграция с `UseTransportOptions.sections` (уже есть в `plugin-sdk/src/transport.ts`).
  - В `useTransport` (web) — пробросить `sections` в `TransportEngine.setSections()`.
- **Критерий готовности (DoD):** typecheck + lint + test: `TransportEngine.setSections([...])` → `scheduleWindow` пробрасывает корректный `gridSectionType` каждому инструменту.
- **Зависит от задач:** T-005 (может идти параллельно)
- **Статус:** 🔴 Запланировано

### T-007. Выбор организма через существующее поле `drumsPattern`

- **Родительская функция:** §4.1 Настройки барабанов — переориентация существующего выбора
- **Приоритет:** P1 — пользовательский выбор
- **Сложность:** XS (<1d)
- **Слой:** music-core
- **Модуль:** `packages/music-core/src/audio/drumInstrument.ts`
- **Описание:**
  - **Не вводить новое поле `organismId`.** В `UserSettingsDTO` уже есть `drumsPattern: z.string().nullable().optional()` (`packages/shared/src/dto.ts:75`), хранящее id выбранного организма. Этот механизм **переиспользуется** для v3.
  - В `selectOrganismForStyle()`: если `settings.drumsPattern` (или эквивалентный канал передачи organism id из `UserSettingsDTO`) задан и валиден — использовать `DRUM_ORGANISMS[settings.drumsPattern]` (явный выбор). Иначе — `patternEngine.selectOrganism()` (Auto, взвешенный выбор).
  - Валидация: если organism id не существует в `DRUM_ORGANISMS` — fallback на Auto + `console.warn`.
  - Согласовать канал доставки: убедиться, что `DrumInstrument` получает текущее значение `drumsPattern` из `UserSettingsDTO` (через тот же путь, что и `drumsVolume`/`drumKit`).
- **Критерий готовности (DoD):** typecheck + lint, `drumsPattern='swing-brushes-form'` → выбирается явно, `drumsPattern=null` → Auto. Существующий UI выбора организма (`DrumsTile`) продолжает работать без изменений.
- **Зависит от задач:** T-003
- **Статус:** 🔴 Запланировано

### T-008. UI: переориентация выпадающего списка организмов под v3

- **Родительская функция:** §4.1 Настройки барабанов — переориентация существующего выбора
- **Приоритет:** P1 — пользовательский UX
- **Сложность:** S (1–2d)
- **Слой:** plugins (core-settings)
- **Модуль:** `packages/plugins/core-settings/src/InstrumentTile.tsx` (функция `DrumsTile`, строки ~207–277)
- **Описание:**
  - **Существующий UI.** Выпадающий список организмов **уже реализован** в `DrumsTile` (`InstrumentTile.tsx:227-272`): список формируется из `getOrganismsForStyle(style)`, значение хранится в `drumsPattern` (`UserSettingsDTO`).
  - В рамках v3 минимально адаптировать существующий UI: убедиться, что список отображает организмы v3 (с обновлёнными `label`) и использует тот же канал сохранения (`useSettings()`/`useUpdateSettings()` из `@jazz/plugin-sdk`, **не** `apiClient` напрямую).
  - Опция Auto = `drumsPattern = null/undefined` (дефолтный организм стиля).
  - При смене стиля — сброс на Auto (id организма привязан к стилю; сохранение последнего выбора per-style не делаем — проще).
  - Лейблы организмов из `organism.label`.
  - **Не создавать** новую компоненту `DrumSettings` — её не существует; правки идут в `DrumsTile`.
- **Критерий готовности (DoD):** typecheck + lint, выбор организма в `DrumsTile` → применяется к звуку (через v3 organism), сохранение через `useUpdateSettings` → переживает перезагрузку.
- **Зависит от задач:** T-007
- **Статус:** 🔴 Запланировано

### T-009. API: сохранение выбора организма через существующее поле `drumsPattern`

- **Родительская функция:** §4.1 Настройки
- **Приоритет:** P2 — поле уже есть в DTO, нужна только корректная обработка в PATCH
- **Сложность:** XS (<1d)
- **Слой:** api + shared
- **Модуль:** `packages/shared/src/dto.ts`, `apps/api/src/routes/settings.routes.ts`
- **Описание:**
  - **Не вводить новое поле.** В `UserSettingsDTOSchema` уже есть `drumsPattern: z.string().nullable().optional()` (`packages/shared/src/dto.ts:75`). Все drum-поля в DTO **плоские с префиксом** `drums*`/`drum*` (`drumsVolume`, `drumKit`, `drumsPattern`), а не sub-object `drums.{...}` — новый контрол нужно оформлять в той же плоской схеме.
  - **M4 — PATCH-маршрут:** в `apps/api/src/routes/settings.routes.ts` PATCH-обработчик сейчас обрабатывает поимённо `drumsEnabled`/`drumsVolume`/`drumKit` (около строк 72-75), но **явной строки для `drumsPattern` нет**. Добавить поимённую обработку `drumsPattern` (как для `drumKit`) — иначе выбор организма не сохранится как scalar в `perStyleOverrides[currentStyle]` (см. PER_STYLE_FIELDS, ~строки 102-127).
  - Валидация значения: при необходимости проверить, что `drumsPattern` (если не null) — валидный id из `DRUM_ORGANISMS`. На уровне DTO оставить как `z.string().nullable().optional()` (валидация id может идти в service-слое).
- **Критерий готовности (DoD):** typecheck + lint, сохранение/загрузка `drumsPattern` через API работает (PATCH сохраняет, GET возвращает), значение синхронизируется в `perStyleOverrides[currentStyle]`.
- **Зависит от задач:** T-007
- **Статус:** 🔴 Запланировано

### T-010. Обновить Конструктор барабанов под v3-организмы

- **Родительская функция:** §3.5 Обратная совместимость
- **Приоритет:** P2 — админский инструмент, не блокирует пользователей
- **Сложность:** M (3–5d)
- **Слой:** plugins (admin-drum-constructor)
- **Модуль:** `packages/plugins/admin-drum-constructor/`
- **Описание:**
  - UI редактирования организма: sectionMap (таблица SectionType → cellPool с multi-select).
  - UI timeSignatureOverrides: опциональная секция «Размеры» с выпадающим списком размеров и per-size sectionMap.
  - Сохранение через `POST /api/dev/drum-source` — обновить Zod-схему на `DrumOrganismV3Schema`.
  - API `dev.routes.ts`: принимать v3-формат, записывать в `drumOrganismsGenerated.ts`.
  - При загрузке старых данных — авто-миграция через `migrateOrganism()` перед отображением.
  - Валидация: проверить, что все cellId в sectionMap существуют в `DRUM_CELLS`.
- **Критерий готовности (DoD):** typecheck + lint + test (shared/drums.test.ts — v3 схема). Конструктор создаёт/редактирует v3-организмы.
- **Зависит от задач:** T-001, T-002
- **Статус:** 🔴 Запланировано

### T-011. Новые клетки: swing — все SectionType (4/4)

- **Родительская функция:** §6.1 Swing Standard
- **Приоритет:** P1 — без них sectionMap неполный
- **Сложность:** M (3–5d) — 4–5 новых клеток по ~3h каждая
- **Слой:** music-core (контент)
- **Модуль:** `packages/music-core/src/audio/drumCells.ts` + `drumCellsGenerated.ts`
- **Описание:**
  - Создать через Конструктор (или вручную) недостающие swing-клетки:
    - `swing-16-intro` (8–16т, разреженный groove, нарастающая динамика)
    - `swing-16-ending` (8–16т, ritardando-подобный фил + crash)
    - `swing-16-chorus` (16т, более плотный/громкий компинг)
    - `swing-16-solo` (16т, минималистичный — не мешает солисту)
    - `swing-16-comp` (16т, более активный snare-компинг для вариативности)
  - Каждая клетка: валидация `validateCell()`, weight > 0.
  - Стиль: `'swing'`, timeSignature: `[4, 4]`.
  - Использовать существующие молекулы где возможно; создать новые там где нужно.
  - **Подшаг (разрывает цикл с T-003): после создания `swing-16-comp` прилинковать его к `swing-flat-16.sectionMap.verseA`** (в `drumOrganismsGenerated.ts`/`drumOrganisms.ts`) — `verseA: ['swing-16-verse', 'swing-16-comp']` для вариативности. В T-003 эта клетка не упоминалась, т.к. её ещё не существовало.
- **Критерий готовности (DoD):** validateCell() проходит для каждой клетки. typecheck + lint. Клетки заиграны и проверены на слух.
- **Зависит от задач:** T-003 (нужны организмы чтобы понять какие клетки требуются)
- **Статус:** 🔴 Запланировано

### T-012. Новые клетки: swing waltz (3/4)

- **Родительская функция:** §6.1 Swing Standard (timeSignatureOverrides)
- **Приоритет:** P2 — 3/4 не основная функциональность
- **Сложность:** M (3–5d) — 3–4 клетки, каждая требует нового groove в 3/4
- **Слой:** music-core (контент)
- **Модуль:** `packages/music-core/src/audio/drumCells.ts` + `drumCellsGenerated.ts`
- **Описание:**
  - Создать swing-waltz клетки (12 тактов, timeSignature: `[3, 4]`):
    - `swing-waltz-12-verse`
    - `swing-waltz-12-bridge`
    - `swing-waltz-12-chorus`
  - Waltz-грув: kick на 1, snare/ride на 2–3, характерный «oom-pah-pah».
  - Применить swing к offbeat восьмым.
  - Валидация `validateCell()`.
  - **⚠️ Предусловие (C5):** waltz-клетки **не заиграют**, пока в T-005 не ослаблен гейт `is44` (`drumInstrument.ts:223-231`). Сегодня для 3/4 инструмент падает в `scheduleDegradedSwing`, игнорируя `timeSignatureOverrides` и клетки. Завершать T-012 имеет смысл только после правки T-005 — иначе клетки валидны, но не используются.
- **Критерий готовности (DoD):** validateCell() + typecheck + lint. Заиграно в 3/4 на слух (требует завершённого T-005).
- **Зависит от задач:** T-011, **T-005 (ослабление гейта is44 — обязательно)**
- **Статус:** 🔴 Запланировано

### T-013. Новые клетки: bossa, funk, latin, ballad — расширенный набор

- **Родительская функция:** §6.3 Bossa Standard + аналоги для остальных стилей
- **Приоритет:** P2 — основной swing работает, остальные стили догоняют
- **Сложность:** L (1–2w) — 4 стиля × 4–5 клеток = ~18 клеток
- **Слой:** music-core (контент)
- **Модуль:** `packages/music-core/src/audio/drumCells.ts` + `drumCellsGenerated.ts`
- **Описание:**
  - Для каждого стиля (bossa, funk, latin, ballad) создать клетки:
    - verseA (уже есть), verseA-var (вариативность)
    - bridge
    - chorus
    - solo
    - intro (опционально для funk)
    - ending (опционально)
  - Приоритет внутри задачи: bossa → funk → ballad → latin.
  - Каждая клетка: стиль-специфичный groove, корректные молекулы, validateCell().
  - Обновить организмы: sectionMap включает все созданные клетки.
  - **⚠️ Предусловие для latin:** `DrumInstrument.STYLE_TO_PATTERN` мапит `latin → bossa` pattern (`drumInstrument.ts:148-154`). Пока этот маппинг не исправлен, latin-клетки могут фактически не использоваться organism-path. Как часть задачи (или отдельным подшагом) — проверить/исправить маппинг, чтобы `latin`-стиль резолвился в latin-клетки.
- **Критерий готовности (DoD):** validateCell() для всех. typecheck + lint. Заиграно per-стиль.
- **Зависит от задач:** T-011
- **Статус:** 🔴 Запланировано

### T-014. Тесты: DrumPatternEngine + resolveSectionCells

- **Родительская функция:** §9 Метрики успеха
- **Приоритет:** P1
- **Сложность:** S (1–2d)
- **Слой:** music-core
- **Модуль:** `packages/music-core/src/audio/drumPatternEngine.test.ts`
- **Описание:**
  - Тест: `resolveSectionCells` с sectionMap — возвращает правильный pool для verseA.
  - Тест: фолбэк на verseA для неизвестного SectionType.
  - Тест: timeSignatureOverride приоритетнее sectionMap.
  - Тест: pool из 2 клеток — cycling `cellIndex = floor(barInSection / cell.length) % 2`.
  - Тест: pool из 1 клетки — всегда она.
- **Критерий готовности (DoD):** 5+ тестов, все зелёные.
- **Зависит от задач:** T-004
- **Статус:** 🔴 Запланировано

### T-015. Тесты: DrumInstrument grid-section-driven scheduling

- **Родительская функция:** §9 Метрики успеха
- **Приоритет:** P1
- **Сложность:** M (3–5d)
- **Слой:** music-core
- **Модуль:** `packages/music-core/src/audio/drumInstrument.test.ts`
- **Описание:**
  - Тест: одна секция verseA, 2 клетки в пуле → такты 1..cell.length играют первую клетку, затем переключение.
  - Тест: три секции (verseA → bridge → verseA) → правильная маршрутизация, barInCell сбрасывается на границах.
  - Тест: flat-режим (gridSections = null) → defaultForm используется.
  - Тест: явный выбор организма через settings.organismId.
  - Тест: смена gridSections на лету (остановка → setGridSections → запуск).
  - Тест: fallback на verseA для секции с неизвестным SectionType.
- **Критерий готовности (DoD):** 6+ тестов, все зелёные. Существующие тесты не сломаны.
- **Зависит от задач:** T-005
- **Статус:** 🔴 Запланировано

### T-016. Тесты: Zod-схема DrumOrganismV3

- **Родительская функция:** §9 Метрики успеха
- **Приоритет:** P1
- **Сложность:** S (1–2d)
- **Слой:** shared
- **Модуль:** `packages/shared/src/drums.test.ts`
- **Описание:**
  - Тест: валидный v3-организм принимается.
  - Тест: sectionMap с неизвестным SectionType — rejected.
  - Тест: timeSignatureOverrides с невалидным размером — rejected.
  - Тест: пустой sectionMap (без verseA) — accepted (полагаемся на runtime fallback).
  - **Примечание (M5):** тест миграции v2 → v3 сюда **не относится** — `migrateOrganism()` живёт в music-core (`drumOrganisms.ts`), а слой shared не должен зависеть от music-core. Тест миграции перенесён в T-002/T-014 (music-core).
- **Критерий готовности (DoD):** 4+ тестов (без теста миграции), все зелёные.
- **Зависит от задач:** T-001
- **Статус:** 🔴 Запланировано

### T-017. Тесты: TransportEngine проброс sectionType

- **Родительская функция:** §3.6 Интеграция с TransportEngine
- **Приоритет:** P1
- **Сложность:** S (1–2d)
- **Слой:** music-core
- **Модуль:** `packages/music-core/src/audio/transportEngine.test.ts`
- **Описание:**
  - Тест: `setSections([...])` → `scheduleWindow` пробрасывает `gridSectionType` и `barInSection` в `ScheduleContext`.
  - Тест: секция из 4 тактов → barInSection = 0,1,2,3.
  - Тест: пересечение границы секций → `gridSectionType` меняется, `barInSection` сбрасывается.
  - Тест: без sections → `gridSectionType` undefined.
- **Критерий готовности (DoD):** 4+ теста, все зелёные.
- **Зависит от задач:** T-006
- **Статус:** 🔴 Запланировано

### T-018. Документация: обновить docs/DRUMS.md

- **Родительская функция:** Сопроводительная документация
- **Приоритет:** P2
- **Сложность:** XS (<1d)
- **Слой:** docs
- **Модуль:** `docs/DRUMS.md`
- **Описание:**
  - Обновить §1 «Архитектура»: organism v3, sectionMap, timeSignatureOverrides.
  - Обновить диаграмму уровней: organism → sectionMap вместо sequence.
  - Добавить §1.3 «Связка с секциями сетки» — как organism адаптируется к форме.
  - Обновить changelog: v3 (2026-07): section-driven scheduling.
- **Критерий готовности (DoD):** Документ читается, диаграмма актуальна.
- **Зависит от задач:** T-005 (после реализации)
- **Статус:** 🔴 Запланировано

## 2. Последовательность (Ordering)

```
Этап A (ядро, блокирующее):  T-001 → T-002 → T-003 → T-004 → T-005
                              └─ T-016 (параллельно типам)

Этап B (интеграция):         T-006 → T-017
                              └─ T-007 → T-008 → T-009

Этап C (контент):            T-011 → T-012 → T-013

Этап D (тесты + фиксация):   T-014 → T-015
                              └─ T-010 (конструктор)
                              └─ T-018 (документация)
```

**Критический путь:** T-001 → T-002 → T-003 → T-004 → T-005 → T-015
Длина критического пути: ~9–14 рабочих дней.

**Параллельные треки:**
- Типы + миграция (T-001–T-003) могут идти параллельно с TransportEngine (T-006) — разные файлы.
- Контент (T-011–T-013) может идти параллельно с UI (T-008–T-009) — разные слои.
- Zod-тесты (T-016) — параллельно с T-001.

## 3. Оценка суммарной трудоёмкости

| Сложность | Количество | Задачи |
|---|---|---|
| XS (<1d) | 4 | T-002, T-007, T-009, T-018 |
| S (1–2d) | 8 | T-001, T-003, T-004, T-006, T-008, T-014, T-016, T-017 |
| M (3–5d) | 5 | T-005, T-010, T-011, T-012, T-015 |
| L (1–2w) | 1 | T-013 |
| **Итого** | **18 задач** | **~26–44 рабочих дней** (5–9 недель одним разработчиком) |

> **Примечание:** T-013 (L) — создание клеток для 4 стилей — самая объёмная задача. Может быть разделена на подзадачи по стилям и делегирована параллельно (bossa + funk + ballad + latin — 4 человека/агента одновременно). Без T-013: **~18–30 дней** (4–6 недель).

## 4. Критические пути

| Цепочка | Длина | Блокирует |
|---|---|---|
| T-001 → T-002 → T-003 → T-004 → T-005 → T-015 | 6 задач | Весь scheduling |
| T-001 → T-010 | 2 задачи | Конструктор |
| T-007 → T-008 → T-009 | 3 задачи | Пользовательский выбор |

---

*План создан на основе DRUMS-SECTIONS-VISION.md v1.0. Статусы обновляются по мере выполнения.*
