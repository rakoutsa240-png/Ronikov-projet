import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createApp } from './app';
import { createDb } from './db/client';
import { env } from './env';
import { expireDueReservations } from './reservations';
import { deriveTicketKeys } from './tickets';

const { db, pool } = createDb(env.DATABASE_URL);

// Apply pending migrations on boot so a fresh database is usable right away.
await migrate(db as Parameters<typeof migrate>[0], { migrationsFolder: new URL('./db/migrations', import.meta.url).pathname });

const app = createApp(db, {
  ticketKeys: deriveTicketKeys(env.TICKET_SECRET),
  secureCookies: env.NODE_ENV === 'production',
});
const server = app.listen(env.PORT, () => {
  console.log(`API RONIKOV sur http://localhost:${env.PORT}`);
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
