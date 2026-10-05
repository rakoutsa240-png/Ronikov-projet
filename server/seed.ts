import { createDb } from './db/client';
import { seed } from './db/seed';
import { env } from './env';

const { db, pool } = createDb(env.DATABASE_URL);
await seed(db);
await pool.end();
console.log('Données de démonstration chargées.');
