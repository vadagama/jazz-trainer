# 03 — Модель данных

## Цель документа

Описать сущности БД, формат JSON-контента гармонической сетки, изоляцию по userId,
индексы и стратегию миграций. СУБД: **SQLite** (better-sqlite3), ORM: **Drizzle**,
миграции: **drizzle-kit**.

---

## 1. Обзор сущностей

```
User 1───1 UserSettings
User 1───* HarmonyGrid        (свои сетки; visibility=private по умолчанию)
User 1───* Pattern            (пользовательские паттерны — задел, частично в MVP)
User *───* HarmonyGrid (Like) (лайки публичных сеток — таблица grid_likes)
Session *──1 User             (серверные сессии для cookie-auth)

System User 1───* HarmonyGrid (seed/публичный каталог; visibility=public)

(встроенные паттерны генератора — это данные в коде music-core, не таблица)
```

Содержимое гармонической сетки (такты и аккорды) хранится **как JSON-поле внутри
HarmonyGrid** (решение подтверждено). Обоснование — §6.

### Модель доступа (public-first)
Приложение **публичное по умолчанию** (см. [04-api.md](04-api.md), [05-frontend.md](05-frontend.md)):
- **Анонимный** доступ: чтение публичного каталога (поиск/просмотр/плеер), смена
  BPM/клика/размера/тональности — всё **локально** (localStorage + ephemeral override),
  без записи в БД.
- **Аутентификация добавляет** персональные возможности: свой каталог сеток, сохранение
  настроек метронома на сервере, профиль, лайки публичных сеток, создание/редактирование
  своих сеток и импорт DSL, копирование публичной сетки «себе».
- **Публичный каталог в MVP** — это сетки системного пользователя (seed, джазовые
  стандарты) с `visibility = 'public'`. Пользователи их **копируют** себе, но **не
  публикуют** свои (публикация — задел на будущее, поле `visibility` уже заложено).

---

## 2. Таблицы

### 2.1 `users`
| Поле | Тип | Описание |
|---|---|---|
| `id` | TEXT (uuid) PK | идентификатор пользователя |
| `email` | TEXT UNIQUE NOT NULL | email из Google (или dev) |
| `name` | TEXT | отображаемое имя |
| `avatar_url` | TEXT NULL | аватар из Google |
| `provider` | TEXT NOT NULL | `'google'` \| `'dev'` \| `'system'` |
| `provider_id` | TEXT NOT NULL | sub из Google / dev-id / `'system'` |
| `created_at` | INTEGER (epoch ms) NOT NULL | |
| `updated_at` | INTEGER (epoch ms) NOT NULL | |

UNIQUE(`provider`, `provider_id`).

> **System user**: специальный пользователь (`provider='system'`, фикс. id, напр.
> `'system'`), которому принадлежат seed-сетки публичного каталога. Не может логиниться.
> Создаётся миграцией/сидом.

### 2.2 `user_settings` (1:1 с user)
Глобальные настройки метронома/звука на уровне пользователя — **только для
аутентифицированных**. Анонимные пользователи хранят те же поля в **localStorage** на
клиенте (сервер не создаёт строку). При первом входе клиент может предложить перенести
локальные настройки в профиль (PATCH /api/settings).
| Поле | Тип | Описание |
|---|---|---|
| `user_id` | TEXT PK FK→users.id | владелец |
| `bpm` | INTEGER NOT NULL DEFAULT 120 | дефолтный темп |
| `click_strong` | TEXT NOT NULL DEFAULT `'click_hi'` | звук сильной доли |
| `click_weak` | TEXT NOT NULL DEFAULT `'click_lo'` | звук слабой доли |
| `volume` | REAL NOT NULL DEFAULT 0.8 | громкость 0..1 |
| `count_in` | INTEGER NOT NULL DEFAULT 0 | затакт (кол-во тактов), 0 = выкл |
| `created_at` / `updated_at` | INTEGER | |

> BPM и настройки клика — **глобальные** (здесь). Тактовый размер — **пер-сетка** (в
> `harmony_grids.time_signature`). Это требование ТЗ.

### 2.3 `harmony_grids`
| Поле | Тип | Описание |
|---|---|---|
| `id` | TEXT (uuid) PK | |
| `user_id` | TEXT FK→users.id NOT NULL | владелец (изоляция); seed-сетки → system user |
| `visibility` | TEXT NOT NULL DEFAULT `'private'` | `'public'` \| `'private'` |
| `source_grid_id` | TEXT NULL FK→harmony_grids.id | если скопирована из публичной — ссылка на оригинал |
| `name` | TEXT NOT NULL | название сетки |
| `time_signature` | TEXT NOT NULL DEFAULT `'4/4'` | размер сетки (строка `"4/4"`) |
| `key` | TEXT NULL | тональность (для генерации/отображения), напр. `'C'` |
| `content` | TEXT (JSON) NOT NULL | сериализованный `GridContent` (см. §3) |
| `created_at` / `updated_at` | INTEGER NOT NULL | |

- Размер дублируется отдельным полем `time_signature` (а не только внутри JSON) ради
  сортировок/фильтров и явности контракта; внутри `content` он не хранится — единый
  источник правды это колонка.
- **Видимость**: `public` сетки читаются всеми (включая анонимов); `private` — только
  владельцем. В MVP `public` только у system user; у обычных пользователей сетки создаются
  как `private` (поле заложено под будущую публикацию).
- `source_grid_id` фиксирует происхождение копии (публичная → своя), для UI «скопировано из».

### 2.4 `grid_likes` (лайки публичных сеток — требует auth)
Связь many-to-many: какой пользователь лайкнул какую (публичную) сетку.
| Поле | Тип | Описание |
|---|---|---|
| `user_id` | TEXT FK→users.id NOT NULL | кто лайкнул |
| `grid_id` | TEXT FK→harmony_grids.id NOT NULL | какую сетку |
| `created_at` | INTEGER NOT NULL | |

PK(`user_id`, `grid_id`) — один лайк на пару. Лайкать можно только `public`-сетки.
Счётчик лайков для каталога считается агрегатом `COUNT(*) … GROUP BY grid_id` (для MVP
достаточно; при росте — денормализованный `like_count` на `harmony_grids`).

### 2.5 `patterns` (задел; в MVP — read-only встроенные + опц. сохранение)
Пользовательские паттерны генератора. Встроенные паттерны живут в коде `music-core`;
эта таблица — для будущих пользовательских.
| Поле | Тип | Описание |
|---|---|---|
| `id` | TEXT PK | |
| `user_id` | TEXT FK→users.id NOT NULL | владелец |
| `name` | TEXT NOT NULL | |
| `definition` | TEXT (JSON) NOT NULL | data-driven описание паттерна |
| `created_at` / `updated_at` | INTEGER | |

### 2.6 `sessions`
Серверные сессии для cookie-auth (Google OAuth + dev).
| Поле | Тип | Описание |
|---|---|---|
| `id` | TEXT PK | session id (в cookie, подписан) |
| `user_id` | TEXT FK→users.id NOT NULL | |
| `expires_at` | INTEGER NOT NULL | epoch ms |
| `created_at` | INTEGER NOT NULL | |

---

## 3. JSON-контент гармонической сетки (`GridContent`)

Валидируется Zod-схемой `GridContentSchema` в `packages/shared` — единый источник правды
для фронта и бэка.

```ts
interface GridContent {
  version: 1;                 // версия формата контента (для миграций JSON)
  bars: Bar[];
}

interface Bar {
  id: string;                 // стабильный id для DnD/выделения
  chords: ChordSlot[];        // 1+ аккордов в такте
}

interface ChordSlot {
  symbol: string;             // исходный текст аккорда, напр. "Dm7", "Am7b5"
  // распарсенная форма опциональна и кэшируется; источник правды — symbol
  parsed?: ChordSymbol | null;
  beats?: number | null;      // сколько долей занимает (null = поделить такт поровну)
}
```

`ChordSymbol` (из `music-core`, описан в [06-dsl.md](06-dsl.md)) — структура
{root, quality, extensions, alterations, bass}. В БД хранится `symbol` (текст); `parsed`
— производное, может пересчитываться парсером.

Пример `content`:
```json
{
  "version": 1,
  "bars": [
    { "id": "b1", "chords": [{ "symbol": "Dm7" }] },
    { "id": "b2", "chords": [{ "symbol": "G7" }] },
    { "id": "b3", "chords": [{ "symbol": "Cmaj7" }] },
    { "id": "b4", "chords": [{ "symbol": "Cmaj7", "beats": 2 }, { "symbol": "A7", "beats": 2 }] }
  ]
}
```

---

## 4. Изоляция и доступ

Доступ зависит от `visibility` сетки и наличия аутентификации:

- **Публичное чтение (без auth)**: `harmony_grids` с `visibility='public'` доступны всем
  на чтение (список/поиск/один/плеер). Анонимный запрос к `private`-сетке → `404`.
- **Приватные данные (с auth)**: `private`-сетки, `user_settings`, `patterns`, `sessions`
  имеют `user_id`; сервис **всегда** добавляет `WHERE user_id = :currentUser` для
  мутаций/выборок «своего». Чужой ресурс → `404` (не раскрываем существование).
- **Запись в публичную сетку запрещена** всем, кроме владельца (system user не логинится),
  т.е. в MVP публичные сетки фактически read-only; изменить можно только свою копию.
- **Лайки** (`grid_likes`): только аутентифицированный, только по `public`-сетке.
- Guard реализуется сквозным слоем в API; покрывается явными permission-тестами
  (A не получает/не меняет/не удаляет `private` B; аноним не лайкает и не пишет). См.
  [04-api.md](04-api.md).

---

## 5. Индексы

- `users (email)` UNIQUE; `users (provider, provider_id)` UNIQUE.
- `harmony_grids (user_id)` — список сеток пользователя.
- `harmony_grids (user_id, updated_at)` — сортировка «моего» каталога по дате.
- `harmony_grids (visibility, updated_at)` — публичный каталог + сортировка.
- `harmony_grids (visibility, name)` — поиск по названию в публичном каталоге.
- `grid_likes (grid_id)` — подсчёт лайков; `grid_likes (user_id)` — лайки пользователя.
- `patterns (user_id)`.
- `sessions (user_id)`; `sessions (expires_at)` — очистка протухших.

---

## 6. JSON-контент: плюсы и минусы (обоснование решения)

**Плюсы (почему выбрали для MVP):**
- Атомарные save/load всей сетки одним запросом — просто и без рассинхронизации.
- Структура сетки совпадает с тем, что нужно фронту и `music-core` — минимум маппинга.
- Лёгкая эволюция формата через поле `version` без тяжёлых SQL-миграций.
- Прямой round-trip с DSL (parse → GridContent → serialize) без сборки из таблиц.

**Минусы (и как смягчаем):**
- Нет SQL-запросов по отдельным аккордам/тактам (аналитика, поиск «все сетки с alt-доминантой»).
  → Для MVP не требуется; при необходимости вводится нормализация без смены публичного API.
- Валидация целиком на стороне приложения (Zod), а не на уровне схемы БД.
  → `GridContentSchema` валидирует на входе API; формат версионируется.
- Частичные обновления невозможны на уровне SQL.
  → Сетки небольшие; обновляем целиком, это приемлемо.

**Путь к нормализации (будущее):** при потребности добавляются таблицы
`harmony_bars` / `harmony_chords` с FK на grid; публичный DTO остаётся прежним
(API собирает/разбирает JSON ↔ строки), поэтому миграция не ломает фронт.

---

## 7. Миграции и seed

- Миграции — **drizzle-kit** (`drizzle/` каталог с SQL-миграциями, применяются при
  старте api или отдельной командой `npm run db:migrate`).
- Схема описана в `apps/api/src/db/schema.ts` (Drizzle).
- **Seed data** (`npm run db:seed`):
  - **System user** (`provider='system'`, id=`'system'`).
  - **Публичный каталог**: несколько `visibility='public'` сеток system user (джазовые
    стандарты: ii-V-I, blues, rhythm-changes-фрагмент, modal vamp) — видны анонимам.
  - **Dev-пользователь** + его дефолтные `user_settings` + 1–2 `private`-сетки — для
    разработки и e2e (логин через dev-login).
- Конфиг БД — через env (`DATABASE_URL`/путь к файлу SQLite). См. [04-api.md](04-api.md) и README.
