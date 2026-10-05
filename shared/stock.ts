import type { FuelStock, FuelType } from './types';

export const FUEL_TYPES: FuelType[] = ['SUPER', 'GAZOLE', 'MELANGE', 'KEROSENE'];

export const FUEL_LABELS: Record<FuelType, string> = {
  SUPER: 'Super Sans Plomb',
  GAZOLE: 'Gazole (Désel)',
  MELANGE: 'Mélange 2 Temps',
  KEROSENE: 'Pétrole / Kérosène',
};

// A tank is LOW under 1 000 L or under 20 % of its capacity, which matches the seed data.
export function computeStockStatus(freeLiters: number, maxCapacityLiters: number): FuelStock['status'] {
  if (freeLiters <= 0) return 'OUT_OF_STOCK';
  if (freeLiters < 1000 || freeLiters < maxCapacityLiters * 0.2) return 'LOW';
  return 'AVAILABLE';
}
