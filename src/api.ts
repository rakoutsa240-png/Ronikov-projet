import type { AuthUser, FuelPriceGlobal, Station } from './types';

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

async function request<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    method,
    signal,
    credentials: 'include',
    headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(res.status, data?.error ?? `Erreur ${res.status}`);
  }
  return res.status === 204 ? (undefined as T) : (res.json() as Promise<T>);
}

export const api = {
  stations: (signal?: AbortSignal) => request<Station[]>('GET', '/stations', undefined, signal),
  prices: (signal?: AbortSignal) => request<FuelPriceGlobal[]>('GET', '/prices', undefined, signal),

  // Resolves to null when nobody is signed in.
  me: (signal?: AbortSignal) =>
    request<AuthUser>('GET', '/me', undefined, signal).catch((e) => {
      if (e instanceof ApiError && e.status === 401) return null;
      throw e;
    }),
  login: (phone: string, password: string) => request<AuthUser>('POST', '/auth/login', { phone, password }),
  register: (data: { name: string; phone: string; password: string; email?: string }) =>
    request<AuthUser>('POST', '/auth/register', data),
  logout: () => request<void>('POST', '/auth/logout'),
};
