import type { Db } from './db/client';
import { auditLog } from './db/schema';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export async function audit(
  db: Db | Tx,
  actorId: string,
  action: string,
  target: string,
  details: Record<string, unknown> = {},
) {
  await db.insert(auditLog).values({ actorId, action, target, details });
}
