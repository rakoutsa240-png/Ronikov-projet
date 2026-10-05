import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1).default('postgres://ronikov:ronikov@localhost:5432/ronikov'),
  PORT: z.coerce.number().int().positive().default(4000),
});

export const env = schema.parse(process.env);
