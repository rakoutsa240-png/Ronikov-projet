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
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['CLIENT', 'STATION_PRO', 'ADMIN']);

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

// Phones are stored as +228 followed by 8 digits. The role is only ever set by the server.
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    email: text('email'),
    passwordHash: text('password_hash').notNull(),
    role: userRoleEnum('role').notNull().default('CLIENT'),
    isPremium: boolean('is_premium').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('users_phone_idx').on(t.phone)],
);

// Which stations a manager (STATION_PRO) runs.
export const stationManagers = pgTable(
  'station_managers',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    stationId: text('station_id')
      .notNull()
      .references(() => stations.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.stationId] })],
);

// Sign-in sessions. Only a SHA-256 hash of the cookie value is stored.
export const sessions = pgTable(
  'sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
);
