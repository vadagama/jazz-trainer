# F0 — Bootstrap monorepo

**Ветка:** `feature/bootstrap-monorepo`

## Scope
Создать каркас monorepo и тулинг, на котором встанут все остальные фичи.

- npm workspaces в корневом `package.json`: `apps/*`, `packages/*`.
- Базовый `tsconfig.base.json` + per-package `tsconfig.json` (project references).
- ESLint + Prettier (единый конфиг на корень).
- Vitest (корневой конфиг, прогон по всем workspaces) + Playwright (каркас, конфиг).
- `packages/shared`: package.json, точка входа, заготовки Zod-схем/типов (пустые модули
  с экспортами, которые наполнят F1/F4/F5).
- `packages/music-core`: package.json, структура каталогов (`dsl/`, `chords/`, `time/`,
  `playback/`, `audio/`, `generator/`), индекс-экспорты-заглушки.
- `apps/api`: минимальный Fastify-сервер с `GET /api/health`.
- `apps/web`: Vite + React + TS скелет, Tailwind + shadcn/ui инициализация, dark theme,
  пустой роутинг (Login/Dashboard заглушки).
- Корневые скрипты: `dev` (параллельно web+api), `build`, `test`, `lint`, `typecheck`.
- `.env.example`, `.gitignore`, обновление README (кратко: установка/запуск).

## Зависимости
Нет (первая фича).

## Контракты
Опирается на структуру из [01-architecture.md](../01-architecture.md). Алиасы пакетов:
`@jazz/shared`, `@jazz/music-core`.

## Тесты
- Smoke: `packages/shared` и `packages/music-core` собираются и экспортируют заглушки.
- API smoke: `GET /api/health` → `{ status: 'ok' }` (Vitest + Supertest).
- `npm run build` всех workspaces проходит.

## Definition of Done
- `npm install` в чистом клоне работает.
- `npm run dev` поднимает web (Vite) и api (Fastify) параллельно.
- `npm run test` зелёный (smoke-тесты).
