import { and, eq, inArray } from 'drizzle-orm';
import type { Db } from './db/client';
import { favorites, notifications, stationManagers, users } from './db/schema';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

// Tells everyone who starred the station.
export async function notifyFavorites(db: Db | Tx, stationId: string, title: string, message: string) {
  const fans = await db.select({ userId: favorites.userId }).from(favorites).where(eq(favorites.stationId, stationId));
  if (fans.length === 0) return;
  await db
    .insert(notifications)
    .values(fans.map(({ userId }) => ({ userId, type: 'STOCK' as const, title, message, stationId })));
}

// One message per user who starred at least one of the stations (a nationwide price change, for example).
export async function notifyFavoritesOnce(db: Db | Tx, stationIds: string[], title: string, message: string) {
  if (stationIds.length === 0) return;
  const fans = await db
    .selectDistinct({ userId: favorites.userId })
    .from(favorites)
    .where(inArray(favorites.stationId, stationIds));
  if (fans.length === 0) return;
  await db.insert(notifications).values(fans.map(({ userId }) => ({ userId, type: 'STOCK' as const, title, message })));
}

// The station's managers, or the admins when nobody runs it.
export async function notifyStationStaff(db: Db | Tx, stationId: string, title: string, message: string) {
  let staff = await db
    .select({ userId: stationManagers.userId })
    .from(stationManagers)
    .innerJoin(users, eq(users.id, stationManagers.userId))
    .where(and(eq(stationManagers.stationId, stationId), eq(users.role, 'STATION_PRO')));
  if (staff.length === 0) staff = await db.select({ userId: users.id }).from(users).where(eq(users.role, 'ADMIN'));
  if (staff.length === 0) return;
  await db
    .insert(notifications)
    .values(staff.map(({ userId }) => ({ userId, type: 'STOCK' as const, title, message, stationId })));
}
