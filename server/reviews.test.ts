import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app';
import type { Db } from './db/client';
import { DEMO_PASSWORD, DEMO_USERS, upsertUser } from './db/users';
import { createTestDb } from './test/db';
import { deriveTicketKeys } from './tickets';

type Agent = ReturnType<typeof request.agent>;

let db: Db;
let app: ReturnType<typeof createApp>;
let client: Agent;
let manager: Agent; // runs st-01
let admin: Agent;
let attendant: Agent; // Kossi Mensah, pompiste at st-01

async function signIn(phone: string, password = DEMO_PASSWORD) {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ phone, password }).expect(200);
  return agent;
}

// A paid ticket at st-01, served by the attendant unless `serve` is false.
async function ticket(serve = true) {
  const booked = await client
    .post('/api/reservations')
    .send({ stationId: 'st-01', fuelType: 'GAZOLE', liters: 10, paymentMethod: 'TMONEY', paymentPhone: '90000001' })
    .expect(201);
  if (serve) await attendant.post('/api/stations/st-01/validate').send({ code: booked.body.code }).expect(200);
  return booked.body.id as string;
}

beforeAll(async () => {
  db = await createTestDb();
  for (const user of DEMO_USERS) await upsertUser(db, user);
  app = createApp(db, { ticketKeys: deriveTicketKeys('test-secret') });
  client = await signIn('90000001');
  manager = await signIn('90000002');
  admin = await signIn('90000003');
  const added = await manager.post('/api/stations/st-01/attendants').send({ name: 'Kossi Mensah', phone: '92230001' }).expect(201);
  attendant = await signIn('92230001', added.body.temporaryPassword);
});

describe('reviews', () => {
  it('lets a client rate a served ticket once, on the station and on whoever served', async () => {
    const id = await ticket();
    const mine = await client.get('/api/reservations/mine').expect(200);
    expect(mine.body.find((r: { id: string }) => r.id === id)).toMatchObject({ servedBy: 'Kossi', review: null });

    const res = await client
      .post(`/api/reservations/${id}/review`)
      .send({ stationRating: 4, attendantRating: 5, comment: '  Très poli, merci  ' })
      .expect(201);
    expect(res.body).toMatchObject({ stationRating: 4, attendantRating: 5, comment: 'Très poli, merci' });

    const again = await client.post(`/api/reservations/${id}/review`).send({ stationRating: 1 }).expect(409);
    expect(again.body.error).toMatch(/déjà/);
    const after = await client.get('/api/reservations/mine').expect(200);
    expect(after.body.find((r: { id: string }) => r.id === id).review).toMatchObject({ stationRating: 4, attendantRating: 5 });

    // The station's public average.
    const station = await request(app).get('/api/stations/st-01').expect(200);
    expect(station.body.rating).toEqual({ average: 4, count: 1 });
  });

  it('refuses tickets not served yet, other people’s tickets and wrong marks', async () => {
    const pending = await ticket(false);
    await client.post(`/api/reservations/${pending}/review`).send({ stationRating: 5 }).expect(409);
    await client.post(`/api/reservations/${pending}/cancel`).expect(200);

    const served = await ticket();
    await manager.post(`/api/reservations/${served}/review`).send({ stationRating: 1 }).expect(404);
    await request(app).post(`/api/reservations/${served}/review`).send({ stationRating: 1 }).expect(401);
    await client.post(`/api/reservations/${served}/review`).send({ stationRating: 6 }).expect(400);
    await client.post(`/api/reservations/${served}/review`).send({ stationRating: 3, attendantRating: 0 }).expect(400);
    await client.post(`/api/reservations/${served}/review`).send({ stationRating: 3, comment: 'x'.repeat(501) }).expect(400);
    await client.post('/api/reservations/not-a-uuid/review').send({ stationRating: 3 }).expect(404);
  });

  it('warns the manager of a bad mark and shows them the attendants’ averages, not the attendant', async () => {
    const id = await ticket();
    await client
      .post(`/api/reservations/${id}/review`)
      .send({ stationRating: 3, attendantRating: 1, comment: 'Le pompiste m’a mal parlé' })
      .expect(201);

    const notes = await manager.get('/api/notifications').expect(200);
    expect(notes.body[0]).toMatchObject({ title: expect.stringMatching(/Avis négatif/) });
    expect(notes.body[0].message).toMatch(/1\/5 pour Kossi Mensah/);

    const list = await manager.get('/api/stations/st-01/reviews').expect(200);
    expect(list.body.reviews[0]).toMatchObject({
      attendantName: 'Kossi Mensah',
      attendantRating: 1,
      comment: 'Le pompiste m’a mal parlé',
      clientName: expect.not.stringMatching(/^$/),
    });
    expect(list.body.attendants).toEqual([
      expect.objectContaining({ attendantName: 'Kossi Mensah', average: 3, count: 2, lowCount: 1 }),
    ]);

    await attendant.get('/api/stations/st-01/reviews').expect(403);
    await client.get('/api/stations/st-01/reviews').expect(403);
    await manager.get('/api/stations/st-02/reviews').expect(403);
    await manager.get('/api/reviews').expect(403);
  });

  it('lets an admin hide an abusive review from the manager and the averages', async () => {
    const id = await ticket();
    await client.post(`/api/reservations/${id}/review`).send({ stationRating: 1, comment: 'insulte' }).expect(201);
    const all = await admin.get('/api/reviews').expect(200);
    const abusive = all.body.reviews.find((r: { comment: string | null }) => r.comment === 'insulte');
    expect(abusive).toMatchObject({ isHidden: false, stationName: expect.any(String) });

    const before = (await request(app).get('/api/stations/st-01').expect(200)).body.rating;
    await manager.patch(`/api/reviews/${abusive.id}`).send({ hidden: true }).expect(403);
    const hidden = await admin.patch(`/api/reviews/${abusive.id}`).send({ hidden: true }).expect(200);
    expect(hidden.body.isHidden).toBe(true);

    const after = (await request(app).get('/api/stations/st-01').expect(200)).body.rating;
    expect(after.count).toBe(before.count - 1);
    const managerList = await manager.get('/api/stations/st-01/reviews').expect(200);
    expect(managerList.body.reviews.some((r: { id: number }) => r.id === abusive.id)).toBe(false);
    const adminList = await admin.get('/api/stations/st-01/reviews').expect(200);
    expect(adminList.body.reviews.find((r: { id: number }) => r.id === abusive.id).isHidden).toBe(true);

    await admin.patch(`/api/reviews/${abusive.id}`).send({ hidden: false }).expect(200);
    expect((await request(app).get('/api/stations/st-01').expect(200)).body.rating.count).toBe(before.count);
    await admin.patch('/api/reviews/999999').send({ hidden: true }).expect(404);

    const journal = await admin.get('/api/audit').expect(200);
    expect(journal.body.map((e: { action: string }) => e.action)).toEqual(expect.arrayContaining(['review.hide', 'review.show']));
  });
});
