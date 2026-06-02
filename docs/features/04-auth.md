# F4 — Auth (опциональная) + access model

**Ветка:** `feature/auth-google`

## Scope
Аутентификация (аддитивная, public-first) и каркас доступа согласно
[04-api.md §1.1,§2,§6](../04-api.md) и [ADR-010](../08-decisions.md).

- Fastify-приложение (фабрика `buildApp()` для тестируемости), CORS с `FRONTEND_URL`,
  cookie-плагин (подписанные cookie), регистрация Drizzle/SQLite + миграции.
- Таблицы `users` (+ `provider='system'`), `user_settings`, `sessions` (Drizzle schema +
  миграция) — [03-data-model.md](../03-data-model.md). **System user** создаётся миграцией/сидом.
- **Google OAuth** (Authorization Code): `/api/auth/google`, `/api/auth/google/callback`.
- **dev-login fallback**: `POST /api/auth/dev-login` (только при `AUTH_DEV_MODE=true`).
- При первом входе — создание `User` + дефолтные `UserSettings`.
- Сессии: создание/проверка/удаление; cookie `sid` HttpOnly.
- `GET /api/auth/me` → `{ user|null }` (публичный, без 401); `POST /api/auth/logout`.
- **optional-auth-preHandler** (на всех маршрутах: грузит `user|null`) + **require-auth-
  preHandler** (на приватных: нет сессии → `401`).
- **Хелпер изоляции** по userId (фильтрация «своего»; чужой/приватный → `404`) —
  применяется к данным в F5.

## Зависимости
F0. (Drizzle/SQLite вводится здесь, до F5.)

## Контракты
Эндпоинты auth, optional/require-auth, формат сессии/cookie, коды ошибок —
[04-api.md](../04-api.md). DTO (`UserDTO`, `UserSettingsDTO`) — в `@jazz/shared`.

## Тесты (integration, Vitest + Supertest)
- dev-login создаёт пользователя + настройки; `me` возвращает его; `logout` сбрасывает.
- **Аноним**: `GET /auth/me` → `{ user: null }` (200); require-auth-маршрут → `401`.
- Google callback — с замоканным обменом токенов.
- System user существует после миграции/сида и не может логиниться.
- Permission-хелпер: заготовка сценария «A vs B» (расширяется в F5 на сетки/лайки).

## Definition of Done
- Auth работает в dev-режиме end-to-end (без Google credentials); анонимный доступ открыт.
- optional/require-auth и изоляция покрыты тестами; зелёные.
- Миграции применяются; `npm run db:migrate` работает; system user заведён.
