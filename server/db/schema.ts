import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['CLIENT', 'STATION_PRO', 'ADMIN', 'ATTENDANT']);

export const reservationStatusEnum = pgEnum('reservation_status', ['PENDING', 'VALIDATED', 'EXPIRED', 'CANCELLED']);

export const paymentMethodEnum = pgEnum('payment_method', ['MIXX_BY_YAS', 'MOOV_MONEY', 'CARD', 'TMONEY', 'FLOOZ']);

export const notificationTypeEnum = pgEnum('notification_type', ['RESERVATION', 'STOCK', 'SYSTEM', 'PREMIUM']);

export const fuelTypeEnum = pgEnum('fuel_type', ['SUPER', 'GAZOLE', 'MELANGE', 'KEROSENE']);

export const managerRequestStatusEnum = pgEnum('manager_request_status', ['PENDING', 'ACCEPTED', 'REJECTED']);

export const reportKindEnum = pgEnum('report_kind', ['NO_FUEL', 'LONG_QUEUE', 'WRONG_PRICE', 'CLOSED']);

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
  // Last time the station's staff updated or confirmed its stock, prices or waiting time.
  checkedAt: timestamp('checked_at', { withTimezone: true }).notNull().defaultNow(),
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
    // Set when an admin gives a temporary password; cleared once the user picks their own.
    mustChangePassword: boolean('must_change_password').notNull().default(false),
    // Set when an admin suspends the account: it can no longer sign in.
    suspendedAt: timestamp('suspended_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('users_phone_idx').on(t.phone)],
);

// Which stations a manager (STATION_PRO) runs, or the one station an attendant (ATTENDANT) works at.
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

// Prices are copied at booking time so a later price change never alters a ticket.
// The ticket code itself is never stored: only its HMAC (to find it) and an encrypted copy (for its owner).
export const reservations = pgTable(
  'reservations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    stationId: text('station_id')
      .notNull()
      .references(() => stations.id),
    fuelType: fuelTypeEnum('fuel_type').notNull(),
    liters: integer('liters').notNull(),
    pricePerLiterXof: integer('price_per_liter_xof').notNull(),
    fuelAmountXof: integer('fuel_amount_xof').notNull(),
    serviceFeeXof: integer('service_fee_xof').notNull(),
    totalXof: integer('total_xof').notNull(),
    paymentMethod: paymentMethodEnum('payment_method').notNull(),
    paymentPhone: text('payment_phone').notNull(),
    paymentStatus: text('payment_status').notNull().default('PAID'),
    codeHash: text('code_hash').notNull(),
    codeLast4: text('code_last4').notNull(),
    codeEncrypted: text('code_encrypted').notNull(),
    status: reservationStatusEnum('status').notNull().default('PENDING'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    validatedAt: timestamp('validated_at', { withTimezone: true }),
    validatedBy: uuid('validated_by').references(() => users.id),
  },
  (t) => [
    uniqueIndex('reservations_code_hash_idx').on(t.codeHash),
    index('reservations_user_idx').on(t.userId, t.createdAt),
    index('reservations_station_idx').on(t.stationId, t.createdAt),
    index('reservations_pending_expiry_idx').on(t.status, t.expiresAt),
    check('reservations_liters_check', sql`${t.liters} > 0`),
  ],
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    stationId: text('station_id').references(() => stations.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp('read_at', { withTimezone: true }),
  },
  (t) => [index('notifications_user_idx').on(t.userId, t.createdAt)],
);

// Who changed stock, prices, stations or accounts, and who served which ticket.
export const auditLog = pgTable(
  'audit_log',
  {
    id: serial('id').primaryKey(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    target: text('target').notNull(),
    details: jsonb('details').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('audit_log_created_idx').on(t.createdAt)],
);

// Every price a station charged, one row per change: the chart on a station's page reads it.
export const stationPrices = pgTable(
  'station_prices',
  {
    id: serial('id').primaryKey(),
    stationId: text('station_id')
      .notNull()
      .references(() => stations.id, { onDelete: 'cascade' }),
    fuelType: fuelTypeEnum('fuel_type').notNull(),
    pricePerLiterXof: integer('price_per_liter_xof').notNull(),
    effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('station_prices_station_effective_idx').on(t.stationId, t.effectiveFrom)],
);

// A client telling others what they saw at a station (no fuel, long queue, wrong price, closed).
// Reports older than the station's last staff check are no longer shown.
export const stationReports = pgTable(
  'station_reports',
  {
    id: serial('id').primaryKey(),
    stationId: text('station_id')
      .notNull()
      .references(() => stations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: reportKindEnum('kind').notNull(),
    fuelType: fuelTypeEnum('fuel_type'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('station_reports_station_created_idx').on(t.stationId, t.createdAt)],
);

// Favourite stations of signed-in users: they are told when one gets fuel back or changes price.
export const favorites = pgTable(
  'favorites',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    stationId: text('station_id')
      .notNull()
      .references(() => stations.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.stationId] }), index('favorites_station_idx').on(t.stationId)],
);

// A signed-up client asking to run a station. An admin accepts (they become its manager) or rejects it.
export const managerRequests = pgTable(
  'manager_requests',
  {
    id: serial('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    stationId: text('station_id')
      .notNull()
      .references(() => stations.id, { onDelete: 'cascade' }),
    message: text('message'),
    status: managerRequestStatusEnum('status').notNull().default('PENDING'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    decidedBy: uuid('decided_by').references(() => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('manager_requests_status_idx').on(t.status, t.createdAt),
    // At most one open request per person.
    uniqueIndex('manager_requests_pending_user_idx').on(t.userId).where(sql`${t.status} = 'PENDING'`),
  ],
);
