import { parseArgs } from 'node:util';
import type { UserRole } from '../shared/types';
import { createDb } from './db/client';
import { upsertUser } from './db/users';
import { env } from './env';

// Usage: bun run user:create --name "Nom" --phone 90123456 --password "..." --role ADMIN [--station st-01 ...]
const { values } = parseArgs({
  options: {
    name: { type: 'string' },
    phone: { type: 'string' },
    password: { type: 'string' },
    role: { type: 'string', default: 'CLIENT' },
    email: { type: 'string' },
    station: { type: 'string', multiple: true },
  },
});

const roles: UserRole[] = ['CLIENT', 'STATION_PRO', 'ADMIN'];
if (!values.name || !values.phone || !values.password || !roles.includes(values.role as UserRole)) {
  console.error(
    'Usage : bun run user:create --name "Nom" --phone 90123456 --password "..." --role CLIENT|STATION_PRO|ADMIN [--station st-01]',
  );
  process.exit(1);
}

const { db, pool } = createDb(env.DATABASE_URL);
try {
  const user = await upsertUser(db, {
    name: values.name,
    phone: values.phone,
    password: values.password,
    role: values.role as UserRole,
    email: values.email,
    stationIds: values.station,
  });
  console.log(`Compte ${user.role} prêt pour ${user.phone}.`);
} finally {
  await pool.end();
}
