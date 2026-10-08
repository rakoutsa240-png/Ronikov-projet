import type { AdminUser, Attendant, AuditEntry, AuthUser, FuelPriceGlobal, FuelType, ManagerRequest, NotificationItem, PaymentMethod, PriceChange, ReportKind, Reservation, Station } from './types';

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
  changePassword: (currentPassword: string, newPassword: string) =>
    request<AuthUser>('POST', '/auth/password', { currentPassword, newPassword }),

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

  attendants: (stationId: string) => request<Attendant[]>('GET', `/stations/${encodeURIComponent(stationId)}/attendants`),
  // temporaryPassword is null when the number already had an account (it keeps its own password).
  addAttendant: (stationId: string, data: { name: string; phone: string }) =>
    request<{ attendant: Attendant; temporaryPassword: string | null }>(
      'POST',
      `/stations/${encodeURIComponent(stationId)}/attendants`,
      data,
    ),
  removeAttendant: (stationId: string, userId: string) =>
    request<void>('DELETE', `/stations/${encodeURIComponent(stationId)}/attendants/${encodeURIComponent(userId)}`),
  resetAttendantPassword: (stationId: string, userId: string) =>
    request<{ temporaryPassword: string }>(
      'POST',
      `/stations/${encodeURIComponent(stationId)}/attendants/${encodeURIComponent(userId)}/password`,
    ),

  updateStock: (
    stationId: string,
    fuelType: FuelType,
    data: { stockLiters?: number; maxCapacityLiters?: number; pricePerLiter?: number },
  ) => request<Station>('PATCH', `/stations/${encodeURIComponent(stationId)}/stock/${fuelType}`, data),
  createStation: (data: {
    name: string;
    brand: string;
    district: string;
    city: string;
    address: string;
    phone: string;
    operatingHours: string;
    lat: number;
    lng: number;
    isPartner: boolean;
    amenities: string[];
    fuels: Partial<Record<FuelType, { stockLiters?: number; maxCapacityLiters?: number; pricePerLiter?: number }>>;
  }) => request<Station>('POST', '/stations', data),
  updateStation: (stationId: string, data: { queueTimeMinutes?: number; isPartner?: boolean; isActive?: boolean }) =>
    request<Station | null>('PATCH', `/stations/${encodeURIComponent(stationId)}`, data),
  updatePrices: (prices: { type: FuelType; officialPriceXOF: number }[], applyToAllStations: boolean) =>
    request<FuelPriceGlobal[]>('PUT', '/prices', { prices, applyToAllStations }),
  users: () => request<AdminUser[]>('GET', '/users'),
  updateUser: (
    id: string,
    data: { role?: AdminUser['role']; isPremium?: boolean; stationIds?: string[]; isSuspended?: boolean },
  ) =>
    request<AdminUser>('PATCH', `/users/${encodeURIComponent(id)}`, data),
  resetUserPassword: (id: string) =>
    request<{ temporaryPassword: string }>('POST', `/users/${encodeURIComponent(id)}/password`),
  requestPremium: () => request<{ message: string }>('POST', '/premium/request'),
  auditLog: (before?: number) => request<AuditEntry[]>('GET', before ? `/audit?before=${before}` : '/audit'),
  managerRequests: () => request<ManagerRequest[]>('GET', '/manager-requests'),
  decideManagerRequest: (id: number, decision: 'accept' | 'reject') =>
    request<ManagerRequest>('POST', `/manager-requests/${id}/${decision}`),
  myManagerRequest: () => request<ManagerRequest | null>('GET', '/manager-requests/mine'),
  requestManager: (stationId: string, message: string) =>
    request<ManagerRequest>('POST', '/manager-requests', { stationId, message: message || undefined }),

  reportStation: (stationId: string, kind: ReportKind, fuelType?: FuelType) =>
    request<Station>('POST', `/stations/${encodeURIComponent(stationId)}/reports`, { kind, fuelType: fuelType ?? null }),
  confirmStation: (stationId: string) => request<Station | null>('POST', `/stations/${encodeURIComponent(stationId)}/check`),
  favorites: () => request<string[]>('GET', '/favorites'),
  saveFavorites: (stationIds: string[]) => request<string[]>('PUT', '/favorites', { stationIds }),

  notifications: () => request<NotificationItem[]>('GET', '/notifications'),
  markNotificationsRead: () => request<void>('POST', '/notifications/read-all'),
};
