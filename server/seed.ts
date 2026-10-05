import { createDb } from './db/client';
import { seed } from './db/seed';
import { DEMO_PASSWORD, DEMO_USERS, upsertUser } from './db/users';
import { env } from './env';

const { db, pool } = createDb(env.DATABASE_URL);
try {
  await seed(db);
  console.log('Données de démonstration chargées.');

  if (process.argv.includes('--demo-users')) {
    for (const user of DEMO_USERS) await upsertUser(db, user);
    console.log(`Comptes de démo (mot de passe « ${DEMO_PASSWORD} ») : ${DEMO_USERS.map((u) => `${u.phone} ${u.role}`).join(', ')}.`);
  }
} finally {
  await pool.end();
}
