/** Environment-derived configuration for the API server. */
export interface ApiConfig {
  port: number;
  webOrigin: string;
  authDevMode: boolean;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  return {
    port: Number(env.API_PORT ?? 3000),
    webOrigin: env.WEB_ORIGIN ?? 'http://localhost:5173',
    authDevMode: env.AUTH_DEV_MODE === 'true',
  };
}
