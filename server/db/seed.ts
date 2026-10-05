import { GLOBAL_FUEL_PRICES, INITIAL_STATIONS } from '../../src/data/mockData';
import { FUEL_TYPES } from '../../shared/stock';
import type { Db } from './client';
import { fuelPrices, fuelStocks, stationPrices, stations } from './schema';

// Loads the demo stations and official prices. Safe to run twice: existing rows are kept.
export async function seed(db: Db) {
  await db.transaction(async (tx) => {
    const added = await tx
      .insert(stations)
      .values(
        INITIAL_STATIONS.map((s) => ({
          id: s.id,
          name: s.name,
          brand: s.brand,
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
        })),
      )
      .onConflictDoNothing()
      .returning({ id: stations.id });
    const addedIds = new Set(added.map((s) => s.id));

    await tx
      .insert(fuelStocks)
      .values(
        INITIAL_STATIONS.flatMap((s) =>
          FUEL_TYPES.map((fuelType) => ({
            stationId: s.id,
            fuelType,
            availableLiters: s.stock[fuelType].availableLiters,
            maxCapacityLiters: s.stock[fuelType].maxCapacityLiters,
            pricePerLiterXof: s.stock[fuelType].pricePerLiter,
          })),
        ),
      )
      .onConflictDoNothing();

    // New stations start their price history with today's prices.
    const newStations = INITIAL_STATIONS.filter((s) => addedIds.has(s.id));
    if (newStations.length > 0) {
      await tx.insert(stationPrices).values(
        newStations.flatMap((s) =>
          FUEL_TYPES.map((fuelType) => ({ stationId: s.id, fuelType, pricePerLiterXof: s.stock[fuelType].pricePerLiter })),
        ),
      );
    }

    const existingPrices = await tx.select({ id: fuelPrices.id }).from(fuelPrices).limit(1);
    if (existingPrices.length === 0) {
      await tx.insert(fuelPrices).values(
        GLOBAL_FUEL_PRICES.map((p) => ({ fuelType: p.type, officialPriceXof: p.officialPriceXOF })),
      );
    }
  });
}
