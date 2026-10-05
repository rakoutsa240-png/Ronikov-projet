import path from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createApp } from './app';
import { createDb } from './db/client';
import { seed } from './db/seed';
import { env } from './env';
import { expireDueReservations } from './reservations';
import { deriveTicketKeys } from './tickets';

const { db, pool } = createDb(env.DATABASE_URL);

// Apply pending migrations on boot so a fresh database is usable right away.
await migrate(db as Parameters<typeof migrate>[0], { migrationsFolder: new URL('./db/migrations', import.meta.url).pathname });

if (env.SEED_DEMO_DATA) await seed(db);

const app = createApp(db, {
  ticketKeys: deriveTicketKeys(env.TICKET_SECRET),
  secureCookies: env.NODE_ENV === 'production',
  trustProxy: env.TRUST_PROXY,
  staticDir: env.STATIC_DIR ? path.resolve(env.STATIC_DIR) : undefined,
});
const server = app.listen(env.PORT, () => {
  console.log(`RONIKOV sur http://localhost:${env.PORT}`);
});

// Pending tickets past their 2 hours become EXPIRED and give their litres back.
const expireTimer = setInterval(() => {
  expireDueReservations(db)
    .then((count) => count > 0 && console.log(`${count} ticket(s) expiré(s)`))
    .catch((err) => console.error('Expiry job failed', err));
}, 60_000);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    clearInterval(expireTimer);
    server.close(() => void pool.end());
  });
}
