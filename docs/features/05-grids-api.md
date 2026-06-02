# F5 — Grids API (public catalog + own CRUD + copy + import/export + likes + generate + seed)

**Ветка:** `feature/grids-api`

## Scope
REST для публичного каталога, своих сеток, лайков, настроек, паттернов и генерации
согласно [04-api.md §3–5](../04-api.md).

- Таблицы `harmony_grids` (+ `visibility`, `source_grid_id`), `grid_likes`, `patterns`
  (Drizzle schema + миграция).
- **Публичный каталог (без auth)**: `GET /api/grids/public` (поиск `?q`, сортировка),
  `GET /api/grids/public/:id` (с content, `likeCount`, `likedByMe`).
- **Свой каталог (auth)**: `GET /api/grids/mine`, `POST /api/grids` (создаётся `private`),
  `GET/PATCH/DELETE /api/grids/:id` (только своя), `GET /api/grids/:id/export`.
- **Copy (auth)**: `POST /api/grids/:id/copy` — копирует публичную **или** свою в
  `private`-копию текущего пользователя с `source_grid_id`.
- **Import (auth)**: `POST /api/grids/import` (DSL → своя сетка через `music-core`).
- **Likes (auth)**: `POST/DELETE /api/grids/:id/like` (только по публичной; идемпотентно).
- **Settings (auth)**: `GET /api/settings`, `PATCH /api/settings`.
- **Generate (без auth)**: `GET /api/patterns`, `POST /api/generate` (через `music-core`).
- Валидация тел Zod-схемами из `@jazz/shared`.
- Access-модель: публичные маршруты открыты; приватные — require-auth + изоляция по userId
  (чужая/приватная по `/grids/:id` → `404`).
- **Seed**: `npm run db:seed` — system user + публичные seed-сетки + dev-пользователь со
  своими `private`-сетками.

## Зависимости
F1 (DSL), F3 (generator), F4 (auth + access-хелперы + БД + system user).

## Контракты
Эндпоинты/DTO/схемы — [04-api.md](../04-api.md). `GridContent`/`visibility`/`grid_likes` —
[03-data-model.md](../03-data-model.md).

## Тесты (integration, Vitest + Supertest)
- Публичный каталог (аноним): список/поиск/один → `200`; приватная по `/public/:id` → `404`.
- Свой CRUD (auth): создание `private`, цикл CRUD, export; `mine` отдаёт только свои.
- Copy публичной авторизованным → новая `private`-копия с `sourceGridId`; copy чужой
  приватной → `404`.
- Import парсит DSL; невалидный DSL → `400` с ошибками; export сериализует.
- Likes: like/unlike публичной (идемпотентно), `likeCount`/`likedByMe` корректны; лайк
  приватной → `404`; аноним → `401`.
- settings GET/PATCH с валидацией границ (auth); аноним → `401`.
- generate (аноним) → валидный `GridContent`.
- **Permission**: A создаёт `private` → B получает `404` на GET/PATCH/DELETE/copy/export;
  аноним → `401` на `mine`/`settings`/`like`.

## Definition of Done
- Публичный каталог, свой CRUD, copy, import/export, лайки, настройки, генерация работают
  и покрыты тестами.
- Seed (system + public + dev) загружается; permission-тесты зелёные.
