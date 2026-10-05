import { drizzle } from 'drizzle-orm/node-postgres';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import pg from 'pg';
import * as schema from './schema';

// Any Postgres-backed Drizzle database: node-postgres in the app, PGlite in tests.
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export function createDb(connectionString: string) {
  const pool = new pg.Pool({ connectionString });
  const db: Db = drizzle(pool, { schema });
  return { db, pool };
}
