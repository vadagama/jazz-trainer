# Railway — API Deploy Configuration

## Project

- **Name:** `amazilia-api`
- **ID:** `29a9e3e1-2d04-46c3-b10e-2136f9f1546e`
- **Service:** `amazilia-api` (ID: `2d1e6483-2f7b-4e1f-bd75-5ce7370adc4d`)

## Deploy Strategy

- **Builder:** Docker (`Dockerfile.api` at repo root)
- **Trigger:** GitHub Actions → `railway up` on push to `main`
- **Build context:** monorepo root (`.railwayignore` excludes samples, node_modules, etc.)
- **Runtime:** Node 22 Alpine, Fastify listening on `:3999`
- **Database:** SQLite at `/app/data/jazz-trainer.sqlite` (ephemeral, needs Railway Volume for persistence)

## Environment Variables

| Variable | Source | Notes |
|----------|--------|-------|
| `SESSION_SECRET` | Railway (direct) | Generated via `openssl rand -hex 32` |
| `NODE_ENV` | Railway (direct) | `production` |
| `WEB_ORIGIN` | Railway (direct) | Vercel studio domain |
| `AUTH_DEV_MODE` | Railway (direct) | `true` for MVP |
| `MIGRATIONS_FOLDER` | Railway (direct) | `/app/apps/api/drizzle` |
| `RAILWAY_TOKEN` | GitHub Secrets | For CI/CD `railway up` |

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
