import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app';
import type { Db } from './db/client';
import { DEMO_PASSWORD, DEMO_USERS, upsertUser } from './db/users';
import { createTestDb } from './test/db';
import { deriveTicketKeys } from './tickets';

type Agent = ReturnType<typeof request.agent>;

let app: ReturnType<typeof createApp>;
let client: Agent;
let manager: Agent; // runs st-01
let admin: Agent;
let attendant: Agent; // Kossi Mensah, pompiste at st-01
let attendantId: string;

// Smallest files that pass the server's check of the first bytes.
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff, 0xd9]);
const OTHER_JPEG = Buffer.concat([JPEG, Buffer.from([0x00, 0x01])]);

async function signIn(phone: string, password = DEMO_PASSWORD) {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ phone, password }).expect(200);
  return agent;
}

const upload = (agent: Agent, data: Buffer, type = 'image/jpeg') => agent.put('/api/me/photo').set('Content-Type', type).send(data);

beforeAll(async () => {
  const db: Db = await createTestDb();
  for (const user of DEMO_USERS) await upsertUser(db, user);
  app = createApp(db, { ticketKeys: deriveTicketKeys('test-secret') });
  client = await signIn('90000001');
  manager = await signIn('90000002');
  admin = await signIn('90000003');
  const added = await manager.post('/api/stations/st-01/attendants').send({ name: 'Kossi Mensah', phone: '92230001' }).expect(201);
  attendantId = added.body.attendant.id;
  attendant = await signIn('92230001', added.body.temporaryPassword);
});

describe('profile photos', () => {
  it('lets anyone add, replace and remove their own photo', async () => {
    const before = await client.get('/api/me').expect(200);
    expect(before.body.photoUrl).toBeNull();

    const added = await upload(client, JPEG).expect(200);
    expect(added.body.photoUrl).toMatch(new RegExp(`^/api/users/${before.body.id}/photo\\?v=\\d+$`));
    const photo = await client.get(added.body.photoUrl).expect(200);
    expect(photo.headers['content-type']).toBe('image/jpeg');
    expect(Buffer.from(photo.body)).toEqual(JPEG);

    await new Promise((r) => setTimeout(r, 5));
    const replaced = await upload(client, OTHER_JPEG).expect(200);
    expect(replaced.body.photoUrl).not.toBe(added.body.photoUrl);
    expect(Buffer.from((await client.get(replaced.body.photoUrl).expect(200)).body)).toEqual(OTHER_JPEG);

    const removed = await client.delete('/api/me/photo').expect(200);
    expect(removed.body.photoUrl).toBeNull();
    await client.get(added.body.photoUrl).expect(404);
  });

  it('refuses files that are not images, too big, or sent signed out', async () => {
    await upload(client, Buffer.from('<svg onload="alert(1)"></svg>'), 'image/png').expect(400);
    await upload(client, Buffer.from('hello'), 'text/plain').expect(400);
    await upload(client, Buffer.concat([JPEG, Buffer.alloc(300 * 1024)])).expect(413);
    await request(app).put('/api/me/photo').set('Content-Type', 'image/jpeg').send(JPEG).expect(401);

    await upload(attendant, JPEG).expect(200);
    await request(app).get(`/api/users/${attendantId}/photo`).expect(401);
    await client.get('/api/users/not-a-uuid/photo').expect(404);
  });

  it('shows the pompiste’s photo to the client they served, and the client’s photo to staff', async () => {
    await upload(attendant, JPEG).expect(200);
    await upload(client, JPEG).expect(200);
    const booked = await client
      .post('/api/reservations')
      .send({ stationId: 'st-01', fuelType: 'GAZOLE', liters: 10, paymentMethod: 'TMONEY', paymentPhone: '90000001' })
      .expect(201);

    const pending = await attendant.get('/api/stations/st-01/reservations').expect(200);
    expect(pending.body.find((r: { id: string }) => r.id === booked.body.id).userPhotoUrl).toMatch(/^\/api\/users\/.+\/photo/);

    await attendant.post('/api/stations/st-01/validate').send({ code: booked.body.code }).expect(200);
    const mine = await client.get('/api/reservations/mine').expect(200);
    const ticket = mine.body.find((r: { id: string }) => r.id === booked.body.id);
    expect(ticket.servedBy).toBe('Kossi');
    expect(ticket.servedByPhotoUrl).toMatch(new RegExp(`^/api/users/${attendantId}/photo`));
    await client.get(ticket.servedByPhotoUrl).expect(200);

    await client.post(`/api/reservations/${booked.body.id}/review`).send({ stationRating: 5, attendantRating: 5 }).expect(201);
    const reviews = await manager.get('/api/stations/st-01/reviews').expect(200);
    expect(reviews.body.attendants[0].attendantPhotoUrl).toBe(ticket.servedByPhotoUrl);
    const team = await manager.get('/api/stations/st-01/attendants').expect(200);
    expect(team.body[0].photoUrl).toBe(ticket.servedByPhotoUrl);
  });

  it('lets only an admin take down someone else’s photo, and logs it', async () => {
    await upload(attendant, JPEG).expect(200);
    await manager.delete(`/api/users/${attendantId}/photo`).expect(403);
    await admin.delete(`/api/users/${attendantId}/photo`).expect(204);
    expect((await attendant.get('/api/me').expect(200)).body.photoUrl).toBeNull();
    await admin.delete('/api/users/00000000-0000-0000-0000-000000000000/photo').expect(404);

    const log = await admin.get('/api/audit').expect(200);
    expect(log.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ action: 'user.photo.remove', target: `user:${attendantId}` })]),
    );
  });
});
