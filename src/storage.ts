import { useEffect, useSyncExternalStore } from 'react';

// Small values kept on the phone (favourites, last booking choices, last known stations).
// Private browsing or a full storage simply means nothing is remembered.
export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Nothing to do: the site works the same, it just won't remember.
  }
}

// Favourite stations, shared by every page that shows a star.
const FAVORITES_KEY = 'ronikov.favorites';
const favoriteListeners = new Set<() => void>();
let favorites: string[] = loadJSON<string[]>(FAVORITES_KEY, []);

const subscribeFavorites = (listener: () => void) => {
  favoriteListeners.add(listener);
  return () => favoriteListeners.delete(listener);
};

// Set while someone is signed in: their favourites are also kept on their account, so the server
// can tell them when one of these stations gets fuel back or changes price.
let favoritesSaver: ((stationIds: string[]) => void) | null = null;
export function setFavoritesSaver(saver: ((stationIds: string[]) => void) | null) {
  favoritesSaver = saver;
}

export const getFavorites = () => favorites;

export function replaceFavorites(stationIds: string[]) {
  favorites = stationIds;
  saveJSON(FAVORITES_KEY, favorites);
  favoriteListeners.forEach((listener) => listener());
}

export function toggleFavorite(stationId: string) {
  replaceFavorites(favorites.includes(stationId) ? favorites.filter((id) => id !== stationId) : [...favorites, stationId]);
  favoritesSaver?.(favorites);
}

export function useFavorites(): string[] {
  return useSyncExternalStore(subscribeFavorites, () => favorites, () => favorites);
}

// True while the phone has a network connection.
const subscribeOnline = (listener: () => void) => {
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => {
    window.removeEventListener('online', listener);
    window.removeEventListener('offline', listener);
  };
};

export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

// Keeps the screen on while a ticket QR code is shown at the pump (supported browsers only).
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: { release: () => Promise<void> } | null = null;
    let cancelled = false;
    (navigator as Navigator & { wakeLock: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock
      .request('screen')
      .then((l) => {
        if (cancelled) void l.release();
        else lock = l;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      void lock?.release().catch(() => {});
    };
  }, [active]);
}
