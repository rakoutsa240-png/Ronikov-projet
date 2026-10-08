import { useSyncExternalStore } from 'react';
import { loadJSON, saveJSON } from './storage';

// Dark (the site's look) or light (easier to read in full sunlight). index.html applies the saved
// choice before the page draws, so it never flashes the other theme.
export type Theme = 'dark' | 'light';
const THEME_KEY = 'ronikov.theme';
const listeners = new Set<() => void>();

const current = (): Theme => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#ffffff' : '#000000');
  saveJSON(THEME_KEY, theme);
  listeners.forEach((listener) => listener());
}

export const savedTheme = (): Theme => (loadJSON<string>(THEME_KEY, 'dark') === 'light' ? 'light' : 'dark');

export function useTheme(): Theme {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    current,
    () => 'dark',
  );
}
