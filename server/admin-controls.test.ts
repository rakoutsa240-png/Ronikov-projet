import { eq } from 'drizzle-orm';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app';
import type { Db } from './db/client';
import { notifications, users } from './db/schema';
import { DEMO_PASSWORD, DEMO_USERS, upsertUser } from './db/users';
import { createTestDb } from './test/db';
import { deriveTicketKeys } from './tickets';

let db: Db;
let app: ReturnType<typeof createApp>;
let admin: ReturnType<typeof request.agent>;

async function signIn(phone: string, password = DEMO_PASSWORD) {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ phone, password }).expect(200);
  return agent;
}

async function signUp(name: string, phone: string) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').send({ name, phone, password: 'motdepasse1' }).expect(201);
  return { agent, id: res.body.id as string };
}

beforeAll(async () => {
  db = await createTestDb();
  for (const user of DEMO_USERS) await upsertUser(db, user);
  app = createApp(db, { ticketKeys: deriveTicketKeys('test-secret') });
  admin = await signIn('90000003');
});

describe('suspending an account', () => {
  it('signs the person out and keeps them out until an admin lifts it', async () => {
    const { agent, id } = await signUp('Client Abusif', '91110001');
    await agent.get('/api/me').expect(200);

    const res = await admin.patch(`/api/users/${id}`).send({ isSuspended: true }).expect(200);
    expect(res.body.isSuspended).toBe(true);
    await agent.get('/api/me').expect(401);
    const login = await request(app).post('/api/auth/login').send({ phone: '91110001', password: 'motdepasse1' }).expect(403);
    expect(login.body.error).toMatch(/suspendu/);

    await admin.patch(`/api/users/${id}`).send({ isSuspended: false }).expect(200);
    await signIn('91110001', 'motdepasse1');
  });

  it('never suspends an admin or yourself, and only admins can suspend', async () => {
    const [self] = await db.select().from(users).where(eq(users.phone, '+22890000003'));
    await admin.patch(`/api/users/${self.id}`).send({ isSuspended: true }).expect(409);
    const { id } = await signUp('Autre Admin', '91110002');
    await admin.patch(`/api/users/${id}`).send({ role: 'ADMIN' }).expect(200);
    await admin.patch(`/api/users/${id}`).send({ isSuspended: true }).expect(409);
    const manager = await signIn('90000002');
    await manager.patch(`/api/users/${id}`).send({ isSuspended: true }).expect(403);
  });
});

describe('action log', () => {
  it('shows admins who did what, newest first, with paging', async () => {
    const res = await admin.get('/api/audit').expect(200);
    expect(res.body.length).toBeGreaterThan(0);
    const [latest] = res.body;
    expect(latest).toMatchObject({ action: 'user.update', actorName: 'Admin RONIKOV', actorPhone: '+22890000003' });
    const ids = res.body.map((e: { id: number }) => e.id);
    expect(ids).toEqual([...ids].sort((a, b) => b - a));

    const older = await admin.get(`/api/audit?before=${latest.id}`).expect(200);
    expect(older.body.every((e: { id: number }) => e.id < latest.id)).toBe(true);
  });

  it('is hidden from clients and managers', async () => {
    await (await signIn('90000001')).get('/api/audit').expect(403);
    await (await signIn('90000002')).get('/api/audit').expect(403);
  });
});

describe('manager requests', () => {
  it('lets a client ask, notifies admins, and makes them manager of that station once accepted', async () => {
    const { agent, id } = await signUp('Yao Gérant', '91110003');
    const asked = await agent.post('/api/manager-requests').send({ stationId: 'st-02', message: 'Je suis le gérant' }).expect(201);
    expect(asked.body).toMatchObject({ stationId: 'st-02', status: 'PENDING', userName: 'Yao Gérant' });
    await agent.post('/api/manager-requests').send({ stationId: 'st-03' }).expect(409);
    expect((await agent.get('/api/manager-requests/mine').expect(200)).body.status).toBe('PENDING');

    const [adminRow] = await db.select().from(users).where(eq(users.phone, '+22890000003'));
    const adminNotes = await db.select().from(notifications).where(eq(notifications.userId, adminRow.id));
    expect(adminNotes.some((n) => n.title === 'Demande de gérant')).toBe(true);

    const pending = await admin.get('/api/manager-requests').expect(200);
    expect(pending.body.map((r: { id: number }) => r.id)).toContain(asked.body.id);

    await agent.post(`/api/manager-requests/${asked.body.id}/accept`).expect(403);
    const accepted = await admin.post(`/api/manager-requests/${asked.body.id}/accept`).expect(200);
    expect(accepted.body.status).toBe('ACCEPTED');
    await admin.post(`/api/manager-requests/${asked.body.id}/reject`).expect(409);

    const me = await agent.get('/api/me').expect(200);
    expect(me.body).toMatchObject({ id, role: 'STATION_PRO', managedStationIds: ['st-02'] });
    await agent.patch('/api/stations/st-02').send({ queueTimeMinutes: 5 }).expect(200);
  });

  it('tells the client when the request is rejected and changes nothing', async () => {
    const { agent } = await signUp('Faux Gérant', '91110004');
    const asked = await agent.post('/api/manager-requests').send({ stationId: 'st-01' }).expect(201);
    await admin.post(`/api/manager-requests/${asked.body.id}/reject`).expect(200);
    const me = await agent.get('/api/me').expect(200);
    expect(me.body.role).toBe('CLIENT');
    expect((await agent.get('/api/manager-requests/mine')).body.status).toBe('REJECTED');
    const notes = await agent.get('/api/notifications').expect(200);
    expect(notes.body[0].title).toBe('Demande de gérant refusée');
  });

  it('refuses an unknown station or an admin asking', async () => {
    const { agent } = await signUp('Client X', '91110005');
    await agent.post('/api/manager-requests').send({ stationId: 'st-nope' }).expect(400);
    await admin.post('/api/manager-requests').send({ stationId: 'st-01' }).expect(403);
  });
});
