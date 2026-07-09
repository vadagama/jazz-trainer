# AI.md — Jazz Trainer

> Минимизация контекста для AI-агентов. Читай этот файл первым — он скажет, что читать дальше, а что можно пропустить.

> **Агенты проекта:**
> - `software-engineer` (`.agents/skills/software-engineer/SKILL.md`) — Staff Engineer. Активируется при запросах на изменение кода.
> - `software-architect` (`.agents/skills/software-architect/SKILL.md`) — Senior Software Architect. Активируется при запросах на анализ качества кодовой базы, поиск уязвимостей, формирование TECH_DEPT.md.
> - `tech-writer` (`.agents/skills/tech-writer/SKILL.md`) — Senior Technical Writer. Активируется при запросах на обновление документации.
> - `analyst` (`.agents/skills/analyst/SKILL.md`) — Senior Business Analyst. Активируется при запросах на продуктовое видение, roadmap, конкурентный анализ.
> - `musician` (`.agents/skills/musician/SKILL.md`) — Drum Arranger. Активируется при запросах на создание/изменение барабанных партий (молекулы, клетки, организмы) для стилей.

## Что это за проект

Браузерный тренажёр джазовой гармонии: гармонические сетки, метроном, DSL, генераторы прогрессий, бас/барабаны/гармония. Монорепо: `apps/web` (React), `apps/api` (Fastify+SQLite), `packages/*` (ядро, SDK, плагины).

> Архитектура: **тонкое ядро + build-time плагины**. Приложение — это shell + plugin-host; вся фичевая логика в плагинах (`packages/plugins/*`). Подробнее: `docs/ARCHITECTURE_BASE.md` (текущая архитектура) и `docs/ARCHITECTURE_VISION.md` (целевое видение).

## Что читать под задачу (минимальный набор)

Выбирай задачу → читай только указанные файлы, **не** весь проект.

### Добавить/изменить плагин

```
packages/plugins/_template/src/index.ts    ← скопируй форму
папка соседнего плагина той же категории   ← пример из реального кода
packages/plugin-sdk/src/extension-points.ts ← типы вкладов
packages/plugin-registry/src/index.ts       ← зарегистрировать (одна строка)
```

### Добавить маршрут в плагин

```
папка плагина: src/index.ts                ← блок contributes.routes
apps/web/vite.config.ts                    ← vite-алиас (если новый плагин)
tsconfig.base.json                         ← paths (если новый плагин)
vitest.config.ts                           ← vitest-алиас (если новый плагин)
```

### Работа с музыкой/звуком (music-core)

```
packages/music-core/src/<модуль>/           ← нужный подпакет
packages/music-core/src/<модуль>/*.test.ts  ← тесты — лучшая документация
```

Модули: `audio/` (TransportEngine, инструменты, AudioPort), `chords/` (parseChord), `dsl/` (parseGrid), `time/`, `playback/`, `generator/`.

### API / бэкенд

```
apps/api/src/routes/<имя>.routes.ts        ← эндпоинты
apps/api/src/services/<имя>.service.ts      ← бизнес-логика
apps/api/src/db/schema.ts                  ← таблицы
packages/shared/src/dto.ts                 ← Zod-DTO (контракт фронт↔бэк)
```

### RBAC / доступ / аудит

```
apps/api/src/services/rbac.service.ts       ← permissions, resolvePermissions, resolveFlags
apps/api/src/plugins/rbac.plugin.ts         ← middleware, requirePermission
apps/api/src/services/audit.service.ts      ← withAudit
apps/api/src/db/schema.ts                  ← roles, permissions, audit_log, feature_flags
packages/plugin-sdk/src/hooks/usePermission.ts ← usePermission на фронте
packages/plugin-sdk/src/hooks/useFlag.ts       ← useFlag на фронте
```

### Тестирование

```
<модуль>/src/**/*.test.ts                  ← тесты лежат рядом с кодом
packages/plugin-host/src/__tests__/         ← host-интеграция
packages/plugin-sdk/src/manifest.schema.test.ts ← контракт манифеста
```

### Обновление документации

```
.agents/skills/tech-writer/SKILL.md        ← скилл tech-writer
docs/ARCHITECTURE_BASE.md                  ← текущая архитектура + ADR
docs/FUNCTIONS.md                          ← каталог возможностей
README.md                                  ← первое знакомство
```

### Анализ качества кодовой базы / технический долг

```
.agents/skills/software-architect/SKILL.md ← скилл software-architect
docs/ARCHITECTURE_BASE.md                  ← текущая архитектура: слои, фазы, ограничения, ADR
docs/ARCHITECTURE_VISION.md                ← целевое видение архитектуры
docs/FUNCTIONS.md                          ← scope проекта
docs/TECH_DEPT.md                          ← результат анализа (создаётся агентом)
eslint.config.js                           ← границы слоёв (boundaries)
```

### Продуктовое видение и план

```
.agents/skills/analyst/SKILL.md            ← скилл analyst
docs/ARCHITECTURE_BASE.md                  ← архитектура: слои, фазы, ограничения
docs/FUNCTIONS.md                          ← текущие возможности
docs/VISION.md                             ← текущее видение (если есть)
docs/EXERSISE-PLAN.md                      ← план задач (упражнения)
docs/ARCHIVE/                              ← архив предыдущих VISION и PLAN
```

## Что НЕ читать (экономия токенов)

- **Соседние плагины** — плагины изолированы, импорты между ними запрещены линтером. Читай только тот, с которым работаешь.
- **Внутренности `music-core`** — если задача не про звук/теорию, работай через типы (`@jazz/plugin-sdk`, `@jazz/shared`), а не реализацию.
- **`apps/web/src/routes/`** — страницы из встроенного псевдоплагина, не трогай без необходимости.
- **`node_modules/`** — очевидно.
- **`tmp/`, `data/`, `dist/`** — сгенерированное.

## Рецепт: добавить новый плагин (3 шага)

### Шаг 1. Создать пакет

Скопируй `packages/plugins/_template/` → `packages/plugins/<имя>/`. Замени в `src/index.ts`:
- `id`, `name`, `category`, `description` (манифест)
- `routes`, `navItems` (вклады) — оставь нужные, удали остальные
- `element: () => import('./ТвойКомпонент')` — создай файл компонента

### Шаг 2. Зарегистрировать

В `packages/plugin-registry/src/index.ts`:
```ts
import newPlugin from '@jazz/plugin-<имя>';
// добавить newPlugin в массив PLUGINS
```

### Шаг 3. Добавить алиасы (3 файла)

В каждом из этих файлов добавить строку по образцу соседних:
- `apps/web/vite.config.ts` — vite-алиас
- `tsconfig.base.json` — path в compilerOptions.paths
- `vitest.config.ts` — test-алиас

### Шаг 4. Проверить

```bash
npm run typecheck && npm run lint && npm run test
```

Ошибка линтера `boundaries/dependencies` = нарушил границы слоёв. Плагин может импортировать только `@jazz/plugin-sdk`, `@jazz/music-core`, `@jazz/shared`.

## Команды (что и зачем)

| Команда | Значение | Когда запускать |
|---|---|---|
| `npm run dev` | web (:5173) + api (:3999) | Разработка |
| `npm run typecheck` | TS strict по всем пакетам | После изменений типов/импортов |
| `npm run lint` | ESLint + границы (boundaries) | После любых изменений |
| `npm run test` | 348 тестов (Vitest) | После изменений логики |
| `npm run test -- --reporter=verbose` | подробный вывод | Когда тест упал |
| `npm run e2e` | Playwright E2E | Перед PR (если есть тесты) |
| `npm run build` | typecheck + сборка web + api | Перед деплоем |
| `npm run format` | Prettier | Перед коммитом |

## Границы слоёв (нарушение = ошибка линтера)

Правило: **default disallow** — разрешены только явно указанные импорты.

| Пакет | Может импортировать |
|---|---|
| `music-core`, `shared` | stdlib + друг друга |
| `plugin-sdk` | `music-core`, `shared` |
| `plugin-host` | `plugin-sdk`, `music-core`, `shared` |
| `plugins/*` | `plugin-sdk`, `music-core`, `shared` |
| `adapters/*` | `plugin-sdk`, `music-core`, `shared` |
| `apps/web` | `plugin-host`, `plugin-sdk`, `music-core`, `shared` |
| `apps/api` | `music-core`, `shared` |

Запрещено:
- Плагин → плагин (изоляция)
- `music-core` → браузерные API (чистота)
- Плагины → shell (независимость от оболочки)

## Конвенции кода

- **Формат:** ESM (`"type": "module"`), TS `strict`, `verbatimModuleSyntax`
- **Стиль:** Prettier (2 пробела, single quotes, trailing commas)
- **Именование плагинов:** `id: 'domain.name'`, `category` из enum: `'core'|'admin'|'theory'|'technique'|'assess'|'play'|'practice'`
- **Маршруты:** `kebab-case`, например `/ear-training`, `/chord-quiz`
- **Нав-секции:** `'main'`, `'create'`, `'learn'`, `'practice'`, `'admin'`
- **Импорты:** Только через алиасы workspace-пакетов (`@jazz/plugin-sdk`, а не `../../packages/plugin-sdk`)
- **Тесты:** Рядом с кодом (`src/__tests__/` или `src/*.test.ts`), Vitest, `describe`/`it`

## Типовые ошибки и как их избежать

1. **Импорт между плагинами** → линтер `boundaries/dependencies` упадёт. Используй общие сервисы `PluginContext` или вынеси общий код в `@jazz/shared` / `@jazz/music-core`.

2. **Не добавил алиас новому плагину** → `Cannot find module '@jazz/plugin-...'`. Добавь в 3 файла (см. рецепт, шаг 3).

3. **Изменение контракта SDK** → ломает все плагины. Меняй `extension-points.ts` и `manifest.schema.ts` осознанно, с тестами.

4. **Zod-DTO рассинхрон** → `@jazz/shared` — единый источник правды для фронта и бэка. Меняй DTO там, оба подхватят.

5. **Типы `unknown` в PluginContext** → `music` и `query` ещё не затайплены. Пока плагины импортируют `music-core` напрямую.

## Где что лежит (карта для быстрой навигации)

```
Задача                           → Куда смотреть
─────────────────────────────────────────────────────────────
Добавить страницу                → <плагин>/src/index.ts (routes) + <плагин>/src/НазваниеPage.tsx
Добавить пункт меню              → <плагин>/src/index.ts (navItems)
Настроить доступ к странице      → <плагин>/src/index.ts (requires: 'permission')
Проверить permission на клиенте  → usePermission('users:read')
Проверить feature flag           → useFlag('new-feature')
Работа с аккордами               → music-core/src/chords/
Работа с DSL                     → music-core/src/dsl/
Multi-chord бары (механизм)      → docs/CHORDS.md + music-core/src/audio/chordTimeline.ts
Работа с транспортом/звуком      → music-core/src/audio/TransportEngine
Инструменты (бас, барабаны)      → music-core/src/audio/BassInstrument, DrumInstrument
Спецификация инструментов         → docs/BASS.md, docs/PIANO.md, docs/RHODES.md, docs/DRUMS.md, docs/GUITAR.md, docs/VIBRAPHONE.md, docs/ORGAN.md, docs/PERCUSSION.md, docs/CLARINET.md, docs/ALL_CHORDS.md
Барабанные киты (плагины)         → packages/plugins/instruments/{jazz,funk}-drum-kit/ + docs/DRUMS.md
Метроном (плагин)                  → packages/plugins/instruments/metronome/ + docs/METRONOME-VISION.md, docs/METRONOME-PLAN.md
Упражнения (practice-cards)       → docs/EXERSISE-VISION.md, docs/EXERSISE-ARCHITECTURE.md
Лады и гаммы                      → docs/SCALES-VISION.md + music-core/src/chords/modes.ts
Rhodes (комплементарный слой)    → music-core/src/audio/rhodesInstrument.ts, rhodesVoicing.ts, pianoRhodesInteraction.ts
Grand Piano (основной компинг)   → music-core/src/audio/pianoInstrument.ts, pianoComping.ts, pianoVoicing.ts
Guitar (гитара)                  → music-core/src/audio/guitarInstrument.ts, guitarManifest.ts, electricGuitarManifest.ts
Salamander Grand Piano            → music-core/src/audio/salamanderManifest.ts, salamanderSampleRegistry.ts
Сольные инструменты (MIDI)        → music-core/src/audio/soloInstrument.ts, soloInstrumentManifest.ts, soloInstrumentHost.ts, manifests/
StyleProfile (стиле-ростеры)      → music-core/src/styleProfile.ts
MIDI-оценка                      → music-core/src/audio/midiEval
DTO / валидация API              → shared/src/dto.ts
Константы (звуки, типы)          → shared/src/constants.ts
Схема БД                         → apps/api/src/db/schema.ts
Auth / сессии                    → apps/api/src/routes/auth.routes.ts
Настройки пользователя           → apps/api/src/routes/settings.routes.ts
RBAC-мидлварь                    → apps/api/src/plugins/rbac.plugin.ts
Аудит                            → apps/api/src/services/audit.service.ts
ESLint-границы                   → eslint.config.js (секция boundaries)
Алиасы                           → tsconfig.base.json + vite.config.ts + vitest.config.ts
Архитектура (текущая + ADR)         → docs/ARCHITECTURE_BASE.md
Архитектура (целевое видение)        → docs/ARCHITECTURE_VISION.md
Возможности сервиса              → docs/FUNCTIONS.md
Продуктовое видение              → docs/VISION.md + .agents/skills/analyst/SKILL.md
План задач                       → docs/EXERSISE-PLAN.md (упражнения), docs/ARCHIVE/ (архив)
Архив версий                     → docs/ARCHIVE/
Анализ качества кода             → .agents/skills/software-architect/SKILL.md
Обновление документации          → .agents/skills/tech-writer/SKILL.md
```

## Ответы на частые вопросы без чтения кода

- **Как плагин получает данные о пользователе?** `useAuth()` из `@jazz/plugin-sdk` → `{ user, permissions, flags }`
- **Как плагин читает/пишет настройки?** `useSettings()` / `useUpdateSettings()` из `@jazz/plugin-sdk`
- **Как плагин делает запрос к API?** `apiClient.get/post/patch/delete()` из `@jazz/plugin-sdk`, DTO-типы из `@jazz/shared`
- **Как добавить permission?** В `RBAC_PERMISSIONS` в `rbac.service.ts`, затем в `permissions` таблицу через seed.
- **Как добавить роль?** В `RBAC_ROLES` в `rbac.service.ts`, затем seed прав в `role_permissions`.
- **Как работает feature flag?** Таблица `feature_flags`, резолюция через `resolveFlags()`, фронт через `useFlag()`.
- **Фазы миграции:** Ф0–Ф1–ФR–Ф3 готовы ✅, Ф2 (AudioPort wiring) 🟡, Ф4 (контент плагинов) 🟡, Ф5 (MIDI/Desktop) 🔴.

---

*Обновляй этот файл при изменениях в структуре проекта, добавлении новых модулей или смене конвенций.*
