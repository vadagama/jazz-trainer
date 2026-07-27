# Инфраструктура Amazilia

Версионируемая конфигурация инфраструктуры. Управляется devops-агентом.

## Структура

- `vercel/` — конфиги Vercel-проектов (landing.json, studio.json, api.json)
- `vercel/project-settings.md` — документирование настроек для ручного воспроизведения
- `ci/` — GitHub Actions пайплайны
- `turso/` — схема БД, скрипты миграций
- `secrets/` — SOPS-конфигурация + .env.example
- `scripts/` — деплой-скрипты, бэкапы

## Быстрые команды

```bash
# Деплой конкретного проекта
vercel --cwd apps/web --prod
vercel --cwd apps/api --prod

# Переменные окружения
vercel env ls
vercel env pull .env.local

# Локальная разработка
npm run dev

# Секреты (после настройки SOPS)
sops --encrypt .env > infra/secrets/.env.encrypted
sops --decrypt infra/secrets/.env.encrypted > .env
```
