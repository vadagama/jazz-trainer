/** Environment-derived configuration for the API server. */
export interface ApiConfig {
  port: number;
  webOrigin: string;
  authDevMode: boolean;
  databaseUrl: string;
  sessionSecret: string;
  sessionTtlMs: number;
  googleClientId: string | null;
  googleClientSecret: string | null;
  googleCallbackUrl: string;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  return {
    port: Number(env.API_PORT ?? 3999),
    webOrigin: env.WEB_ORIGIN ?? 'http://localhost:5173',
    authDevMode: env.AUTH_DEV_MODE === 'true',
    databaseUrl: env.DATABASE_URL ?? './data/jazz-trainer.sqlite',
    sessionSecret: env.SESSION_SECRET ?? 'dev-insecure-change-me',
    sessionTtlMs: THIRTY_DAYS_MS,
    googleClientId: env.GOOGLE_CLIENT_ID ?? null,
    googleClientSecret: env.GOOGLE_CLIENT_SECRET ?? null,
    googleCallbackUrl:
      env.GOOGLE_CALLBACK_URL ?? 'http://localhost:3999/api/auth/google/callback',
  };
}
