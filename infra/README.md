# Инфраструктура Amazilia

Версионируемая конфигурация инфраструктуры. Управляется devops-агентом.

## Структура

- `vercel/` — конфиги Vercel-проектов (landing.json, studio.json)
- `vercel/project-settings.md` — документирование настроек для ручного воспроизведения
- `railway/` — конфигурация Railway (API-сервер)
- `ci/` — GitHub Actions пайплайны
- `turso/` — схема БД, скрипты миграций
- `secrets/` — SOPS-конфигурация + .env.example
- `scripts/` — деплой-скрипты, бэкапы, откат

## Бэкап БД

Три уровня защиты:

| Уровень | Триггер | Хранение | Как восстановить |
|---------|---------|----------|-----------------|
| **Pre-deploy** | `workflow_dispatch` → `deploy-api` | Railway Volume (`/app/data/`) | `./infra/scripts/rollback-db.sh --latest` |
| **Scheduled daily** | Cron `0 3 * * *` → `backup-db` job | Railway Volume + GitHub Artifact (30 дней) | GitHub Actions → Artifacts → скачать → `./infra/scripts/rollback-db.sh <file>` |
| **Manual** | `./infra/scripts/backup-db.sh` | Локально + Railway Volume | `./infra/scripts/rollback-db.sh <file>` |

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

# Бэкап БД
./infra/scripts/backup-db.sh

# Откат БД
./infra/scripts/rollback-db.sh --latest
```

---

## Rollback-процедуры (Фаза 8)

> При отказе продакшена: действуй быстро, восстанавливай по порядку.

### Важно: порядок отката

1. **Feature flag** (1 сек) — если проблема в новой фиче
2. **БД** (1 мин) — если миграция сломала схему или данные
3. **API** (30 сек) — откат кода на Railway
4. **Фронтенд** (10 сек) — откат кода на Vercel

Откатывай от самого быстрого и безопасного к самому медленному.

---

### 1. Feature Flag — мгновенный откат

> Самый быстрый способ. Не требует передеплоя.

```bash
# Через админку: /admin/flags → выключить нужный флаг
# Или через БД:
railway run --service amazilia-api-prod \
  "sqlite3 /app/data/jazz-trainer.sqlite \"UPDATE feature_flags SET enabled = 0 WHERE name = '<flag-name>';\""
```

**Когда использовать:** проблема изолирована в новой фиче, старый код работает.

---

### 2. БД (Railway Volume) — восстановление из бэкапа

> Используй, если миграция повредила схему или данные.

**Автоматический бэкап (CI):** перед каждым деплоем API CI-джоба создаёт бэкап на Railway Volume:
`/app/data/jazz-trainer-backup-<timestamp>.sqlite`

**Восстановление последнего бэкапа:**
```bash
./infra/scripts/rollback-db.sh --latest
```

**Восстановление конкретного бэкапа:**
```bash
# Скачать бэкап локально
railway run --service amazilia-api-prod "cat /app/data/jazz-trainer-backup-1234567890.sqlite" > restore.sqlite

# Восстановить из локального файла
./infra/scripts/rollback-db.sh restore.sqlite
```

**Ручное восстановление (если скрипт недоступен):**
```bash
# Посмотреть доступные бэкапы
railway run --service amazilia-api-prod "ls -lh /app/data/jazz-trainer-backup-*.sqlite"

# Восстановить конкретный бэкап
railway run --service amazilia-api-prod \
  "cp /app/data/jazz-trainer-backup-<timestamp>.sqlite /app/data/jazz-trainer.sqlite"

# Перезапустить сервис для подхвата восстановленной БД
railway service redeploy --service amazilia-api
```

**Ручной бэкап:**
```bash
./infra/scripts/backup-db.sh
```

---

### 3. API (Railway) — откат кода

**Автоматический откат:** Railway отслеживает HEALTHCHECK (`/api/health`). Если новый деплой не проходит health-check 3 раза подряд — Railway автоматически откатывает на предыдущую рабочую версию. Вмешательство не требуется.

**Ручной откат (CLI):**
```bash
railway rollback --service amazilia-api
```

**Ручной откат (Dashboard):**
1. Railway Dashboard → проект → Deployments
2. Найти предыдущий зелёный (успешный) деплой
3. Нажать «Rollback»

**Ручной передеплой текущего main (если rollback недоступен):**
```bash
railway up --service amazilia-api
```

---

### 4. Фронтенд (Vercel) — мгновенный откат, без билда

**Через CLI:**
```bash
# Студия
vercel rollback --scope <team> --project amazilia-studio

# Лендинг
vercel rollback --scope <team> --project amazilia-landing
```

**Через Dashboard:**
1. Vercel Dashboard → проект → Deployments
2. Найти предыдущий зелёный (Ready) деплой
3. «Promote to Production» → мгновенно

> Vercel Rollback / Promote не требует нового билда — мгновенное переключение трафика на предыдущий деплой.

---

## Типовые сценарии отказа и восстановления

| Сценарий | Симптом | Авто-откат? | Действие |
|----------|---------|-------------|----------|
| **Миграция БД упала** | CI-джоба `deploy-api` красная, старый API работает | ✅ Деплой не происходит | Поправить миграцию → push в main → `workflow_dispatch` |
| **`railway up` упал** | CI-джоба красная, старый API работает | ✅ Старый деплой не заменён | Проверить логи Railway → поправить код/Dockerfile → push |
| **Health-check падает после деплоя** | Новый API задеплоился, но `/api/health` возвращает не 200 | ✅ Railway авто-откат на предыдущую версию | Проверить логи Railway → поправить → push |
| **Vercel Production Deploy упал** | Билд красный на Vercel Dashboard | ❌ | Проверить логи Vercel → поправить код → push или Redeploy |
| **Preview Deployments не работают** | Preview URL показывает ошибку | ❌ | Проверить production API жив, проверить `VITE_API_URL` |
| **Новая фича сломала UI** | Пользователи видят ошибку | ❌ | Выключить feature flag → поправить код → включить обратно |
| **Миграция сломала данные** | API отвечает, но данные повреждены | ❌ | Откатить БД из бэкапа → откатить API |

### Детальный алгоритм: миграция сломала данные

1. **Откатить БД:** `./infra/scripts/rollback-db.sh --latest`
2. **Откатить API** (если код зависит от новой схемы): `railway rollback --service amazilia-api-prod`
3. **Поправить миграцию** локально
4. **Задеплоить заново:** push в main → `workflow_dispatch`

### Детальный алгоритм: продакшен упал, причина неясна

1. **Выключить все экспериментальные feature flags** (1 сек)
2. **Откатить API:** `railway rollback --service amazilia-api-prod` (30 сек)
3. **Откатить фронтенд:** Vercel Dashboard → Promote to Production (10 сек)
4. **Если не помогло — откатить БД:** `./infra/scripts/rollback-db.sh --latest` (1 мин)
5. **Диагностировать причину** по логам Railway / Vercel / Sentry
6. **После исправления** — задеплоить заново

---

## GitHub Secrets

| Secret | Назначение |
|--------|-----------|
| `RAILWAY_TOKEN` | Деплой API, миграции, бэкапы |
| `VERCEL_TOKEN` | Vercel CLI (опционально) |
| `VERCEL_ORG_ID` | Vercel организация |
| `VERCEL_PROJECT_ID` | Vercel проект |
| `SENTRY_AUTH_TOKEN` | Source maps upload |
| `SOPS_AGE_KEY` | Расшифровка секретов |
