# План работ — AI-ассистент композиций (MVP)

**На основе:** AI-ASSISTANT-VISION.md (2026-07-25)
**Дата:** 2026-07-25
**Статус:** 🟢 Принято

## 1. Задачи (Tasks)

---

### Фаза 1: Фундамент — типы, схемы и AI-метаданные

Эти задачи не имеют зависимостей внутри MVP и могут выполняться параллельно. Создают основу, на которую опираются все остальные фазы.

---

#### T-001. Composition Plan DSL: типы и Zod-схема

- **Родительская функция:** 3.2 Composition Plan DSL
- **Приоритет:** P0
- **Сложность:** S (1–2d)
- **Слой:** `shared`
- **Пакет:** `packages/shared/`
- **Описание:**
  - Создать `src/ai/compositionPlan.ts` с типами:
    - `CompositionIntent` (title, style, mood, tempo, timeSignature, complexity, durationTargetBars, variationSeed, novelty)
    - `HarmonyPlan` (key, harmonicLanguage, progressionStrategy, tensionCurve)
    - `FormSection` (label, type, bars, energy)
    - `EnsembleRole` (role, instrumentPreference, behavior, density)
    - `ComplexityOverride` (relativeComplexity)
    - `CompositionPlan` (schemaVersion, intent, harmony, form, ensemble, complexity, overrides?)
  - Создать `src/ai/compositionPlan.schema.ts` — Zod-схема `CompositionPlanSchema`:
    - Все обязательные поля
    - `complexity` — enum 1–4
    - `energy` — 0.0–1.0
    - `timeSignature` — 4/4, 3/4, 2/4, 5/4, 6/8
    - `bars` — 2–64, кратно 2
    - `role` — harmony, bass, drums, percussion, guitar, melody, texture
    - `mood` — массив строк
    - Строгая проверка: `strict()` (лишние поля → ошибка)
  - Экспортировать типы и схему из `packages/shared/src/index.ts`
  - Экспортировать `CompositionPlan` тип и `CompositionPlanSchema` для использования в `music-core` и `apps/api`
- **Критерий готовности (DoD):**
  - Все типы покрыты Zod-схемой (`strict()`)
  - `CompositionPlanSchema.parse()` успешно валидирует пример из VISION §3.2
  - `CompositionPlanSchema.safeParse()` ловит ошибки: невалидный complexity, лишние поля, отсутствующие обязательные
  - `typecheck` + `lint` + `test` — зелёные
- **Зависит от задач:** нет
- **Статус:** 🔴 Запланировано

---

#### T-002. AI-метаданные: StyleProfile

- **Родительская функция:** 4.1 Расширение StyleProfile для AI
- **Приоритет:** P0
- **Сложность:** XS (<1d)
- **Слой:** `music-core`
- **Модуль:** `packages/music-core/src/styleProfile.ts`
- **Описание:**
  - Добавить в `StyleProfile` поля:
    - `aiDescription: string` — текстовое описание стиля для AI (1–2 предложения)
    - `musicalTraits: string[]` — ключевые музыкальные характеристики (напр. `["swing feel", "walking bass", "ride cymbal driven"]`)
    - `tempoRange: { min: number; max: number; default: number }` — темповый диапазон
    - `typicalInstruments: string[]` — массив `InstrumentId`, характерных для стиля
  - Заполнить значения для всех 5 стилей (swing, bossa, funk, latin, ballad)
  - Убедиться, что поля опциональны (не ломают существующий код без AI)
- **Критерий готовности (DoD):**
  - Все 5 стилей имеют заполненные AI-метаданные
  - Существующие тесты `styleProfile.test.ts` проходят
  - `typecheck` + `lint` — зелёные
  - Поля документированы в JSDoc
- **Зависит от задач:** нет
- **Статус:** 🔴 Запланировано

---

#### T-003. AI-метаданные: InstrumentManifest

- **Родительская функция:** 4.2 Расширение InstrumentManifest для AI
- **Приоритет:** P0
- **Сложность:** S (1–2d)
- **Слой:** `music-core`
- **Модуль:** `packages/music-core/src/audio/instrumentManifest.ts`
- **Описание:**
  - Добавить в `InstrumentManifest` опциональные AI-поля:
    - `aiDescription: string` — описание для AI (1 предложение)
    - `aiRoles: string[]` — доступные роли (`harmony`, `bass`, `drums`, `texture`, …)
    - `aiBehaviors: string[]` — музыкальные поведения (`walking`, `comping`, `syncopated-comping`, `laid-back-pocket`, `pads`, …)
    - `aiDensityLevels: { low: string; medium: string; high: string }` — описание уровней плотности
  - Заполнить значения для всех 12 инструментов аккомпанемента:
    - Bass (upright + electric), Jazz Drum Kit, Funk Drum Kit, Grand Piano, Rhodes, Guitar, Electric Guitar, Vibraphone, Organ, Percussion, Clarinet
  - Поля опциональны — не ломают существующие манифесты
- **Критерий готовности (DoD):**
  - Все 12 `InstrumentManifest` имеют заполненные AI-поля
  - Существующие тесты манифестов проходят
  - `typecheck` + `lint` — зелёные
  - Поля документированы в JSDoc с примерами значений
- **Зависит от задач:** нет
- **Статус:** 🔴 Запланировано

---

### Фаза 2: Каталог и валидация

Зависит от T-001 (типы DSL), T-002 (StyleProfile AI-метаданные), T-003 (InstrumentManifest AI-метаданные).

---

#### T-004. MusicCapabilities — агрегация каталога

- **Родительская функция:** 3.4 Каталог сервиса (Music Capabilities)
- **Приоритет:** P0
- **Сложность:** M (3–5d)
- **Слой:** `music-core`
- **Модуль:** `packages/music-core/src/ai/capabilities.ts`
- **Описание:**
  - Создать `MusicCapabilities` интерфейс и функцию `buildCapabilities()`:
    - Агрегирует данные из `StyleProfile` → `StyleDefinition[]` (с AI-метаданными)
    - Агрегирует данные из `InstrumentManifest[]` → `InstrumentDefinition[]` (с AI-метаданными)
    - Собирает `SectionTypeDefinition[]` (intro, verse, chorus, bridge, solo, outro, …)
    - `TimeSignature[]` — доступные размеры
    - `ComplexityLevel[]` — 4 уровня с описанием
    - `PatternDescriptor[]` — метаданные паттернов (без самих паттернов): id, name, style compatibility, complexity range, description
    - `CompatibilityRule[]` — правила совместимости стиль/инструмент/паттерн (из StyleProfile)
  - Создать хелперы для выборок:
    - `searchPatterns(criteria: PatternCriteria): PatternDescriptor[]`
    - `getCompatibleInstruments(styleId: Style, role?: string): InstrumentDefinition[]`
    - `getStyleDefinition(styleId: Style): StyleDefinition`
  - Написать тесты: `capabilities.test.ts`
    - Проверка, что все 5 стилей имеют `StyleDefinition`
    - Проверка, что все 12 инструментов имеют `InstrumentDefinition`
    - `searchPatterns` фильтрует по стилю и сложности
    - `getCompatibleInstruments` возвращает только совместимые
- **Критерий готовности (DoD):**
  - `buildCapabilities()` возвращает полный `MusicCapabilities` без ошибок
  - Все хелперы (`searchPatterns`, `getCompatibleInstruments`, `getStyleDefinition`) покрыты тестами
  - `typecheck` + `lint` + `test` — зелёные
- **Зависит от задач:** T-001, T-002, T-003
- **Статус:** 🔴 Запланировано

---

#### T-005. Валидатор: Schema + Referential (уровни 1–2)

- **Родительская функция:** 3.7 Система валидации
- **Приоритет:** P0
- **Сложность:** M (3–5d)
- **Слой:** `music-core`
- **Модуль:** `packages/music-core/src/ai/validator.ts`
- **Описание:**
  - Создать `validateCompositionPlan(plan, capabilities) → ValidationResult`:
    - **Уровень 1 (Schema):** `CompositionPlanSchema.safeParse(plan)` → ошибки Zod
    - **Уровень 2 (Referential):**
      - `style` → существует в `capabilities.styles`
      - `instrumentPreference` → резолвится в реальный `InstrumentId`
      - `sectionType` → существует в `capabilities.sectionTypes`
      - `timeSignature` → в `capabilities.timeSignatures`
      - `key` → валидная тональность (парсинг через `music-core/chords`)
      - `complexity` → в диапазоне 1–4
      - `bars` → разумная длина (2–64, кратная 2)
  - Формат ошибок:
    ```ts
    { code: string; path: string; value: unknown; allowed?: unknown[]; message: string }
    ```
  - Написать тесты: `validator.test.ts`
    - Валидный план проходит оба уровня
    - Несуществующий стиль → `STYLE_NOT_FOUND`
    - Несуществующий инструмент → `INSTRUMENT_NOT_FOUND`
    - Невалидный размер → `UNSUPPORTED_TIME_SIGNATURE`
    - Невалидная тональность → `INVALID_KEY`
    - Лишние поля в JSON → ошибка Schema
- **Критерий готовности (DoD):**
  - 10+ тестов: позитивные + негативные для каждого типа ошибок
  - `typecheck` + `lint` + `test` — зелёные
  - Ошибки содержат `path` в формате JSON Pointer (`/intent/style`)
- **Зависит от задач:** T-001, T-004
- **Статус:** 🔴 Запланировано

---

### Фаза 3: Компилятор

Зависит от T-001 (типы DSL), T-004 (каталог), T-005 (валидатор). Ядро всей системы.

---

#### T-006. Composition Compiler: style + ensemble resolution

- **Родительская функция:** 3.3 Composition Compiler
- **Приоритет:** P0
- **Сложность:** M (3–5d)
- **Слой:** `music-core`
- **Модуль:** `packages/music-core/src/ai/compiler.ts`
- **Описание:**
  - Создать `resolveStyle(styleInput: string, capabilities: MusicCapabilities) → StyleResolution`:
    - Прямое совпадение: `"swing"` → `StyleId.swing`
    - Синонимы: `"jazz"` → swing, `"bossa"` → bossa, `"latin jazz"` → latin, `"slow"` → ballad
    - Частичное совпадение: `"neo-soul"` → ближайший (swing) с `fallback: true` и `explanation`
    - Без совпадения → ближайший с пометкой `fallback`
  - Создать `resolveEnsemble(ensemble: EnsembleRole[], capabilities) → ResolvedEnsembleRole[]`:
    - `instrumentPreference` → маппинг на `InstrumentId`:
      - `"rhodes"` → `InstrumentId.rhodes`
      - `"piano"` → `InstrumentId.piano` (upright-piano)
      - `"electric-bass"` → `InstrumentId.electricBass`
      - `"drum-kit"` → стиле-зависимый выбор kit (swing → jazz-kit, funk → funk-kit)
    - Проверка совместимости через `StyleProfile.getInstruments(style)`
    - При несовместимости: замена на ближайший совместимый с `fallback: true`
  - Написать тесты: `compiler.test.ts`
    - `"jazz"` → StyleId.swing (синоним)
    - `"neo-soul"` → swing c `fallback: true` (частичное)
    - `"rhodes"` → InstrumentId.rhodes
    - Несовместимый инструмент для стиля → замена + fallback
- **Критерий готовности (DoD):**
  - 15+ тестов: синонимы, fallback'и, несовместимость, граничные случаи
  - `resolveStyle` и `resolveEnsemble` — чистые функции (легко тестировать)
  - `typecheck` + `lint` + `test` — зелёные
- **Зависит от задач:** T-001, T-004
- **Статус:** 🔴 Запланировано

---

#### T-007. Composition Compiler: form + harmony + pattern selection

- **Родительская функция:** 3.3 Composition Compiler
- **Приоритет:** P0
- **Сложность:** L (1–2w)
- **Слой:** `music-core`
- **Модуль:** `packages/music-core/src/ai/compiler.ts` (продолжение)
- **Описание:**
  - Создать `compileSections(form, timeSignature) → Section[]`:
    - `label` → `SectionLabel`
    - `type` → `SectionType` (intro, verse, chorus, bridge, solo, outro, …)
    - `bars` → количество тактов
    - `energy` → маппинг на плотность ансамбля в секции
    - Генерация переходов между секциями (fill в конце предыдущей)
  - Создать `selectPatterns(resolvedEnsemble, style, complexity, sections) → SectionPatternMap`:
    - Для каждого инструмента в каждой секции:
      - Фильтрация паттернов по стилю, сложности, роли, поведению
      - Выбор через `searchPatterns(criteria)` из каталога
      - Fallback: если паттерн не найден → ближайший совместимый
    - Адаптация под количество аккордов в такте (sub-bar resolution)
  - Создать `resolveComplexityProfile(complexity, overrides?) → PerInstrumentComplexity`:
    - Разворачивание глобального 1–4 в per-instrument профиль (voicingComplexity, rhythmicDensity, variation, noteDensity, approachNotes, fills, limbDensity, ghostNotes)
    - Применение `overrides` (relativeComplexity +1/-1 для конкретного инструмента)
  - Написать тесты: `compiler.test.ts` (продолжение)
    - Секции создаются с правильной длительностью
    - Паттерны выбираются по стилю и сложности
    - `complexity: 2` → профиль разворачивается корректно
    - `overrides.bass.relativeComplexity: 1` → bass noteDensity увеличивается
- **Критерий готовности (DoD):**
  - `compileComposition(plan, capabilities)` компилирует полный пример из VISION §3.2
  - 15+ тестов: секции, паттерны, complexity, overrides
  - Компилятор детерминирован: одинаковый план + seed → одинаковый результат
  - `typecheck` + `lint` + `test` — зелёные
- **Зависит от задач:** T-006
- **Статус:** 🔴 Запланировано

---

#### T-008. Composition Compiler: финальная сборка и интеграция

- **Родительская функция:** 3.3 Composition Compiler
- **Приоритет:** P0
- **Сложность:** M (3–5d)
- **Слой:** `music-core`
- **Модуль:** `packages/music-core/src/ai/compiler.ts` (завершение)
- **Описание:**
  - Создать главную функцию `compileComposition(plan: CompositionPlan, capabilities: MusicCapabilities) → CompileResult`:
    1. `resolveStyle(plan.intent.style)` → `StyleId`
    2. `resolveEnsemble(plan.ensemble)` → `ResolvedEnsembleRole[]`
    3. `compileSections(plan.form, plan.intent.timeSignature)` → `Section[]`
    4. `resolveComplexityProfile(plan.intent.complexity, plan.overrides)` → `PerInstrumentComplexity`
    5. `selectPatterns(...)` → `SectionPatternMap`
    6. `generateHarmony(plan.harmony, plan.form)` → гармоническая прогрессия (переиспользовать существующие генераторы)
    7. Сборка в `CompileResult`:
       ```ts
       { composition: Composition; plan: CompositionPlan; warnings: CompileWarning[]; stats: CompileStats }
       ```
  - `CompileWarning` — нефатальные проблемы: fallback стиля, замена инструмента, паттерн по умолчанию
  - Интеграция с существующим `TransportEngine`, `ChordTimeline`, `StyleProfile`
  - Написать интеграционный тест: полный цикл plan → composition → воспроизведение
- **Критерий готовности (DoD):**
  - Полный интеграционный тест: пример из VISION §3.2 → `CompileResult` с реальными ID инструментов и паттернов
  - `CompileResult.composition` передаётся в `TransportEngine` и воспроизводится без ошибок
  - `warnings` содержат все fallback'и с объяснениями
  - `typecheck` + `lint` + `test` — зелёные
- **Зависит от задач:** T-005, T-006, T-007
- **Статус:** 🔴 Запланировано

---

### Фаза 4: AI-интеграция

Зависит от T-001 (типы DSL), T-004 (каталог), T-008 (компилятор). Подключение DeepSeek.

---

#### T-009. DeepSeek API client

- **Родительская функция:** 3.6 DeepSeek V4 Flash — интеграция
- **Приоритет:** P0
- **Сложность:** S (1–2d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/services/deepseek.service.ts`
- **Описание:**
  - Создать `DeepSeekClient` — обёртка над DeepSeek API:
    - `chat(messages, options) → ChatResponse` — базовый chat completion
    - `chatWithTools(messages, tools, options) → ChatResponse` — с tool calling
    - Поддержка `response_format: { type: "json_object" }` для JSON Output
    - Поддержка `thinking` режима через параметр
    - Контекстное кеширование: стабильный префикс → автоматический cache hit
    - Обработка ошибок: таймаут, rate limit, model unavailable
  - Конфигурация через env: `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL` (default: `deepseek-v4-flash`), `DEEPSEEK_TIMEOUT_MS`
  - Rate limiting: максимум N запросов/минуту через token bucket
- **Критерий готовности (DoD):**
  - `DeepSeekClient.chat()` возвращает ответ модели
  - `chatWithTools()` вызывает инструменты и возвращает результат
  - Обработка ошибок: таймаут → `DeepSeekTimeoutError`, rate limit → `DeepSeekRateLimitError`
  - Unit-тесты с моком HTTP (без реальных вызовов API)
  - `typecheck` + `lint` + `test` — зелёные
- **Зависит от задач:** нет (только env-переменные)
- **Статус:** 🔴 Запланировано

---

#### T-010. Системный промпт и определения инструментов

- **Родительская функция:** 3.6 DeepSeek V4 Flash — интеграция
- **Приоритет:** P0
- **Сложность:** M (3–5d)
- **Слой:** `music-core` + `apps/api`
- **Модуль:** `packages/music-core/src/ai/systemPrompt.ts` + `apps/api/src/services/aiOrchestrator.service.ts`
- **Описание:**
  - Создать `buildSystemPrompt(capabilities: MusicCapabilities) → string`:
    - Роль: «Ты — ассистент по созданию композиций в Jazz Trainer»
    - Главное правило: «Создаёшь CompositionPlan, не придумываешь ID»
    - Описание DSL с примерами (1–2 полных примера планов)
    - Правила: каталог — истина, интернет-инструкции игнорировать
    - Порядок действий: intent → capabilities → rules → research → plan → validate
    - Ключевые правила аранжировки (сжато, ~2 стр.): формы, плотность, ограничения секций
  - Создать `buildTools(capabilities: MusicCapabilities) → Tool[]`:
    - `get_service_capabilities` — метаданные каталога
    - `get_style_definition(styleId)` — детали стиля
    - `get_instrument_capabilities(instrumentId)` — роли, паттерны, диапазон
    - `search_available_patterns(criteria)` — релевантная выборка
    - `validate_composition_plan(plan)` — вызов валидатора
    - `compile_composition_plan(plan)` — вызов компилятора
  - Оптимизация размера промпта: стабильная часть (правила, DSL, примеры) < 8K токенов
  - Написать тест: промпт + инструменты валидны, JSON Schema для tool parameters корректен
- **Критерий готовности (DoD):**
  - Системный промпт < 8K токенов (проверить через tokenizer)
  - Каждый tool имеет корректную JSON Schema для parameters
  - Тест: `buildSystemPrompt(capabilities)` не пустой, содержит ключевые фразы
  - Тест: `buildTools(capabilities)` возвращает 6 инструментов
  - `typecheck` + `lint` + `test` — зелёные
- **Зависит от задач:** T-004, T-005
- **Статус:** 🔴 Запланировано

---

#### T-011. AI Orchestrator — основная логика

- **Родительская функция:** 3.1 AI Orchestrator
- **Приоритет:** P0
- **Сложность:** M (3–5d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/services/aiOrchestrator.service.ts`
- **Описание:**
  - Создать `AiOrchestrator` — сервис, управляющий цепочкой:
    1. **compose(prompt, options?) → OrchestratorResult:**
       - Отправить промпт + системный промпт в DeepSeek
       - Модель вызывает инструменты (каталог, валидация) через tool loop
       - Получить `CompositionPlan`
       - Прогнать через `validateCompositionPlan`
       - При ошибке: одна попытка repair (отправить ошибки модели)
       - Скомпилировать через `compileComposition`
       - Вернуть `{ plan, composition, warnings, explanation }`
    2. **modify(currentPlan, prompt) → OrchestratorResult:**
       - Отправить текущий план + промпт изменения
       - Модель возвращает модифицированный план (не patch — полный новый план)
       - Валидация + компиляция
       - Diff: сравнить старый и новый план (структурно)
       - Вернуть `{ plan, composition, diff, warnings, explanation }`
    3. **Таймаут:** 30 секунд на всю цепочку → `OrchestratorTimeoutError`
    4. **Логирование:** каждый вызов → audit log (промпт, план, результат, длительность)
  - Написать тесты:
    - `compose("Создай простой свинг в Bb")` → валидный план (мок DeepSeek)
    - `modify(plan, "Добавь соло на 16 тактов")` → план с добавленной секцией
    - Ошибка валидации → одна попытка repair → success или ошибка пользователю
    - Таймаут → `OrchestratorTimeoutError`
- **Критерий готовности (DoD):**
  - Unit-тесты с замоканным DeepSeek: 3 сценария (compose, modify, repair)
  - Интеграционный тест (с реальным DeepSeek API, опционально): промпт → план
  - Все ошибки обработаны: таймаут, невалидный JSON, превышение лимита repair
  - `typecheck` + `lint` + `test` — зелёные
- **Зависит от задач:** T-008, T-009, T-010, T-005
- **Статус:** 🔴 Запланировано

---

### Фаза 5: API-эндпоинты

Зависит от T-011 (orchestrator). REST-интерфейс для фронта.

---

#### T-012. API-эндпоинты AI

- **Родительская функция:** 4.3 API-эндпоинты для AI Orchestrator
- **Приоритет:** P0
- **Сложность:** M (3–5d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/routes/ai.routes.ts`
- **Описание:**
  - Создать 5 эндпоинтов:
    1. `POST /api/ai/compose` — создание композиции
       - Body: `{ prompt: string; variationSeed?: number; novelty?: number }`
       - Response: `{ plan: CompositionPlan; composition: Composition; explanation: string; warnings: Warning[] }`
       - RBAC: `super_admin`, `admin`
    2. `POST /api/ai/modify` — изменение композиции
       - Body: `{ compositionId: string; prompt: string }`
       - Response: `{ plan; composition; diff: DiffEntry[]; explanation }`
       - RBAC: `super_admin`, `admin`
    3. `POST /api/ai/validate` — валидация плана (для отладки)
       - Body: `{ plan: CompositionPlan }`
       - Response: `{ valid: boolean; errors: ValidationError[] }`
       - RBAC: `super_admin`, `admin`
    4. `GET /api/ai/capabilities` — каталог сервиса
       - Response: `MusicCapabilities`
       - RBAC: `super_admin`, `admin`
    5. `POST /api/ai/preview` — запрос preview (существующий плеер)
       - Body: `{ composition: Composition; bars?: number }`
       - Response: `{ previewUrl: string }` или `{ status: "ok" }` (если рендерится на клиенте)
       - RBAC: `super_admin`, `admin`
  - Zod-DTO схемы для request/response в `@jazz/shared`
  - Интеграция с `rbac.plugin.ts`: middleware `requirePermission('ai:use')` [assumption — новое permission]
  - Аудит: все вызовы → `withAudit()`
  - Написать тесты: `ai.routes.test.ts`
    - `POST /api/ai/compose` → 200 + валидный план
    - `POST /api/ai/compose` без прав → 403
    - `POST /api/ai/validate` с невалидным планом → 200 + ошибки
    - `GET /api/ai/capabilities` → 200 + полный каталог
- **Критерий готовности (DoD):**
  - 5 эндпоинтов работают с корректными DTO
  - RBAC enforced: без прав → 403
  - Аудит записывается для compose и modify
  - `typecheck` + `lint` + `test` — зелёные
- **Зависит от задач:** T-011
- **Статус:** 🔴 Запланировано

---

### Фаза 6: Плагин и UX

Зависит от T-012 (API). Визуальный интерфейс ассистента.

---

#### T-013. Плагин `ai-assistant`: scaffold

- **Родительская функция:** 3.10 UX ассистента
- **Приоритет:** P0
- **Сложность:** S (1–2d)
- **Слой:** `plugins`
- **Пакет:** `packages/plugins/ai-assistant/`
- **Описание:**
  - Скопировать `packages/plugins/_template/` → `packages/plugins/ai-assistant/`
  - Заполнить `src/index.ts`:
    - `id: 'admin.ai-assistant'`
    - `name: 'AI Assistant'`
    - `category: 'admin'`
    - `description: 'AI-ассистент для создания и редактирования композиций'`
    - `routes: [{ path: '/admin/ai-assistant', element: lazy(() => import('./AiAssistantPage')) }]`
    - `navItems: [{ section: 'admin', label: 'AI Assistant', to: '/admin/ai-assistant', icon: 'sparkles' }]`
    - `requires: 'ai:use'` [assumption — новое permission]
  - Добавить permission `ai:use` в `packages/plugin-sdk/src/extension-points.ts` и `apps/api/src/services/rbac.service.ts`
  - Зарегистрировать плагин в `plugin-registry`
  - Добавить алиасы: `vite.config.ts`, `tsconfig.base.json`, `vitest.config.ts`
- **Критерий готовности (DoD):**
  - Плагин загружается без ошибок
  - Маршрут `/admin/ai-assistant` доступен в админке
  - Навигационный пункт «AI Assistant» в секции admin
  - `typecheck` + `lint` — зелёные (включая boundaries)
- **Зависит от задач:** нет (технически). Функционально зависит от T-012.
- **Статус:** 🔴 Запланировано

---

#### T-014. Чат-компонент и UX

- **Родительская функция:** 3.10 UX ассистента
- **Приоритет:** P0
- **Сложность:** M (3–5d)
- **Слой:** `plugins/ai-assistant`
- **Модуль:** `packages/plugins/ai-assistant/src/AiAssistantPage.tsx`
- **Описание:**
  - Создать `AiAssistantPage` — основная страница:
    - Левая панель: чат (история сообщений, поле ввода, кнопка отправки)
    - Правая панель: просмотр скомпилированной композиции (переиспользовать компоненты плеера)
  - Чат-компонент:
    - Сообщения пользователя (справа) и ассистента (слева)
    - Поддержка markdown в ответах
    - Индикатор загрузки (thinking…)
    - Обработка ошибок: «Не удалось создать композицию. Попробуйте другой запрос.»
  - Diff-компонент (после modify):
    - Компактный список изменений:
      ```
      Форма: AABA → AABA + Solo
      Длительность: 32 → 48 тактов
      Rhodes: complexity 2 → 3 только в Solo
      ```
    - Кнопки: «Применить», «Прослушать», «Отмена»
  - Интеграция с API: `POST /api/ai/compose`, `POST /api/ai/modify`
  - Использовать `apiClient` из `@jazz/plugin-sdk`
  - Использовать `usePermission('ai:use')` для проверки доступа
- **Критерий готовности (DoD):**
  - Чат отправляет промпт → получает план + композицию
  - Ответ ассистента рендерится с markdown
  - Diff показывает изменения структурированно
  - Кнопка «Применить» применяет изменения
  - Ошибки API показываются пользователю понятным сообщением
  - `typecheck` + `lint` — зелёные
- **Зависит от задач:** T-012, T-013
- **Статус:** 🔴 Запланировано

---

### Фаза 7: История версий и финальная полировка

---

#### T-015. История версий: схема БД и API

- **Родительская функция:** 4.4 История версий композиций
- **Приоритет:** P0
- **Сложность:** S (1–2d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/db/schema.ts` + `apps/api/src/routes/compositionVersions.routes.ts`
- **Описание:**
  - Добавить таблицу `composition_versions`:
    ```sql
    id TEXT PRIMARY KEY,
    composition_id TEXT NOT NULL REFERENCES compositions(id),
    version_number INTEGER NOT NULL,
    plan_json TEXT NOT NULL,          -- CompositionPlan
    composition_json TEXT NOT NULL,   -- скомпилированная Composition
    prompt TEXT,                      -- промпт, создавший эту версию
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(composition_id, version_number)
    ```
  - Эндпоинты:
    - `GET /api/ai/compositions/:id/versions` — список версий
    - `GET /api/ai/compositions/:id/versions/:version` — конкретная версия
    - `POST /api/ai/compositions/:id/versions/:version/restore` — откат к версии
  - Автосохранение версии при каждом `POST /api/ai/compose` и `POST /api/ai/modify`
  - Аудит через `withAudit()`
- **Критерий готовности (DoD):**
  - Версия создаётся автоматически при compose/modify
  - `GET /versions` возвращает список с пагинацией
  - `POST /restore` откатывает композицию к выбранной версии
  - `typecheck` + `lint` + `test` — зелёные
- **Зависит от задач:** T-012
- **Статус:** 🔴 Запланировано

---

#### T-016. История версий: UX

- **Родительская функция:** 4.4 История версий композиций
- **Приоритет:** P0
- **Сложность:** S (1–2d)
- **Слой:** `plugins/ai-assistant`
- **Модуль:** `packages/plugins/ai-assistant/src/VersionHistory.tsx`
- **Описание:**
  - Компонент `VersionHistory` в правой панели:
    - Список версий с датой и промптом
    - Текущая версия выделена
    - Кнопка «Вернуть эту версию» для каждой предыдущей
    - Подтверждение перед откатом: «Вернуть версию #3 от 25.07.2026? Текущие изменения будут сохранены как новая версия.»
  - Интеграция с API версий
- **Критерий готовности (DoD):**
  - Список версий отображается корректно
  - Откат работает: композиция возвращается к выбранной версии
  - Текущая версия не теряется (сохраняется как новая)
  - `typecheck` + `lint` — зелёные
- **Зависит от задач:** T-014, T-015
- **Статус:** 🔴 Запланировано

---

#### T-017. Тестовый набор и автотесты

- **Родительская функция:** Метрики успеха (VISION §7)
- **Приоритет:** P0
- **Сложность:** L (1–2w)
- **Слой:** `music-core` + `apps/api`
- **Модуль:** `packages/music-core/src/ai/__tests__/integration.test.ts` + `apps/api/src/__tests__/ai.integration.test.ts`
- **Описание:**
  - Создать набор из 100–300 эталонных запросов в JSON-файле:
    ```json
    [
      { "prompt": "Создай простой swing в Bb на 32 такта", "expected": { "style": "swing", "minBars": 32, "complexity": 1 } },
      { "prompt": "Сделай bossa nova без перкуссии", "expected": { "style": "bossa", "noInstruments": ["percussion"] } },
      ...
    ]
    ```
  - Написать автотест: каждый запрос → compose → проверка:
    - JSON валиден (Schema)
    - Все ID реальные (Referential)
    - Композиция воспроизводится (компиляция без ошибок)
    - Аккорды помещаются в такты (длительности корректны)
    - Сложность в допустимом профиле
    - Одинаковый seed → одинаковый результат (воспроизводимость)
    - Изменение секции не ломает остальные (модификация)
    - Неподдерживаемая фича корректно заменена или отклонена (warnings)
  - Интеграционный тест API: `POST /api/ai/compose` → 200, валидный ответ
  - Интеграционный тест API: `POST /api/ai/modify` → 200, корректный diff
- **Критерий готовности (DoD):**
  - 100+ запросов в тестовом наборе
  - Автотест проходит для 90%+ запросов
  - `typecheck` + `lint` + `test` — зелёные
  - CI настроен на запуск тестового набора
- **Зависит от задач:** T-011, T-012, T-008
- **Статус:** 🔴 Запланировано

---

#### T-018. Документация

- **Родительская функция:** Все (документирование новой системы)
- **Приоритет:** P1
- **Сложность:** S (1–2d)
- **Слой:** `docs`
- **Модуль:** `docs/AI-ASSISTANT.md`
- **Описание:**
  - Создать `docs/AI-ASSISTANT.md` — техническая документация:
    - Архитектура: схема цепочки, компоненты, слои
    - Composition Plan DSL: полное описание всех полей с примерами
    - Composition Compiler: логика резолюции, маппинги, complexity profile
    - API: все эндпоинты с примерами запросов/ответов
    - Как добавить новый стиль/инструмент в каталог
    - Как расширить системный промпт
    - Локальная разработка: как запустить с `AUTH_DEV_MODE` и моком DeepSeek
  - Обновить `CLAUDE.md`: добавить карту «AI-ассистент → `docs/AI-ASSISTANT.md` + `packages/music-core/src/ai/`»
  - Обновить `FUNCTIONS.md`: добавить раздел «10. AI-ассистент»
- **Критерий готовности (DoD):**
  - `docs/AI-ASSISTANT.md` покрывает архитектуру, DSL, API
  - `CLAUDE.md` и `FUNCTIONS.md` обновлены
  - `typecheck` + `lint` — зелёные (документация не влияет)
- **Зависит от задач:** T-008, T-012, T-014
- **Статус:** 🔴 Запланировано

---

## 2. Последовательность (Ordering)

Рекомендуемый порядок с учётом зависимостей:

```
Фаза 1 (Foundation)        Фаза 2 (Catalog+Validate)   Фаза 3 (Compiler)         Фаза 4 (AI)              Фаза 5-7 (API+UX+Polish)
─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
T-001 ─────────────────────┐
T-002 ─────────────────────┤
T-003 ─────────────────────┤
                           ├──→ T-004 ────────────────┐
                           └──→ T-005 ────────────────┤
                                                      ├──→ T-006 ──→ T-007 ──→ T-008 ──→ T-011 ──→ T-012 ──→ T-014 ──→ T-016
                           T-009 ─────────────────────┤                                            │
                           T-010 ─────────────────────┘            T-013 ─────────────────────────┘
                                                                                                          │
                                                                                                   T-015 ─┘
                                                                                                          │
                                                                                                   T-017 (параллельно)
                                                                                                   T-018 (после всего)
```

**Критический путь:** T-001 → T-004/T-005 → T-006 → T-007 → T-008 → T-011 → T-012 → T-014 → T-016 (10 задач, ~7–8 недель)

**Параллельные треки:**

- Трек A: T-001, T-002, T-003 — можно делать одновременно (3 разработчика)
- Трек B: T-009 (DeepSeek client) — не зависит от компилятора, можно параллельно с фазой 3
- Трек C: T-013 (плагин scaffold) — можно делать параллельно с фазой 4
- Трек D: T-017 (тесты) — можно начинать после T-008, идёт параллельно с фазой 5–7

## 3. Оценка суммарной трудоёмкости

| Сложность | Количество | Задачи                                          |
| --------- | ---------- | ----------------------------------------------- |
| XS (<1d)  | 1          | T-002                                           |
| S (1–2d)  | 7          | T-001, T-003, T-009, T-013, T-015, T-016, T-018 |
| M (3–5d)  | 7          | T-004, T-005, T-006, T-008, T-010, T-011, T-012 |
| L (1–2w)  | 2          | T-007, T-017                                    |
| XL (>2w)  | 0          | —                                               |

**Суммарно:** ~45–65 рабочих дней (9–13 недель) одним разработчиком.
**С 2–3 разработчиками (параллельные треки):** ~6–9 недель.

## 4. Критические пути

| Цепочка                                   | Блокирует                  | Длительность |
| ----------------------------------------- | -------------------------- | ------------ |
| T-001 → T-004/T-005 → T-006–T-008 → T-011 | Весь AI Orchestrator и API | ~6–8 недель  |
| T-011 → T-012 → T-014                     | UX ассистента              | ~2 недели    |
| T-012 → T-015 → T-016                     | Историю версий             | ~1 неделя    |

**Главный риск:** T-007 (pattern selection + complexity profile) — самая сложная задача. Если затянется, блокирует T-008, T-011 и всё последующее.

**Рекомендация:** Начать T-007 как можно раньше (сразу после T-004/T-005), выделить самого сильного разработчика.

---

_Документ создан 2026-07-25 на основе AI-ASSISTANT-VISION.md. Требует обсуждения и уточнения приоритетов и оценок сложности._
