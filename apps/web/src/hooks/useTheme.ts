import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem('jazz-theme') as Theme | null;
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* storage unavailable */ }
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function useThemeState(): ThemeContextValue {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('jazz-theme', next);
      } catch { /* storage unavailable */ }
      return next;
    });
  }, []);

  return { theme, toggle };
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
