import request from 'supertest';
import { eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';
import { normalizeVoucherCode } from '../shared/vouchers';
import { createApp } from './app';
import type { Db } from './db/client';
import { reservations, vouchers } from './db/schema';
import { DEMO_PASSWORD, DEMO_USERS, upsertUser } from './db/users';
import { expireDueReservations } from './reservations';
import { createTestDb } from './test/db';
import { deriveTicketKeys } from './tickets';

type Agent = ReturnType<typeof request.agent>;

let db: Db;
let app: ReturnType<typeof createApp>;
let client: Agent; // 90000001
let other: Agent; // a second client
let manager: Agent; // runs st-01
let admin: Agent;

async function signIn(phone: string, password = DEMO_PASSWORD) {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ phone, password }).expect(200);
  return agent;
}

const book = (agent: Agent, liters: number, voucherId?: string, stationId = 'st-01') =>
  agent
    .post('/api/reservations')
    .send({ stationId, fuelType: 'GAZOLE', liters, paymentMethod: 'TMONEY', paymentPhone: '90000001', voucherId });

beforeAll(async () => {
  db = await createTestDb();
  for (const user of DEMO_USERS) await upsertUser(db, user);
  app = createApp(db, { ticketKeys: deriveTicketKeys('test-secret') });
  client = await signIn('90000001');
  manager = await signIn('90000002');
  admin = await signIn('90000003');
  await request(app).post('/api/auth/register').send({ name: 'Ama Koffi', phone: '91110001', password: 'motdepasse-ama' }).expect(201);
  other = await signIn('91110001', 'motdepasse-ama');
});

describe('fuel vouchers', () => {
  it('reads codes the way people type them', () => {
    expect(normalizeVoucherCode('bon 7kq2 m9xa')).toBe('BON-7KQ2-M9XA');
    expect(normalizeVoucherCode('7KQ2M9XA')).toBe('BON-7KQ2-M9XA');
    expect(normalizeVoucherCode('BON-7KQ2-M9X')).toBeNull();
    expect(normalizeVoucherCode('BON-0KQ2-M9XA')).toBeNull(); // 0 is never used
  });

  it('only lets an admin or a manager create vouchers', async () => {
    await client.post('/api/vouchers').send({ amountXof: 1000, validDays: 30, count: 1 }).expect(403);
    await client.get('/api/vouchers').expect(403);
    const both = await admin.post('/api/vouchers').send({ amountXof: 1000, validDays: 30, count: 1, phone: '90000001' }).expect(400);
    expect(both.body.error).toMatch(/numéro ou un nombre/);
  });

  it('gives a voucher to an account, which is told and can book with it', async () => {
    const res = await admin
      .post('/api/vouchers')
      .send({ amountXof: 5000, validDays: 30, label: 'Bienvenue', phone: '90 00 00 01' })
      .expect(201);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ source: 'GIFT', status: 'AVAILABLE', amountXOF: 5000, ownerPhone: '+22890000001', label: 'Bienvenue' });
    await admin.post('/api/vouchers').send({ amountXof: 5000, validDays: 30, phone: '99999999' }).expect(404);

    const notes = await client.get('/api/notifications').expect(200);
    expect(notes.body[0]).toMatchObject({ title: 'Bon d’essence offert' });
    expect(notes.body[0].message).toContain('5 000 FCFA');

    const mine = await client.get('/api/vouchers/mine').expect(200);
    const gift = mine.body.vouchers.find((v: { label: string }) => v.label === 'Bienvenue');
    expect(gift.status).toBe('AVAILABLE');

    // 10 L of gazole + 150 F fee, less 5 000 F.
    const booked = await book(client, 10, gift.id).expect(201);
    const full = booked.body.pricePerLiter * 10 + booked.body.serviceFeeXOF;
    expect(booked.body).toMatchObject({ voucherDiscountXOF: 5000, totalAmountXOF: full - 5000 });

    // Used once only, and never by someone else.
    const again = await book(client, 10, gift.id).expect(409);
    expect(again.body.error).toMatch(/plus utilisable/);
    await book(other, 10, gift.id).expect(409);

    const after = await client.get('/api/vouchers/mine').expect(200);
    expect(after.body.vouchers.find((v: { id: string }) => v.id === gift.id)).toMatchObject({
      status: 'USED',
      reservationId: booked.body.id,
      usedStationName: booked.body.stationName,
      validStationId: null,
    });

    // Cancelling the ticket gives the voucher back.
    await client.post(`/api/reservations/${booked.body.id}/cancel`).expect(200);
    const back = await client.get('/api/vouchers/mine').expect(200);
    expect(back.body.vouchers.find((v: { id: string }) => v.id === gift.id).status).toBe('AVAILABLE');
  });

  it('never makes a booking cost less than nothing', async () => {
    const [gift] = (await admin.post('/api/vouchers').send({ amountXof: 100_000, validDays: 30, phone: '90000001' }).expect(201)).body;
    const booked = await book(client, 2, gift.id).expect(201);
    expect(booked.body.totalAmountXOF).toBe(0);
    expect(booked.body.voucherDiscountXOF).toBe(booked.body.pricePerLiter * 2 + booked.body.serviceFeeXOF);
    await client.post(`/api/reservations/${booked.body.id}/cancel`).expect(200);
  });

  it('gives a voucher back when its ticket expires', async () => {
    const [gift] = (await admin.post('/api/vouchers').send({ amountXof: 2000, validDays: 30, phone: '91110001' }).expect(201)).body;
    const booked = await book(other, 5, gift.id).expect(201);
    await db.update(reservations).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(reservations.id, booked.body.id));
    await expireDueReservations(db);
    const mine = await other.get('/api/vouchers/mine').expect(200);
    expect(mine.body.vouchers.find((v: { id: string }) => v.id === gift.id).status).toBe('AVAILABLE');
  });

  it('makes contest codes that the first person to type one gets', async () => {
    const res = await admin.post('/api/vouchers').send({ amountXof: 2000, validDays: 15, label: 'Concours radio', count: 3 }).expect(201);
    expect(res.body).toHaveLength(3);
    const codes: string[] = res.body.map((v: { code: string }) => v.code);
    expect(new Set(codes).size).toBe(3);
    for (const v of res.body) expect(v).toMatchObject({ source: 'CONTEST', status: 'UNCLAIMED', ownerName: null });

    const typed = codes[0].toLowerCase().replace(/-/g, ' ');
    const claimed = await other.post('/api/vouchers/claim').send({ code: typed }).expect(201);
    expect(claimed.body).toMatchObject({ code: codes[0], status: 'AVAILABLE', amountXOF: 2000 });

    expect((await other.post('/api/vouchers/claim').send({ code: codes[0] }).expect(409)).body.error).toMatch(/déjà dans votre compte/);
    expect((await client.post('/api/vouchers/claim').send({ code: codes[0] }).expect(409)).body.error).toMatch(/quelqu’un d’autre/);
    await client.post('/api/vouchers/claim').send({ code: 'BON-2222-2222' }).expect(404);

    const list = await admin.get('/api/vouchers').expect(200);
    expect(list.body.find((v: { code: string }) => v.code === codes[0])).toMatchObject({ ownerName: 'Ama Koffi', status: 'AVAILABLE' });
  });

  it('refuses expired and withdrawn codes', async () => {
    const [late, withdrawn] = (await admin.post('/api/vouchers').send({ amountXof: 1000, validDays: 1, count: 2 }).expect(201)).body;
    await db.update(vouchers).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(vouchers.id, late.id));
    expect((await client.post('/api/vouchers/claim').send({ code: late.code }).expect(409)).body.error).toMatch(/expiré/);

    const cancelled = await admin.post(`/api/vouchers/${withdrawn.id}/cancel`).expect(200);
    expect(cancelled.body.status).toBe('CANCELLED');
    await client.post('/api/vouchers/claim').send({ code: withdrawn.code }).expect(404);

    const journal = await admin.get('/api/audit').expect(200);
    expect(journal.body.map((e: { action: string }) => e.action)).toEqual(expect.arrayContaining(['voucher.gift', 'voucher.codes', 'voucher.cancel']));
  });

  it('does not withdraw a voucher that paid for a ticket', async () => {
    const [gift] = (await admin.post('/api/vouchers').send({ amountXof: 1000, validDays: 30, phone: '90000001' }).expect(201)).body;
    const booked = await book(client, 3, gift.id).expect(201);
    expect((await admin.post(`/api/vouchers/${gift.id}/cancel`).expect(409)).body.error).toMatch(/déjà servi/);
    await client.post(`/api/reservations/${booked.body.id}/cancel`).expect(200);
  });

  it('makes Pleino vouchers work at partner stations only', async () => {
    const [gift] = (await admin.post('/api/vouchers').send({ amountXof: 1000, validDays: 30, phone: '90000001' }).expect(201)).body;
    expect(gift).toMatchObject({ validStationId: null, validStationName: null });
    const refused = await book(client, 5, gift.id, 'st-08').expect(409); // st-08 is not a partner
    expect(refused.body.error).toMatch(/ne marche pas dans cette station/);
    const booked = await book(client, 5, gift.id, 'st-02').expect(201);
    expect(booked.body.voucherDiscountXOF).toBe(1000);
    await client.post(`/api/reservations/${booked.body.id}/cancel`).expect(200);
  });

  it('lets a manager give vouchers that only work at their station', async () => {
    await manager.post('/api/vouchers').send({ amountXof: 1000, validDays: 30, count: 2 }).expect(403); // no station
    await manager.post('/api/vouchers').send({ stationId: 'st-02', amountXof: 1000, validDays: 30, count: 2 }).expect(403);

    const res = await manager
      .post('/api/vouchers')
      .send({ stationId: 'st-01', amountXof: 1500, validDays: 30, phone: '91110001', label: 'Merci fidèle client' })
      .expect(201);
    const gift = res.body[0];
    expect(gift).toMatchObject({ validStationId: 'st-01', status: 'AVAILABLE', ownerName: 'Ama Koffi' });
    const notes = await other.get('/api/notifications').expect(200);
    expect(notes.body[0].message).toMatch(/^.+ vous offre un bon d’essence de 1 500 FCFA, valable dans cette station\./);

    const mine = await other.get('/api/vouchers/mine').expect(200);
    expect(mine.body.vouchers.find((v: { id: string }) => v.id === gift.id).validStationName).toBeTruthy();
    expect((await book(other, 5, gift.id, 'st-02').expect(409)).body.error).toMatch(/ne marche pas/);
    const booked = await book(other, 5, gift.id, 'st-01').expect(201);
    expect(booked.body.voucherDiscountXOF).toBe(1500);
    await other.post(`/api/reservations/${booked.body.id}/cancel`).expect(200);

    // A manager only sees and withdraws the vouchers of their stations.
    const codes = (await manager.post('/api/vouchers').send({ stationId: 'st-01', amountXof: 500, validDays: 7, count: 2 }).expect(201)).body;
    const listed = await manager.get('/api/vouchers').expect(200);
    expect(listed.body.length).toBeGreaterThanOrEqual(3);
    expect(listed.body.every((v: { validStationId: string }) => v.validStationId === 'st-01')).toBe(true);
    await manager.post(`/api/vouchers/${codes[0].id}/cancel`).expect(200);
    const [pleino] = (await admin.post('/api/vouchers').send({ amountXof: 500, validDays: 7, count: 1 }).expect(201)).body;
    await manager.post(`/api/vouchers/${pleino.id}/cancel`).expect(404);
  });

  it('earns a loyalty voucher every 100 L served', async () => {
    const start = await other.get('/api/vouchers/mine').expect(200);
    expect(start.body.loyalty).toMatchObject({ litersServed: 0, stepLiters: 100, amountXOF: 1000, litersToNext: 100 });

    const serve = async (liters: number) => {
      const booked = await book(other, liters).expect(201);
      await manager.post('/api/stations/st-01/validate').send({ code: booked.body.code }).expect(200);
    };
    await serve(60);
    const halfway = await other.get('/api/vouchers/mine').expect(200);
    expect(halfway.body.loyalty).toMatchObject({ litersServed: 60, litersToNext: 40 });
    expect(halfway.body.vouchers.filter((v: { source: string }) => v.source === 'LOYALTY')).toHaveLength(0);

    await serve(50);
    const earned = await other.get('/api/vouchers/mine').expect(200);
    const loyalty = earned.body.vouchers.filter((v: { source: string }) => v.source === 'LOYALTY');
    expect(loyalty).toHaveLength(1);
    expect(loyalty[0]).toMatchObject({ amountXOF: 1000, status: 'AVAILABLE', label: '100 L servis' });
    expect(earned.body.loyalty).toMatchObject({ litersServed: 110, litersToNext: 90 });
    const notes = await other.get('/api/notifications').expect(200);
    expect(notes.body.map((n: { title: string }) => n.title)).toContain('Bon fidélité gagné');

    // Serving more without reaching 200 L does not award a second one.
    await serve(20);
    const still = await other.get('/api/vouchers/mine').expect(200);
    expect(still.body.vouchers.filter((v: { source: string }) => v.source === 'LOYALTY')).toHaveLength(1);
  });
});
