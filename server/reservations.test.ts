import { and, eq, sql } from 'drizzle-orm';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app';
import type { Db } from './db/client';
import { fuelStocks, reservations, users } from './db/schema';
import { DEMO_PASSWORD, DEMO_USERS, upsertUser } from './db/users';
import { expireDueReservations } from './reservations';
import { createTestDb } from './test/db';
import { deriveTicketKeys, generateTicketCode, parseTicketCode } from './tickets';

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

async function stock(stationId: string, fuelType: 'SUPER' | 'GAZOLE' | 'MELANGE' | 'KEROSENE') {
  const [row] = await db
    .select()
    .from(fuelStocks)
    .where(and(eq(fuelStocks.stationId, stationId), eq(fuelStocks.fuelType, fuelType)));
  return row;
}

const book = (agent: ReturnType<typeof request.agent>, body: Record<string, unknown> = {}) =>
  agent.post('/api/reservations').send({
    stationId: 'st-01',
    fuelType: 'SUPER',
    liters: 20,
    paymentMethod: 'TMONEY',
    paymentPhone: '90 12 34 56',
    ...body,
  });

beforeAll(async () => {
  db = await createTestDb();
  for (const user of DEMO_USERS) await upsertUser(db, user);
  await upsertUser(db, { name: 'Autre Gérant', phone: '90000004', password: DEMO_PASSWORD, role: 'STATION_PRO', stationIds: ['st-02'] });
  app = createApp(db, { ticketKeys: deriveTicketKeys('test-secret') });
  client = await signIn('90000001');
  manager = await signIn('90000002');
  admin = await signIn('90000003');
});

describe('ticket codes', () => {
  it('look like RNK-XXXX-XX and avoid look-alike characters', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateTicketCode();
      expect(code).toMatch(/^RNK-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{2}$/);
      expect(parseTicketCode(code.toLowerCase().replace(/-/g, ' '))).toBe(code.replace(/^RNK-|-/g, ''));
    }
  });
});

describe('booking', () => {
  it('needs a signed-in account', async () => {
    await book(request(app) as never).expect(401);
  });

  it('charges the database price plus the fee and holds the litres', async () => {
    const before = await stock('st-01', 'SUPER');
    const res = await book(client, { pricePerLiter: 1, totalAmountXOF: 1 }).expect(201);
    expect(res.body).toMatchObject({
      stationId: 'st-01',
      liters: 20,
      pricePerLiter: 725,
      serviceFeeXOF: 150,
      totalAmountXOF: 20 * 725 + 150,
      status: 'PENDING',
      phonePayment: '+22890123456',
      userName: 'Kofi Mensah',
    });
    expect(res.body.code).toMatch(/^RNK-[A-Z2-9]{4}-[A-Z2-9]{2}$/);
    expect(res.body.qrPayload).toMatch(/^RNK1\./);
    expect(new Date(res.body.expiresAt).getTime() - new Date(res.body.createdAt).getTime()).toBe(2 * 3600_000);
    expect((await stock('st-01', 'SUPER')).reservedLiters).toBe(before.reservedLiters + 20);

    const [stored] = await db.select().from(reservations).where(eq(reservations.id, res.body.id));
    expect(JSON.stringify(stored)).not.toContain(res.body.code.replace(/-/g, '').slice(3));
  });

  it('waives the fee for a Premium account', async () => {
    await db.update(users).set({ isPremium: true }).where(eq(users.phone, '+22890000001'));
    const res = await book(client, { liters: 5 }).expect(201);
    expect(res.body).toMatchObject({ serviceFeeXOF: 0, totalAmountXOF: 5 * 725 });
    await db.update(users).set({ isPremium: false }).where(eq(users.phone, '+22890000001'));
  });

  it('refuses more than 100 litres, an empty tank, and a bad phone', async () => {
    await book(client, { liters: 101 }).expect(400);
    await book(client, { liters: 0 }).expect(400);
    await book(client, { stationId: 'st-02', fuelType: 'MELANGE', liters: 1 }).expect(409);
    await book(client, { paymentPhone: '123' }).expect(400);
    await book(client, { stationId: 'nope' }).expect(404);
  });

  it('never books more litres than are free, even with requests in parallel', async () => {
    await db
      .update(fuelStocks)
      .set({ availableLiters: 50, reservedLiters: 0 })
      .where(and(eq(fuelStocks.stationId, 'st-03'), eq(fuelStocks.fuelType, 'KEROSENE')));
    const results = await Promise.all(
      Array.from({ length: 4 }, () => book(client, { stationId: 'st-03', fuelType: 'KEROSENE', liters: 20 })),
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(2);
    expect(results.filter((r) => r.status === 409)).toHaveLength(2);
    expect((await stock('st-03', 'KEROSENE')).reservedLiters).toBe(40);
  });

  it('lists the owner’s tickets with their full code', async () => {
    const res = await client.get('/api/reservations/mine').expect(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((r: { code: string }) => /^RNK-[A-Z2-9]{4}-[A-Z2-9]{2}$/.test(r.code))).toBe(true);
    await manager.get('/api/reservations/mine').expect(200).expect((r) => expect(r.body).toEqual([]));
  });
});

describe('cancelling', () => {
  it('gives the litres back and only once', async () => {
    const { body } = await book(client, { liters: 10 }).expect(201);
    const before = await stock('st-01', 'SUPER');
    await client.post(`/api/reservations/${body.id}/cancel`).expect(200).expect((r) => expect(r.body.status).toBe('CANCELLED'));
    expect((await stock('st-01', 'SUPER')).reservedLiters).toBe(before.reservedLiters - 10);
    await client.post(`/api/reservations/${body.id}/cancel`).expect(409);
  });

  it('is refused for someone else’s ticket', async () => {
    const { body } = await book(client, { liters: 1 }).expect(201);
    await admin.post(`/api/reservations/${body.id}/cancel`).expect(404);
    await client.post('/api/reservations/not-a-uuid/cancel').expect(404);
  });
});

describe('validating at the pump', () => {
  it('serves the ticket once and moves the litres out of the tank', async () => {
    const { body } = await book(client, { liters: 15 }).expect(201);
    const before = await stock('st-01', 'SUPER');

    const res = await manager.post('/api/stations/st-01/validate').send({ code: body.code.toLowerCase() }).expect(200);
    expect(res.body.reservation).toMatchObject({ id: body.id, status: 'VALIDATED', liters: 15 });
    expect(res.body.reservation.code).not.toBe(body.code);

    const after = await stock('st-01', 'SUPER');
    expect(after.availableLiters).toBe(before.availableLiters - 15);
    expect(after.reservedLiters).toBe(before.reservedLiters - 15);

    const again = await manager.post('/api/stations/st-01/validate').send({ code: body.code }).expect(409);
    expect(again.body.error).toMatch(/déjà été utilisé/);

    const notes = await client.get('/api/notifications').expect(200);
    expect(notes.body[0]).toMatchObject({ title: 'Carburant Servi', read: false });
  });

  it('accepts the signed QR code and refuses an edited one', async () => {
    const { body } = await book(client, { liters: 2 }).expect(201);
    const forged = body.qrPayload.replace(/\.[^.]+$/, '.AAAAAAAAAAAAAAAAAAAAAA');
    await manager.post('/api/stations/st-01/validate').send({ code: forged }).expect(400);
    await manager.post('/api/stations/st-01/validate').send({ code: body.qrPayload }).expect(200);
  });

  it('keeps managers to their own stations', async () => {
    const { body } = await book(client, { liters: 3 }).expect(201);
    const other = await signIn('90000004');
    await other.post('/api/stations/st-01/validate').send({ code: body.code }).expect(403);
    // Typed at a station that is not the ticket's, it looks like an unknown code.
    await other.post('/api/stations/st-02/validate').send({ code: body.code }).expect(404);
    await client.post('/api/stations/st-01/validate').send({ code: body.code }).expect(403);
    await admin.post('/api/stations/st-01/validate').send({ code: body.code }).expect(200);
  });

  it('shows staff only the end of each code', async () => {
    const res = await manager.get('/api/stations/st-01/reservations').expect(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((r: { code: string; qrPayload?: string }) => r.code.startsWith('RNK-••') && !r.qrPayload)).toBe(true);
    await manager.get('/api/stations/st-02/reservations').expect(403);
    await manager.get('/api/reservations').expect(403);
    await admin.get('/api/reservations').expect(200);
  });
});

describe('expiry', () => {
  it('expires pending tickets after 2 hours and frees their litres', async () => {
    const { body } = await book(client, { liters: 7 }).expect(201);
    const before = await stock('st-01', 'SUPER');
    await db
      .update(reservations)
      .set({ expiresAt: sql`now() - interval '1 minute'` })
      .where(eq(reservations.id, body.id));

    // Typed at the pump before the job runs, an expired ticket is still refused.
    const res = await manager.post('/api/stations/st-01/validate').send({ code: body.code }).expect(409);
    expect(res.body.error).toMatch(/expiré/);
    expect((await stock('st-01', 'SUPER')).reservedLiters).toBe(before.reservedLiters - 7);

    const { body: second } = await book(client, { liters: 4 }).expect(201);
    await db
      .update(reservations)
      .set({ expiresAt: sql`now() - interval '1 minute'` })
      .where(eq(reservations.id, second.id));
    expect(await expireDueReservations(db)).toBe(1);
    expect(await expireDueReservations(db)).toBe(0);
    const mine = await client.get('/api/reservations/mine').expect(200);
    expect(mine.body.find((r: { id: string }) => r.id === second.id).status).toBe('EXPIRED');
  });
});

describe('notifications', () => {
  it('are per account and can be marked read', async () => {
    const before = await client.get('/api/notifications').expect(200);
    expect(before.body.some((n: { read: boolean }) => !n.read)).toBe(true);
    await client.post('/api/notifications/read-all').expect(204);
    const after = await client.get('/api/notifications').expect(200);
    expect(after.body.every((n: { read: boolean }) => n.read)).toBe(true);
    await request(app).get('/api/notifications').expect(401);
  });
});
