import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1).default('postgres://ronikov:ronikov@localhost:5432/ronikov'),
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.string().default('development'),
  // Signs and encrypts ticket codes. Changing it makes existing tickets unreadable.
  TICKET_SECRET: z.string().min(32).optional(),
});

const parsed = schema.parse(process.env);
if (!parsed.TICKET_SECRET && parsed.NODE_ENV === 'production') {
  throw new Error('TICKET_SECRET (32+ caractères) est obligatoire en production');
}

export const env = {
  ...parsed,
  TICKET_SECRET: parsed.TICKET_SECRET ?? 'dev-only-ticket-secret-do-not-use-in-production',
};
