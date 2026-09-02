'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const THEME_KEY = 'ng-theme';
const ACCENT_KEY = 'ng-accent';

export interface Accent {
  id: string;
  label: string;
  hex: string;
}

export const ACCENTS: Accent[] = [
  { id: 'teal', label: 'Teal', hex: '#00b294' },
  { id: 'azure', label: 'Azure', hex: '#0078d4' },
  { id: 'magenta', label: 'Magenta', hex: '#e3008c' },
  { id: 'amber', label: 'Amber', hex: '#e88c00' },
  { id: 'violet', label: 'Violet', hex: '#8764b8' },
  { id: 'lime', label: 'Lime', hex: '#7cbb00' },
];

interface ThemeValue {
  theme: string;
  accent: string;
  setTheme: (value: string) => void;
  toggleTheme: () => void;
  setAccent: (value: string) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

function stored(key: string, fallback: string): string {
  if (typeof window === 'undefined') {
    return fallback;
  }
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function persist(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* приватный режим — просто не запоминаем */
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState('dark');
  const [accent, setAccentState] = useState('teal');

  // Первую отрисовку делаем в значениях по умолчанию, иначе разметка сервера
  // и клиента разойдутся; сохранённое оформление применяем сразу после неё.
  useEffect(() => {
    setThemeState(stored(THEME_KEY, 'dark'));
    setAccentState(stored(ACCENT_KEY, 'teal'));
  }, []);

  useEffect(() => {
    const element = document.documentElement;
    element.setAttribute('data-theme', theme);
    element.setAttribute('data-accent', accent);
  }, [theme, accent]);

  const setTheme = useCallback((value: string) => {
    setThemeState(value);
    persist(THEME_KEY, value);
  }, []);

  const setAccent = useCallback((value: string) => {
    setAccentState(value);
    persist(ACCENT_KEY, value);
  }, []);

  const value = useMemo<ThemeValue>(
    () => ({
      theme,
      accent,
      setTheme,
      toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
      setAccent,
    }),
    [theme, accent, setTheme, setAccent],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useTheme вызван вне ThemeProvider');
  }
  return value;
}

/** Ключ текущего оформления: по его смене графики перерисовываются. */
export function useThemeKey(): string {
  const { theme, accent } = useTheme();
  return `${theme}:${accent}`;
}

/** Значение CSS-переменной — нужно графикам, они не понимают классы Tailwind. */
export function cssVar(name: string): string {
  if (typeof window === 'undefined') {
    return '#888888';
  }
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888888';
}

const TONE_VARS: Record<string, string> = {
  accent: '--ng-accent',
  success: '--ng-success',
  warning: '--ng-warning',
  danger: '--ng-danger',
  info: '--ng-info',
  neutral: '--ng-muted',
};

export function toneColor(tone: string): string {
  return cssVar(TONE_VARS[tone] ?? '--ng-muted');
}
