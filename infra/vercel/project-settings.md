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

> **Важно:** OAuth callback URL должны указывать на Vercel-прокси (`amazilia-studio.vercel.app`),
> а не напрямую на Railway. Это нужно, чтобы OAuth state-куки (установленные через прокси)
> были доступны при обработке callback.

### База данных

- SQLite через `better-sqlite3` на эфемерном диске Railway (`/app/data/`)
- План: миграция на Turso (`libsql://`) — требует перевода всех запросов на async

## Временные домены (до покупки amazilia.app)

| Проект | Домен |
|--------|-------|
| Landing | `https://amazilia-landing.vercel.app` |
| Studio | `https://amazilia-studio.vercel.app` |
| API | `https://amazilia-api-production.up.railway.app` |
