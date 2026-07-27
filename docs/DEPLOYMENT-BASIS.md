# DEPLOYMENT-BASIS — Актуальная инфраструктура Amazilia

> **Назначение:** Описание текущей инфраструктуры — что реально развёрнуто и работает, на основе
> артефактов `infra/` и кода приложения.
> **Аудитория:** DevOps-инженер, разработчики, AI-агенты.
>
> Отличие от [`DEPLOYMENT.md`](DEPLOYMENT.md): `DEPLOYMENT.md` — план и целевое видение размещения.
> Этот документ — **фактическое состояние**: что настроено, что работает, что ещё заглушка.

---

## 1. Платформа и хостинг

| Компонент | Платформа | Статус |
|-----------|-----------|--------|
| **Веб-приложение** | Vercel (проект `amazilia-studio`) | 🟢 |
| **Лендинг** | Vercel (проект `amazilia-landing`) | 🟢 |
| **API-сервер** | Railway (Docker) | 🟢 |
| **База данных** | SQLite (`better-sqlite3` + Drizzle ORM) | 🟢 |
| **CI/CD** | GitHub Actions | 🟢 |

> **Архитектура:** два Vercel-проекта (лендинг + студия) + Railway (API).
> Лендинг — отдельный Vite + React проект в `apps/landing/`, студия — в `apps/web/`.

---

## 2. Vercel-проекты

### 2.1. `amazilia-landing` — лендинг

**Источники:**
- `apps/landing/vercel.json` (рабочий конфиг)
- `infra/vercel/landing.json` (IaC-копия)
- `infra/vercel/project-settings.md` (ручное воспроизведение)

| Параметр | Значение |
|----------|----------|
| Framework | Other |
| Root Directory | `apps/landing` |
| Build Command | `cd ../.. && npm install --no-package-lock && npm run build -w @jazz/landing` |
| Output Directory | `dist` |
| Dev Command | `cd ../.. && npm run dev -w @jazz/landing` |
| Production Branch | `main` |

**Технология:** Vite + React + Tailwind CSS v4. Исходники — `apps/landing/src/` (скопированы из `apps/web/src/routes/landing/`).

### 2.2. `amazilia-studio` — веб-приложение

**Источники:**
- `apps/web/vercel.json` (рабочий конфиг)
- `infra/vercel/studio.json` (IaC-копия)
- `infra/vercel/project-settings.md` (ручное воспроизведение)

| Параметр | Значение |
|----------|----------|
| Framework | Other (не автоопределяем) |
| Root Directory | `apps/web` |
| Build Command | `cd ../.. && npm install --no-package-lock && npm run build -w @jazz/web` |
| Output Directory | `dist` |
| Dev Command | `cd ../.. && npm run dev -w @jazz/web` |
| Production Branch | `main` |

**Rewrites (проксирование API):**

| Source | Destination |
|--------|-------------|
| `/api/:path*` | `https://amazilia-api-production.up.railway.app/api/:path*` |
| `/((?!api/).*)` | `/index.html` (SPA fallback) |

**Заголовки кеширования:**

| Source | Cache-Control |
|--------|---------------|
| `/assets/(.*)` | `public, max-age=31536000, immutable` |

### 2.3. `amazilia-api` — API-сервер (Railway)

**Источники:**
- `Dockerfile.api` (корень монорепо)
- `.railwayignore` (фильтр загрузки)
- `infra/railway/README.md` (IaC-документация)

| Параметр | Значение |
|----------|----------|
| Платформа | Railway |
| Builder | Docker (`Dockerfile.api`) |
| Runtime | Node 22 Alpine, Fastify `:3999` |
| Деплой | GitHub Actions → `railway up` (push в `main`) |
| База данных | SQLite (`better-sqlite3`, эфемерный диск) |

### 2.4. Временные домены

До покупки `amazilia.app` используются бесплатные домены:

| Проект | Домен |
|--------|-------|
| Лендинг | `<landing-project>.vercel.app` |
| Studio | `<studio-project>.vercel.app` |
| API | `<project>.up.railway.app` |

---

## 3. CI/CD (GitHub Actions)

**Источник:** `.github/workflows/ci.yml` + `infra/ci/pipeline.yml` (IaC-копия)

### 3.1. Триггеры

- `pull_request` — любой PR
- `push` → `main` — мерж в основную ветку

### 3.2. Пайплайн (`verify`)

| Шаг | Команда |
|-----|---------|
| Checkout | `actions/checkout@v4` |
| Setup Node | Node 22, npm cache |
| Install | `rm -rf node_modules && npm install --no-audit --no-fund` |
| Typecheck | `npm run typecheck` |
| Lint | `npm run lint` |
| Test | `npm run test` |

### 3.3. Стратегия деплоя

- **Trunk-based:** единственная ветка `main`.
- **Лендинг + Studio:** Vercel Git Integration авто-деплоит `main` → Production, PR → Preview.
- **API:** GitHub Actions job `deploy-api` → `railway up` (после `verify`), только на push в `main`.
- CI-пайплайн проверяет (typecheck, lint, test), затем деплоит API через Railway.

---

## 4. База данных: SQLite + Drizzle ORM

**Источники:** `apps/api/src/db/index.ts`, `apps/api/drizzle.config.ts`

Текущая реализация использует **SQLite локально** (не Turso — Turso в плане, см. `DEPLOYMENT.md`).

| Характеристика | Значение |
|----------------|----------|
| Драйвер | `better-sqlite3` (нативный C-модуль) |
| ORM | Drizzle (`drizzle-orm/better-sqlite3`) |
| Миграции | `drizzle-kit` → `apps/api/drizzle/` |
| Файл БД | `./data/jazz-trainer.sqlite` (по умолчанию) |
| WAL | Включён (`journal_mode = WAL`) |
| Foreign Keys | Включены (`PRAGMA foreign_keys = ON`) |
| Переменная окружения | `DATABASE_URL` |

> **Turso (`infra/turso/schema.sql`)** — заглушка для аварийного восстановления.
> Код **не использует** `@libsql/client`. При миграции на Turso потребуется замена драйвера
> (`better-sqlite3` → `@libsql/client`) и адаптера Drizzle.

---

## 5. Безопасность API

**Источники:** `apps/api/src/server.ts`, `apps/api/src/plugins/*.plugin.ts`

### 5.1. Middleware (Fastify-плагины)

| Плагин | Назначение | Конфигурация |
|--------|------------|--------------|
| `@fastify/helmet` | HTTP-заголовки безопасности | HSTS: maxAge=1 год, includeSubDomains, preload. X-Content-Type-Options, X-Frame-Options: DENY, Referrer-Policy: strict-origin-when-cross-origin. CSP: выключен |
| `@fastify/cors` | Cross-Origin Resource Sharing | origin = WEB_ORIGIN, credentials, методы GET/POST/PATCH/DELETE/OPTIONS |
| `@fastify/cookie` | Cookie-парсинг | — |
| `@fastify/rate-limit` | Защита от перебора | max=100 запросов/60с, по IP. Переопределяется: `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS` |
| `authPlugin` | Аутентификация (сессии) | sessionTtl: 24ч, maxAbsoluteTtl: 7д, superAdmin: 15 мин |
| `rbacPlugin` | Авторизация (RBAC) | Проверка permissions, guard для admin-роутов |
| `adminIpFilterPlugin` | IP-фильтр super_admin | CIDR allowlist из `ADMIN_IP_ALLOWLIST`. Роль `admin` не ограничивается |

### 5.2. Обработчик ошибок

```text
5xx → { error: { code: 'INTERNAL_ERROR', message: 'Internal error' } }
4xx → { error: { code: <код ошибки>, message: <сообщение> } }
```

Детали внутренних ошибок не раскрываются клиенту. 5xx логируются через pino.

---

## 6. Аутентификация и сессии

**Источники:** `apps/api/src/routes/auth.routes.ts`, `apps/api/src/config.ts`

| Провайдер | Статус | Переменные |
|-----------|--------|------------|
| Google OAuth | 🟢 | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` |
| GitHub OAuth | 🟢 | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL` |
| Magic Link | 🟢 | `RESEND_API_KEY`, `EMAIL_FROM` |
| Dev-режим | 🟢 | `AUTH_DEV_MODE=true` (только локально) |
| TOTP 2FA | 🟢 | `TOTP_ISSUER` (по умолчанию: `Amazilia`) |

Сессии: cookie-based, TTL настраивается (`SESSION_TTL_MS`, `SESSION_MAX_ABSOLUTE_TTL_MS`).

---

## 7. Email: Resend

**Источники:** `apps/api/src/services/email.service.ts`, `apps/api/src/config.ts`

| Параметр | Значение |
|----------|----------|
| Провайдер | Resend API (`api.resend.com`) |
| Переменная | `RESEND_API_KEY` |
| From-адрес | `EMAIL_FROM` (по умолчанию: `noreply@amazilia.app`) |
| Dev-режим | Если ключ не задан — ссылка печатается в консоль |
| Free-tier fallback | При 403 (неверифицированный домен) — fallback на консоль |

---

## 8. Переменные окружения

**Источник:** `apps/api/src/config.ts` (`loadConfig`)

### 8.1. Полный каталог

| Переменная | По умолчанию | Назначение |
|------------|-------------|------------|
| `API_PORT` | `3999` | Порт API (локально) |
| `NODE_ENV` | — | `production` / `development` / `test` |
| `LOG_LEVEL` | `info` | Уровень логирования pino |
| `VITE_STUDIO_URL` | `http://localhost:5173` | URL проекта `amazilia-studio` (используется лендингом для ссылок: вход, CTA). На Vercel задаётся в Dashboard проекта `amazilia-landing` |
| `WEB_ORIGIN` | `http://localhost:5173` | Origin веб-приложения (CORS) |
| `DATABASE_URL` | `./data/jazz-trainer.sqlite` | Путь к SQLite (локально) / Turso URL (план) |
| `AUTH_DEV_MODE` | `false` | Режим dev-аутентификации |
| `SESSION_SECRET` | `dev-insecure-change-me` | Секрет сессионных cookie |
| `SESSION_TTL_MS` | `86400000` (24ч) | TTL сессии |
| `SESSION_MAX_ABSOLUTE_TTL_MS` | `604800000` (7д) | Максимальный срок сессии |
| `SUPER_ADMIN_SESSION_MAX_TTL_MS` | `900000` (15 мин) | Максимальный срок super_admin-сессии |
| `GOOGLE_CLIENT_ID` | `null` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | `null` | Google OAuth Client Secret |
| `GOOGLE_CALLBACK_URL` | `http://localhost:3999/api/auth/google/callback` | Google OAuth callback |
| `GOOGLE_HD` | `null` | Google Workspace domain restriction |
| `GITHUB_CLIENT_ID` | `null` | GitHub OAuth Client ID |
| `GITHUB_CLIENT_SECRET` | `null` | GitHub OAuth Client Secret |
| `GITHUB_CALLBACK_URL` | `http://localhost:3999/api/auth/github/callback` | GitHub OAuth callback |
| `RESEND_API_KEY` | `null` | API-ключ Resend |
| `EMAIL_FROM` | `noreply@amazilia.app` | Отправитель email |
| `TOTP_ISSUER` | `Amazilia` | Название в TOTP-приложении |
| `ADMIN_IP_ALLOWLIST` | `null` | CSV IP/CIDR для super_admin |
| `RATE_LIMIT_MAX` | `100` | Максимум запросов в окне |
| `RATE_LIMIT_WINDOW_MS` | `60000` (1 мин) | Окно rate-limit |

### 8.2. Загрузка

- Файл `.env` из корня проекта (3 уровня вверх от `src/config.ts`) — загружается при старте.
- Переменные из shell/платформы имеют приоритет над `.env`.
- В продакшене `.env` опционален — переменные задаются через Vercel CLI или Dashboard.

**Управление через Vercel CLI:**

```bash
vercel login                                          # аутентификация
vercel projects ls                                    # список проектов и URL
cd apps/landing && vercel link --project amazilia-landing --yes  # привязать
vercel env add VITE_STUDIO_URL production             # добавить переменную
vercel env ls                                         # просмотр
git push                                              # редеплой (Vite-переменные требуют пересборки)
```

### 8.3. Валидация секретов

При `NODE_ENV=production`:
- `SESSION_SECRET` не должен быть dev-значением — иначе `process.exit(1)`.
- Неполные пары OAuth-ключей (только ID или только Secret) — фатальная ошибка.

---

## 9. Инфраструктура как код (`infra/`)

```
infra/
├── README.md                     ← Обзорная документация
├── ci/
│   └── pipeline.yml              ← GitHub Actions CI (копия .github/workflows/ci.yml)
├── scripts/
│   └── backup-blob.sh            ← Заглушка бэкапа Vercel Blob (не реализовано)
├── secrets/
│   └── .sops.yaml                ← SOPS-конфигурация (Age-ключ не настроен)
├── turso/
│   └── schema.sql                ← Дамп схемы БД (заглушка, управляется drizzle-kit)
└── vercel/
    ├── api.json                  ← IaC-копия apps/api/vercel.json
    ├── studio.json               ← IaC-копия apps/web/vercel.json
    ├── project-settings.md       ← Ручное воспроизведение настроек проектов
    └── env/                      ← (пусто)
```

### 9.1. Что работает

| Артефакт | Статус |
|----------|--------|
| `ci/pipeline.yml` | 🟢 Синхронизирован с `.github/workflows/ci.yml` |
| `vercel/api.json` | 🟢 Синхронизирован с `apps/api/vercel.json` |
| `vercel/studio.json` | 🟢 Синхронизирован с `apps/web/vercel.json` |
| `vercel/landing.json` | 🟢 Синхронизирован с `apps/landing/vercel.json` |
| `vercel/project-settings.md` | 🟢 Актуален |

### 9.2. Что не реализовано (заглушки)

| Артефакт | Статус |
|----------|--------|
| `scripts/backup-blob.sh` | 🔴 Заглушка (`echo "Not implemented yet"`) |
| `secrets/.sops.yaml` | 🔴 Age-ключ не настроен (плейсхолдер `<публичный-age-ключ>`) |
| `turso/schema.sql` | 🔴 Заглушка — схема управляется drizzle-kit |
| `vercel/env/` | 🔴 Пустая директория |

---

## 10. Что НЕ настроено (отсутствует в коде)

Следующие сервисы описаны в `DEPLOYMENT.md` как целевые, но **отсутствуют в актуальном коде**:

| Сервис | Статус | Комментарий |
|--------|--------|-------------|
| **Turso** | 🔴 | Код использует `better-sqlite3`, не `@libsql/client`. Turso — в плане миграции. |
| **Vercel Blob** | 🔴 | Нет кода интеграции. Бэкап-скрипт — заглушка. |
| **Vercel Edge Config** | 🔴 | Не используется в коде. |
| **Vercel Flags** | 🔴 | Не используется в коде. |
| **Vercel Firewall (WAF)** | 🔴 | Не настроен (управляется через Dashboard). |
| **Vercel Observability** | 🔴 | Не настроено. |
| **Sentry** | 🔴 | Нет `@sentry/node` в зависимостях, нет кода инициализации. |
| **Amplitude** | 🔴 | Нет `@amplitude/analytics-browser` в коде. |
| **Crisp / поддержка** | 🔴 | Нет кода интеграции. |
| **Redis / Upstash** | 🔴 | Rate-limit использует in-memory хранилище. |

---

## 11. Команды управления

```bash
# Локальная разработка
npm run dev                    # web (:5173) + api (:3999)

# Проверки перед PR
npm run typecheck              # TypeScript strict по всем пакетам
npm run lint                   # ESLint + границы слоёв
npm run test                   # Vitest

# Сборка
npm run build                  # typecheck + сборка web + api

# Деплой
vercel --cwd apps/web --prod      # Studio (Vercel)
vercel --cwd apps/landing --prod  # Лендинг (Vercel)
railway up                        # API (Railway)

# Переменные окружения Vercel
vercel env ls                  # Список переменных
vercel env pull .env.local     # Скачать локально

# Секреты (после настройки SOPS)
sops --encrypt .env > infra/secrets/.env.encrypted
sops --decrypt infra/secrets/.env.encrypted > .env
```

---

## 12. Отличия от `DEPLOYMENT.md`

| Аспект | `DEPLOYMENT.md` (план) | `DEPLOYMENT-BASIS.md` (факт) |
|--------|------------------------|------------------------------|
| API-хостинг | Vercel Serverless | Railway (Docker) |
| БД | Turso (libSQL) | SQLite (`better-sqlite3`) |
| Проектов | 3 Vercel (Лендинг + Studio + API) | 2 Vercel + 1 Railway |
| Sentry | Описан | Отсутствует в коде |
| Vercel Blob | Описан | Заглушка |
| Vercel Flags/Edge Config | Описаны | Отсутствуют |
| SOPS | Описан | Ключ не настроен |
| Аналитика (Amplitude) | Описана | Отсутствует |
| Поддержка (Crisp) | Описана | Отсутствует |

---

_Обновлено: 2026-07-28. Актуализировать при изменении любого артефакта в `infra/` или конфигурации Vercel/Railway._
