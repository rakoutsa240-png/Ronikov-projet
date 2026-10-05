import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app';
import type { Db } from './db/client';
import { auditLog, fuelStocks, users } from './db/schema';
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

const userId = async (phone: string) =>
  (await db.select({ id: users.id }).from(users).where(eq(users.phone, phone)))[0].id;

beforeAll(async () => {
  db = await createTestDb();
  for (const user of DEMO_USERS) await upsertUser(db, user);
  app = createApp(db, { ticketKeys: deriveTicketKeys('test-secret') });
  client = await signIn('90000001');
  manager = await signIn('90000002');
  admin = await signIn('90000003');
});

describe('stock updates', () => {
  it('lets a manager set the tank level of their station, keeping booked litres held', async () => {
    await db
      .update(fuelStocks)
      .set({ reservedLiters: 100 })
      .where(and(eq(fuelStocks.stationId, 'st-01'), eq(fuelStocks.fuelType, 'GAZOLE')));
    const res = await manager.patch('/api/stations/st-01/stock/GAZOLE').send({ stockLiters: 5000 }).expect(200);
    expect(res.body.stock.GAZOLE).toMatchObject({ availableLiters: 4900, reservedLiters: 100 });

    const [log] = await db.select().from(auditLog).where(eq(auditLog.action, 'stock.update'));
    expect(log.target).toBe('station:st-01:GAZOLE');
    expect(log.details).toMatchObject({ before: { availableLiters: 10500 }, after: { availableLiters: 5000 } });
  });

  it('refuses another station, a price change, and a level above capacity', async () => {
    await manager.patch('/api/stations/st-02/stock/SUPER').send({ stockLiters: 10 }).expect(403);
    await manager.patch('/api/stations/st-01/stock/SUPER').send({ pricePerLiter: 1 }).expect(403);
    await manager.patch('/api/stations/st-01/stock/SUPER').send({ stockLiters: 999_999 }).expect(400);
    await manager.patch('/api/stations/st-01/stock/DIESEL').send({ stockLiters: 10 }).expect(400);
    await client.patch('/api/stations/st-01/stock/SUPER').send({ stockLiters: 10 }).expect(403);
  });

  it('lets an admin change any station’s price', async () => {
    const res = await admin.patch('/api/stations/st-05/stock/SUPER').send({ pricePerLiter: 730 }).expect(200);
    expect(res.body.stock.SUPER.pricePerLiter).toBe(730);
  });
});

describe('station updates', () => {
  it('lets a manager set the queue time only', async () => {
    const res = await manager.patch('/api/stations/st-01').send({ queueTimeMinutes: 30 }).expect(200);
    expect(res.body.queueTimeMinutes).toBe(30);
    await manager.patch('/api/stations/st-01').send({ isPartner: false }).expect(403);
    await manager.patch('/api/stations/st-01').send({ name: 'Piraté' }).expect(400);
  });

  it('lets an admin change the partner flag and hide a station', async () => {
    const res = await admin.patch('/api/stations/st-02').send({ isPartner: false }).expect(200);
    expect(res.body.isPartner).toBe(false);
    await admin.patch('/api/stations/st-08').send({ isActive: false }).expect(200);
    const list = await request(app).get('/api/stations').expect(200);
    expect(list.body.map((s: { id: string }) => s.id)).not.toContain('st-08');
    await admin.patch('/api/stations/st-08').send({ isActive: true }).expect(200);
  });
});

describe('official prices', () => {
  it('are set by an admin, optionally for every station', async () => {
    await manager.put('/api/prices').send({ prices: [{ type: 'SUPER', officialPriceXOF: 700 }] }).expect(403);
    const res = await admin
      .put('/api/prices')
      .send({ prices: [{ type: 'GAZOLE', officialPriceXOF: 760 }], applyToAllStations: true })
      .expect(200);
    expect(res.body.find((p: { type: string }) => p.type === 'GAZOLE').officialPriceXOF).toBe(760);
    const stations = await request(app).get('/api/stations').expect(200);
    expect(stations.body.every((s: { stock: { GAZOLE: { pricePerLiter: number } } }) => s.stock.GAZOLE.pricePerLiter === 760)).toBe(true);
  });
});

describe('accounts', () => {
  it('are listed and changed by an admin only', async () => {
    await manager.get('/api/users').expect(403);
    const list = await admin.get('/api/users').expect(200);
    expect(list.body.map((u: { phone: string }) => u.phone)).toEqual(
      expect.arrayContaining(['+22890000001', '+22890000002', '+22890000003']),
    );
    expect(JSON.stringify(list.body)).not.toContain('scrypt');
  });

  it('promotes a client to manager of a station, which takes effect at once', async () => {
    const id = await userId('+22890000001');
    const res = await admin.patch(`/api/users/${id}`).send({ role: 'STATION_PRO', stationIds: ['st-03'] }).expect(200);
    expect(res.body).toMatchObject({ role: 'STATION_PRO', managedStationIds: ['st-03'] });
    await client.patch('/api/stations/st-03').send({ queueTimeMinutes: 3 }).expect(200);

    await admin.patch(`/api/users/${id}`).send({ role: 'CLIENT' }).expect(200)
      .expect((r) => expect(r.body.managedStationIds).toEqual([]));
    await client.patch('/api/stations/st-03').send({ queueTimeMinutes: 4 }).expect(403);
    await admin.patch(`/api/users/${id}`).send({ role: 'STATION_PRO', stationIds: ['nope'] }).expect(400);
  });

  it('grants Premium and tells the client', async () => {
    const id = await userId('+22890000001');
    await admin.patch(`/api/users/${id}`).send({ isPremium: true }).expect(200);
    const me = await client.get('/api/me').expect(200);
    expect(me.body.isPremium).toBe(true);
    const notes = await client.get('/api/notifications').expect(200);
    expect(notes.body[0]).toMatchObject({ type: 'PREMIUM', title: 'Pass Premium Activé' });
    await admin.patch(`/api/users/${id}`).send({ isPremium: false }).expect(200);
  });

  it('keeps an admin from removing their own admin role', async () => {
    const id = await userId('+22890000003');
    await admin.patch(`/api/users/${id}`).send({ role: 'CLIENT' }).expect(409);
  });
});

describe('Premium requests', () => {
  it('notify the admins', async () => {
    const res = await client.post('/api/premium/request').expect(202);
    expect(res.body.message).toMatch(/administrateur/);
    const notes = await admin.get('/api/notifications').expect(200);
    expect(notes.body[0]).toMatchObject({ type: 'PREMIUM', title: 'Demande de Pass Premium' });
    expect(notes.body[0].message).toContain('+22890000001');
    await request(app).post('/api/premium/request').expect(401);
  });
});
