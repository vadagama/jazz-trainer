# Vercel Project Settings

Настройки Vercel-проектов для ручного воспроизведения. Все настройки дублируются в CLI-конфигах (`infra/vercel/*.json`).

> **Лендинг** — это React-роут `/landing` внутри Studio (`apps/web`), а не отдельный
> проект. Отдельный статический проект `amazilia-landing` (`apps/landing`) удалён.

## Проект 1: Веб-приложение (Studio)

| Параметр | Значение |
|----------|----------|
| **Имя** | `amazilia-studio` |
| **Framework** | Other |
| **Root Directory** | `apps/web` |
| **Build Command** | `cd ../.. && npm run build -- -w @jazz/web` |
| **Output Directory** | `dist` |
| **Install Command** | `cd ../.. && npm ci` |
| **Dev Command** | `cd ../.. && npm run dev -- -w @jazz/web` |
| **Production Branch** | `main` |

### Rewrites

| Source | Destination |
|--------|-------------|
| `/api/:path*` | `https://<api-project>.vercel.app/api/:path*` |
| `/(.*)` | `/index.html` (SPA fallback, static files served first) |

## Проект 2: API

| Параметр | Значение |
|----------|----------|
| **Имя** | `amazilia-api` |
| **Framework** | Other |
| **Root Directory** | `apps/api` |
| **Build Command** | `cd ../.. && npm install --no-package-lock && npm run build -w @jazz/api` |
| **Output Directory** | `dist` |
| **Install Command** | `cd ../.. && npm ci` |
| **Production Branch** | `main` |

### База данных

- **Локально:** SQLite через `better-sqlite3` (синхронный API)
- **Vercel:** SQLite в `/tmp/jazz-trainer.sqlite` (в рамках serverless-функции)
- **План:** миграция на Turso (`libsql://`) — требует перевода всех запросов на async (см. DEPLOYMENT.md §5.1)

### Serverless Function

| Функция | Memory | Max Duration |
|---------|--------|-------------|
| `api/[...path].ts` | 512 MB | 30s |

## Временные домены (до покупки amazilia.app)

| Проект | Временный домен |
|--------|-----------------|
| Studio (+ лендинг `/landing`) | `<studio-project>.vercel.app` |
| API | `<api-project>.vercel.app` |
