import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app';
import type { Db } from './db/client';
import { DEMO_PASSWORD, DEMO_USERS, upsertUser } from './db/users';
import { createTestDb } from './test/db';
import { deriveTicketKeys } from './tickets';

let db: Db;
let app: ReturnType<typeof createApp>;
let manager: ReturnType<typeof request.agent>; // runs st-01
let admin: ReturnType<typeof request.agent>;

async function signIn(phone: string, password = DEMO_PASSWORD) {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ phone, password }).expect(200);
  return agent;
}

beforeAll(async () => {
  db = await createTestDb();
  for (const user of DEMO_USERS) await upsertUser(db, user);
  app = createApp(db, { ticketKeys: deriveTicketKeys('test-secret') });
  manager = await signIn('90000002');
  admin = await signIn('90000003');
});

describe('pump attendants', () => {
  it('are added by the manager and can only validate tickets at their station', async () => {
    const res = await manager.post('/api/stations/st-01/attendants').send({ name: 'Kossi Pompiste', phone: '92220001' }).expect(201);
    expect(res.body.attendant).toMatchObject({ name: 'Kossi Pompiste', phone: '+22892220001', mustChangePassword: true });
    expect(res.body.temporaryPassword).toMatch(/^[a-z2-9]{8}$/);

    const attendant = await signIn('92220001', res.body.temporaryPassword);
    const me = await attendant.get('/api/me').expect(200);
    expect(me.body).toMatchObject({ role: 'ATTENDANT', managedStationIds: ['st-01'], mustChangePassword: true });

    await attendant.get('/api/stations/st-01/reservations').expect(200);
    const wrong = await attendant.post('/api/stations/st-01/validate').send({ code: 'RNK-AAAA-AA' });
    expect(wrong.status).not.toBe(403);
    await attendant.get('/api/stations/st-02/reservations').expect(403);
    await attendant.post('/api/stations/st-02/validate').send({ code: 'RNK-AAAA-AA' }).expect(403);

    // No stock, station or team changes.
    await attendant.patch('/api/stations/st-01/stock/SUPER').send({ stockLiters: 1 }).expect(403);
    await attendant.patch('/api/stations/st-01').send({ queueTimeMinutes: 5 }).expect(403);
    await attendant.post('/api/stations/st-01/check').expect(403);
    await attendant.get('/api/stations/st-01/attendants').expect(403);
    await attendant.post('/api/stations/st-01/attendants').send({ name: 'Autre', phone: '92220009' }).expect(403);

    const list = await manager.get('/api/stations/st-01/attendants').expect(200);
    expect(list.body.map((a: { phone: string }) => a.phone)).toContain('+22892220001');
  });

  it('can only be managed for the manager’s own station', async () => {
    await manager.get('/api/stations/st-02/attendants').expect(403);
    await manager.post('/api/stations/st-02/attendants').send({ name: 'Ailleurs', phone: '92220002' }).expect(403);
    const client = await signIn('90000001');
    await client.post('/api/stations/st-01/attendants').send({ name: 'Moi', phone: '92220003' }).expect(403);
    // An admin can do it for any station.
    await admin.post('/api/stations/st-02/attendants').send({ name: 'Par Admin', phone: '92220004' }).expect(201);
  });

  it('turns an existing client account into an attendant, keeping its password', async () => {
    await request(app).post('/api/auth/register').send({ name: 'Déjà Client', phone: '92220005', password: 'motdepasse1' }).expect(201);
    const res = await manager.post('/api/stations/st-01/attendants').send({ name: 'Ignoré', phone: '92220005' }).expect(201);
    expect(res.body.temporaryPassword).toBeNull();
    expect(res.body.attendant.name).toBe('Déjà Client');
    const me = await (await signIn('92220005', 'motdepasse1')).get('/api/me').expect(200);
    expect(me.body.role).toBe('ATTENDANT');

    // Managers, admins and attendants cannot be taken over.
    const taken = await manager.post('/api/stations/st-01/attendants').send({ name: 'Admin', phone: '90000003' }).expect(409);
    expect(taken.body.error).toMatch(/déjà/);
    await manager.post('/api/stations/st-01/attendants').send({ name: 'Encore', phone: '92220005' }).expect(409);
  });

  it('gets a new temporary password from the manager, and goes back to a client account when removed', async () => {
    const added = await manager.post('/api/stations/st-01/attendants').send({ name: 'À Retirer', phone: '92220006' }).expect(201);
    const id = added.body.attendant.id as string;
    const before = await signIn('92220006', added.body.temporaryPassword);

    const reset = await manager.post(`/api/stations/st-01/attendants/${id}/password`).expect(200);
    await before.get('/api/me').expect(401); // signed out everywhere
    const after = await signIn('92220006', reset.body.temporaryPassword);

    // Not one of st-02's attendants, so its staff cannot touch it.
    await admin.delete(`/api/stations/st-02/attendants/${id}`).expect(404);

    await manager.delete(`/api/stations/st-01/attendants/${id}`).expect(204);
    const me = await after.get('/api/me').expect(200);
    expect(me.body).toMatchObject({ role: 'CLIENT', managedStationIds: [] });
    await after.get('/api/stations/st-01/reservations').expect(403);
    await manager.post(`/api/stations/st-01/attendants/${id}/password`).expect(404);
  });

  it('keeps their station when an admin changes only their Premium', async () => {
    const added = await manager.post('/api/stations/st-01/attendants').send({ name: 'Premium Pompiste', phone: '92220007' }).expect(201);
    const res = await admin.patch(`/api/users/${added.body.attendant.id}`).send({ isPremium: true }).expect(200);
    expect(res.body).toMatchObject({ role: 'ATTENDANT', isPremium: true, managedStationIds: ['st-01'] });
  });
});
