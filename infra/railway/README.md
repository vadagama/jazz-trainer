# Railway — API Deploy Configuration

## Project

- **Name:** `amazilia-api`
- **ID:** `29a9e3e1-2d04-46c3-b10e-2136f9f1546e`
- **Service:** `amazilia-api` (ID: `2d1e6483-2f7b-4e1f-bd75-5ce7370adc4d`)

## Deploy Strategy

- **Builder:** Docker (`Dockerfile` at repo root)
- **Trigger:** GitHub Actions → `railway up` on push to `main`
- **Build context:** monorepo root (`.railwayignore` excludes samples, node_modules, etc.)
- **Runtime:** Node 22 Alpine, Fastify listening on `:3999`
- **Database:** SQLite at `/app/data/jazz-trainer.sqlite` (ephemeral, needs Railway Volume for persistence)

## Environment Variables

| Variable | Source | Notes |
|----------|--------|-------|
| `SESSION_SECRET` | Railway (direct) | Generated via `openssl rand -hex 32` |
| `NODE_ENV` | Railway (direct) | `production` |
| `WEB_ORIGIN` | Railway (direct) | `https://amazilia-studio.vercel.app` |
| `AUTH_DEV_MODE` | Railway (direct) | `false` for production |
| `GOOGLE_CALLBACK_URL` | Railway (direct) | `https://amazilia-studio.vercel.app/api/auth/google/callback` (через Vercel proxy) |
| `GITHUB_CALLBACK_URL` | Railway (direct) | `https://amazilia-studio.vercel.app/api/auth/github/callback` (через Vercel proxy) |
| `RAILWAY_TOKEN` | GitHub Secrets | For CI/CD `railway up` |

> **Важно:** `GOOGLE_CALLBACK_URL` и `GITHUB_CALLBACK_URL` должны указывать на Vercel-прокси (`amazilia-studio.vercel.app`), а не напрямую на Railway. Браузер получает OAuth state-куки через Vercel-прокси на домене `amazilia-studio.vercel.app`; при прямом callback на Railway куки будут недоступны (разные домены), и CSRF-проверка провалится с `invalid_state`.

## CI/CD Integration

GitHub Actions workflow (`.github/workflows/ci.yml`):
- `verify` job: lint, typecheck, test
- `deploy-api` job: runs `railway up` on push to `main` (after `verify` passes)

Requires `RAILWAY_TOKEN` in GitHub Secrets → Settings → Secrets and variables → Actions.

## How to get RAILWAY_TOKEN

```bash
# Option 1: Dashboard
# https://railway.com/account/tokens → Create Token

# Option 2: CLI
railway login --browserless
# Follow the link, get the token
```

Then add to GitHub: repo → Settings → Secrets and variables → Actions → New repository secret.
