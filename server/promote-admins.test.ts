import { eq } from 'drizzle-orm';
import { beforeAll, expect, it } from 'vitest';
import type { Db } from './db/client';
import { users } from './db/schema';
import { promoteAdmins, upsertUser } from './db/users';
import { createTestDb } from './test/db';

let db: Db;

// Starting the database is slow under a full parallel run, so it gets the setup timeout, not the test's.
beforeAll(async () => {
  db = await createTestDb();
});

it('promotes existing accounts listed by phone, in any format', async () => {
  await upsertUser(db, { name: 'Akou', phone: '90123456', password: 'motdepasse', role: 'CLIENT' });
  await upsertUser(db, { name: 'Autre', phone: '90654321', password: 'motdepasse', role: 'CLIENT' });

  expect(await promoteAdmins(db, ['+228 90 12 34 56', '99999999', 'pas un numéro'])).toBe(1);

  const roles = Object.fromEntries((await db.select().from(users)).map((u) => [u.name, u.role]));
  expect(roles).toEqual({ Akou: 'ADMIN', Autre: 'CLIENT' });
  expect(await promoteAdmins(db, [])).toBe(0);
  expect((await db.select().from(users).where(eq(users.role, 'ADMIN'))).length).toBe(1);
});
