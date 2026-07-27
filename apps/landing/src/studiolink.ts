/** URL проекта amazilia-studio.
 *
 * Локально: http://localhost:5173 (Vite dev server студии).
 * Vercel: задаётся через VITE_STUDIO_URL = https://<studio-project>.vercel.app
 */

if (import.meta.env.PROD && !import.meta.env.VITE_STUDIO_URL) {
  throw new Error('VITE_STUDIO_URL is required in production');
}

const BASE = import.meta.env.VITE_STUDIO_URL || 'http://localhost:5173';

/** Полный URL студии с путём, например studioUrl('/login'). */
export function studioUrl(path: string): string {
  return `${BASE}${path}`;
}
