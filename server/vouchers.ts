import { randomInt } from 'node:crypto';
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { normalizeTogoPhone } from '../shared/phone';
import {
  LOYALTY_AMOUNT_XOF,
  LOYALTY_STEP_LITERS,
  LOYALTY_VALIDITY_DAYS,
  normalizeVoucherCode,
  VOUCHER_CODE_ALPHABET,
} from '../shared/vouchers';
import type { AdminVoucher, AuthUser, MyVouchers, Voucher, VoucherStatus } from '../shared/types';
import { audit } from './audit';
import type { Db } from './db/client';
import { notifications, reservations, stations, users, vouchers } from './db/schema';

// A refusal the client should see, with its HTTP status.
export class VoucherError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
type VoucherRow = typeof vouchers.$inferSelect;

const DAY_MS = 24 * 60 * 60_000;

export function generateVoucherCode(): string {
  const pick = () => Array.from({ length: 4 }, () => VOUCHER_CODE_ALPHABET[randomInt(VOUCHER_CODE_ALPHABET.length)]).join('');
  return `BON-${pick()}-${pick()}`;
}

// 5000 -> "5 000", written the same way in every notification.
const fcfa = (n: number) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA`;

export function voucherStatus(v: VoucherRow, now = new Date()): VoucherStatus {
  if (v.cancelledAt) return 'CANCELLED';
  if (v.reservationId) return 'USED';
  if (v.expiresAt <= now) return 'EXPIRED';
  return v.ownerId ? 'AVAILABLE' : 'UNCLAIMED';
}

// Where a voucher works and where it was used: two different stations.
const validAt = alias(stations, 'valid_at');
const usedAt = alias(stations, 'used_at');

type Joined = { voucher: VoucherRow; validStationName: string | null; usedStationName: string | null };

function toVoucher({ voucher: v, validStationName, usedStationName }: Joined): Voucher {
  return {
    id: v.id,
    code: v.code,
    amountXOF: v.amountXof,
    source: v.source,
    label: v.label,
    status: voucherStatus(v),
    validStationId: v.stationId,
    validStationName,
    expiresAt: v.expiresAt.toISOString(),
    createdAt: v.createdAt.toISOString(),
    usedAt: v.usedAt?.toISOString() ?? null,
    reservationId: v.reservationId,
    usedStationName,
  };
}

function joined(db: Db) {
  return db
    .select({
      voucher: vouchers,
      validStationName: validAt.name,
      usedStationName: usedAt.name,
      ownerName: users.name,
      ownerPhone: users.phone,
    })
    .from(vouchers)
    .leftJoin(validAt, eq(validAt.id, vouchers.stationId))
    .leftJoin(reservations, eq(reservations.id, vouchers.reservationId))
    .leftJoin(usedAt, eq(usedAt.id, reservations.stationId))
    .leftJoin(users, eq(users.id, vouchers.ownerId));
}

async function litersServed(db: Db | Tx, userId: string) {
  const [row] = await db
    .select({ liters: sql<number>`coalesce(sum(${reservations.liters}), 0)::int` })
    .from(reservations)
    .where(and(eq(reservations.userId, userId), eq(reservations.status, 'VALIDATED')));
  return Number(row?.liters ?? 0);
}

export async function listMyVouchers(db: Db, userId: string): Promise<MyVouchers> {
  const rows = await joined(db).where(eq(vouchers.ownerId, userId)).orderBy(desc(vouchers.createdAt)).limit(200);
  const order: Record<VoucherStatus, number> = { AVAILABLE: 0, UNCLAIMED: 1, USED: 2, EXPIRED: 3, CANCELLED: 4 };
  const list = rows
    .map(toVoucher)
    // Usable ones first, the one ending soonest on top.
    .sort((a, b) => order[a.status] - order[b.status] || (a.status === 'AVAILABLE' ? a.expiresAt.localeCompare(b.expiresAt) : 0));
  const liters = await litersServed(db, userId);
  return {
    vouchers: list,
    loyalty: {
      litersServed: liters,
      stepLiters: LOYALTY_STEP_LITERS,
      amountXOF: LOYALTY_AMOUNT_XOF,
      litersToNext: LOYALTY_STEP_LITERS - (liters % LOYALTY_STEP_LITERS),
    },
  };
}

// A contest code becomes the voucher of whoever types it first.
export async function claimVoucher(db: Db, userId: string, input: string): Promise<Voucher> {
  const code = normalizeVoucherCode(input);
  if (!code) throw new VoucherError(404, 'Code de bon inconnu. Vérifiez les lettres et les chiffres.');
  const claimed = await db.transaction(async (tx) => {
    const [row] = await tx.select().from(vouchers).where(eq(vouchers.code, code)).for('update');
    if (!row || row.cancelledAt) throw new VoucherError(404, 'Code de bon inconnu. Vérifiez les lettres et les chiffres.');
    if (row.ownerId === userId) throw new VoucherError(409, 'Ce bon est déjà dans votre compte.');
    if (row.ownerId) throw new VoucherError(409, 'Ce code a déjà été utilisé par quelqu’un d’autre.');
    if (row.expiresAt <= new Date()) throw new VoucherError(409, 'Ce bon a expiré.');
    const [updated] = await tx
      .update(vouchers)
      .set({ ownerId: userId, claimedAt: new Date() })
      .where(eq(vouchers.id, row.id))
      .returning();
    return updated.id;
  });
  const [row] = await joined(db).where(eq(vouchers.id, claimed));
  return toVoucher(row);
}

export interface NewVouchers {
  stationId?: string; // only works at this station; required for a manager, none for Pleino's own
  amountXof: number;
  validDays: number;
  label?: string;
  phone?: string; // a gift to this account
  count?: number; // otherwise this many contest codes
}

// Managers give vouchers for their own stations only; an admin's work at every partner station.
export async function createVouchers(db: Db, author: AuthUser, input: NewVouchers): Promise<AdminVoucher[]> {
  const adminId = author.id;
  const stationId = input.stationId ?? null;
  if (author.role !== 'ADMIN' && (!stationId || !author.managedStationIds.includes(stationId))) {
    throw new VoucherError(403, 'Choisissez une de vos stations');
  }
  const [station] = stationId ? await db.select().from(stations).where(eq(stations.id, stationId)) : [];
  if (stationId && !station) throw new VoucherError(404, 'Station introuvable');
  const expiresAt = new Date(Date.now() + input.validDays * DAY_MS);
  const label = input.label?.trim() || null;

  if (input.phone !== undefined) {
    const phone = normalizeTogoPhone(input.phone);
    const [owner] = phone ? await db.select().from(users).where(eq(users.phone, phone)) : [];
    if (!owner) throw new VoucherError(404, 'Aucun compte Pleino avec ce numéro.');
    const id = await db.transaction(async (tx) => {
      const row = await insertWithFreshCode(tx, {
        amountXof: input.amountXof,
        source: 'GIFT',
        label,
        stationId,
        ownerId: owner.id,
        claimedAt: new Date(),
        expiresAt,
        createdBy: adminId,
      });
      await tx.insert(notifications).values({
        userId: owner.id,
        type: 'SYSTEM',
        title: 'Bon d’essence offert',
        message: station
          ? `${station.name} vous offre un bon d’essence de ${fcfa(input.amountXof)}, valable dans cette station. Utilisez-le à votre prochaine réservation.`
          : `Pleino vous offre un bon d’essence de ${fcfa(input.amountXof)}, valable dans toutes les stations partenaires. Utilisez-le à votre prochaine réservation.`,
        stationId,
      });
      await audit(tx, adminId, 'voucher.gift', `user:${owner.id}`, { amountXof: input.amountXof, code: row.code, label, stationId });
      return row.id;
    });
    return listAllVouchers(db, [id]);
  }

  const howMany = input.count ?? 1;
  const ids = await db.transaction(async (tx) => {
    const made: string[] = [];
    // All codes in one insert; the rare code already taken is simply drawn again.
    for (let attempt = 0; made.length < howMany && attempt < 5; attempt++) {
      const rows = await tx
        .insert(vouchers)
        .values(
          Array.from({ length: howMany - made.length }, () => ({
            code: generateVoucherCode(),
            amountXof: input.amountXof,
            source: 'CONTEST' as const,
            label,
            stationId,
            expiresAt,
            createdBy: adminId,
          })),
        )
        .onConflictDoNothing({ target: vouchers.code })
        .returning({ id: vouchers.id });
      made.push(...rows.map((r) => r.id));
    }
    if (made.length < howMany) throw new Error('Could not generate unique voucher codes');
    await audit(tx, adminId, 'voucher.codes', `vouchers:${howMany}`, { amountXof: input.amountXof, count: howMany, label, stationId });
    return made;
  });
  return listAllVouchers(db, ids);
}

async function insertWithFreshCode(tx: Tx, values: Omit<typeof vouchers.$inferInsert, 'code'>) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const [row] = await tx
      .insert(vouchers)
      .values({ ...values, code: generateVoucherCode() })
      .onConflictDoNothing({ target: vouchers.code })
      .returning();
    if (row) return row;
  }
  throw new Error('Could not generate a unique voucher code');
}

// What an admin or a manager sees: everything, or the vouchers of the given stations.
export async function listAllVouchers(db: Db, onlyIds?: string[], stationIds?: string[]): Promise<AdminVoucher[]> {
  const filters = [
    onlyIds ? inArray(vouchers.id, onlyIds) : undefined,
    stationIds ? (stationIds.length ? inArray(vouchers.stationId, stationIds) : sql`false`) : undefined,
  ].filter((f) => f !== undefined);
  const rows = await joined(db)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(vouchers.createdAt))
    .limit(1000);
  return rows.map((r) => ({
    ...toVoucher(r),
    ownerName: r.ownerName,
    ownerPhone: r.ownerPhone,
    claimedAt: r.voucher.claimedAt?.toISOString() ?? null,
  }));
}

// An admin withdraws a voucher that has not been used (a code given out by mistake, for example).
export async function cancelVoucher(db: Db, author: AuthUser, id: string): Promise<AdminVoucher> {
  const adminId = author.id;
  await db.transaction(async (tx) => {
    const [row] = await tx.select().from(vouchers).where(eq(vouchers.id, id)).for('update');
    const allowed = author.role === 'ADMIN' || (row?.stationId != null && author.managedStationIds.includes(row.stationId));
    if (!row || !allowed) throw new VoucherError(404, 'Bon introuvable');
    if (row.reservationId) throw new VoucherError(409, 'Ce bon a déjà servi pour une réservation.');
    if (row.cancelledAt) return;
    await tx.update(vouchers).set({ cancelledAt: new Date() }).where(eq(vouchers.id, id));
    await audit(tx, adminId, 'voucher.cancel', `voucher:${id}`, { code: row.code, amountXof: row.amountXof });
  });
  const [voucher] = await listAllVouchers(db, [id]);
  return voucher;
}

// Locks one of the client's usable vouchers for a booking being made in `tx`.
export async function lockUsableVoucher(tx: Tx, userId: string, voucherId: string) {
  const [row] = await tx
    .select()
    .from(vouchers)
    .where(and(eq(vouchers.id, voucherId), eq(vouchers.ownerId, userId)))
    .for('update');
  return row && voucherStatus(row) === 'AVAILABLE' ? row : null;
}

// A station's voucher works there only; Pleino's work at partner stations.
export const voucherWorksAt = (v: { stationId: string | null }, station: { id: string; isPartner: boolean }) =>
  v.stationId === null ? station.isPartner : v.stationId === station.id;

export async function attachVoucher(tx: Tx, voucherId: string, reservationId: string, at: Date) {
  await tx.update(vouchers).set({ reservationId, usedAt: at }).where(eq(vouchers.id, voucherId));
}

// A cancelled or expired ticket gives its voucher back (it still ends on its own date).
export async function releaseVoucher(tx: Tx, reservationId: string) {
  await tx.update(vouchers).set({ reservationId: null, usedAt: null }).where(eq(vouchers.reservationId, reservationId));
}

// After a ticket is served: one loyalty voucher for every LOYALTY_STEP_LITERS litres served so far.
export async function awardLoyaltyVouchers(tx: Tx, userId: string) {
  // Two tickets of the same client served at once must not both award the same voucher.
  await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update');
  const liters = await litersServed(tx, userId);
  const [{ owned }] = await tx
    .select({ owned: count() })
    .from(vouchers)
    .where(and(eq(vouchers.ownerId, userId), eq(vouchers.source, 'LOYALTY')));
  const earned = Math.floor(liters / LOYALTY_STEP_LITERS);
  const now = new Date();
  for (let n = Number(owned) + 1; n <= earned; n++) {
    await insertWithFreshCode(tx, {
      amountXof: LOYALTY_AMOUNT_XOF,
      source: 'LOYALTY',
      label: `${n * LOYALTY_STEP_LITERS} L servis`,
      ownerId: userId,
      claimedAt: now,
      expiresAt: new Date(now.getTime() + LOYALTY_VALIDITY_DAYS * DAY_MS),
    });
    await tx.insert(notifications).values({
      userId,
      type: 'SYSTEM',
      title: 'Bon fidélité gagné',
      message: `Bravo ! Vos ${n * LOYALTY_STEP_LITERS} L servis vous rapportent un bon d’essence de ${fcfa(LOYALTY_AMOUNT_XOF)}, valable ${LOYALTY_VALIDITY_DAYS} jours.`,
    });
  }
}
