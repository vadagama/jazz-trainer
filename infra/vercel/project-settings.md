# Vercel Project Settings

Настройки Vercel-проектов для ручного воспроизведения. Все настройки дублируются в CLI-конфигах (`infra/vercel/*.json`).

## Проект 1: Лендинг (Landing)

| Параметр | Значение |
|----------|----------|
| **Имя** | `amazilia-landing` |
| **Framework** | Other |
| **Root Directory** | `apps/landing` |
| **Build Command** | `cd ../.. && npm run build -w @jazz/landing` |
| **Output Directory** | `dist` |
| **Install Command** | `cd ../.. && npm install --no-package-lock` |
| **Dev Command** | `cd ../.. && npm run dev -w @jazz/landing` |
| **Production Branch** | `main` |
| **Production URL** | `https://amazilia-landing.vercel.app` |

### Environment Variables

| Variable | Value |
|----------|-------|
| `VITE_STUDIO_URL` | `https://amazilia-studio.vercel.app` |

## Проект 2: Веб-приложение (Studio)

| Параметр | Значение |
|----------|----------|
| **Имя** | `amazilia-studio` |
| **Framework** | Other |
| **Root Directory** | `apps/web` |
| **Build Command** | `cd ../.. && npm run build -w @jazz/web` |
| **Output Directory** | `dist` |
| **Install Command** | `cd ../.. && npm install --no-package-lock` |
| **Dev Command** | `cd ../.. && npm run dev -w @jazz/web` |
| **Production Branch** | `main` |
| **Production URL** | `https://amazilia-studio.vercel.app` |

### Rewrites

| Source | Destination |
|--------|-------------|
| `/api/:path*` | `https://amazilia-api-production.up.railway.app/api/:path*` |
| `/(.*)` | `/index.html` (SPA fallback, static files served first) |

## Проект 3: API (Railway)

API деплоится на Railway как long-lived Docker-контейнер (Fastify). Подробнее: `infra/railway/README.md`.

| Параметр | Значение |
|----------|----------|
| **Платформа** | Railway |
| **Имя сервиса** | `amazilia-api` |
| **Builder** | Docker (`Dockerfile` at repo root) |
| **Runtime** | Node 22 Alpine, Fastify `:3999` |
| **Деплой** | GitHub Actions → `railway up` (push в `main`) |
| **Production URL** | `https://amazilia-api-production.up.railway.app` |

### Environment Variables (Railway)

| Variable | Value |
|----------|-------|
| `WEB_ORIGIN` | `https://amazilia-studio.vercel.app` |
| `NODE_ENV` | `production` |
| `SESSION_SECRET` | (generate: `openssl rand -hex 32`) |
| `AUTH_DEV_MODE` | `false` |
| `GOOGLE_CALLBACK_URL` | `https://amazilia-studio.vercel.app/api/auth/google/callback` (через Vercel proxy) |
| `GITHUB_CALLBACK_URL` | `https://amazilia-studio.vercel.app/api/auth/github/callback` (через Vercel proxy) |
| `SENTRY_DSN` | Sentry DSN для backend (`amazilia-api` project) |
| `TELEGRAM_BOT_TOKEN` | Токен Telegram бота для алертов |
| `TELEGRAM_CHAT_ID` | ID Telegram чата для алертов |
| `VERCEL_WEBHOOK_SECRET` | Секрет для валидации Vercel webhook (x-vercel-signature) |

> **Важно:** OAuth callback URL должны указывать на Vercel-прокси (`amazilia-studio.vercel.app`),
> а не напрямую на Railway. Это нужно, чтобы OAuth state-куки (установленные через прокси)
> были доступны при обработке callback.

### Firewall (WAF) — Фаза 11

> ⚠️ `vercel.json` **не поддерживает** `firewall` для non-Next.js проектов.
> WAF настраивается **только через Vercel Dashboard**:
>   1. Vercel Dashboard → проект → Firewall
>   2. Managed Rulesets → OWASP → выбрать `paranoid`
>   3. Custom Rules → добавить правило: path `/admin/*` → action `challenge`

| Проект | OWASP Ruleset | Custom Rules |
|--------|--------------|-------------|
| **Studio** | `paranoid` | Admin routes (`/admin/*`) → `challenge` |
| **Landing** | `paranoid` | — |

### Sentry — Фаза 12

**Проекты созданы:**

| Проект | Platform | ID |
|--------|----------|----|
| `amazilia-studio` | `javascript-react` | `4511837235380224` |
| `amazilia-api` | `node` | `4511837235314688` |

**Необходимые действия для активации:**

1. ✅ Создать два проекта в [Sentry](https://sentry.io): `amazilia-studio` (Browser/React) и `amazilia-api` (Node.js)
2. Добавить Telegram-интеграцию: Project Settings → Integrations → Telegram
3. Задать переменные окружения:

| Variable | Где | Статус |
|----------|-----|--------|
| `VITE_SENTRY_DSN` | Vercel (`amazilia-studio` env vars) | ✅ Production |
| `SENTRY_DSN` | Railway (`amazilia-api-prod` env vars) | ✅ |
| `SENTRY_AUTH_TOKEN` | GitHub Secrets | ✅ (`sntrys_...` — `org:ci` scope) |

> Код инициализации уже готов: `apps/web/src/lib/sentry.ts` и `apps/api/src/lib/sentry.ts`.
> **После ближайшего push в `main`** (или Redeploy в Vercel Dashboard) Sentry начнёт принимать ошибки.
> Без DSN Sentry работает в no-op режиме — ошибки не собираются, но приложение функционирует.

> **Важно:** OAuth callback URL должны указывать на Vercel-прокси (`amazilia-studio.vercel.app`),
> а не напрямую на Railway. Это нужно, чтобы OAuth state-куки (установленные через прокси)
> были доступны при обработке callback.

### Observability (Фаза 9)

| Variable | Value |
|----------|-------|
| `VITE_SENTRY_DSN` | Sentry DSN для frontend (`amazilia-studio` project) |

### База данных

- SQLite через `better-sqlite3` на эфемерном диске Railway (`/app/data/`)
- План: миграция на Turso (`libsql://`) — требует перевода всех запросов на async

## Временные домены (до покупки amazilia.app)

| Проект | Домен |
|--------|-------|
| Landing | `https://amazilia-landing.vercel.app` |
| Studio | `https://amazilia-studio.vercel.app` |
| API | `https://amazilia-api-production.up.railway.app` |
