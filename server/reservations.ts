import { and, desc, eq, lte, sql } from 'drizzle-orm';
import {
  MAX_LITERS_PER_RESERVATION,
  RESERVATION_VALIDITY_MINUTES,
  SERVICE_FEE_XOF,
} from '../shared/reservations';
import { FUEL_LABELS } from '../shared/stock';
import type { AuthUser, FuelType, NotificationItem, PaymentMethod, Reservation } from '../shared/types';
import { audit } from './audit';
import type { Db } from './db/client';
import { fuelStocks, notifications, reservations, stations, users } from './db/schema';
import {
  createQrPayload,
  decryptTicketCode,
  encryptTicketCode,
  generateTicketCode,
  hashTicketCode,
  maskTicketCode,
  parseTicketCode,
  readQrPayload,
  type TicketKeys,
} from './tickets';

// A refusal the client should see, with its HTTP status.
export class ReservationError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly reservation?: Reservation,
  ) {
    super(message);
  }
}

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
type ReservationRow = typeof reservations.$inferSelect;

const reservationColumns = {
  reservation: reservations,
  stationName: stations.name,
  stationBrand: stations.brand,
  stationAddress: stations.address,
  userName: users.name,
  userPhone: users.phone,
};

type JoinedRow = {
  reservation: ReservationRow;
  stationName: string;
  stationBrand: string;
  stationAddress: string;
  userName: string;
  userPhone: string;
};

function toReservation(row: JoinedRow, code: string, qrPayload?: string): Reservation {
  const r = row.reservation;
  return {
    id: r.id,
    code,
    stationId: r.stationId,
    stationName: row.stationName,
    stationBrand: row.stationBrand,
    stationAddress: row.stationAddress,
    fuelType: r.fuelType,
    fuelLabel: FUEL_LABELS[r.fuelType],
    liters: r.liters,
    pricePerLiter: r.pricePerLiterXof,
    totalAmountXOF: r.totalXof,
    serviceFeeXOF: r.serviceFeeXof,
    paymentMethod: r.paymentMethod,
    phonePayment: r.paymentPhone,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    expiresAt: r.expiresAt.toISOString(),
    validatedAt: r.validatedAt?.toISOString(),
    userName: row.userName,
    userPhone: row.userPhone,
    ...(qrPayload ? { qrPayload } : {}),
  };
}

// The owner sees the full code and the signed QR; staff only see the last characters.
const forOwner = (keys: TicketKeys, row: JoinedRow) => {
  const code = decryptTicketCode(keys, row.reservation.codeEncrypted);
  return toReservation(row, code, createQrPayload(keys, row.reservation.id, code));
};
const forStaff = (row: JoinedRow) => toReservation(row, maskTicketCode(row.reservation.codeLast4));

function joined(db: Db | Tx) {
  return db
    .select(reservationColumns)
    .from(reservations)
    .innerJoin(stations, eq(stations.id, reservations.stationId))
    .innerJoin(users, eq(users.id, reservations.userId));
}

async function notify(
  db: Db | Tx,
  userId: string,
  type: NotificationItem['type'],
  title: string,
  message: string,
  stationId?: string,
) {
  await db.insert(notifications).values({ userId, type, title, message, stationId });
}

export interface NewReservation {
  stationId: string;
  fuelType: FuelType;
  liters: number;
  paymentMethod: PaymentMethod;
  paymentPhone: string;
}

export async function createReservation(db: Db, keys: TicketKeys, user: AuthUser, input: NewReservation) {
  if (!Number.isInteger(input.liters) || input.liters < 1 || input.liters > MAX_LITERS_PER_RESERVATION) {
    throw new ReservationError(400, `Entre 1 et ${MAX_LITERS_PER_RESERVATION} litres par réservation`);
  }

  const { id } = await db.transaction(async (tx) => {
    // Lock this tank so two bookings cannot both take the last litres.
    const [stock] = await tx
      .select({ stock: fuelStocks, isActive: stations.isActive, stationName: stations.name })
      .from(fuelStocks)
      .innerJoin(stations, eq(stations.id, fuelStocks.stationId))
      .where(and(eq(fuelStocks.stationId, input.stationId), eq(fuelStocks.fuelType, input.fuelType)))
      .for('update', { of: fuelStocks });
    if (!stock || !stock.isActive) throw new ReservationError(404, 'Station introuvable');

    const free = stock.stock.availableLiters - stock.stock.reservedLiters;
    if (free < input.liters) {
      throw new ReservationError(409, `Stock insuffisant : ${Math.max(0, free)} L disponibles`);
    }

    // Price and fee come from the database and the account, never from the request.
    const price = stock.stock.pricePerLiterXof;
    const fuelAmount = price * input.liters;
    const fee = user.isPremium ? 0 : SERVICE_FEE_XOF;
    const now = new Date();

    let inserted: ReservationRow | undefined;
    for (let attempt = 0; !inserted && attempt < 5; attempt++) {
      const code = generateTicketCode();
      const raw = parseTicketCode(code)!;
      [inserted] = await tx
        .insert(reservations)
        .values({
          userId: user.id,
          stationId: input.stationId,
          fuelType: input.fuelType,
          liters: input.liters,
          pricePerLiterXof: price,
          fuelAmountXof: fuelAmount,
          serviceFeeXof: fee,
          totalXof: fuelAmount + fee,
          paymentMethod: input.paymentMethod,
          paymentPhone: input.paymentPhone,
          paymentStatus: 'PAID', // payments are simulated for now
          codeHash: hashTicketCode(keys, raw),
          codeLast4: raw.slice(-4),
          codeEncrypted: encryptTicketCode(keys, code),
          createdAt: now,
          expiresAt: new Date(now.getTime() + RESERVATION_VALIDITY_MINUTES * 60_000),
        })
        .onConflictDoNothing({ target: reservations.codeHash })
        .returning();
    }
    if (!inserted) throw new Error('Could not generate a unique ticket code');

    await tx
      .update(fuelStocks)
      .set({ reservedLiters: sql`${fuelStocks.reservedLiters} + ${input.liters}`, updatedAt: now })
      .where(and(eq(fuelStocks.stationId, input.stationId), eq(fuelStocks.fuelType, input.fuelType)));

    await notify(
      tx,
      user.id,
      'RESERVATION',
      'Réservation Confirmée',
      `Votre ticket de ${input.liters} L ${FUEL_LABELS[input.fuelType]} est actif chez ${stock.stationName} pendant ${RESERVATION_VALIDITY_MINUTES / 60} h.`,
      input.stationId,
    );
    return inserted;
  });

  const [row] = await joined(db).where(eq(reservations.id, id));
  return forOwner(keys, row);
}

export async function listUserReservations(db: Db, keys: TicketKeys, userId: string) {
  const rows = await joined(db).where(eq(reservations.userId, userId)).orderBy(desc(reservations.createdAt));
  return rows.map((row) => forOwner(keys, row));
}

export async function listStationReservations(db: Db, stationId?: string) {
  const query = joined(db);
  const rows = await (stationId ? query.where(eq(reservations.stationId, stationId)) : query)
    .orderBy(desc(reservations.createdAt))
    .limit(500);
  return rows.map(forStaff);
}

// Gives the litres held by a pending ticket back to the tank, and sets its final status.
async function releasePending(tx: Tx, row: ReservationRow, status: 'CANCELLED' | 'EXPIRED') {
  await tx.update(reservations).set({ status }).where(eq(reservations.id, row.id));
  await tx
    .update(fuelStocks)
    .set({ reservedLiters: sql`greatest(${fuelStocks.reservedLiters} - ${row.liters}, 0)`, updatedAt: new Date() })
    .where(and(eq(fuelStocks.stationId, row.stationId), eq(fuelStocks.fuelType, row.fuelType)));
}

export async function cancelReservation(db: Db, keys: TicketKeys, user: AuthUser, reservationId: string) {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(reservations)
      .where(and(eq(reservations.id, reservationId), eq(reservations.userId, user.id)))
      .for('update');
    if (!row) throw new ReservationError(404, 'Réservation introuvable');
    if (row.status !== 'PENDING') throw new ReservationError(409, 'Seul un ticket en attente peut être annulé');
    await releasePending(tx, row, 'CANCELLED');
  });
  const [row] = await joined(db).where(eq(reservations.id, reservationId));
  return forOwner(keys, row);
}

export async function validateTicket(db: Db, keys: TicketKeys, staff: AuthUser, stationId: string, input: string) {
  // The input is either a typed code or the content of a scanned QR code.
  const isQr = input.trim().startsWith('RNK1.');
  const raw = isQr ? readQrPayload(keys, input)?.raw : parseTicketCode(input);
  if (!raw) {
    throw new ReservationError(
      isQr ? 400 : 404,
      isQr ? 'QR code altéré ou illisible.' : 'Code invalide ou inexistant dans le système Pleino.',
    );
  }

  const result = await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(reservations)
      .where(eq(reservations.codeHash, hashTicketCode(keys, raw)))
      .for('update');
    // A ticket from another station gets the same answer as an unknown code.
    if (!row || row.stationId !== stationId) {
      throw new ReservationError(404, 'Code invalide ou inexistant dans le système Pleino.');
    }

    if (row.status === 'PENDING' && row.expiresAt <= new Date()) {
      await releasePending(tx, row, 'EXPIRED');
      return { ok: false as const, id: row.id, message: 'Impossible: Ce ticket est expiré.' };
    }
    if (row.status === 'VALIDATED') {
      return { ok: false as const, id: row.id, message: 'Attention: Ce code a déjà été utilisé et validé à la pompe.' };
    }
    if (row.status !== 'PENDING') {
      return {
        ok: false as const,
        id: row.id,
        message: `Impossible: Ce ticket est ${row.status === 'EXPIRED' ? 'expiré' : 'annulé'}.`,
      };
    }

    const now = new Date();
    await tx
      .update(reservations)
      .set({ status: 'VALIDATED', validatedAt: now, validatedBy: staff.id })
      .where(eq(reservations.id, row.id));
    // The litres leave the tank and are no longer held for this ticket.
    await tx
      .update(fuelStocks)
      .set({
        availableLiters: sql`greatest(${fuelStocks.availableLiters} - ${row.liters}, 0)`,
        reservedLiters: sql`greatest(${fuelStocks.reservedLiters} - ${row.liters}, 0)`,
        updatedAt: now,
      })
      .where(and(eq(fuelStocks.stationId, row.stationId), eq(fuelStocks.fuelType, row.fuelType)));
    await audit(tx, staff.id, 'ticket.validate', `reservation:${row.id}`, {
      stationId: row.stationId,
      fuelType: row.fuelType,
      liters: row.liters,
    });
    await notify(
      tx,
      row.userId,
      'RESERVATION',
      'Carburant Servi',
      `Votre ticket de ${row.liters} L ${FUEL_LABELS[row.fuelType]} a été validé à la pompe.`,
      row.stationId,
    );
    return {
      ok: true as const,
      id: row.id,
      message: `CODE VALIDE ET CONFIRMÉ ! Vous pouvez distribuer ${row.liters}L de ${FUEL_LABELS[row.fuelType]}.`,
    };
  });

  const [row] = await joined(db).where(eq(reservations.id, result.id));
  const reservation = forStaff(row);
  if (!result.ok) throw new ReservationError(409, result.message, reservation);
  return { message: result.message, reservation };
}

// Called every minute: pending tickets past their time become EXPIRED and free their litres.
export async function expireDueReservations(db: Db): Promise<number> {
  return db.transaction(async (tx) => {
    const due = await tx
      .select()
      .from(reservations)
      .where(and(eq(reservations.status, 'PENDING'), lte(reservations.expiresAt, new Date())))
      .for('update', { skipLocked: true });
    for (const row of due) {
      await releasePending(tx, row, 'EXPIRED');
      await notify(
        tx,
        row.userId,
        'RESERVATION',
        'Ticket Expiré',
        `Votre ticket de ${row.liters} L ${FUEL_LABELS[row.fuelType]} a expiré sans être utilisé.`,
        row.stationId,
      );
    }
    return due.length;
  });
}

export async function listNotifications(db: Db, userId: string): Promise<NotificationItem[]> {
  const rows = await db
    .select({ n: notifications, stationName: stations.name, stationBrand: stations.brand })
    .from(notifications)
    .leftJoin(stations, eq(stations.id, notifications.stationId))
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(100);
  return rows.map(({ n, stationName, stationBrand }) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    timestamp: n.createdAt.toISOString(),
    read: n.readAt !== null,
    type: n.type,
    ...(stationName ? { stationName } : {}),
    ...(stationBrand ? { stationBrand } : {}),
  }));
}

export async function markNotificationsRead(db: Db, userId: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), sql`${notifications.readAt} is null`));
}
