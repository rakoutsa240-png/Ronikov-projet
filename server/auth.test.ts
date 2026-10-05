import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { normalizeTogoPhone } from '../shared/phone';
import { createApp } from './app';
import { hashPassword, verifyPassword } from './auth';
import type { Db } from './db/client';
import { DEMO_PASSWORD, DEMO_USERS, upsertUser } from './db/users';
import { createTestDb } from './test/db';

let db: Db;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  db = await createTestDb();
  for (const user of DEMO_USERS) await upsertUser(db, user);
  app = createApp(db);
});

describe('normalizeTogoPhone', () => {
  it('accepts the usual ways of writing a Togolese number', () => {
    for (const input of ['90 12 34 56', '90123456', '+228 90 12 34 56', '0022890123456', '228-90-12-34-56']) {
      expect(normalizeTogoPhone(input)).toBe('+22890123456');
    }
    expect(normalizeTogoPhone('9012345')).toBeNull();
    expect(normalizeTogoPhone('+33 6 12 34 56 78')).toBeNull();
  });
});

describe('password hashing', () => {
  it('verifies the right password only', async () => {
    const hash = await hashPassword('motdepasse');
    expect(hash).not.toContain('motdepasse');
    expect(await verifyPassword('motdepasse', hash)).toBe(true);
    expect(await verifyPassword('autre', hash)).toBe(false);
  });
});

describe('auth routes', () => {
  it('registers a client, keeps them signed in, and signs them out', async () => {
    const agent = request.agent(app);
    const res = await agent
      .post('/api/auth/register')
      .send({ name: 'Afi Koffi', phone: '91 22 33 44', password: 'secret-123', role: 'ADMIN' })
      .expect(201);
    expect(res.body).toMatchObject({ name: 'Afi Koffi', phone: '+22891223344', role: 'CLIENT', isPremium: false });
    expect(res.headers['set-cookie'][0]).toMatch(/ronikov_session=.+HttpOnly/i);

    await agent.get('/api/me').expect(200).expect((r) => expect(r.body.phone).toBe('+22891223344'));
    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/me').expect(401);
  });

  it('refuses a second account on the same number', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Doublon', phone: '+228 90000001', password: 'secret-123' })
      .expect(409);
  });

  it('rejects bad sign-up data', async () => {
    await request(app).post('/api/auth/register').send({ name: 'X', phone: '123', password: 'court' }).expect(400);
  });

  it('logs in with the server-side role and managed stations', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ phone: '90000002', password: DEMO_PASSWORD })
      .expect(200);
    expect(res.body).toMatchObject({ role: 'STATION_PRO', managedStationIds: ['st-01'] });
  });

  it('gives the same answer for an unknown number and a wrong password', async () => {
    const unknown = await request(app).post('/api/auth/login').send({ phone: '99999999', password: 'x' }).expect(401);
    const wrong = await request(app).post('/api/auth/login').send({ phone: '90000003', password: 'x' }).expect(401);
    expect(unknown.body).toEqual(wrong.body);
  });

  it('limits login attempts per number', async () => {
    const freshApp = createApp(db);
    const tries = [];
    for (let i = 0; i < 11; i++) {
      tries.push(await request(freshApp).post('/api/auth/login').send({ phone: '90 00 00 01', password: 'mauvais' }));
    }
    expect(tries.slice(0, 10).every((r) => r.status === 401)).toBe(true);
    expect(tries[10].status).toBe(429);
  });

  it('ignores a forged session cookie', async () => {
    await request(app).get('/api/me').set('Cookie', 'ronikov_session=forged').expect(401);
  });
});
