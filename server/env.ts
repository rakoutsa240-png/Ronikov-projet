import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1).default('postgres://ronikov:ronikov@localhost:5432/ronikov'),
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.string().default('development'),
  // Signs and encrypts ticket codes. Changing it makes existing tickets unreadable.
  TICKET_SECRET: z.string().min(32).optional(),
  // Express "trust proxy": "true", a number of proxy hops, or an address list. Set it behind a host's proxy.
  TRUST_PROXY: z.string().default('loopback'),
  // Folder with the built front-end to serve from the API (for example "dist"). Empty = API only.
  STATIC_DIR: z.string().optional(),
  // "true" loads the demo stations and prices on start (keeps existing rows).
  SEED_DEMO_DATA: z.enum(['true', 'false']).default('false'),
});

const parsed = schema.parse(process.env);
if (!parsed.TICKET_SECRET && parsed.NODE_ENV === 'production') {
  throw new Error('TICKET_SECRET (32+ caractères) est obligatoire en production');
}

function parseTrustProxy(value: string): boolean | number | string {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return /^\d+$/.test(value) ? Number(value) : value;
}

export const env = {
  ...parsed,
  TRUST_PROXY: parseTrustProxy(parsed.TRUST_PROXY),
  SEED_DEMO_DATA: parsed.SEED_DEMO_DATA === 'true',
  TICKET_SECRET: parsed.TICKET_SECRET ?? 'dev-only-ticket-secret-do-not-use-in-production',
};
