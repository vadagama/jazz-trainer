# Jazz Trainer

Браузерный тренажёр джазовой гармонии: гармонические сетки, точный метроном,
DSL для ввода гармонии, генераторы прогрессий, аккомпанемент (бас, барабаны, Rhodes).

> Приложение **публичное по умолчанию**: каталог и плеер доступны без входа.
> Аутентификация добавляет персональные возможности (свой каталог, настройки, лайки).

## Структура (monorepo, npm workspaces)

```
apps/
  web/                    React + Vite (оболочка)
  api/                    Fastify + SQLite + Drizzle
packages/
  music-core/             Чистая музыкальная логика (DSL, аккорды, транспорт, порты)
  shared/                 DTO (Zod), константы, общие типы
  plugin-sdk/             Контракты плагинов (extension points, хуки, apiClient)
  plugin-host/            Загрузка плагинов, агрегация вкладов
  plugin-registry/        Build-time реестр (16 плагинов)
  plugins/                16 плагинов (вся фичевая логика)
  adapters/               Платформенные адаптеры (Tone.js → AudioPort, Web MIDI)
  ui/                     Общие UI-компоненты
docs/                     Документация
```

Архитектура: **тонкое ядро + build-time плагины**. Подробнее:
- [ARCHITECTURE_BASE.md](docs/ARCHITECTURE_BASE.md) — текущая архитектура + архитектурные решения (ADR)
- [ARCHITECTURE_VISION.md](docs/ARCHITECTURE_VISION.md) — целевое видение архитектуры
- [FUNCTIONS.md](docs/FUNCTIONS.md) — каталог возможностей

## Требования

- Node.js >= 20.11
- npm >= 10

## Установка и запуск

```bash
npm install          # установить зависимости всех workspaces
cp .env.example .env # настроить окружение (значения по умолчанию рабочие для dev)
npm run dev          # поднять web (Vite :5173) и api (Fastify :3999) параллельно
```

- Web: http://localhost:5173
- API health: http://localhost:3999/api/health → `{ "status": "ok" }`

## Скрипты

| Скрипт | Назначение |
|---|---|
| `npm run dev` | web + api параллельно |
| `npm run build` | typecheck + сборка web и api |
| `npm run test` | unit/integration тесты (Vitest) |
| `npm run typecheck` | проверка типов по всем workspaces |
| `npm run lint` | ESLint + границы слоёв (boundaries) |
| `npm run format` | Prettier |
| `npm run e2e` | e2e-тесты (Playwright) |

## Переменные окружения

См. [.env.example](.env.example). Dev-login fallback (`AUTH_DEV_MODE=true`) позволяет
запускать и тестировать приложение без реальных Google OAuth credentials.

## Статус

Миграция на плагинную архитектуру:

| Фаза | Статус | Ключевой результат |
|---|---|---|
| Ф0 — Границы | ✅ | ESLint boundaries + strict, 0 нарушений |
| Ф1 — SDK + Host | ✅ | `plugin-sdk`, `plugin-host`, `plugin-registry`, shell bootstrap |
| ФR — RBAC + аудит | ✅ | 3 роли, 11 permissions, audit log |
| Ф2 — AudioPort | 🟢 | Адаптеры готовы (Tone.js, Web MIDI), wiring частичный |
| Ф3 — Фичи → плагины | ✅ | `core-editor`, `core-player`, `catalog` вынесены |
| Ф4 — Новые домены | 🟡 | 10 domain-плагинов созданы, наполнение в процессе |
| Ф5 — MIDI | 🟡 | MIDI-плагины готовы, Desktop исключён из скоупа |
