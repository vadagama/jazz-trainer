# Инфраструктура Amazilia

Версионируемая конфигурация инфраструктуры. Управляется devops-агентом.

## Структура

- `vercel/` — конфиги Vercel-проектов (landing.json, studio.json)
- `vercel/project-settings.md` — документирование настроек для ручного воспроизведения
- `railway/` — конфигурация Railway (API-сервер)
- `ci/` — GitHub Actions пайплайны
- `turso/` — схема БД, скрипты миграций
- `secrets/` — SOPS-конфигурация + .env.example
- `scripts/` — деплой-скрипты, бэкапы

## Быстрые команды

```bash
# Деплой фронта (Vercel)
vercel --cwd apps/web --prod
vercel --cwd apps/landing --prod

# Деплой API (Railway)
railway up

# Переменные окружения (Vercel)
vercel env ls
vercel env pull .env.local

# Переменные окружения (Railway)
railway variables list
railway variables set KEY=VALUE

# Локальная разработка
npm run dev

# Секреты (после настройки SOPS)
sops --encrypt .env > infra/secrets/.env.encrypted
sops --decrypt infra/secrets/.env.encrypted > .env
```
