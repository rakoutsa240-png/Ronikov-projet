import { and, asc, desc, eq, gte, isNull, lt, lte, sql } from 'drizzle-orm';
import { REPORT_WINDOW_HOURS } from '../../shared/reports';
import { computeStockStatus, FUEL_LABELS, FUEL_TYPES } from '../../shared/stock';
import type { FuelPriceGlobal, FuelStock, FuelType, PriceChange, Station, StationRating, StationReport } from '../../shared/types';
import type { Db } from './client';
import { fuelPrices, fuelStocks, reviews, stationPrices, stationReports, stations } from './schema';

type StockRow = typeof fuelStocks.$inferSelect;

// Litres a client can still book: what is in the tank minus what is already reserved.
function toFuelStock(row: StockRow): FuelStock {
  const free = Math.max(0, row.availableLiters - row.reservedLiters);
  return {
    availableLiters: free,
    reservedLiters: row.reservedLiters,
    maxCapacityLiters: row.maxCapacityLiters,
    pricePerLiter: row.pricePerLiterXof,
    status: computeStockStatus(free, row.maxCapacityLiters),
  };
}

type ReportRow = typeof stationReports.$inferSelect;

// Client reports made after the station's last staff check, grouped by problem, most recent first.
export function summarizeReports(rows: ReportRow[], checkedAt: Date): StationReport[] {
  const groups = new Map<string, StationReport>();
  for (const row of rows) {
    if (row.createdAt <= checkedAt) continue;
    const key = `${row.kind}:${row.fuelType ?? ''}`;
    const group = groups.get(key);
    const at = row.createdAt.toISOString();
    if (!group) groups.set(key, { kind: row.kind, fuelType: row.fuelType, count: 1, lastAt: at });
    else {
      group.count += 1;
      if (at > group.lastAt) group.lastAt = at;
    }
  }
  return [...groups.values()].sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

export const reportWindowStart = () => new Date(Date.now() - REPORT_WINDOW_HOURS * 3_600_000);

// A price that went down stays marked as a drop for this many days.
export const PRICE_DROP_DAYS = 3;

// The last two prices of every station and fuel, newest first.
function lastTwoPrices(db: Db) {
  const ranked = db
    .select({
      stationId: stationPrices.stationId,
      fuelType: stationPrices.fuelType,
      price: stationPrices.pricePerLiterXof,
      at: stationPrices.effectiveFrom,
      rank: sql<number>`row_number() over (partition by ${stationPrices.stationId}, ${stationPrices.fuelType} order by ${stationPrices.effectiveFrom} desc, ${stationPrices.id} desc)`
        .mapWith(Number)
        .as('rank'),
    })
    .from(stationPrices)
    .as('ranked');
  return db.select().from(ranked).where(lte(ranked.rank, 2)).orderBy(asc(ranked.rank));
}

export async function listStations(db: Db): Promise<Station[]> {
  const [stationRows, stockRows, reportRows, ratingRows, priceRows] = await Promise.all([
    db.select().from(stations).orderBy(asc(stations.id)),
    db.select().from(fuelStocks),
    db.select().from(stationReports).where(gte(stationReports.createdAt, reportWindowStart())),
    // Hidden (abusive) reviews do not count.
    db
      .select({
        stationId: reviews.stationId,
        average: sql<number>`avg(${reviews.stationRating})`.mapWith(Number),
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(reviews)
      .where(isNull(reviews.hiddenAt))
      .groupBy(reviews.stationId),
    lastTwoPrices(db),
  ]);
  const ratingByStation = new Map<string, StationRating>(
    ratingRows.map((r) => [r.stationId, { average: Math.round(r.average * 10) / 10, count: r.count }]),
  );

  // Latest change first: a drop is when it went below the one before, recently, and still holds.
  const pricesByFuel = new Map<string, { price: number; at: Date }[]>();
  for (const row of priceRows) {
    const key = `${row.stationId}:${row.fuelType}`;
    pricesByFuel.set(key, [...(pricesByFuel.get(key) ?? []), { price: row.price, at: row.at }]);
  }
  const dropSince = Date.now() - PRICE_DROP_DAYS * 86_400_000;

  const stockByStation = new Map<string, Partial<Record<FuelType, FuelStock>>>();
  for (const row of stockRows) {
    const stock = stockByStation.get(row.stationId) ?? {};
    stock[row.fuelType] = toFuelStock(row);
    const [latest, before] = pricesByFuel.get(`${row.stationId}:${row.fuelType}`) ?? [];
    if (
      latest &&
      before &&
      latest.price < before.price &&
      latest.price === row.pricePerLiterXof &&
      latest.at.getTime() >= dropSince
    ) {
      stock[row.fuelType]!.priceDrop = { previousPrice: before.price, at: latest.at.toISOString() };
    }
    stockByStation.set(row.stationId, stock);
  }

  return stationRows
    .filter((s) => s.isActive)
    .map((s) => {
      const stock = stockByStation.get(s.id) ?? {};
      return {
        id: s.id,
        name: s.name,
        brand: s.brand as Station['brand'],
        district: s.district,
        city: s.city,
        address: s.address,
        lat: s.lat,
        lng: s.lng,
        phone: s.phone,
        operatingHours: s.operatingHours,
        amenities: s.amenities,
        queueTimeMinutes: s.queueTimeMinutes,
        isPartner: s.isPartner,
        checkedAt: s.checkedAt.toISOString(),
        rating: ratingByStation.get(s.id) ?? null,
        reports: summarizeReports(
          reportRows.filter((r) => r.stationId === s.id),
          s.checkedAt,
        ),
        stock: Object.fromEntries(
          FUEL_TYPES.map((type) => [
            type,
            stock[type] ?? { availableLiters: 0, maxCapacityLiters: 0, pricePerLiter: 0, status: 'OUT_OF_STOCK' },
          ]),
        ) as Record<FuelType, FuelStock>,
      };
    });
}

export async function listPrices(db: Db): Promise<FuelPriceGlobal[]> {
  const [priceRows, stockRows] = await Promise.all([
    db.select().from(fuelPrices).orderBy(desc(fuelPrices.effectiveFrom), desc(fuelPrices.id)),
    db.select().from(fuelStocks),
  ]);
  const now = Date.now();

  return FUEL_TYPES.flatMap((type) => {
    const current = priceRows.find((p) => p.fuelType === type && p.effectiveFrom.getTime() <= now);
    if (!current) return [];

    const tanks = stockRows.filter((s) => s.fuelType === type && s.maxCapacityLiters > 0);
    const avgAvailabilityPercent =
      tanks.length === 0
        ? 0
        : Math.round(
            (tanks.reduce((sum, s) => sum + Math.max(0, s.availableLiters - s.reservedLiters) / s.maxCapacityLiters, 0) /
              tanks.length) *
              100,
          );

    return [{ type, label: FUEL_LABELS[type], officialPriceXOF: current.officialPriceXof, avgAvailabilityPercent }];
  });
}

// The price changes of one station over the last `days` days, oldest first. The last change before
// the period is included so the chart knows the price on its first day.
export async function listStationPriceHistory(db: Db, stationId: string, days: number): Promise<PriceChange[]> {
  const since = new Date(Date.now() - days * 86_400_000);
  const [inPeriod, before] = await Promise.all([
    db
      .select()
      .from(stationPrices)
      .where(and(eq(stationPrices.stationId, stationId), gte(stationPrices.effectiveFrom, since)))
      .orderBy(asc(stationPrices.effectiveFrom), asc(stationPrices.id)),
    Promise.all(
      FUEL_TYPES.map((type) =>
        db
          .select()
          .from(stationPrices)
          .where(
            and(eq(stationPrices.stationId, stationId), eq(stationPrices.fuelType, type), lt(stationPrices.effectiveFrom, since)),
          )
          .orderBy(desc(stationPrices.effectiveFrom), desc(stationPrices.id))
          .limit(1),
      ),
    ),
  ]);
  return [...before.flat(), ...inPeriod].map((row) => ({
    fuelType: row.fuelType,
    pricePerLiter: row.pricePerLiterXof,
    effectiveFrom: row.effectiveFrom.toISOString(),
  }));
}
