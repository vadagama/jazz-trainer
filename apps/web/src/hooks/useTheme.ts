import { useState, useCallback, useEffect } from 'react';

export type Theme = 'dark' | 'light';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('jazz-theme') as Theme | null;
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('jazz-theme', next);
      } catch {}
      return next;
    });
  }, []);

  return { theme, toggle };
}
