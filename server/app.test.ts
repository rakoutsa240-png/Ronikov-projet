import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { computeStockStatus } from '../shared/stock';
import { INITIAL_STATIONS } from '../src/data/mockData';
import { createApp } from './app';
import type { Db } from './db/client';
import * as schema from './db/schema';
import { seed } from './db/seed';

let db: Db;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  db = drizzle(new PGlite(), { schema }) as unknown as Db;
  await migrate(db as never, { migrationsFolder: new URL('./db/migrations', import.meta.url).pathname });
  await seed(db);
  await seed(db); // running it twice must not duplicate anything
  app = createApp(db);
});

describe('computeStockStatus', () => {
  it('matches every status in the demo data', () => {
    for (const station of INITIAL_STATIONS) {
      for (const stock of Object.values(station.stock)) {
        expect(computeStockStatus(stock.availableLiters, stock.maxCapacityLiters)).toBe(stock.status);
      }
    }
  });
});

describe('GET /api/stations', () => {
  it('returns the seeded stations in the shape the app uses', async () => {
    const res = await request(app).get('/api/stations').expect(200);
    expect(res.body).toHaveLength(INITIAL_STATIONS.length);
    const first = res.body.find((s: { id: string }) => s.id === 'st-01');
    expect(first).toEqual(INITIAL_STATIONS.find((s) => s.id === 'st-01'));
  });

  it('filters by city and by available fuel', async () => {
    const lome = await request(app).get('/api/stations?city=lomé').expect(200);
    expect(lome.body.length).toBeGreaterThan(0);
    expect(lome.body.every((s: { city: string }) => s.city === 'Lomé')).toBe(true);

    const melange = await request(app).get('/api/stations?fuel=MELANGE&available=true').expect(200);
    expect(melange.body.map((s: { id: string }) => s.id)).not.toContain('st-02');
  });

  it('rejects an unknown fuel type', async () => {
    await request(app).get('/api/stations?fuel=DIESEL').expect(400);
  });

  it('subtracts reserved litres from what can be booked', async () => {
    await db
      .update(schema.fuelStocks)
      .set({ reservedLiters: 8000 })
      .where(eq(schema.fuelStocks.stationId, 'st-01'));
    const res = await request(app).get('/api/stations/st-01').expect(200);
    expect(res.body.stock.SUPER).toMatchObject({ availableLiters: 400, status: 'LOW' });
    expect(res.body.stock.MELANGE).toMatchObject({ availableLiters: 0, status: 'OUT_OF_STOCK' });
    await db.update(schema.fuelStocks).set({ reservedLiters: 0 }).where(eq(schema.fuelStocks.stationId, 'st-01'));
  });

  it('returns 404 for an unknown station', async () => {
    await request(app).get('/api/stations/nope').expect(404);
  });
});

describe('GET /api/prices', () => {
  it('returns the latest official price per fuel', async () => {
    const before = await request(app).get('/api/prices').expect(200);
    expect(before.body.map((p: { type: string }) => p.type)).toEqual(['SUPER', 'GAZOLE', 'MELANGE', 'KEROSENE']);
    expect(before.body[0]).toMatchObject({ type: 'SUPER', label: 'Super Sans Plomb', officialPriceXOF: 725 });

    await db.insert(schema.fuelPrices).values({ fuelType: 'SUPER', officialPriceXof: 740 });
    await db
      .insert(schema.fuelPrices)
      .values({ fuelType: 'SUPER', officialPriceXof: 999, effectiveFrom: new Date(Date.now() + 86_400_000) });
    const after = await request(app).get('/api/prices').expect(200);
    expect(after.body[0].officialPriceXOF).toBe(740);
  });
});
