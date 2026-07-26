import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/queries/useAuth';
import { apiClient } from '@/lib/apiClient';

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
  } catch {
    /* storage unavailable */
  }
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function useThemeState(): ThemeContextValue {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const { theme: serverTheme, user } = useAuth();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Sync from server when auth resolves (server is source of truth for logged-in users)
  useEffect(() => {
    if (serverTheme && serverTheme !== theme) {
      setTheme(serverTheme as Theme);
      try {
        localStorage.setItem('jazz-theme', serverTheme);
      } catch {
        /* storage unavailable */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverTheme]);

  const toggle = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem('jazz-theme', next);
    } catch {
      /* storage unavailable */
    }
    setTheme(next);
    // Background sync to server (fire-and-forget)
    if (user) {
      apiClient.patch('/api/settings', { theme: next }).catch(() => {});
    }
  }, [theme, user]);

  return { theme, toggle };
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
