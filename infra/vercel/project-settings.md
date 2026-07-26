# Vercel Project Settings

Настройки Vercel-проектов для ручного воспроизведения. Все настройки дублируются в CLI-конфигах (`infra/vercel/*.json`).

## Проект 1: Лендинг

| Параметр | Значение |
|----------|----------|
| **Имя** | `amazilia-landing` |
| **Framework** | Other |
| **Root Directory** | `apps/landing` |
| **Build Command** | `cd ../.. && npm run build -- -w @jazz/landing` |
| **Output Directory** | `dist` |
| **Install Command** | `cd ../.. && npm ci` |
| **Dev Command** | `cd ../.. && npm run dev -- -w @jazz/landing` |
| **Production Branch** | `main` |

## Проект 2: Веб-приложение (Studio)

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

## Проект 3: API

| Параметр | Значение |
|----------|----------|
| **Имя** | `amazilia-api` |
| **Framework** | Other |
| **Root Directory** | `apps/api` |
| **Build Command** | `cd ../.. && npm run build -- -w @jazz/api` |
| **Install Command** | `cd ../.. && npm ci` |
| **Production Branch** | `main` |

### Serverless Function

| Функция | Memory | Max Duration |
|---------|--------|-------------|
| `api/[...path].ts` | 512 MB | 30s |

## Временные домены (до покупки amazilia.app)

| Проект | Временный домен |
|--------|-----------------|
| Лендинг | `<landing-project>.vercel.app` |
| Studio | `<studio-project>.vercel.app` |
| API | `<api-project>.vercel.app` |
