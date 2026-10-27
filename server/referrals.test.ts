import request from 'supertest';
import { eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';
import { MAX_REFERRAL_REWARDS, normalizeReferralCode, REFERRAL_AMOUNT_XOF } from '../shared/vouchers';
import { createApp } from './app';
import type { Db } from './db/client';
import { reservations, users } from './db/schema';
import { DEMO_PASSWORD, DEMO_USERS, upsertUser } from './db/users';
import { createTestDb } from './test/db';
import { deriveTicketKeys } from './tickets';

type Agent = ReturnType<typeof request.agent>;

let db: Db;
let app: ReturnType<typeof createApp>;
let client: Agent; // 90000001, who invites
let manager: Agent; // runs st-01
let admin: Agent;

async function signIn(phone: string, password = DEMO_PASSWORD) {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ phone, password }).expect(200);
  return agent;
}

const book = (agent: Agent, liters: number, fuelType = 'GAZOLE') =>
  agent
    .post('/api/reservations')
    .send({ stationId: 'st-01', fuelType, liters, paymentMethod: 'TMONEY', paymentPhone: '90000001' })
    .expect(201);

async function serve(agent: Agent, liters: number, fuelType = 'GAZOLE') {
  const booked = await book(agent, liters, fuelType);
  await manager.post('/api/stations/st-01/validate').send({ code: booked.body.code }).expect(200);
  return booked.body;
}

beforeAll(async () => {
  db = await createTestDb();
  for (const user of DEMO_USERS) await upsertUser(db, user);
  app = createApp(db, { ticketKeys: deriveTicketKeys('test-secret') });
  client = await signIn('90000001');
  manager = await signIn('90000002');
  admin = await signIn('90000003');
});

describe('referrals', () => {
  it('reads codes the way people type them', () => {
    expect(normalizeReferralCode('ami 7kq2m9')).toBe('AMI-7KQ2M9');
    expect(normalizeReferralCode('7KQ2M9')).toBe('AMI-7KQ2M9');
    expect(normalizeReferralCode('AMI-7KQ2M')).toBeNull();
    expect(normalizeReferralCode('AMI-0KQ2M9')).toBeNull();
  });

  it('gives each account one code to share, made the first time', async () => {
    await request(app).get('/api/referral').expect(401);
    const first = (await client.get('/api/referral').expect(200)).body;
    expect(first).toMatchObject({ amountXOF: REFERRAL_AMOUNT_XOF, invited: 0, rewarded: 0, maxRewards: MAX_REFERRAL_REWARDS });
    expect(first.code).toMatch(/^AMI-[2-9A-HJ-NP-Z]{6}$/);
    expect((await client.get('/api/referral').expect(200)).body.code).toBe(first.code);
    expect((await admin.get('/api/referral').expect(200)).body.code).not.toBe(first.code);
  });

  it('refuses an unknown code at sign-up instead of losing it silently', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Yao Mensah', phone: '91220001', password: 'motdepasse-yao', referralCode: 'AMI-ZZZZZZ' })
      .expect(400);
    expect(res.body.error).toMatch(/parrainage inconnu/);
  });

  it('rewards both friends once, after the first ticket served, not at sign-up', async () => {
    const { code } = (await client.get('/api/referral')).body;
    const friend = request.agent(app);
    await friend
      .post('/api/auth/register')
      .send({ name: 'Yao Mensah', phone: '91220001', password: 'motdepasse-yao', referralCode: code.toLowerCase().replace('-', ' ') })
      .expect(201);
    expect((await client.get('/api/referral')).body).toMatchObject({ invited: 1, rewarded: 0 });
    expect((await friend.get('/api/vouchers/mine')).body.vouchers).toEqual([]);

    // A cancelled ticket does not count.
    const cancelled = (await book(friend, 5)).body;
    await friend.post(`/api/reservations/${cancelled.id}/cancel`).expect(200);
    expect((await friend.get('/api/vouchers/mine')).body.vouchers).toEqual([]);

    await serve(friend, 5);
    const mine = (await friend.get('/api/vouchers/mine')).body.vouchers;
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ source: 'REFERRAL', amountXOF: REFERRAL_AMOUNT_XOF, status: 'AVAILABLE', validStationId: null });
    const theirs = (await client.get('/api/vouchers/mine')).body.vouchers.filter((v: { source: string }) => v.source === 'REFERRAL');
    expect(theirs).toHaveLength(1);
    expect(theirs[0].label).toBe('Parrainage de Yao');
    expect((await client.get('/api/referral')).body).toMatchObject({ invited: 1, rewarded: 1 });
    const notes = (await client.get('/api/notifications')).body;
    expect(notes[0]).toMatchObject({ title: 'Bon de parrainage gagné' });
    expect(notes[0].message).toMatch(/^Yao a fait son premier plein/);

    // The second ticket gives nothing more.
    await serve(friend, 5);
    expect((await friend.get('/api/vouchers/mine')).body.vouchers.filter((v: { source: string }) => v.source === 'REFERRAL')).toHaveLength(1);
  });

  it('stops rewarding the person who invites after the limit, but still welcomes the friend', async () => {
    const [me] = await db.select({ id: users.id }).from(users).where(eq(users.phone, '+22890000001'));
    const { code } = (await client.get('/api/referral')).body;
    // Pretend the limit is already reached.
    for (let i = 0; i < MAX_REFERRAL_REWARDS - 1; i++) {
      await db.insert(users).values({
        name: `Ami ${i}`,
        phone: `+2289230${String(i).padStart(4, '0')}`,
        passwordHash: 'x',
        referredBy: me.id,
        referralRewardedAt: new Date(),
      });
    }
    const late = request.agent(app);
    await late.post('/api/auth/register').send({ name: 'Kossi Late', phone: '91220002', password: 'motdepasse-kossi', referralCode: code }).expect(201);
    const before = (await client.get('/api/vouchers/mine')).body.vouchers.length;
    await serve(late, 5);
    expect((await late.get('/api/vouchers/mine')).body.vouchers).toHaveLength(1);
    expect((await client.get('/api/vouchers/mine')).body.vouchers.length).toBe(before);
  });
});

describe('station sales', () => {
  it('is for the station’s managers and admins only', async () => {
    await client.get('/api/stations/st-01/sales').expect(403);
    await manager.get('/api/stations/st-02/sales').expect(403);
    await request(app).get('/api/stations/st-01/sales').expect(401);
  });

  it('adds up the tickets served, by day, hour and fuel, and compares with the period before', async () => {
    // Served tickets from the referral tests above: 5 + 5 + 5 L of Gazole today. One more, and one never served.
    const extra = await serve(client, 10, 'SUPER');
    await book(client, 7);
    // One served 8 days ago: outside the week, inside the week before.
    await db
      .update(reservations)
      .set({ validatedAt: new Date(Date.now() - 8 * 86_400_000) })
      .where(eq(reservations.id, extra.id));
    await serve(client, 10, 'SUPER');

    const week = (await manager.get('/api/stations/st-01/sales').expect(200)).body;
    expect(week.days).toBe(7);
    expect(week.tickets).toBe(4);
    expect(week.liters).toBe(25);
    expect(week.byDay).toHaveLength(7);
    expect(week.byDay[6]).toMatchObject({ date: new Date().toISOString().slice(0, 10), liters: 25 });
    expect(week.byHour).toHaveLength(24);
    expect(week.byHour[new Date().getUTCHours()].tickets).toBe(4);
    expect(week.byFuel.map((f: { type: string; liters: number }) => [f.type, f.liters])).toEqual([
      ['SUPER', 10],
      ['GAZOLE', 15],
    ]);
    expect(week.revenueXOF).toBe(week.byFuel.reduce((sum: number, f: { revenueXOF: number }) => sum + f.revenueXOF, 0));
    expect(week.previous.liters).toBe(10);

    const month = (await admin.get('/api/stations/st-01/sales?days=30').expect(200)).body;
    expect(month).toMatchObject({ days: 30, tickets: 5, liters: 35 });
    expect(month.byDay).toHaveLength(30);
  });
});
