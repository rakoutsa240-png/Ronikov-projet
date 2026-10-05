import type { FuelPriceGlobal, Station } from './types';

// In development Vite forwards /api to the API server; set VITE_API_URL when the API lives elsewhere.
const BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE_URL}/api${path}`, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.error ?? `Erreur ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  stations: (signal?: AbortSignal) => getJson<Station[]>('/stations', signal),
  prices: (signal?: AbortSignal) => getJson<FuelPriceGlobal[]>('/prices', signal),
};
