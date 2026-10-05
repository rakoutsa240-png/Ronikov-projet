import { and, asc, desc, eq, gte, lt } from 'drizzle-orm';
import { computeStockStatus, FUEL_LABELS, FUEL_TYPES } from '../../shared/stock';
import type { FuelPriceGlobal, FuelStock, FuelType, PriceChange, Station } from '../../shared/types';
import type { Db } from './client';
import { fuelPrices, fuelStocks, stationPrices, stations } from './schema';

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

export async function listStations(db: Db): Promise<Station[]> {
  const [stationRows, stockRows] = await Promise.all([
    db.select().from(stations).orderBy(asc(stations.id)),
    db.select().from(fuelStocks),
  ]);

  const stockByStation = new Map<string, Partial<Record<FuelType, FuelStock>>>();
  for (const row of stockRows) {
    const stock = stockByStation.get(row.stationId) ?? {};
    stock[row.fuelType] = toFuelStock(row);
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
