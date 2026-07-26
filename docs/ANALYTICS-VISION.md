# ANALYTICS VISION — Раздел аналитики в админке

**Дата:** 2026-07-19
**Горизонт:** v1.0 (MVP) → v1.1 (расширение)
**Статус:** 🟡 Черновик
**Связанные документы:** `ROLES.md`, `ARCHITECTURE_BASE.md` (ADR-007, ADR-011), `FUNCTIONS.md` §5.5

---

## 1. Резюме (Executive Summary)

Jazz Trainer собирает данные, но не использует их. Таблица `audit_log` спроектирована (ADR-007), сервис `withAudit()` готов — но **ни разу не вызван** (D-011 в `TECH_DEPT.md`). Страница диагностики (`admin-diagnostics`) — заглушка. Ноль видимости в поведение пользователей.

В этой версии мы превращаем сырой аудит-лог в **полноценную аналитическую подсистему**: событийное логирование всех значимых действий, агрегирующие таблицы, дашборды с графиками и фильтрами. Администратор получает ответы на вопросы: сколько активных пользователей, какие упражнения популярны, кто создаёт контент, где отваливаются.

**Ключевое архитектурное решение:** разделение на горячее (SQLite, последние 7 дней) и холодное (S3-совместимое объектное хранилище / файловая система, архивы старше) хранение сырых событий. Агрегаты — всегда в SQLite, обновляются по расписанию (каждые N минут/часов).

**Главная ценность:** product-driven decisions на основе данных, а не интуиции. Понимание retention, engagement, контентных предпочтений.

---

## 2. Текущее состояние (Baseline)

### 2.1. Что уже есть

| Компонент                         | Статус          | Локация                                                      |
| --------------------------------- | --------------- | ------------------------------------------------------------ |
| Таблица `audit_log`               | 🟢 Готово       | `apps/api/src/db/schema.ts:262-276`                          |
| `withAudit()` / `withAuditSync()` | 🟢 Готово       | `apps/api/src/services/audit.service.ts`                     |
| `GET /api/admin/audit`            | 🟢 Декларирован | `FUNCTIONS.md:452` (фактически не реализован)                |
| `audit:read` permission           | 🟢 Готово       | `ROLES.md:58`                                                |
| Плагин `admin-diagnostics`        | 🟡 Заглушка     | `packages/plugins/admin-diagnostics/src/DiagnosticsPage.tsx` |
| RBAC (super_admin, admin)         | 🟢 Готово       | Доступ к `/admin/diagnostics` через `diagnostics:read`       |

### 2.2. Критические пробелы

1. **`withAudit()` — 0 call sites.** Ни одна мутация не пишет в `audit_log`. (D-011)
2. **Нет событий read-типа.** Просмотр страниц, запуск упражнений, прослушивание — не фиксируются.
3. **Нет агрегаций.** Сырой лог не свёрнут в метрики.
4. **Нет UI.** Страница диагностики — пустой div.
5. **Нет таксономии событий.** Нет согласованного списка `action`/`entity_type`.

---

## 3. Конкурентный контекст

| Продукт                       | Аналитика                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------- |
| **EarMaster**                 | Встроенная статистика: прогресс по урокам, счёт, время. Без дашбордов.                            |
| **iReal Pro**                 | Нет аналитики.                                                                                    |
| **musictheory.net**           | Нет аналитики.                                                                                    |
| **Flat**                      | Нет аналитики для образования.                                                                    |
| **Duolingo** (референс)       | Полноценная аналитика: streaks, XP, время, графики прогресса. **Но для пользователя, не админа.** |
| **Google Analytics / Matomo** | Универсальная веб-аналитика. Не семантическая (не знает про «запустил упражнение ii–V–I в Bb»).   |

**Вывод:** Ниша свободна. Ни один конкурент в музыкальном EdTech не даёт админу/преподавателю аналитику по активности учеников. Jazz Trainer может быть первым — особенно в сценарии «преподаватель следит за группой студентов».

---

## 4. Таксономия событий (Event Catalog)

### 4.1. Принципы

- **Событие** — факт, неизменяемый после записи (append-only).
- **Сырые события** пишутся в момент действия с минимальной задержкой.
- **Агрегаты** вычисляются из сырых событий периодически (cron/interval).
- События делятся на **безопасностные** (логин, смена роли) и **продуктовые** (запуск упражнения, лайк).

### 4.2. Уровень 1: Безопасность и аккаунт (security-critical)

| `event_type`         | `entity_type`   | Описание                        | Данные                             |
| -------------------- | --------------- | ------------------------------- | ---------------------------------- |
| `auth:register`      | `user`          | Регистрация нового пользователя | `{ provider, email }`              |
| `auth:login`         | `session`       | Вход в систему                  | `{ provider }`                     |
| `auth:logout`        | `session`       | Выход                           | —                                  |
| `auth:token_refresh` | `session`       | Обновление токена               | —                                  |
| `user:update_role`   | `user`          | Изменение роли пользователя     | `{ old_role, new_role, actor_id }` |
| `user:disable`       | `user`          | Блокировка аккаунта             | `{ actor_id }`                     |
| `user:enable`        | `user`          | Разблокировка аккаунта          | `{ actor_id }`                     |
| `settings:update`    | `user_settings` | Изменение настроек              | `{ changed_keys[] }`               |

### 4.3. Уровень 2: Контент и творчество

| `event_type`   | `entity_type` | Описание                       | Данные                                     |
| -------------- | ------------- | ------------------------------ | ------------------------------------------ |
| `grid:create`  | `grid`        | Создание гармонической сетки   | `{ grid_id, style, length_bars }`          |
| `grid:update`  | `grid`        | Редактирование сетки           | `{ grid_id }`                              |
| `grid:delete`  | `grid`        | Удаление сетки                 | `{ grid_id }`                              |
| `grid:fork`    | `grid`        | Форк (копирование) чужой сетки | `{ source_grid_id, new_grid_id }`          |
| `grid:publish` | `grid`        | Публикация в каталог           | `{ grid_id, is_public }`                   |
| `grid:view`    | `grid`        | Просмотр сетки в каталоге      | `{ grid_id, source: 'catalog'\|'editor' }` |
| `grid:like`    | `grid`        | Лайк сетки в каталоге          | `{ grid_id }`                              |
| `grid:unlike`  | `grid`        | Снятие лайка                   | `{ grid_id }`                              |

### 4.4. Уровень 3: Обучение и практика

| `event_type`        | `entity_type` | Описание                  | Данные                                             |
| ------------------- | ------------- | ------------------------- | -------------------------------------------------- |
| `exercise:start`    | `exercise`    | Запуск упражнения         | `{ exercise_type, config_hash }`                   |
| `exercise:complete` | `exercise`    | Завершение упражнения     | `{ exercise_type, duration_sec, score, mistakes }` |
| `exercise:abandon`  | `exercise`    | Прерывание упражнения     | `{ exercise_type, duration_sec, progress_pct }`    |
| `quiz:start`        | `quiz`        | Начало квиза              | `{ quiz_type }`                                    |
| `quiz:complete`     | `quiz`        | Завершение квиза          | `{ quiz_type, score, total, duration_sec }`        |
| `theory:view`       | `theory_page` | Просмотр страницы теории  | `{ page_id, duration_sec? }`                       |
| `playback:start`    | `playback`    | Запуск воспроизведения    | `{ grid_id, bpm, style, instruments[] }`           |
| `playback:stop`     | `playback`    | Остановка воспроизведения | `{ grid_id, duration_sec }`                        |
| `recording:start`   | `recording`   | Начало MIDI-записи        | `{ grid_id }`                                      |
| `recording:save`    | `recording`   | Сохранение записи         | `{ recording_id, duration_sec, grid_id }`          |

### 4.5. Уровень 4: Социальное и каталог

| `event_type`     | `entity_type` | Описание                  | Данные               |
| ---------------- | ------------- | ------------------------- | -------------------- |
| `catalog:search` | `catalog`     | Поиск в каталоге          | `{ query, filters }` |
| `catalog:browse` | `catalog`     | Просмотр каталога (лента) | `{ page, sort }`     |
| `profile:view`   | `user`        | Просмотр чужого профиля   | `{ target_user_id }` |

### 4.6. Схема таблицы событий (расширение `audit_log`)

Текущий `audit_log` покрывает только мутации. Предлагаю **обобщить** его до `events`:

```sql
CREATE TABLE events (
  id          TEXT PRIMARY KEY,          -- UUID
  actor_id    TEXT NOT NULL,             -- user ID (или 'anonymous')
  event_type  TEXT NOT NULL,             -- 'auth:login', 'exercise:start', etc.
  entity_type TEXT NOT NULL,             -- 'user', 'grid', 'exercise', etc.
  entity_id   TEXT NOT NULL,             -- ID сущности
  payload     TEXT,                      -- JSON: произвольные данные события
  session_id  TEXT,                      -- ID сессии (для связывания событий)
  ip          TEXT,
  user_agent  TEXT,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_events_type_time ON events(event_type, created_at);
CREATE INDEX idx_events_actor_time ON events(actor_id, created_at);
CREATE INDEX idx_events_entity ON events(entity_type, entity_id);
CREATE INDEX idx_events_session ON events(session_id);
CREATE INDEX idx_events_created ON events(created_at);
```

> **Миграция:** Переименовать `audit_log` → `events`, добавить поля `event_type`, `payload`, `session_id`. Данные из старого `audit_log` маппить: `action` → `event_type`, `before`/`after` → `payload`.

---

## 5. Агрегирующие таблицы и графики

### 5.1. Принцип агрегации

Агрегаты вычисляются из сырых событий **периодически** (cron-задача каждые 15 минут / 1 час / 1 день — зависит от гранулярности). Результат сохраняется в материализованные таблицы в SQLite.

| Агрегат            | Гранулярность    | Обновление    |
| ------------------ | ---------------- | ------------- |
| Почасовые срезы    | `hour`           | Каждые 15 мин |
| Дневные срезы      | `day`            | Каждый час    |
| Недельные/месячные | `week` / `month` | Раз в день    |

### 5.2. Агрегат 1: Активность пользователей (DAU/WAU/MAU)

```sql
CREATE TABLE agg_user_activity (
  period      TEXT NOT NULL,   -- '2026-07-19' (day) / '2026-W29' (week) / '2026-07' (month)
  period_type TEXT NOT NULL,   -- 'day', 'week', 'month'
  total_users INTEGER NOT NULL,
  new_users   INTEGER NOT NULL,
  active_users INTEGER NOT NULL, -- хотя бы 1 событие за период
  returning_users INTEGER NOT NULL, -- были активны в предыдущем периоде
  PRIMARY KEY (period, period_type)
);
```

**График:** `DAU/WAU/MAU` — линейный график, stacked bars.

### 5.3. Агрегат 2: События по типам

```sql
CREATE TABLE agg_events_by_type (
  period       TEXT NOT NULL,
  period_type  TEXT NOT NULL,
  event_type   TEXT NOT NULL,  -- 'exercise:start', 'grid:create', etc.
  count        INTEGER NOT NULL,
  unique_users INTEGER NOT NULL,
  PRIMARY KEY (period, period_type, event_type)
);
```

**График:** Гистограмма по `event_type` за выбранный период. Топ-10 событий.

### 5.4. Агрегат 3: Упражнения

```sql
CREATE TABLE agg_exercises (
  period        TEXT NOT NULL,
  period_type   TEXT NOT NULL,
  exercise_type TEXT NOT NULL, -- 'ear_training', 'rhythm_drills', 'chord_quiz', 'practice_cards'
  starts        INTEGER NOT NULL,
  completes     INTEGER NOT NULL,
  abandons      INTEGER NOT NULL,
  completion_rate REAL NOT NULL, -- completes / starts
  avg_duration_sec REAL,
  avg_score      REAL,
  unique_users   INTEGER NOT NULL,
  PRIMARY KEY (period, period_type, exercise_type)
);
```

**Графики:**

- `completion_rate` по типам упражнений (bar chart)
- `starts` vs `completes` vs `abandons` (stacked bar)
- `avg_score` тренд (линейный график)

### 5.5. Агрегат 4: Контент

```sql
CREATE TABLE agg_content (
  period        TEXT NOT NULL,
  period_type   TEXT NOT NULL,
  grids_created  INTEGER NOT NULL,
  grids_published INTEGER NOT NULL,
  grids_viewed   INTEGER NOT NULL,
  grids_liked    INTEGER NOT NULL,
  unique_creators INTEGER NOT NULL,
  total_public_grids INTEGER NOT NULL, -- кумулятивно на конец периода
  PRIMARY KEY (period, period_type)
);
```

**Графики:**

- Создание/публикация по дням (линейный)
- Топ-10 сеток по просмотрам/лайкам (bar chart, таблица)

### 5.6. Агрегат 5: Retention (когортный анализ)

```sql
CREATE TABLE agg_retention (
  cohort_week  TEXT NOT NULL, -- неделя регистрации '2026-W29'
  week_n       INTEGER NOT NULL, -- номер недели от регистрации (0, 1, 2...)
  cohort_size  INTEGER NOT NULL, -- сколько зарегистрировалось в cohort_week
  active_count INTEGER NOT NULL, -- сколько из них были активны на week_n
  retention_pct REAL NOT NULL,
  PRIMARY KEY (cohort_week, week_n)
);
```

**График:** Тепловая карта удержания (cohort-week × week-N), треугольная матрица.

### 5.7. Агрегат 6: Сессии и вовлечённость

```sql
CREATE TABLE agg_sessions (
  period            TEXT NOT NULL,
  period_type       TEXT NOT NULL,
  total_sessions    INTEGER NOT NULL,
  avg_session_duration_sec REAL,
  avg_events_per_session REAL,
  bounce_sessions   INTEGER NOT NULL, -- ≤ 1 события
  PRIMARY KEY (period, period_type)
);
```

**График:** Средняя длительность сессии по дням (линейный).

### 5.8. Агрегат 7: Инструменты и стили

```sql
CREATE TABLE agg_playback (
  period       TEXT NOT NULL,
  period_type  TEXT NOT NULL,
  style        TEXT NOT NULL, -- 'swing', 'bossa', 'funk', 'latin', 'ballad'
  play_count   INTEGER NOT NULL,
  avg_bpm      REAL,
  top_instruments TEXT, -- JSON: самые используемые инструменты
  unique_users INTEGER NOT NULL,
  PRIMARY KEY (period, period_type, style)
);
```

**График:** Pie/bar по стилям, bar по инструментам.

---

## 6. Архитектурное решение: хранение (Hot / Cold)

### 6.1. Проблема

SQLite — быстрая, но не бесконечная. При 1000 активных пользователей, генерирующих ~50 событий/день каждый, за месяц накапливается ~1.5 млн строк. За год — ~18 млн. SQLite справляется (limit ~281 TB), но:

- Растёт размер бекапа.
- Замедляются запросы на сырых данных.
- Дорого хранить «холодные» данные в оперативной БД.

### 6.2. Решение: Двухуровневое хранение

```
┌──────────────────────────────────────────────────────┐
│                    Hot Storage (SQLite)               │
│  • events: последние 7 дней                           │
│  • agg_*: все периоды (агрегаты — компактные)         │
│  • Быстрые запросы, дашборды, фильтры                 │
├──────────────────────────────────────────────────────┤
│                   Cold Storage (S3/File)              │
│  • events: архивы старше 7 дней                       │
│  • Формат: NDJSON.gz (по дням)                        │
│  • Хранение: $0.02/GB/мес (S3) или ~$0 (локально)     │
│  • Восстановление: по запросу (rehydrate)              │
└──────────────────────────────────────────────────────┘
```

### 6.3. Формат холодного хранения

```
s3://jazz-trainer-analytics/
  events/
    2026/
      07/
        13.jsonl.gz   ← день целиком, сжатый
        14.jsonl.gz
        ...
```

Каждая строка — JSON-объект события (та же структура, что в SQLite). Сжатие gzip (текстовые JSON-логи сжимаются в ~10x).

### 6.4. Архивация (cron, раз в сутки)

1. `SELECT * FROM events WHERE created_at < unixepoch() - 7*86400`
2. Сформировать NDJSON-файл за каждый день.
3. Gzip.
4. Отправить в S3 (или сохранить локально в `data/archive/`).
5. `DELETE FROM events WHERE created_at < unixepoch() - 7*86400`.
6. Записать мета-запись в таблицу `archive_manifest` (какой день куда сохранён).

### 6.5. Восстановление (rehydrate)

По запросу администратора «показать сырые события за 2026-06-01»:

1. Проверить `archive_manifest` — где файл.
2. Скачать из S3, распаковать.
3. Загрузить во временную таблицу SQLite (`events_archive`).
4. Показать в UI. Удалить временную через TTL (1 час).

### 6.6. Альтернативы и обоснование выбора

| Вариант                       | Плюсы                           | Минусы                                    | Вердикт                           |
| ----------------------------- | ------------------------------- | ----------------------------------------- | --------------------------------- |
| **Всё в SQLite**              | Простота. 0 новых зависимостей. | Рост БД, замедление бекапов.              | ✅ **Рекомендовано для MVP**      |
| **SQLite + S3**               | Дешёвое холодное хранение.      | Зависимость от S3 API, сложность restore. | 🟡 Для продакшена, если >1000 MAU |
| **SQLite + локальные файлы**  | Дешёво, без внешних сервисов.   | Нужен volume/диск.                        | 🟡 Компромисс для self-hosted     |
| **Внешняя OLAP (ClickHouse)** | Мощная аналитика.               | Избыточно для масштаба.                   | ❌ Over-engineering               |
| **Google Analytics / Matomo** | Готово, дёшево.                 | Нет семантики («запустил ii–V–I»).        | ❌ Не подходит                    |

**Рекомендация на MVP (v1.0):** Все данные — в SQLite. Добавить `events` таблицу. Никакого S3. Агрегаты считать в той же SQLite. Архивацию включить в v1.1, когда объём данных станет заметным (>5 млн событий).

### 6.7. Промежуточное решение (v1.0+): локальная архивация

До внедрения S3, хранить архивы как `.jsonl.gz` в `apps/api/data/archive/events/`. Self-hosted сервер сам управляет диском. S3 — опциональный бэкенд для `data/archive/`.

---

## 7. Дашборды и UI

### 7.1. Структура страницы аналитики

Новый плагин: `admin-analytics` (или расширение `admin-diagnostics`).

**Маршрут:** `/admin/analytics`
**Нав-секция:** `admin`, label: «Аналитика», icon: `bar-chart`
**Permission:** `analytics:read` (новое)

### 7.2. Компоненты дашборда

```
┌──────────────────────────────────────────────────────────┐
│  Фильтры                                                 │
│  [Диапазон дат: 2026-07-01 – 2026-07-19]  [Период: день] │
│  [Тип события: все ▾]  [Пользователь: все ▾]             │
├──────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │
│  │ DAU    127  │ │ WAU    342  │ │ MAU    891  │         │
│  └─────────────┘ └─────────────┘ └─────────────┘         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │
│  │ Событий  5k │ │ Новых   12  │ │ Retention  │         │
│  │ за период   │ │ за период   │ │ D7    34%   │         │
│  └─────────────┘ └─────────────┘ └─────────────┘         │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Активность по дням (DAU)                                │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░  ← линейный график           │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  События по типам (топ-10)        Упражнения              │
│  ┌──────────────────────┐  ┌──────────────────────┐      │
│  │ exercise:start  1200 │  │ ████████░░ ear       │      │
│  │ exercise:compl   890 │  │ █████░░░░░ rhythm    │      │
│  │ grid:view        650 │  │ ████░░░░░░ quiz      │      │
│  │ ...                  │  │ ...                  │      │
│  └──────────────────────┘  └──────────────────────┘      │
│                          │                                │
│  Retention (когорты)       Контент                       │
│  ┌──────────────────────┐  ┌──────────────────────┐      │
│  │ W27 100% 45% 30%    │  │ Создано:   34         │      │
│  │ W28 100% 52%  ...   │  │ Опублик:   12         │      │
│  │ W29 100% ...        │  │ Лайков:    89         │      │
│  └──────────────────────┘  └──────────────────────┘      │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  Таблица: Последние события (сырой лог)                   │
│  [Время]  [Пользователь]  [Событие]  [Детали]            │
│  12:34    oleg@...        exercise:complete  score:85    │
│  12:30    maria@...       grid:create    style:swing     │
│  ...                                                     │
└──────────────────────────────────────────────────────────┘
```

### 7.3. Фильтры и диапазоны

| Фильтр             | Тип             | Значения                                       |
| ------------------ | --------------- | ---------------------------------------------- |
| **Диапазон дат**   | DateRangePicker | От–до, пресеты: сегодня, 7д, 30д, 90д, всё     |
| **Гранулярность**  | Select          | Час, день, неделя, месяц                       |
| **Тип события**    | MultiSelect     | Группы: все, безопасность, контент, упражнения |
| **Пользователь**   | SearchSelect    | По email/имени                                 |
| **Тип упражнения** | Select          | ear_training, rhythm_drills и т.д.             |
| **Стиль**          | Select          | swing, bossa, funk, latin, ballad              |

### 7.4. Экспорт

- **CSV** — экспорт сырых событий за выбранный период.
- **JSON** — экспорт агрегатов.

---

## 8. Улучшения существующих функций

### 8.1. Подключение `withAudit()` (D-011)

Во все мутирующие эндпоинты добавить вызов `withAudit()`:

| Эндпоинт                            | `event_type`                   |
| ----------------------------------- | ------------------------------ |
| `POST /api/auth/register`           | `auth:register`                |
| `POST /api/auth/login`              | `auth:login`                   |
| `POST /api/auth/logout`             | `auth:logout`                  |
| `PATCH /api/admin/users/:id/role`   | `user:update_role`             |
| `PATCH /api/admin/users/:id/status` | `user:disable` / `user:enable` |
| `POST /api/grids`                   | `grid:create`                  |
| `PUT /api/grids/:id`                | `grid:update`                  |
| `DELETE /api/grids/:id`             | `grid:delete`                  |
| `PATCH /api/settings`               | `settings:update`              |

### 8.2. Клиентский трекинг (события read/view)

Для событий, которые происходят только на фронте (просмотр страницы, запуск упражнения), добавить **легковесный POST-эндпоинт**:

```
POST /api/analytics/event
Body: { event_type, entity_type, entity_id, payload? }
Response: 202 Accepted (fire-and-forget, не блокирует UX)
```

**Важно:** Не использовать `withAudit()` — он ждёт результат fn. Для read-событий нужен асинхронный fire-and-forget (или batch-отправка каждые N секунд).

### 8.3. Расширение `admin-diagnostics`

- Текущая заглушка `DiagnosticsPage` заменяется на полноценный дашборд.
- Либо: выделить аналитику в отдельный плагин `admin-analytics`, оставив `admin-diagnostics` для health-check и системной диагностики.

**Рекомендация:** Выделить `admin-analytics` — разная ответственность. Диагностика = мониторинг системы (CPU, память, ошибки). Аналитика = продуктовая статистика.

---

## 9. Новые permissions

| Код                     | Название               | Описание                     |
| ----------------------- | ---------------------- | ---------------------------- |
| `analytics:read`        | Просмотр аналитики     | Доступ к дашбордам и отчётам |
| `analytics:export`      | Экспорт аналитики      | CSV/JSON экспорт данных      |
| `analytics:events:read` | Просмотр сырых событий | Доступ к ленте сырых событий |

Добавить в `RBAC_PERMISSIONS` в `rbac.service.ts`.

**Роли с доступом:**

- `super_admin` → все 3
- `admin` → `analytics:read`, `analytics:export`
- `catalog_editor` → `analytics:read` (только контентные метрики)
- `user` → нет доступа

---

## 10. Не войдёт в эту версию (Out of Scope)

- **A/B-эксперименты.** Сегментация пользователей, feature-флаги с аналитикой.
- **Real-time дашборды.** Обновление через WebSocket. В v1.0 — polling каждые 30 сек / ручное обновление.
- **Кастомные отчёты.** Конструктор отчётов с drag-and-drop.
- **Алерты.** «Аномальная активность», «падение retention ниже X%».
- **Экспорт в BI-инструменты.** Прямой коннект к Tableau / Metabase.
- **S3-архивация.** В v1.0 все данные в SQLite. S3 — в v1.1, при масштабе.
- **Пользовательская аналитика.** Дашборд «мой прогресс» для обычного пользователя (отдельный VISION).
- **Аналитика по MIDI-записям.** Сравнение сыгранного с эталоном, тепловые карты ошибок.

---

## 11. Риски и допущения

| Риск                                      | Вероятность | Влияние | Митигация                                                                               |
| ----------------------------------------- | ----------- | ------- | --------------------------------------------------------------------------------------- |
| **Рост SQLite замедляет API**             | Средняя     | Среднее | Индексы + архивация (v1.1). Мониторинг размера БД.                                      |
| **Событийный POST влияет на UX**          | Низкая      | Среднее | 202 Accepted, fire-and-forget, batch на фронте.                                         |
| **Расхождение семантики событий**         | Средняя     | Высокое | Таксономия зафиксирована в этом документе + константы в `shared/src/constants.ts`.      |
| **Сложность когортного анализа в SQLite** | Средняя     | Низкое  | SQLite-оконные функции с версии 3.25 (2018). Предрасчёт агрегатов cron'ом.              |
| **Приватность (GDPR)**                    | Низкая      | Высокое | Все события анонимизируемы. Добавить endpoint удаления данных пользователя (в будущем). |
| **Конфликт `event_type` имён**            | Низкая      | Среднее | Zod-валидация `event_type` по каталогу.                                                 |

---

## 12. Метрики успеха

| Метрика                       | Цель                                                    |
| ----------------------------- | ------------------------------------------------------- |
| **Покрытие событий**          | 100% мутаций покрыты аудитом (0 call sites → N)         |
| **Время до первого дашборда** | Администратор видит DAU/WAU через <3 сек после загрузки |
| **Точность агрегатов**        | Расхождение с сырыми данными <1%                        |
| **Размер БД**                 | Рост <100 MB/мес при 1000 MAU                           |
| **Запрос сырых событий**      | <2 сек для 7-дневного окна                              |
| **Retention-данные**          | Доступны через 1 неделю после запуска                   |

---

## 13. План фаз (MVP → Расширение)

| Фаза                           | Содержание                                                                             | Статус |
| ------------------------------ | -------------------------------------------------------------------------------------- | ------ |
| **Фаза 0: Подготовка**         | Миграция `audit_log` → `events`, таксономия в `shared`, Zod-схема `AnalyticsEvent`     | 🔴     |
| **Фаза 1: Аудит мутаций**      | Подключить `withAudit()` во все мутирующие эндпоинты (D-011 fix)                       | 🔴     |
| **Фаза 2: Клиентский трекинг** | `POST /api/analytics/event`, batch-отправка, fire-and-forget                           | 🔴     |
| **Фаза 3: Агрегаты**           | Cron-задачи: `agg_user_activity`, `agg_events_by_type`, `agg_exercises`, `agg_content` | 🔴     |
| **Фаза 4: Дашборд**            | Плагин `admin-analytics`, KPI-карточки, графики (Recharts), фильтры                    | 🔴     |
| **Фаза 5: Когорты**            | `agg_retention`, `agg_sessions`, тепловая карта retention                              | 🔴     |
| **Фаза 6: Архивация**          | S3/файловая архивация событий старше 7 дней (v1.1)                                     | 🔴     |

---

_Документ создан 2026-07-19. Следующий шаг: утверждение → декомпозиция в `ANALYTICS-PLAN.md`._
