# syntax=docker/dockerfile:1
FROM node:22-alpine AS builder
WORKDIR /app

# Install build dependencies for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

# Copy workspace config and all package.json files
COPY package.json ./
COPY packages/music-core/package.json ./packages/music-core/
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install all dependencies
RUN npm install --no-package-lock

# Copy source code
COPY packages/music-core/ ./packages/music-core/
COPY packages/shared/ ./packages/shared/
COPY apps/api/ ./apps/api/
COPY tsconfig.base.json ./

# Build only the API workspace (tsup bundles @jazz/* deps)
RUN npm run build -w @jazz/api

# ── Runtime stage ──────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production

# Copy built API, migrations, and node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/drizzle ./apps/api/drizzle
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/node_modules ./node_modules

# Ensure data directory for SQLite with write permissions
RUN mkdir -p /app/data && chown node:node /app/data

# Switch to non-root user
USER node

EXPOSE 3999

# Health check — Railway polls /api/health to determine readiness
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||3999)+'/api/health',r=>{process.exit(r.statusCode===200?0:1)})"

CMD ["node", "apps/api/dist/index.js"]
