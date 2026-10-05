import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import type { Db } from '../db/client';
import * as schema from '../db/schema';
import { seed } from '../db/seed';

// A fresh in-memory PostgreSQL with every migration applied and the demo data loaded.
export async function createTestDb(): Promise<Db> {
  const db = drizzle(new PGlite(), { schema }) as unknown as Db;
  await migrate(db as never, { migrationsFolder: new URL('../db/migrations', import.meta.url).pathname });
  await seed(db);
  return db;
}
