# Jazz Trainer

Браузерный тренажёр джазовой гармонии: гармонические сетки, точный метроном,
DSL для ввода гармонии и генераторы прогрессий. Архитектура заложена под будущий
accompaniment engine (бас, гармония, мелодия, барабаны, MIDI-экспорт).

> Приложение **публичное по умолчанию**: каталог и плеер доступны без входа.
> Аутентификация добавляет персональные возможности (свой каталог, настройки, лайки).

## Структура (monorepo, npm workspaces)

```
apps/
  web/            React + Vite frontend (view + actions)
  api/            Fastify backend + Drizzle + SQLite
packages/
  music-core/     DSL parser, chord model, transport, generator, playback state machine
  shared/         общие типы + Zod-схемы (DTO, grid content)
docs/             проектные документы (Phase 0)
```

Подробности — в [docs/01-architecture.md](docs/01-architecture.md).

## Требования

- Node.js >= 20.11
- npm >= 10

## Установка и запуск

```bash
npm install          # установить зависимости всех workspaces
cp .env.example .env # настроить окружение (значения по умолчанию рабочие для dev)
npm run dev          # поднять web (Vite :5173) и api (Fastify :3000) параллельно
```

- Web: http://localhost:5173
- API health: http://localhost:3000/api/health → `{ "status": "ok" }`

## Скрипты

| Скрипт | Назначение |
|---|---|
| `npm run dev` | web + api параллельно |
| `npm run build` | typecheck + сборка web и api |
| `npm run test` | unit/integration тесты (Vitest) |
| `npm run typecheck` | проверка типов по всем workspaces |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run e2e` | e2e-тесты (Playwright) |

## Переменные окружения

См. [.env.example](.env.example). Dev-login fallback (`AUTH_DEV_MODE=true`) позволяет
запускать и тестировать приложение без реальных Google OAuth credentials.

## Статус

Фича-за-фичой по плану (Phase 1): F0 bootstrap → F1 DSL → F2 transport →
F3 generator → F4 auth → F5 grids API → F6–F8 web → F9 финал.
Дорожная карта — [docs/07-features.md](docs/07-features.md).
