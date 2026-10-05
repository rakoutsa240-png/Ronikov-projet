import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const fuelTypeEnum = pgEnum('fuel_type', ['SUPER', 'GAZOLE', 'MELANGE', 'KEROSENE']);

export const stations = pgTable('stations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  brand: text('brand').notNull(),
  district: text('district').notNull(),
  city: text('city').notNull(),
  address: text('address').notNull(),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  phone: text('phone').notNull(),
  operatingHours: text('operating_hours').notNull(),
  amenities: text('amenities').array().notNull().default(sql`'{}'::text[]`),
  queueTimeMinutes: integer('queue_time_minutes').notNull().default(0),
  isPartner: boolean('is_partner').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
});

// One row per station and fuel. Status is computed from the litres, never stored.
export const fuelStocks = pgTable(
  'fuel_stocks',
  {
    stationId: text('station_id')
      .notNull()
      .references(() => stations.id, { onDelete: 'cascade' }),
    fuelType: fuelTypeEnum('fuel_type').notNull(),
    availableLiters: integer('available_liters').notNull(),
    reservedLiters: integer('reserved_liters').notNull().default(0),
    maxCapacityLiters: integer('max_capacity_liters').notNull(),
    pricePerLiterXof: integer('price_per_liter_xof').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.stationId, t.fuelType] }),
    check('fuel_stocks_liters_check', sql`${t.availableLiters} >= 0 AND ${t.reservedLiters} >= 0 AND ${t.maxCapacityLiters} >= 0`),
  ],
);

// Official prices with history: the current price is the latest effective_from per fuel.
export const fuelPrices = pgTable(
  'fuel_prices',
  {
    id: serial('id').primaryKey(),
    fuelType: fuelTypeEnum('fuel_type').notNull(),
    officialPriceXof: integer('official_price_xof').notNull(),
    effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('fuel_prices_fuel_effective_idx').on(t.fuelType, t.effectiveFrom)],
);
