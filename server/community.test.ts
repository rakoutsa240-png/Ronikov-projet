import { eq } from 'drizzle-orm';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app';
import type { Db } from './db/client';
import { notifications, stationReports, stations, users } from './db/schema';
import { DEMO_PASSWORD, DEMO_USERS, upsertUser } from './db/users';
import { createTestDb } from './test/db';
import { deriveTicketKeys } from './tickets';

let db: Db;
let app: ReturnType<typeof createApp>;
let client: ReturnType<typeof request.agent>;
let manager: ReturnType<typeof request.agent>;
let admin: ReturnType<typeof request.agent>;

async function signIn(phone: string) {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ phone, password: DEMO_PASSWORD }).expect(200);
  return agent;
}

const notificationsOf = async (phone: string) => {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.phone, `+228${phone}`));
  return db.select().from(notifications).where(eq(notifications.userId, user.id));
};

beforeAll(async () => {
  db = await createTestDb();
  for (const user of DEMO_USERS) await upsertUser(db, user);
  app = createApp(db, { ticketKeys: deriveTicketKeys('test-secret') });
  client = await signIn('90000001');
  manager = await signIn('90000002');
  admin = await signIn('90000003');
  // Every station was checked an hour ago, so reports made now count.
  await db.update(stations).set({ checkedAt: new Date(Date.now() - 3_600_000) });
});

describe('client reports', () => {
  it('shows a report on the station and tells its manager once', async () => {
    const res = await client.post('/api/stations/st-01/reports').send({ kind: 'NO_FUEL', fuelType: 'SUPER' }).expect(201);
    expect(res.body.reports).toEqual([expect.objectContaining({ kind: 'NO_FUEL', fuelType: 'SUPER', count: 1 })]);
    expect(res.body.checkedAt).toEqual(expect.any(String));

    await client.post('/api/stations/st-01/reports').send({ kind: 'NO_FUEL', fuelType: 'SUPER' }).expect(409);
    const second = await admin.post('/api/stations/st-01/reports').send({ kind: 'NO_FUEL', fuelType: 'SUPER' }).expect(201);
    expect(second.body.reports[0].count).toBe(2);

    const managerNotes = (await notificationsOf('90000002')).filter((n) => n.title.startsWith('Signalement'));
    expect(managerNotes).toHaveLength(1);
    expect(managerNotes[0].title).toBe('Signalement : Plus de Super');
  });

  it('needs an account, a known problem and, for missing fuel, the fuel', async () => {
    await request(app).post('/api/stations/st-01/reports').send({ kind: 'LONG_QUEUE' }).expect(401);
    await client.post('/api/stations/st-01/reports').send({ kind: 'NO_FUEL' }).expect(400);
    await client.post('/api/stations/st-01/reports').send({ kind: 'FIRE' }).expect(400);
    await client.post('/api/stations/st-404/reports').send({ kind: 'LONG_QUEUE' }).expect(404);
  });

  it('clears reports once the staff confirm the station', async () => {
    await client.post('/api/stations/st-01/reports').send({ kind: 'LONG_QUEUE' }).expect(201);
    await client.post('/api/stations/st-01/check').expect(403);
    await manager.post('/api/stations/st-02/check').expect(403);
    const res = await manager.post('/api/stations/st-01/check').expect(200);
    expect(res.body.reports).toEqual([]);
    expect(Date.now() - new Date(res.body.checkedAt).getTime()).toBeLessThan(5_000);
    // The old rows stay for the record.
    expect((await db.select().from(stationReports)).length).toBe(3);
  });
});

describe('favourites', () => {
  it('keeps the list per account', async () => {
    expect((await client.get('/api/favorites').expect(200)).body).toEqual([]);
    const res = await client.put('/api/favorites').send({ stationIds: ['st-01', 'st-01', 'st-404', 'st-03'] }).expect(200);
    expect(res.body).toEqual(['st-01', 'st-03']);
    expect((await client.get('/api/favorites').expect(200)).body.sort()).toEqual(['st-01', 'st-03']);
    await request(app).get('/api/favorites').expect(401);
  });

  it('tells fans when fuel is back and when the price changes', async () => {
    await manager.patch('/api/stations/st-01/stock/SUPER').send({ stockLiters: 0 }).expect(200);
    await manager.patch('/api/stations/st-01/stock/SUPER').send({ stockLiters: 4000 }).expect(200);
    await admin.patch('/api/stations/st-01/stock/SUPER').send({ pricePerLiter: 700 }).expect(200);
    await admin.put('/api/prices').send({ prices: [{ type: 'GAZOLE', officialPriceXOF: 699 }], applyToAllStations: true }).expect(200);

    const titles = (await notificationsOf('90000001')).map((n) => n.title).sort();
    expect(titles).toEqual(['Nouveau prix du Gazole (Diesel)', 'Nouveau prix du Super Sans Plomb', 'Super Sans Plomb de retour']);
    // Nobody else starred these stations.
    expect((await notificationsOf('90000003')).filter((n) => n.title.includes('retour'))).toEqual([]);
  });
});
