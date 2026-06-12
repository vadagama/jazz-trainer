# Отчёт: Фаза 1 — Выделить контракты и хост

**Ветка:** `refactoring/phase-1-contracts-host`  
**Коммит:** `bbf97ba`  
**База:** `refactoring/phase-0-boundaries` (3a256d7)  
**Дата:** 2026-06-11  
**Оценка по плану:** 1–2 дня, 2–3 PR

---

## Цель

Создать `plugin-sdk` и `plugin-host`. Хост обслуживает существующие фичи как встроенные псевдоплагины. Структура файлов не двигается, прод не тронут.

---

## Выполненные задачи

### 3.1 — `@jazz/plugin-sdk`

Новый пакет: `packages/plugin-sdk/` (8 файлов)

| Файл | Содержание |
|------|------------|
| `manifest.schema.ts` | Zod-схема `manifestSchema` + `validateManifest()`. Типы: `PluginManifestInput` (вход, `enabled` опционален), `PluginManifest` (выход после валидации) |
| `extension-points.ts` | Интерфейсы: `RouteContribution`, `NavItemContribution`, `CommandContribution`, `ActivityContribution`, `PluginContributions` |
| `context.ts` | Интерфейсы сервисов: `AudioService` (заглушка до фазы 2), `StorageService`, `SettingsService`, `NavigationService`, `EventBus`, `PluginContext` |
| `activity.ts` | Типы: `ActivityType`, `ActivityState<T>`, `ActivityResult`, `ActivityDefinition<T>` — жизненный цикл обучающих активностей |
| `definePlugin.ts` | `PluginDefinition` + `definePlugin()` — typed identity-хелпер |
| `index.ts` | Re-export всего SDK |
| `manifest.schema.test.ts` | 8 контрактных тестов |

**Зависимости:** `zod ^3.24.1`

### 3.2 — `@jazz/plugin-host`

Новый пакет: `packages/plugin-host/` (6 файлов)

| Файл | Содержание |
|------|------------|
| `loader.ts` | `loadPlugins()` — валидация id, дедупликация, проверка `enabled`, вызов `setup`, отлов ошибок |
| `aggregator.ts` | `aggregateContributions()` — сбор `routes[]` и `navItems[]` с привязкой `pluginId` |
| `context-factory.ts` | `createPluginContext()` — фабрика контекста с заглушками всех сервисов (переопределяются через `overrides`) |
| `index.ts` | Re-export |
| `__tests__/host.test.ts` | 11 интеграционных тестов |

**Зависимости:** `@jazz/plugin-sdk`

### 3.3 — `@jazz/plugin-registry`

Новый пакет: `packages/plugin-registry/` (2 файла)

```ts
export const PLUGINS: PluginDefinition[] = [];
```

Пустой массив — заполнится в Фазе 3, когда существующие фичи станут отдельными плагинами.

**Зависимости:** `@jazz/plugin-sdk`

### 3.4 — Интеграция в App Shell

Создана директория `apps/web/src/shell/`:

| Файл | Содержание |
|------|------------|
| `builtin-plugins.ts` | Псевдоплагин `builtinCorePlugin` — 8 роутов + 2 nav-элемента через `definePlugin()` |
| `bootstrap.ts` | Загружает `builtinCorePlugin` + реестр, агрегирует вклады, экспортирует `contributions` |

**Изменения в существующих файлах:**

| Файл | Изменение |
|------|-----------|
| `apps/web/package.json` | +3 зависимости: `@jazz/plugin-sdk`, `@jazz/plugin-host`, `@jazz/plugin-registry` |
| `apps/web/tsconfig.json` | +3 path-алиаса для новых пакетов |
| `apps/web/src/main.tsx` | +1 строка: `import './shell/bootstrap.js'` (сайд-эффект) |
| `tsconfig.base.json` | +6 path-алиасов |

`App.tsx` **не изменён** — хост работает рядом, не ломая существующее поведение.

---

## Новые тесты

| Пакет | Тестов | Описание |
|-------|--------|----------|
| `plugin-sdk` | 8 | `validateManifest`: валидный, без id, пустой id, пустое имя, неверный apiVersion, категория вне enum, enabled default, enabled=false |
| `plugin-host` | 11 | `loadPlugins`: загрузка, дубликат, отсутствие id, вызов setup, disabled-плагин, ошибка setup. `aggregateContributions`: сбор routes+navItems, без routes, без navItems. `createPluginContext`: все сервисы, overrides |

**Итого: 19 новых тестов** (348 всего: 329 старых + 19 новых)

---

## Архитектурные границы

Определены в Фазе 0, новые пакеты автоматически попадают под правила:

| Зона | Разрешённые импорты |
|---|---|
| `plugin-sdk` | `plugin-sdk`, `music-core`, `shared` |
| `plugin-host` | `plugin-host`, `plugin-sdk`, `music-core`, `shared` |
| `plugins/*` | `plugin-sdk`, `music-core`, `shared` |

Все три новых пакета соблюдают эти границы — линтер подтверждает 0 нарушений.

---

## Критерии приёмки

| Критерий | Результат |
|----------|-----------|
| `@jazz/plugin-sdk` собирается, экспортирует все типы | ✅ typecheck чист |
| `@jazz/plugin-host` собирается, тесты ≥8 | ✅ typecheck чист, 11 тестов |
| `@jazz/plugin-registry` существует | ✅ |
| Приложение запускается без изменений в поведении | ✅ `App.tsx` не тронут |
| `npm run typecheck` | ✅ все 7 workspace |
| `npm run test` | ✅ 348/348 |
| `npm run lint` | ✅ 0 новых нарушений (10 старых baseline) |

---

## Изменённые файлы

| Файл | Изменение |
|------|-----------|
| `tsconfig.base.json` | +6 алиасов |
| `apps/web/package.json` | +3 зависимости |
| `apps/web/tsconfig.json` | +3 алиаса |
| `apps/web/src/main.tsx` | +1 импорт bootstrap |
| `apps/web/src/shell/bootstrap.ts` | новый |
| `apps/web/src/shell/builtin-plugins.ts` | новый |
| `packages/plugin-sdk/*` | новый пакет (8 файлов) |
| `packages/plugin-host/*` | новый пакет (6 файлов) |
| `packages/plugin-registry/*` | новый пакет (2 файла) |

**Всего: 26 файлов, +642 / −6 строк**

---

## Следующий шаг

Фаза 2 — Звуковой порт (`refactoring/phase-2-audio-port`):
абстрагировать звук через `AudioPort`/`InputPort`, обернуть `useTransport` в `tone-audio-adapter`.
