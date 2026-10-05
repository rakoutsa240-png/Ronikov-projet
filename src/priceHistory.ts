import type { FuelType, PriceChange, Station } from './types';

const FUELS: FuelType[] = ['SUPER', 'GAZOLE', 'MELANGE', 'KEROSENE'];

export interface PricePoint extends Record<FuelType, number> {
  date: string; // label under the chart
  fullDate: string;
}

// One point per day, ending today: each fuel's price is the last change made on or before that day.
// A fuel with no recorded change yet uses the station's current price.
export function buildDailySeries(changes: PriceChange[], station: Station, days: number, now = new Date()): PricePoint[] {
  const sorted = [...changes].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  const points: PricePoint[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);
    const endOfDay = new Date(day);
    endOfDay.setHours(23, 59, 59, 999);

    const prices = Object.fromEntries(
      FUELS.map((fuel) => {
        let price = sorted.find((c) => c.fuelType === fuel)?.pricePerLiter ?? station.stock[fuel]?.pricePerLiter ?? 0;
        for (const c of sorted) {
          if (c.fuelType === fuel && new Date(c.effectiveFrom) <= endOfDay) price = c.pricePerLiter;
        }
        return [fuel, price];
      }),
    ) as Record<FuelType, number>;

    const dayName = day.toLocaleDateString('fr-FR', { weekday: 'short' });
    const dayMonth = day.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    points.push({
      ...prices,
      date: i === 0 ? "Aujourd'hui" : days > 7 ? dayMonth : `${dayName.charAt(0).toUpperCase()}${dayName.slice(1)} ${dayMonth}`,
      fullDate: day.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    });
  }
  return points;
}
