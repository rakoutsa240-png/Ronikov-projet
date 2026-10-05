import type { Station } from './types';

export const STATION_BRANDS: Station['brand'][] = [
  'TotalEnergies',
  'Shell',
  'Sanol',
  'Cap',
  'Somayaf',
  'Yatt & Co',
  'Oryx',
  'Togo-Petro',
];

// A box around Togo, wide enough for its borders: a station placed outside it is a typo.
export const TOGO_BOUNDS = { minLat: 6.0, maxLat: 11.2, minLng: -0.2, maxLng: 1.9 };

// Straight-line distance in kilometres between two points (haversine formula).
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
