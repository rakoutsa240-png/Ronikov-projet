import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createApp } from './app';
import { createDb } from './db/client';
import { env } from './env';

const { db, pool } = createDb(env.DATABASE_URL);

// Apply pending migrations on boot so a fresh database is usable right away.
await migrate(db as Parameters<typeof migrate>[0], { migrationsFolder: new URL('./db/migrations', import.meta.url).pathname });

const server = createApp(db).listen(env.PORT, () => {
  console.log(`API RONIKOV sur http://localhost:${env.PORT}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => void pool.end());
  });
}
