import { and, asc, eq } from 'drizzle-orm';
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { normalizeTogoPhone } from '../../shared/phone';
import type { Attendant } from '../../shared/types';
import { audit } from '../audit';
import { hashPassword, rateLimit, requireRole, temporaryPassword } from '../auth';
import type { Db } from '../db/client';
import { sessions, stationManagers, stations, users } from '../db/schema';
import { canManageStation } from './reservations';

const newAttendantBody = z.object({
  name: z.string().trim().min(2, 'Nom trop court').max(80),
  phone: z
    .string()
    .refine((value) => normalizeTogoPhone(value) !== null, 'Numéro togolais invalide (8 chiffres)')
    .transform((value) => normalizeTogoPhone(value)!),
});

const toAttendant = (row: typeof users.$inferSelect): Attendant => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  isSuspended: row.suspendedAt !== null,
  mustChangePassword: row.mustChangePassword,
});

// A station's attendants (pompistes) only validate tickets at that station. Its manager, or an
// admin, adds and removes them here without going through the RONIKOV team.
export function attendantsRouter(db: Db) {
  const router = Router();
  const staff = requireRole('STATION_PRO', 'ADMIN');
  const perUser = rateLimit({ max: 20, windowMs: 60_000, key: (req) => `attendants:${req.user?.id}` });

  const ownStation = (req: Request, res: Response) => {
    if (canManageStation(req.user!, String(req.params.id))) return true;
    res.status(403).json({ error: 'Cette station ne fait pas partie des vôtres' });
    return false;
  };

  // Only accounts that are attendants of this very station can be changed through it.
  const findAttendant = async (stationId: string, userId: string) => {
    if (!z.string().uuid().safeParse(userId).success) return undefined;
    const [row] = await db
      .select({ user: users })
      .from(users)
      .innerJoin(stationManagers, eq(stationManagers.userId, users.id))
      .where(and(eq(users.id, userId), eq(users.role, 'ATTENDANT'), eq(stationManagers.stationId, stationId)));
    return row?.user;
  };

  router.get('/stations/:id/attendants', staff, async (req, res) => {
    if (!ownStation(req, res)) return;
    const rows = await db
      .select({ user: users })
      .from(users)
      .innerJoin(stationManagers, eq(stationManagers.userId, users.id))
      .where(and(eq(users.role, 'ATTENDANT'), eq(stationManagers.stationId, String(req.params.id))))
      .orderBy(asc(users.name));
    res.json(rows.map(({ user }) => toAttendant(user)));
  });

  // A new number gets an account with a temporary password, shown once to the manager, who reads it
  // out to the attendant. A number that already has a client account keeps its own password.
  router.post('/stations/:id/attendants', staff, perUser, async (req, res) => {
    if (!ownStation(req, res)) return;
    const stationId = String(req.params.id);
    const parsed = newAttendantBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' });
      return;
    }
    const { name, phone } = parsed.data as { name: string; phone: string };
    const password = temporaryPassword();
    const passwordHash = await hashPassword(password);

    const result = await db.transaction(async (tx) => {
      const [station] = await tx.select({ id: stations.id }).from(stations).where(eq(stations.id, stationId));
      if (!station) return { status: 404, error: 'Station introuvable' } as const;

      const [existing] = await tx.select().from(users).where(eq(users.phone, phone)).for('update');
      let user: typeof users.$inferSelect;
      let temporary: string | null = null;
      if (existing) {
        if (existing.role !== 'CLIENT') {
          return { status: 409, error: 'Ce numéro appartient déjà à un gérant, un pompiste ou un administrateur' } as const;
        }
        if (existing.suspendedAt) return { status: 409, error: 'Ce compte est suspendu' } as const;
        [user] = await tx.update(users).set({ role: 'ATTENDANT' }).where(eq(users.id, existing.id)).returning();
      } else {
        [user] = await tx
          .insert(users)
          .values({ name, phone, passwordHash, role: 'ATTENDANT', mustChangePassword: true })
          .returning();
        temporary = password;
      }
      await tx.insert(stationManagers).values({ userId: user.id, stationId });
      await audit(tx, req.user!.id, 'attendant.add', `user:${user.id}`, { stationId, existingAccount: Boolean(existing) });
      return { status: 201, attendant: toAttendant(user), temporaryPassword: temporary } as const;
    });
    if ('error' in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.status(201).json({ attendant: result.attendant, temporaryPassword: result.temporaryPassword });
  });

  // The account stays, as a plain client account, so the person keeps their own tickets.
  router.delete('/stations/:id/attendants/:userId', staff, async (req, res) => {
    if (!ownStation(req, res)) return;
    const stationId = String(req.params.id);
    const attendant = await findAttendant(stationId, String(req.params.userId));
    if (!attendant) {
      res.status(404).json({ error: 'Pompiste introuvable' });
      return;
    }
    await db.transaction(async (tx) => {
      await tx.update(users).set({ role: 'CLIENT' }).where(eq(users.id, attendant.id));
      await tx.delete(stationManagers).where(eq(stationManagers.userId, attendant.id));
      await audit(tx, req.user!.id, 'attendant.remove', `user:${attendant.id}`, { stationId });
    });
    res.status(204).end();
  });

  // Same as the admin's reset, limited to the station's own attendants.
  router.post('/stations/:id/attendants/:userId/password', staff, perUser, async (req, res) => {
    if (!ownStation(req, res)) return;
    const stationId = String(req.params.id);
    const attendant = await findAttendant(stationId, String(req.params.userId));
    if (!attendant) {
      res.status(404).json({ error: 'Pompiste introuvable' });
      return;
    }
    const password = temporaryPassword();
    const passwordHash = await hashPassword(password);
    await db.transaction(async (tx) => {
      await tx.update(users).set({ passwordHash, mustChangePassword: true }).where(eq(users.id, attendant.id));
      await tx.delete(sessions).where(eq(sessions.userId, attendant.id));
      await audit(tx, req.user!.id, 'attendant.password_reset', `user:${attendant.id}`, { stationId });
    });
    res.json({ temporaryPassword: password });
  });

  return router;
}
