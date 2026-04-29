import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'vibrant' | 'midnight' | 'sunset' | 'forest';

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  cycleTheme: () => void;
  themes: { id: Theme; label: string }[];
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const STORAGE_KEY = 'tutor-manage-theme';

const THEMES: { id: Theme; label: string }[] = [
  { id: 'vibrant', label: 'Vibrant' },
  { id: 'midnight', label: 'Midnight' },
  { id: 'sunset', label: 'Sunset' },
  { id: 'forest', label: 'Forest' },
];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('vibrant');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored && THEMES.some(t => t.id === stored)) {
      setThemeState(stored);
    }
  }, []);

  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);

  const cycleTheme = () => {
    const idx = THEMES.findIndex(t => t.id === theme);
    const next = THEMES[(idx + 1) % THEMES.length];
    setThemeState(next.id);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
