# DEPLOYMENT-BASIS — Текущая инфраструктура Amazilia

> **Назначение:** Актуальное состояние инфраструктуры. Что развёрнуто и работает **сейчас**.
> **Аудитория:** devops-агент, разработчики.
> **Целевое состояние:** См. `DEPLOYMENT.md`.

Статусы: 🟢 = работает, 🟡 = частично, 🔴 = не настроено.

---

## 1. Обзор

| Компонент | Хостинг | Технология | URL | Статус |
|-----------|---------|-----------|-----|--------|
| **Лендинг** | Vercel | Vite + React (`apps/landing`) | `https://amazilia-landing.vercel.app` | 🟢 |
| **Веб-приложение** | Vercel | Vite + React SPA (`apps/web`) | `https://amazilia-studio.vercel.app` | 🟢 |
| **API-сервер** | Railway (Docker) | Fastify (`apps/api`) | `https://amazilia-api-production.up.railway.app` | 🟢 |
| **База данных** | Railway Volume | SQLite (`better-sqlite3`) + Drizzle | `/app/data/` (persistent) | 🟢 |
| **Email** | Resend | Транзакционные письма | — | 🟢 |
| **CI/CD** | GitHub Actions | verify (cache + npm ci) + deploy-api (workflow_dispatch + миграции) | `.github/workflows/ci.yml` | 🟢 |
| **Preview Deployments** | Vercel (авто) | Каждый PR получает Preview URL | `<hash>-.vercel.app` | 🟢 |
| **Feature Flags** | Свой движок в БД | `feature_flags` таблица + `useFlag()` | — | 🟢 |
| **База данных (план)** | Turso | libSQL (`@libsql/client`) | — | 🟡 |
| **Файловое хранилище** | Vercel Blob | S3-совместимое | — | 🔴 |
| **Sentry** | Sentry | Error tracking | — | 🔴 |
| **Vercel Flags SDK** | Vercel | A/B-тесты, staged rollout | — | 🔴 |

---

## 2. Vercel — Frontend

### 2.1. `amazilia-studio`

| Параметр | Значение |
|----------|----------|
| Root Directory | `apps/web` |
| Production Branch | `main` |
| Production URL | `https://amazilia-studio.vercel.app` |
| Build Command | `cd ../.. && npm run build -w @jazz/web` |
| Output Directory | `dist` |

**Environment Variables:**

| Variable | Value |
|----------|-------|
| (Production) | Не заданы явно — хардкод в `vercel.json` |

### 2.2. `amazilia-landing`

| Параметр | Значение |
|----------|----------|
| Root Directory | `apps/landing` |
| Production Branch | `main` |
| Production URL | `https://amazilia-landing.vercel.app` |
| Build Command | `cd ../.. && npm run build -w @jazz/landing` |
| Output Directory | `dist` |

**Environment Variables:**

| Variable | Value |
|----------|-------|
| `VITE_STUDIO_URL` | `https://amazilia-studio.vercel.app` |

---

## 3. Railway — API

### 3.1. `amazilia-api` (единственный сервис)

> **План (6.4.3):** переименовать сервис `amazilia-api` → `amazilia-api-prod`. Требуется ручное переименование в Railway Dashboard.

| Параметр | Значение |
|----------|----------|
| Project ID | `29a9e3e1-2d04-46c3-b10e-2136f9f1546e` |
| Service ID | `2d1e6483-2f7b-4e1f-bd75-5ce7370adc4d` |
| Runtime | Node 22 Alpine, Fastify `:3999` |
| Builder | Docker (`Dockerfile` в корне) |
| Git Branch | `main` |
| Деплой | GitHub Actions → `railway up` |

**Environment Variables:**

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `WEB_ORIGIN` | `https://amazilia-studio.vercel.app` |
| `SESSION_SECRET` | (prod secret) |
| `AUTH_DEV_MODE` | `false` |
| `GOOGLE_CLIENT_ID` | (prod OAuth app) |
| `GOOGLE_CLIENT_SECRET` | (prod OAuth secret) |
| `GOOGLE_CALLBACK_URL` | `https://amazilia-studio.vercel.app/api/auth/google/callback` |
| `GITHUB_CLIENT_ID` | (prod OAuth app) |
| `GITHUB_CLIENT_SECRET` | (prod OAuth secret) |
| `GITHUB_CALLBACK_URL` | `https://amazilia-studio.vercel.app/api/auth/github/callback` |
| `RESEND_API_KEY` | (prod key) |
| `EMAIL_FROM` | `noreply@amazilia.app` |

**База данных:** SQLite `better-sqlite3` на Railway Volume (`/app/data/jazz-trainer.sqlite`). Данные **сохраняются** между редеплоями.

---

## 4. CI/CD

### 4.1. GitHub Actions (`.github/workflows/ci.yml`)

```yaml
on:
  pull_request:
  push:
    branches: [main]
  workflow_dispatch:  # Фаза 6: ручной деплой API

jobs:
  verify:         # cache node_modules → npm ci → typecheck → lint → test
  deploy-api:     # workflow_dispatch only: railway run migrate → railway up
```

**Ключевые изменения (Фаза 6):**
- Кеширование `node_modules` через `actions/cache@v4` + `npm ci` вместо `npm install`
- `deploy-api` только через `workflow_dispatch` (ручной гейт для продакшена)
- Миграции БД (`railway run "npm run db:migrate"`) перед `railway up`
- Сервис: `amazilia-api` (планируется переименование в `amazilia-api-prod`)

**Vercel деплои:** автоматические через Git Integration (PR = Preview, push `main` = Production).

---

## 5. Ключевые проблемы (as-is)

| # | Проблема | Влияние | Решение (из DEPLOYMENT.md) |
|---|---------|---------|---------------------------|
| 1 | **БД на Railway Volume** — данные сохраняются ✅ (Фаза 3) | Решено. | — |
| 2 | **Нет test БД** — локальная разработка и preview разделяют прод? | Высокое. Нельзя безопасно тестировать миграции. | Создать `jazz-trainer-test` (§5.1) |
| 3 | **API URL хардкоден** в `vercel.json` | Среднее. Preview использует production API. | Заменить на `$VITE_API_URL` через Vercel env vars |
| 4 | **Нет test API** — Preview деплои идут напрямую в production API | Среднее. Нельзя изолированно тестировать API-изменения. | Создать `amazilia-api-test` (§5.2) |
| 5 | **Нет Sentry** — ошибки продакшена не видны | Среднее. Баги обнаруживаются случайно. | Настроить Sentry (§9) |
| 6 | **Нет WAF** — API открыт для всех IP | Низкое (пока один пользователь). Вырастет со временем. | Настроить Vercel Firewall (§6) |
| 7 | **Нет Vercel Blob** — нет файлового хранилища | Низкое. MIDI/аватары пока не загружаются. | Установить Vercel Blob (§7) |

---

## 6. Что уже сделано правильно

- ✅ Vercel Git Integration: авто-деплой Preview и Production
- ✅ GitHub Actions CI: verify на каждый PR + push в `main`
- ✅ CI: кеширование `node_modules` + `npm ci` (Фаза 6.4.1)
- ✅ CI: миграции БД перед деплоем API (Фаза 6.4.2)
- ✅ CI: ручной деплой-гейт API через `workflow_dispatch` (Фаза 6.2)
- ✅ Feature flags: свой движок в БД, готов к staged rollout
- ✅ API поддерживает `libsql://` URL (код готов, осталось создать Turso БД)
- ✅ OAuth callback через Vercel proxy (куки на одном домене)
- ✅ Resend для transactional email
- ✅ `@fastify/helmet`, `@fastify/cors`, `@fastify/rate-limit`
- ✅ RBAC + audit log в БД
- ✅ Railway Volume: SQLite persistence подтверждён (Фаза 3)
- ✅ Docker HEALTHCHECK для Railway

---

_Документ подготовлен `software-architect`. Обновлён 2026-08-01 (Фаза 6)._
