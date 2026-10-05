import { eq, inArray } from 'drizzle-orm';
import { normalizeTogoPhone } from '../../shared/phone';
import type { UserRole } from '../../shared/types';
import { hashPassword } from '../auth';
import type { Db } from './client';
import { stationManagers, users } from './schema';

export interface NewUser {
  name: string;
  phone: string;
  password: string;
  role: UserRole;
  email?: string;
  stationIds?: string[];
}

// Creates the user, or updates the name, password, role and stations of the one with that phone.
export async function upsertUser(db: Db, input: NewUser) {
  const phone = normalizeTogoPhone(input.phone);
  if (!phone) throw new Error(`Numéro togolais invalide : ${input.phone}`);
  if (input.password.length < 8) throw new Error('Mot de passe : 8 caractères minimum');
  const passwordHash = await hashPassword(input.password);

  return db.transaction(async (tx) => {
    const values = { name: input.name, phone, email: input.email ?? null, passwordHash, role: input.role };
    const [user] = await tx
      .insert(users)
      .values(values)
      .onConflictDoUpdate({ target: users.phone, set: values })
      .returning();

    await tx.delete(stationManagers).where(eq(stationManagers.userId, user.id));
    if (input.stationIds?.length) {
      await tx.insert(stationManagers).values(input.stationIds.map((stationId) => ({ userId: user.id, stationId })));
    }
    return user;
  });
}

// Makes the existing accounts with these phones admins. Returns how many were promoted.
export async function promoteAdmins(db: Db, phones: string[]) {
  const normalized = phones.map((p) => normalizeTogoPhone(p)).filter((p): p is string => p !== null);
  if (normalized.length === 0) return 0;
  const promoted = await db
    .update(users)
    .set({ role: 'ADMIN' })
    .where(inArray(users.phone, normalized))
    .returning({ id: users.id });
  return promoted.length;
}

// Demo accounts for local testing, all with the same password. Never load them in production.
export const DEMO_PASSWORD = 'ronikov-demo';
export const DEMO_USERS: NewUser[] = [
  { name: 'Kofi Mensah', phone: '90000001', password: DEMO_PASSWORD, role: 'CLIENT' },
  { name: 'Ama Gérante', phone: '90000002', password: DEMO_PASSWORD, role: 'STATION_PRO', stationIds: ['st-01'] },
  { name: 'Admin RONIKOV', phone: '90000003', password: DEMO_PASSWORD, role: 'ADMIN' },
];
