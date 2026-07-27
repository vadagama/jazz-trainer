/** Environment-derived configuration for the API server. */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Load a .env file into process.env (only sets vars not already present).
 * Shell env / platform vars take precedence over the file.
 */
function loadEnvFile(filePath: string): void {
  try {
    const content = readFileSync(filePath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      // Strip surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key && !(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env file is optional in production
  }
}

// Resolve .env from project root (three levels up from src/config.ts)
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '..', '..', '.env');
loadEnvFile(envPath);

export interface ApiConfig {
  port: number;
  webOrigin: string;
  authDevMode: boolean;
  databaseUrl: string;
  /** Auth token for Turso (libsql:// URLs). Optional for local SQLite. */
  databaseAuthToken: string | null;
  sessionSecret: string;
  sessionTtlMs: number;
  sessionMaxAbsoluteTtlMs: number;
  googleClientId: string | null;
  googleClientSecret: string | null;
  googleCallbackUrl: string;
  githubClientId: string | null;
  githubClientSecret: string | null;
  githubCallbackUrl: string;
  /** If set, only users from this Google Workspace domain are allowed. */
  googleHd: string | null;
  /** Resend API key for sending emails (magic link, notifications). */
  resendApiKey: string | null;
  /** From address for outgoing emails. */
  emailFrom: string;
  /** TOTP issuer name (displayed in authenticator apps). */
  totpIssuer: string;
  /** Max absolute TTL for super_admin sessions (ms). Default: 15 min. */
  superAdminSessionMaxAbsoluteTtlMs: number;
  /** CSV of allowed IPs/CIDRs for super_admin admin access. Null = disabled. */
  adminIpAllowlist: string | null;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;

const DEV_INSECURE_SECRET = 'dev-insecure-change-me';

function fail(message: string): never {
  console.error(`[api] CONFIG ERROR: ${message}`);
  process.exit(1);
}

/**
 * Validate that required secrets are configured.
 * In development, uses permissive defaults with a warning.
 * In production, fails fast with a readable error when a secret is missing or insecure.
 */
function validateSecrets(config: ApiConfig): void {
  const isProd = process.env.NODE_ENV === 'production';

  if (!config.sessionSecret || config.sessionSecret === DEV_INSECURE_SECRET) {
    if (isProd) {
      fail('SESSION_SECRET is required in production (must not be a dev default)');
    }
    console.warn('[api] WARNING: using insecure default SESSION_SECRET — change in production');
  }

  // In production, WEB_ORIGIN must point to the actual frontend origin.
  // Default localhost origin will cause CORS and OAuth cookie failures.
  if (isProd && config.webOrigin === 'http://localhost:5173') {
    console.warn(
      '[api] WARNING: WEB_ORIGIN is still the dev default (http://localhost:5173). ' +
        'CORS and OAuth callbacks will fail in production. ' +
        'Set WEB_ORIGIN=https://amazilia-studio.vercel.app (or your production frontend origin).',
    );
  }

  if (config.googleClientId && !config.googleClientSecret && isProd) {
    fail('GOOGLE_CLIENT_ID is set but GOOGLE_CLIENT_SECRET is missing');
  }

  if (!config.googleClientId && config.googleClientSecret && isProd) {
    fail('GOOGLE_CLIENT_SECRET is set but GOOGLE_CLIENT_ID is missing');
  }

  if (config.githubClientId && !config.githubClientSecret && isProd) {
    fail('GITHUB_CLIENT_ID is set but GITHUB_CLIENT_SECRET is missing');
  }

  if (!config.githubClientId && config.githubClientSecret && isProd) {
    fail('GITHUB_CLIENT_SECRET is set but GITHUB_CLIENT_ID is missing');
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  // webOrigin is the canonical frontend origin. The browser accesses the API
  // through a reverse proxy (Vite dev server / Vercel rewrites), so OAuth
  // callback URLs must use this origin to keep cookies on the same domain.
  const webOrigin = env.WEB_ORIGIN ?? 'http://localhost:5173';

  const config: ApiConfig = {
    port: Number(env.API_PORT ?? env.PORT ?? 3999),
    webOrigin,
    authDevMode: env.AUTH_DEV_MODE === 'true',
    databaseUrl: env.DATABASE_URL ?? env.TURSO_DATABASE_URL ?? env.AMAZILIA_DB_TURSO_DATABASE_URL ?? './data/jazz-trainer.sqlite',
    databaseAuthToken: env.DATABASE_AUTH_TOKEN ?? env.TURSO_AUTH_TOKEN ?? env.AMAZILIA_DB_TURSO_AUTH_TOKEN ?? null,
    sessionSecret: env.SESSION_SECRET ?? 'dev-insecure-change-me',
    sessionTtlMs: Number(env.SESSION_TTL_MS ?? ONE_DAY_MS),
    sessionMaxAbsoluteTtlMs: Number(env.SESSION_MAX_ABSOLUTE_TTL_MS ?? SEVEN_DAYS_MS),
    googleClientId: env.GOOGLE_CLIENT_ID ?? null,
    googleClientSecret: env.GOOGLE_CLIENT_SECRET ?? null,
    googleCallbackUrl: env.GOOGLE_CALLBACK_URL ?? `${webOrigin}/api/auth/google/callback`,
    githubClientId: env.GITHUB_CLIENT_ID ?? null,
    githubClientSecret: env.GITHUB_CLIENT_SECRET ?? null,
    githubCallbackUrl: env.GITHUB_CALLBACK_URL ?? `${webOrigin}/api/auth/github/callback`,
    googleHd: env.GOOGLE_HD ?? null,
    resendApiKey: env.RESEND_API_KEY ?? null,
    emailFrom: env.EMAIL_FROM ?? 'noreply@amazilia.app',
    totpIssuer: env.TOTP_ISSUER ?? 'Amazilia',
    superAdminSessionMaxAbsoluteTtlMs: Number(env.SUPER_ADMIN_SESSION_MAX_TTL_MS ?? 15 * 60 * 1000),
    adminIpAllowlist: env.ADMIN_IP_ALLOWLIST ?? null,
  };
  validateSecrets(config);
  return config;
}
