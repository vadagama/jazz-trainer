# 04 — REST API

## Цель документа

Описать REST-эндпоинты, форматы запросов/ответов, схему аутентификации (cookie-сессия),
permission-модель и коды ошибок. Бэкенд — **Fastify + TypeScript**. Валидация
вход/выхода — Zod-схемы из `packages/shared`.

---

## 1. Общие правила

- Базовый префикс: `/api`.
- Формат: JSON. Контент-тип `application/json`.
- Авторизация: **cookie-сессия** (`sid`, HttpOnly, SameSite=Lax, Secure в проде).
- **Public-first**: API делится на **публичные** эндпоинты (доступны без сессии) и
  **приватные** (требуют сессии). См. §1.1.
- Валидация тела/параметров — Zod-схемы (`@shared/schemas`); ошибка валидации → `400`.
- Изоляция: приватный ресурс с чужим `user_id` → `404` (не раскрываем существование).

### 1.1 Публичные vs приватные эндпоинты

**Публичные (без auth):**
- `GET /api/health`
- `GET /api/auth/*` (вход) и `GET /api/auth/me` (вернёт `null`, если нет сессии)
- `GET /api/grids/public` — список/поиск публичного каталога
- `GET /api/grids/public/:id` — публичная сетка (для просмотра/плеера)
- `GET /api/patterns` — список встроенных паттернов
- `POST /api/generate` — генерация (результат не сохраняется)

**Приватные (требуют сессии → иначе `401`):**
- `GET /api/grids/mine` и весь CRUD своих сеток
- `POST /api/grids/:id/copy` — копировать (в т.ч. публичную) себе
- `POST /api/grids/import` — импорт DSL в свою сетку
- `GET|PATCH /api/settings` — настройки на сервере
- `POST|DELETE /api/grids/:id/like` — лайк/анлайк публичной сетки

> Анонимный пользователь меняет BPM/клик/размер/тональность **локально** (localStorage +
> ephemeral override для текущего плейбека) — это не обращается к API и ничего не сохраняет.

### Формат ошибки
```json
{ "error": { "code": "NOT_FOUND", "message": "Grid not found" } }
```
Коды: `UNAUTHENTICATED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404),
`VALIDATION_ERROR` (400, + `details` от Zod), `CONFLICT` (409), `INTERNAL` (500).

---

## 2. Auth

Поддерживаются два провайдера: **Google OAuth** и **dev-login** (fallback, включается
переменной окружения `AUTH_DEV_MODE=true`; в проде выключен).

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/auth/google` | редирект на Google OAuth consent |
| GET | `/api/auth/google/callback` | callback: обмен кода, upsert user, создание сессии, редирект на web |
| POST | `/api/auth/dev-login` | dev-fallback: `{ email, name? }` → upsert dev-user + сессия (только при `AUTH_DEV_MODE`) |
| GET | `/api/auth/me` | `{ user }` если есть сессия, иначе `{ user: null }` (200, не 401) |
| POST | `/api/auth/logout` | удалить сессию, очистить cookie |

`GET /api/auth/me` намеренно **публичный** и возвращает `{ user: null }` для анонима —
фронт по нему решает, показывать ли персональные возможности.

При первом входе (Google или dev) создаётся `User` + дефолтные `UserSettings`.

**Поток Google OAuth (Authorization Code):**
```
web → GET /api/auth/google → 302 Google consent
Google → GET /api/auth/google/callback?code=... 
  api: обмен code на токены → профиль (sub,email,name,picture)
  api: upsert users(provider='google', provider_id=sub) → ensure user_settings
  api: создать session, выставить cookie sid → 302 на FRONTEND_URL
```

---

## 3. User settings (приватные)

| Метод | Путь | Тело | Ответ |
|---|---|---|---|
| GET | `/api/settings` | — | `UserSettingsDTO` |
| PATCH | `/api/settings` | `UpdateSettingsSchema` (частичное) | `UserSettingsDTO` |

`UserSettingsDTO`: `{ bpm, clickStrong, clickWeak, volume, countIn }`.
Валидация: `bpm` 20–400, `volume` 0–1, `clickStrong/clickWeak` из списка звуков,
`countIn` ≥ 0.

> Анонимный пользователь не вызывает эти эндпоинты — те же поля хранятся в localStorage.
> При первом входе фронт может один раз отправить локальные значения через `PATCH /settings`.

---

## 4. Harmony grids

### 4.1 Публичный каталог (без auth)
| Метод | Путь | Параметры | Ответ |
|---|---|---|---|
| GET | `/api/grids/public` | `?q=&sort=&limit=&offset=` | `PublicGridSummaryDTO[]` (поиск по названию/тональности) |
| GET | `/api/grids/public/:id` | — | `PublicGridDTO` (с content, для просмотра/плеера) |

- `q` — поиск по названию (и опц. тональности); `sort` — `updated` \| `likes` \| `name`.
- `PublicGridSummaryDTO`: `{ id, name, timeSignature, key, barsCount, likeCount, likedByMe, updatedAt }`.
  `likedByMe` = `false` для анонима; для авторизованного — есть ли его лайк.
- `PublicGridDTO`: то же + `content` + `owner: { name }` (без приватных данных).
- Запрос `private`-сетки через `/public/:id` → `404`.

### 4.2 Свой каталог (требует auth)
| Метод | Путь | Тело | Ответ |
|---|---|---|---|
| GET | `/api/grids/mine` | — | `HarmonyGridSummaryDTO[]` (свои, без content) |
| POST | `/api/grids` | `CreateGridSchema` | `HarmonyGridDTO` (201) — создаётся `private` |
| GET | `/api/grids/:id` | — | `HarmonyGridDTO` (только своя) |
| PATCH | `/api/grids/:id` | `UpdateGridSchema` (частичное) | `HarmonyGridDTO` |
| DELETE | `/api/grids/:id` | — | `204` |
| POST | `/api/grids/:id/copy` | `{ name? }` | `HarmonyGridDTO` (201) — копия себе |
| POST | `/api/grids/import` | `{ name, timeSignature, dsl }` | `HarmonyGridDTO` (201) — DSL → своя сетка |
| GET | `/api/grids/:id/export` | — | `{ dsl }` — сериализация content → DSL |

- `HarmonyGridDTO`: `{ id, name, timeSignature, key, visibility, sourceGridId, content, createdAt, updatedAt }`.
- `HarmonyGridSummaryDTO`: `{ id, name, timeSignature, key, barsCount, visibility, updatedAt }`.
- **copy** работает и для **публичной** сетки (`:id` публичной), и для своей: создаёт
  новую `private`-сетку текущего пользователя с `source_grid_id` оригинала. Это и есть
  «перекинуть из публичного в свой».
- `GET/PATCH/DELETE/export /grids/:id` — только над **своей** сеткой; чужая/публичная по
  этому маршруту → `404` (публичную читать через `/public/:id`).
- `import/export` используют DSL parser/serializer из `music-core`; ошибки парсинга →
  `400 VALIDATION_ERROR` с позицией. См. [06-dsl.md](06-dsl.md).

### 4.3 Лайки (требует auth)
| Метод | Путь | Тело | Ответ |
|---|---|---|---|
| POST | `/api/grids/:id/like` | — | `{ likeCount, likedByMe: true }` |
| DELETE | `/api/grids/:id/like` | — | `{ likeCount, likedByMe: false }` |

- Лайкать можно только `public`-сетку; иначе `404`/`409`. Идемпотентно (повторный
  POST/DELETE не ломается). Аноним → `401`.

---

## 5. Generate (генерация гармонии) — публичные

| Метод | Путь | Тело | Ответ |
|---|---|---|---|
| GET | `/api/patterns` | — | `PatternInfoDTO[]` — встроенные паттерны генератора |
| POST | `/api/generate` | `GenerateSchema` | `{ content: GridContent }` — не сохраняется, только результат |

> Доступны без auth: аноним может генерировать и проигрывать прогрессию локально; чтобы
> сохранить результат как свою сетку — нужно войти (`POST /grids` или `/grids/import`).

`GenerateSchema`: `{ patternId, key, lengthBars?, options? }`.
Встроенные паттерны (`PatternInfoDTO`): ii-V-I major, ii-V-I minor, circle of fifths,
rhythm changes fragment, modal vamp, dominant chain, random diatonic, turnaround.

Генерация выполняется через `music-core` generator. Результат отдаётся как `GridContent`,
который фронт кладёт в редактор; пользователь правит и сохраняет через `POST/PATCH /grids`.

> Пользовательские паттерны (`patterns` таблица) — задел: эндпоинты CRUD для них могут
> быть добавлены позже без изменения контракта generate.

---

## 6. Permission-модель

- **optional-auth-preHandler** (на всех маршрутах): достаёт сессию из cookie (если есть) →
  грузит `user` в `request.user` или ставит `null`. Не отклоняет анонимов.
- **require-auth-preHandler** (на приватных маршрутах §3, §4.2, §4.3): нет сессии → `401`.
- Публичные маршруты (§4.1, §5, `/auth/me`, `/health`) доступны и анониму, и пользователю.
- Сервисы своих данных получают `userId = request.user.id` и фильтруют по нему.
- `/grids/:id` и его суб-маршруты — только над **своей** сеткой; публичная/чужая → `404`.
- Публичный каталог читается без фильтра по владельцу, но только `visibility='public'`.
- Покрывается явными тестами:
  - A создаёт `private`-сетку → B получает `404` на GET/PATCH/DELETE/copy(`/grids/:id`)/export;
  - аноним получает `401` на `/grids/mine`, `/settings`, `/grids/:id/like`;
  - аноним получает `200` на `/grids/public`, `/grids/public/:id`, `/patterns`, `/generate`;
  - `copy` публичной сетки авторизованным создаёт `private`-копию с `sourceGridId`.

---

## 7. Прочее

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/health` | `{ status: 'ok' }` — liveness, без auth |

### Конфигурация (env)
| Переменная | Назначение |
|---|---|
| `PORT` | порт API (по умолчанию 3001) |
| `DATABASE_URL` | путь к файлу SQLite |
| `SESSION_SECRET` | секрет подписи cookie |
| `FRONTEND_URL` | origin фронта (CORS + редиректы OAuth) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `GOOGLE_CALLBACK_URL` | callback URL |
| `AUTH_DEV_MODE` | `true` включает dev-login fallback |

### CORS / cookies
CORS разрешает `FRONTEND_URL` с `credentials: true`. Cookie `sid` — HttpOnly,
SameSite=Lax (dev: same-site через Vite proxy), Secure в проде.

### Контракты — единый источник
Все DTO и Zod-схемы определяются в `packages/shared` и импортируются и api, и web.
Это исключает рассинхронизацию контрактов.
