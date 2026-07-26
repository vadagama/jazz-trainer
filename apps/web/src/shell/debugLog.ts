/**
 * Отладочный лог, активный только в dev-сборке. В production `import.meta.env.DEV`
 * === false, поэтому вызовы становятся мёртвым кодом и вырезаются при сборке —
 * горячие пути (MIDI/keyboard-события) не засоряют консоль в проде.
 */
export function debugLog(...args: unknown[]): void {
  if (import.meta.env.DEV) {
    console.debug(...args);
  }
}
