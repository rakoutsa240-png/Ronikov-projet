import { and, eq, gte, lt, sql } from 'drizzle-orm';
import { FUEL_TYPES } from '../shared/stock';
import type { FuelType, StationSales } from '../shared/types';
import type { Db } from './db/client';
import { reservations } from './db/schema';

const DAY_MS = 24 * 60 * 60_000;

// Lomé is on UTC all year, so days and hours are counted in UTC.
const dayOf = (d: Date) => d.toISOString().slice(0, 10);

// Tickets served at a station over the last `days` days (today included), counted on the day they were served.
export async function stationSales(db: Db, stationId: string, days: number, now = new Date()): Promise<StationSales> {
  const todayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const start = new Date(todayStart - (days - 1) * DAY_MS);
  const previousStart = new Date(start.getTime() - days * DAY_MS);
  const served = and(eq(reservations.stationId, stationId), eq(reservations.status, 'VALIDATED'));

  const [rows, [previous]] = await Promise.all([
    db
      .select({
        fuelType: reservations.fuelType,
        liters: reservations.liters,
        fuelAmountXof: reservations.fuelAmountXof,
        voucherDiscountXof: reservations.voucherDiscountXof,
        validatedAt: reservations.validatedAt,
      })
      .from(reservations)
      .where(and(served, gte(reservations.validatedAt, start))),
    db
      .select({
        liters: sql<number>`coalesce(sum(${reservations.liters}), 0)`.mapWith(Number),
        revenueXOF: sql<number>`coalesce(sum(${reservations.fuelAmountXof}), 0)`.mapWith(Number),
      })
      .from(reservations)
      .where(and(served, gte(reservations.validatedAt, previousStart), lt(reservations.validatedAt, start))),
  ]);

  const byDay = new Map<string, { liters: number; revenueXOF: number }>();
  for (let i = 0; i < days; i++) byDay.set(dayOf(new Date(start.getTime() + i * DAY_MS)), { liters: 0, revenueXOF: 0 });
  const byFuel = new Map<FuelType, { tickets: number; liters: number; revenueXOF: number }>();
  const byHour = Array.from({ length: 24 }, (_, hour) => ({ hour, tickets: 0 }));
  let liters = 0;
  let revenueXOF = 0;
  let voucherXOF = 0;

  for (const r of rows) {
    if (!r.validatedAt) continue;
    liters += r.liters;
    revenueXOF += r.fuelAmountXof;
    voucherXOF += r.voucherDiscountXof;
    const day = byDay.get(dayOf(r.validatedAt));
    if (day) {
      day.liters += r.liters;
      day.revenueXOF += r.fuelAmountXof;
    }
    const fuel = byFuel.get(r.fuelType) ?? { tickets: 0, liters: 0, revenueXOF: 0 };
    fuel.tickets += 1;
    fuel.liters += r.liters;
    fuel.revenueXOF += r.fuelAmountXof;
    byFuel.set(r.fuelType, fuel);
    byHour[r.validatedAt.getUTCHours()].tickets += 1;
  }

  return {
    days,
    tickets: rows.length,
    liters,
    revenueXOF,
    voucherXOF,
    byFuel: FUEL_TYPES.filter((type) => byFuel.has(type)).map((type) => ({ type, ...byFuel.get(type)! })),
    byDay: [...byDay].map(([date, v]) => ({ date, ...v })),
    byHour,
    previous: previous ?? { liters: 0, revenueXOF: 0 },
  };
}
