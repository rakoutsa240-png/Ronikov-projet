import type { AdminUser, AuthUser, FuelPriceGlobal, FuelType, NotificationItem, PaymentMethod, PriceChange, Reservation, Station } from './types';

// In development Vite forwards /api to the API server; set VITE_API_URL when the API lives elsewhere.
const BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly data: Record<string, unknown> | null = null,
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
    throw new ApiError(res.status, data?.error ?? `Erreur ${res.status}`, data);
  }
  return res.status === 204 ? (undefined as T) : (res.json() as Promise<T>);
}

export const api = {
  stations: (signal?: AbortSignal) => request<Station[]>('GET', '/stations', undefined, signal),
  prices: (signal?: AbortSignal) => request<FuelPriceGlobal[]>('GET', '/prices', undefined, signal),
  priceHistory: (stationId: string, days: number, signal?: AbortSignal) =>
    request<PriceChange[]>('GET', `/stations/${encodeURIComponent(stationId)}/price-history?days=${days}`, undefined, signal),

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

  createReservation: (data: {
    stationId: string;
    fuelType: FuelType;
    liters: number;
    paymentMethod: PaymentMethod;
    paymentPhone: string;
  }) => request<Reservation>('POST', '/reservations', data),
  myReservations: () => request<Reservation[]>('GET', '/reservations/mine'),
  allReservations: () => request<Reservation[]>('GET', '/reservations'),
  stationReservations: (stationId: string) =>
    request<Reservation[]>('GET', `/stations/${encodeURIComponent(stationId)}/reservations`),
  cancelReservation: (id: string) => request<Reservation>('POST', `/reservations/${encodeURIComponent(id)}/cancel`),
  validateTicket: (stationId: string, code: string) =>
    request<{ message: string; reservation: Reservation }>(
      'POST',
      `/stations/${encodeURIComponent(stationId)}/validate`,
      { code },
    ),

  updateStock: (
    stationId: string,
    fuelType: FuelType,
    data: { stockLiters?: number; maxCapacityLiters?: number; pricePerLiter?: number },
  ) => request<Station>('PATCH', `/stations/${encodeURIComponent(stationId)}/stock/${fuelType}`, data),
  updateStation: (stationId: string, data: { queueTimeMinutes?: number; isPartner?: boolean; isActive?: boolean }) =>
    request<Station | null>('PATCH', `/stations/${encodeURIComponent(stationId)}`, data),
  updatePrices: (prices: { type: FuelType; officialPriceXOF: number }[], applyToAllStations: boolean) =>
    request<FuelPriceGlobal[]>('PUT', '/prices', { prices, applyToAllStations }),
  users: () => request<AdminUser[]>('GET', '/users'),
  updateUser: (id: string, data: { role?: AdminUser['role']; isPremium?: boolean; stationIds?: string[] }) =>
    request<AdminUser>('PATCH', `/users/${encodeURIComponent(id)}`, data),
  requestPremium: () => request<{ message: string }>('POST', '/premium/request'),

  notifications: () => request<NotificationItem[]>('GET', '/notifications'),
  markNotificationsRead: () => request<void>('POST', '/notifications/read-all'),
};
