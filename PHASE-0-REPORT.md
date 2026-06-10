# Отчёт: Фаза 0 — Закрепить границы

**Ветка:** `refactoring/phase-0-boundaries`  
**Коммит:** `3a256d7`  
**Дата:** 2026-06-11  
**Оценка по плану:** 2–4 часа, 1 PR

---

## Цель

Архитектурные правила становятся принудительными. Риск минимальный, код не меняется.

---

## Выполненные задачи

### 0.1 — Установка зависимостей

```bash
npm i -D eslint-plugin-boundaries eslint-plugin-import eslint-import-resolver-typescript
```

| Пакет | Версия | Назначение |
|-------|--------|------------|
| `eslint-plugin-boundaries` | 6.0.2 | Контроль межмодульных зависимостей |
| `eslint-plugin-import` | 2.32.0 | Валидация import/export, запрет путей |
| `eslint-import-resolver-typescript` | — | Резолвинг `@/` алиасов и tsconfig paths |

### 0.2 — Матрица границ (`boundaries/dependencies`)

Настроено 8 правил с default `disallow` — любой импорт, не описанный явно, считается ошибкой.

| From (зона) | Разрешённые импорты |
|---|---|
| `packages/music-core` | `music-core`, `shared` |
| `packages/shared` | `shared` (ничего внешнего) |
| `packages/plugin-sdk` | `plugin-sdk`, `music-core`, `shared` |
| `packages/plugin-host` | `plugin-host`, `plugin-sdk`, `music-core`, `shared` |
| `packages/plugins/*` | `plugin-sdk`, `music-core`, `shared` |
| `packages/adapters/*` | `plugin-sdk`, `music-core`, `shared` |
| `apps/web` | `web`, `plugin-host`, `plugin-sdk`, `music-core`, `shared` |
| `apps/api` | `api`, `music-core`, `shared` |

Также добавлены `boundaries/elements` — дескрипторы типов элементов для каждой зоны (требование плагина v6).

Файл: `eslint.config.js`, строки 64–132.

### 0.3 — Запрет браузерных API в core-пакетах (`import/no-restricted-paths`)

Три правила:

| Target | From | Смысл |
|--------|------|-------|
| `packages/music-core` | `apps/*` | core не зависит от приложений |
| `packages/shared` | `apps/*` | shared не зависит от приложений |
| `packages/plugins` | `apps/web/src/shell` | плагины не импортируют shell |

Дополнительно подключены `import.flatConfigs.recommended` и `import.flatConfigs.typescript` для проверки корректности импортов.

Настроен `import/resolver` с проектами TypeScript (`tsconfig.base.json` + все дочерние), чтобы резолвились `@/` алиасы и workspace-пакеты.

Файл: `eslint.config.js`, строки 134–176.

### 0.4 — Линтер: baseline существующих нарушений

```
npm run lint → 20 problems (10 errors, 10 warnings)
```

Все 20 проблем — **ранее существовавшие ошибки кода**, не связанные с архитектурными границами:

- 3 неиспользуемые переменные (`@typescript-eslint/no-unused-vars`)
- 2 пустых блока (`no-empty`)
- 1 shadowing `Infinity` (`no-shadow-restricted-names`)
- 4 проблемы с хуками React (`react-hooks/exhaustive-deps`)
- И прочие предупреждения

**Нарушений границ: 0** — текущий код полностью соответствует архитектурной матрице.

Также добавлен `**/.claude/**` в секцию `ignores`, чтобы ESLint не сканировал рабочие деревья Claude.

### 0.5 — Проверка `strict: true`

| Файл | `strict` | Источник |
|------|----------|----------|
| `tsconfig.base.json` | `true` | задан явно |
| `packages/music-core/tsconfig.json` | `true` | наследует от base |
| `packages/shared/tsconfig.json` | `true` | наследует от base |
| `apps/web/tsconfig.json` | `true` | наследует от base |
| `apps/api/tsconfig.json` | `true` | наследует от base |

Все пять конфигов — `strict: true`, изменений не потребовалось.

---

## Критерии приёмки

| Критерий | Результат |
|----------|-----------|
| `npm run lint` без новых ошибок | ✅ 0 нарушений границ, 10 старых ошибок (baseline) |
| `npm run typecheck` | ✅ все 4 workspace — без ошибок |
| `npm run test` | ✅ 329/329 тестов зелёные |

---

## Изменённые файлы

| Файл | Изменение |
|------|-----------|
| `package.json` | +3 devDependencies |
| `package-lock.json` | lock-файл обновлён |
| `eslint.config.js` | +125 строк: ignores, boundaries, import rules |

---

## Следующий шаг

Фаза 1 — Выделить контракты и хост (`refactoring/phase-1-contracts-host`):
создать `@jazz/plugin-sdk` и `@jazz/plugin-host`, обслужить существующие фичи как псевдоплагины.
