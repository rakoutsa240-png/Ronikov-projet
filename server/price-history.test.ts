import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app';
import type { Db } from './db/client';
import { DEMO_PASSWORD, DEMO_USERS, upsertUser } from './db/users';
import type { PriceChange } from '../shared/types';
import { createTestDb } from './test/db';
import { deriveTicketKeys } from './tickets';

let db: Db;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  db = await createTestDb();
  for (const user of DEMO_USERS) await upsertUser(db, user);
  app = createApp(db, { ticketKeys: deriveTicketKeys('test-secret') });
});

const history = async (stationId: string) =>
  (await request(app).get(`/api/stations/${stationId}/price-history`).expect(200)).body as PriceChange[];

describe('price history', () => {
  it('starts with the price each station charges today', async () => {
    const station = (await request(app).get('/api/stations/st-01').expect(200)).body;
    const points = await history('st-01');
    expect(points.filter((p) => p.fuelType === 'SUPER').map((p) => p.pricePerLiter)).toEqual([station.stock.SUPER.pricePerLiter]);
  });

  it('records a price an admin sets on a station, and only when it changes', async () => {
    const admin = request.agent(app);
    await admin.post('/api/auth/login').send({ phone: '90000003', password: DEMO_PASSWORD }).expect(200);
    await admin.patch('/api/stations/st-01/stock/GAZOLE').send({ pricePerLiter: 799 }).expect(200);
    await admin.patch('/api/stations/st-01/stock/GAZOLE').send({ pricePerLiter: 799 }).expect(200);

    const gazole = (await history('st-01')).filter((p) => p.fuelType === 'GAZOLE');
    expect(gazole.at(-1)?.pricePerLiter).toBe(799);
    expect(gazole.filter((p) => p.pricePerLiter === 799)).toHaveLength(1);
  });

  it('records official prices applied to every station', async () => {
    const admin = request.agent(app);
    await admin.post('/api/auth/login').send({ phone: '90000003', password: DEMO_PASSWORD }).expect(200);
    await admin.put('/api/prices').send({ prices: [{ type: 'SUPER', officialPriceXOF: 777 }], applyToAllStations: true }).expect(200);

    expect((await history('st-02')).filter((p) => p.fuelType === 'SUPER').at(-1)?.pricePerLiter).toBe(777);
  });

  it('rejects an unknown station or period', async () => {
    await request(app).get('/api/stations/nope/price-history').expect(404);
    await request(app).get('/api/stations/st-01/price-history?days=0').expect(400);
  });
});
