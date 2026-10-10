import { useSyncExternalStore } from 'react';
import { loadJSON, saveJSON } from './storage';

// Light (the default, easy to read in full sunlight) or dark. index.html applies a saved dark
// choice before the page draws, so it never flashes the other theme.
export type Theme = 'dark' | 'light';
const THEME_KEY = 'ronikov.theme';
const listeners = new Set<() => void>();

const current = (): Theme => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  saveJSON(THEME_KEY, theme);
  listeners.forEach((listener) => listener());
}

export const savedTheme = (): Theme => (loadJSON<string>(THEME_KEY, 'light') === 'dark' ? 'dark' : 'light');

export function useTheme(): Theme {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    current,
    () => 'light',
  );
}
