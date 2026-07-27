/** URL проекта amazilia-studio. Задаётся через VITE_STUDIO_URL. */
const BASE = import.meta.env.VITE_STUDIO_URL || 'http://localhost:5173';

/** Полный URL студии с путём, например studioUrl('/login'). */
export function studioUrl(path: string): string {
  return `${BASE}${path}`;
}
