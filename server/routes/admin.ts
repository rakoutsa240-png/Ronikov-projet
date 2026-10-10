import { and, asc, desc, eq, inArray, lt, ne, type SQL } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { STATION_BRANDS, TOGO_BOUNDS } from '../../shared/stations';
import { computeStockStatus, FUEL_LABELS, FUEL_TYPES } from '../../shared/stock';
import type { AdminUser, AuditEntry, FuelType, ManagerRequest, UserRole } from '../../shared/types';
import { notifyFavorites, notifyFavoritesOnce } from '../alerts';
import { audit } from '../audit';
import { hashPassword, rateLimit, requireRole, temporaryPassword, toAuthUser } from '../auth';
import type { Db } from '../db/client';
import { listPrices, listStations } from '../db/queries';
import {
  auditLog,
  fuelPrices,
  fuelStocks,
  managerRequests,
  notifications,
  sessions,
  stationManagers,
  stationPrices,
  stations,
  users,
} from '../db/schema';
import { canManageStation } from './reservations';

// The project's tsconfig is not strict, so zod marks fields optional; handlers check what they need.
const fuelType = z.enum(FUEL_TYPES as [FuelType, ...FuelType[]]);

const stockBody = z
  .object({
    stockLiters: z.number().int().min(0).max(1_000_000).optional(), // what is physically in the tank
    maxCapacityLiters: z.number().int().min(1).max(1_000_000).optional(),
    pricePerLiter: z.number().int().min(1).max(100_000).optional(), // admin only
  })
  .strict();

const stationBody = z
  .object({
    queueTimeMinutes: z.number().int().min(0).max(600).optional(),
    isPartner: z.boolean().optional(), // admin only
    isActive: z.boolean().optional(), // admin only
  })
  .strict();

const newStationBody = z.object({
  name: z.string().trim().min(2, 'Nom trop court').max(120),
  brand: z.enum(STATION_BRANDS as [string, ...string[]], { message: 'Enseigne inconnue' }),
  district: z.string().trim().min(2, 'Quartier manquant').max(80),
  city: z.string().trim().min(2, 'Ville manquante').max(80),
  address: z.string().trim().min(3, 'Adresse manquante').max(200),
  lat: z.number().min(TOGO_BOUNDS.minLat, 'Position hors du Togo').max(TOGO_BOUNDS.maxLat, 'Position hors du Togo'),
  lng: z.number().min(TOGO_BOUNDS.minLng, 'Position hors du Togo').max(TOGO_BOUNDS.maxLng, 'Position hors du Togo'),
  phone: z.string().trim().min(8, 'Téléphone manquant').max(30),
  operatingHours: z.string().trim().min(2).max(60).default('06:00 - 22:00'),
  amenities: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  isPartner: z.boolean().default(false),
  // Tanks start empty with a 20 000 L capacity and today's official price unless given.
  fuels: z
    .partialRecord(
      fuelType,
      z.object({
        stockLiters: z.number().int().min(0).max(1_000_000).default(0),
        maxCapacityLiters: z.number().int().min(1).max(1_000_000).default(20_000),
        pricePerLiter: z.number().int().min(1).max(100_000).optional(),
      }),
    )
    .default({}),
});

const pricesBody = z.object({
  prices: z.array(z.object({ type: fuelType, officialPriceXOF: z.number().int().min(1).max(100_000) })).min(1),
  applyToAllStations: z.boolean().default(false),
});

const userBody = z
  .object({
    role: z.enum(['CLIENT', 'STATION_PRO', 'ADMIN']).optional(),
    isPremium: z.boolean().optional(),
    stationIds: z.array(z.string().min(1)).max(50).optional(),
    isSuspended: z.boolean().optional(),
  })
  .strict();

const managerRequestBody = z.object({
  stationId: z.string().min(1, 'Choisissez votre station'),
  message: z.string().trim().max(500, 'Message trop long').optional(),
});

const firstIssue = (error: z.ZodError) => error.issues[0]?.message ?? 'Données invalides';

async function toAdminUser(db: Db, row: typeof users.$inferSelect): Promise<AdminUser> {
  return { ...(await toAuthUser(db, row)), createdAt: row.createdAt.toISOString(), isSuspended: row.suspendedAt !== null };
}

const AUDIT_PAGE = 100;

export function adminRouter(db: Db) {
  const router = Router();
  const staff = requireRole('STATION_PRO', 'ADMIN');
  const adminOnly = requireRole('ADMIN');

  router.patch('/stations/:id/stock/:fuelType', staff, async (req, res) => {
    const stationId = String(req.params.id);
    const fuel = fuelType.safeParse(req.params.fuelType);
    const parsed = stockBody.safeParse(req.body);
    if (!fuel.success || !parsed.success) {
      res.status(400).json({ error: parsed.success ? 'Carburant inconnu' : firstIssue(parsed.error) });
      return;
    }
    if (!canManageStation(req.user!, stationId)) {
      res.status(403).json({ error: 'Cette station ne fait pas partie des vôtres' });
      return;
    }
    const { stockLiters, maxCapacityLiters, pricePerLiter } = parsed.data;
    if (pricePerLiter !== undefined && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Seul un administrateur peut changer le prix' });
      return;
    }

    const error = await db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(fuelStocks)
        .where(and(eq(fuelStocks.stationId, stationId), eq(fuelStocks.fuelType, fuel.data)))
        .for('update');
      if (!row) return { status: 404, message: 'Station introuvable' };

      const next = {
        availableLiters: stockLiters ?? row.availableLiters,
        maxCapacityLiters: maxCapacityLiters ?? row.maxCapacityLiters,
        pricePerLiterXof: pricePerLiter ?? row.pricePerLiterXof,
      };
      if (next.availableLiters > next.maxCapacityLiters) {
        return { status: 400, message: `Le stock dépasse la capacité de la cuve (${next.maxCapacityLiters} L)` };
      }
      const now = new Date();
      await tx
        .update(fuelStocks)
        .set({ ...next, updatedAt: now })
        .where(and(eq(fuelStocks.stationId, stationId), eq(fuelStocks.fuelType, fuel.data)));
      const [station] = await tx.update(stations).set({ checkedAt: now }).where(eq(stations.id, stationId)).returning();
      const label = FUEL_LABELS[fuel.data];
      const wasOut = computeStockStatus(row.availableLiters - row.reservedLiters, row.maxCapacityLiters) === 'OUT_OF_STOCK';
      const isOut = computeStockStatus(next.availableLiters - row.reservedLiters, next.maxCapacityLiters) === 'OUT_OF_STOCK';
      if (wasOut && !isOut) {
        await notifyFavorites(tx, stationId, `${label} de retour`, `${station.name} a de nouveau du ${label}. Réservez vos litres avant qu’il ne parte.`);
      }
      if (next.pricePerLiterXof !== row.pricePerLiterXof) {
        await tx.insert(stationPrices).values({ stationId, fuelType: fuel.data, pricePerLiterXof: next.pricePerLiterXof });
        await notifyFavorites(
          tx,
          stationId,
          `Nouveau prix du ${label}`,
          `${station.name} : ${next.pricePerLiterXof} FCFA/L au lieu de ${row.pricePerLiterXof} FCFA/L.`,
        );
      }
      await audit(tx, req.user!.id, 'stock.update', `station:${stationId}:${fuel.data}`, {
        before: {
          availableLiters: row.availableLiters,
          maxCapacityLiters: row.maxCapacityLiters,
          pricePerLiterXof: row.pricePerLiterXof,
        },
        after: next,
      });
      return null;
    });
    if (error) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    res.json((await listStations(db)).find((s) => s.id === stationId));
  });

  router.post('/stations', adminOnly, async (req, res) => {
    const parsed = newStationBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: firstIssue(parsed.error) });
      return;
    }
    const { fuels, ...data } = parsed.data as z.output<typeof newStationBody> & {
      fuels: Partial<Record<FuelType, { stockLiters: number; maxCapacityLiters: number; pricePerLiter?: number }>>;
    };
    for (const [type, fuel] of Object.entries(fuels)) {
      if (fuel && fuel.stockLiters > fuel.maxCapacityLiters) {
        res.status(400).json({ error: `Le stock de ${type} dépasse la capacité de la cuve` });
        return;
      }
    }
    const official = new Map((await listPrices(db)).map((p) => [p.type, p.officialPriceXOF]));
    const stationId = `st-${randomUUID().slice(0, 8)}`;

    await db.transaction(async (tx) => {
      await tx.insert(stations).values({ id: stationId, ...data, brand: data.brand as string });
      const tanks = FUEL_TYPES.map((type) => ({
        stationId,
        fuelType: type,
        availableLiters: fuels[type]?.stockLiters ?? 0,
        maxCapacityLiters: fuels[type]?.maxCapacityLiters ?? 20_000,
        pricePerLiterXof: fuels[type]?.pricePerLiter ?? official.get(type) ?? 0,
      }));
      await tx.insert(fuelStocks).values(tanks);
      await tx
        .insert(stationPrices)
        .values(tanks.map((t) => ({ stationId, fuelType: t.fuelType, pricePerLiterXof: t.pricePerLiterXof })));
      await audit(tx, req.user!.id, 'station.create', `station:${stationId}`, { ...data, fuels });
    });
    res.status(201).json((await listStations(db)).find((s) => s.id === stationId));
  });

  router.patch('/stations/:id', staff, async (req, res) => {
    const stationId = String(req.params.id);
    const parsed = stationBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: firstIssue(parsed.error) });
      return;
    }
    if (!canManageStation(req.user!, stationId)) {
      res.status(403).json({ error: 'Cette station ne fait pas partie des vôtres' });
      return;
    }
    const { queueTimeMinutes, isPartner, isActive } = parsed.data;
    if ((isPartner !== undefined || isActive !== undefined) && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Un gérant ne peut changer que le temps d’attente' });
      return;
    }
    const changes = Object.fromEntries(
      Object.entries({ queueTimeMinutes, isPartner, isActive }).filter(([, v]) => v !== undefined),
    );
    if (Object.keys(changes).length === 0) {
      res.status(400).json({ error: 'Rien à modifier' });
      return;
    }
    // A new waiting time is fresh news from the station.
    const checked = queueTimeMinutes !== undefined ? { checkedAt: new Date() } : {};
    const [updated] = await db.update(stations).set({ ...changes, ...checked }).where(eq(stations.id, stationId)).returning();
    if (!updated) {
      res.status(404).json({ error: 'Station introuvable' });
      return;
    }
    await audit(db, req.user!.id, 'station.update', `station:${stationId}`, changes);
    // An admin may have just deactivated it, so it can be missing from the public list.
    res.json((await listStations(db)).find((s) => s.id === stationId) ?? null);
  });

  router.put('/prices', adminOnly, async (req, res) => {
    const parsed = pricesBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: firstIssue(parsed.error) });
      return;
    }
    const { prices, applyToAllStations } = parsed.data as z.output<typeof pricesBody> & {
      prices: { type: FuelType; officialPriceXOF: number }[];
    };
    await db.transaction(async (tx) => {
      const now = new Date();
      await tx.insert(fuelPrices).values(prices.map((p) => ({ fuelType: p.type, officialPriceXof: p.officialPriceXOF, effectiveFrom: now })));
      if (applyToAllStations) {
        for (const p of prices) {
          const changed = await tx
            .update(fuelStocks)
            .set({ pricePerLiterXof: p.officialPriceXOF, updatedAt: now })
            .where(and(eq(fuelStocks.fuelType, p.type), ne(fuelStocks.pricePerLiterXof, p.officialPriceXOF)))
            .returning({ stationId: fuelStocks.stationId });
          if (changed.length > 0) {
            await tx.insert(stationPrices).values(
              changed.map((c) => ({ stationId: c.stationId, fuelType: p.type, pricePerLiterXof: p.officialPriceXOF, effectiveFrom: now })),
            );
            await notifyFavoritesOnce(
              tx,
              changed.map((c) => c.stationId),
              `Nouveau prix du ${FUEL_LABELS[p.type]}`,
              `Le ${FUEL_LABELS[p.type]} passe à ${p.officialPriceXOF} FCFA/L dans vos stations favorites.`,
            );
          }
        }
      }
      await audit(tx, req.user!.id, 'prices.update', 'prices', { prices, applyToAllStations });
    });
    res.json(await listPrices(db));
  });

  router.get('/users', adminOnly, async (_req, res) => {
    const rows = await db.select().from(users).orderBy(asc(users.createdAt));
    const list: AdminUser[] = [];
    for (const row of rows) list.push(await toAdminUser(db, row));
    res.json(list);
  });

  router.patch('/users/:id', adminOnly, async (req, res) => {
    const userId = String(req.params.id);
    const parsed = userBody.safeParse(req.body);
    if (!z.string().uuid().safeParse(userId).success || !parsed.success) {
      res.status(400).json({ error: parsed.success ? 'Compte introuvable' : firstIssue(parsed.error) });
      return;
    }
    const { role, isPremium, stationIds, isSuspended } = parsed.data as {
      role?: UserRole;
      isPremium?: boolean;
      stationIds?: string[];
      isSuspended?: boolean;
    };
    if (userId === req.user!.id && role !== undefined && role !== 'ADMIN') {
      res.status(409).json({ error: 'Vous ne pouvez pas retirer votre propre rôle d’administrateur' });
      return;
    }
    if (userId === req.user!.id && isSuspended) {
      res.status(409).json({ error: 'Vous ne pouvez pas suspendre votre propre compte' });
      return;
    }

    const error = await db.transaction(async (tx) => {
      const [target] = await tx.select().from(users).where(eq(users.id, userId)).for('update');
      if (!target) return { status: 404, message: 'Compte introuvable' };

      // An admin is never suspended directly, so one admin cannot lock the others out.
      if (isSuspended && (role ?? target.role) === 'ADMIN') {
        return { status: 409, message: 'Retirez d’abord son rôle d’administrateur pour suspendre ce compte' };
      }
      const changes: Partial<typeof users.$inferInsert> = Object.fromEntries(
        Object.entries({ role, isPremium }).filter(([, v]) => v !== undefined),
      );
      if (isSuspended !== undefined && isSuspended !== (target.suspendedAt !== null)) {
        changes.suspendedAt = isSuspended ? new Date() : null;
      }
      if (Object.keys(changes).length > 0) await tx.update(users).set(changes).where(eq(users.id, userId));
      // A suspended account is signed out everywhere at once.
      if (isSuspended) await tx.delete(sessions).where(eq(sessions.userId, userId));

      const finalRole = role ?? target.role;
      // An attendant keeps their station while only their premium or suspension changes.
      const keepsAttendantStation = finalRole === 'ATTENDANT' && role === undefined && stationIds === undefined;
      if (!keepsAttendantStation && (stationIds !== undefined || finalRole !== 'STATION_PRO')) {
        // Only managers run stations; other roles lose their assignments.
        const wanted = finalRole === 'STATION_PRO' ? [...new Set(stationIds ?? [])] : [];
        if (wanted.length > 0) {
          const found = await tx.select({ id: stations.id }).from(stations).where(inArray(stations.id, wanted));
          if (found.length !== wanted.length) return { status: 400, message: 'Station inconnue' };
        }
        await tx.delete(stationManagers).where(eq(stationManagers.userId, userId));
        if (wanted.length > 0) {
          await tx.insert(stationManagers).values(wanted.map((stationId) => ({ userId, stationId })));
        }
      }
      if (isPremium === true && !target.isPremium) {
        await tx.insert(notifications).values({
          userId,
          type: 'PREMIUM',
          title: 'Pass Premium Activé',
          message: 'Votre pass prioritaire Pleino est actif : vos prochaines réservations sont sans frais de service.',
        });
      }
      await audit(tx, req.user!.id, 'user.update', `user:${userId}`, { role, isPremium, stationIds, isSuspended });
      return null;
    });
    if (error) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    const [updated] = await db.select().from(users).where(eq(users.id, userId));
    res.json(await toAdminUser(db, updated));
  });

  // For a user who forgot their password: the admin reads the temporary one out to them, and they
  // must pick their own at their next sign-in. Their open sessions end so a lost phone stays locked out.
  router.post('/users/:id/password', adminOnly, async (req, res) => {
    const userId = String(req.params.id);
    if (!z.string().uuid().safeParse(userId).success) {
      res.status(400).json({ error: 'Compte introuvable' });
      return;
    }
    if (userId === req.user!.id) {
      res.status(409).json({ error: 'Changez votre propre mot de passe depuis votre profil' });
      return;
    }
    const password = temporaryPassword();
    const passwordHash = await hashPassword(password);
    const found = await db.transaction(async (tx) => {
      const [target] = await tx
        .update(users)
        .set({ passwordHash, mustChangePassword: true })
        .where(eq(users.id, userId))
        .returning({ id: users.id });
      if (!target) return false;
      await tx.delete(sessions).where(eq(sessions.userId, userId));
      await audit(tx, req.user!.id, 'user.password_reset', `user:${userId}`, {});
      return true;
    });
    if (!found) {
      res.status(404).json({ error: 'Compte introuvable' });
      return;
    }
    res.json({ temporaryPassword: password });
  });

  // The admin's log of who changed what, newest first, 100 at a time (pass ?before=<id> for older ones).
  router.get('/audit', adminOnly, async (req, res) => {
    const before = Number(req.query.before);
    const rows = await db
      .select({ entry: auditLog, actorName: users.name, actorPhone: users.phone })
      .from(auditLog)
      .leftJoin(users, eq(users.id, auditLog.actorId))
      .where(Number.isInteger(before) && before > 0 ? lt(auditLog.id, before) : undefined)
      .orderBy(desc(auditLog.id))
      .limit(AUDIT_PAGE);
    res.json(
      rows.map(
        ({ entry, actorName, actorPhone }): AuditEntry => ({
          id: entry.id,
          action: entry.action,
          target: entry.target,
          details: entry.details,
          actorName,
          actorPhone,
          createdAt: entry.createdAt.toISOString(),
        }),
      ),
    );
  });

  // A station's manager signs up like any client, then asks here to run their station (or one more).
  const managerRequestLimit = rateLimit({ max: 5, windowMs: 3_600_000, key: (req) => `manager:${req.user?.id}` });
  router.post('/manager-requests', requireRole('CLIENT', 'STATION_PRO'), managerRequestLimit, async (req, res) => {
    const parsed = managerRequestBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: firstIssue(parsed.error) });
      return;
    }
    const user = req.user!;
    const { stationId, message } = parsed.data as { stationId: string; message?: string };
    const [station] = await db
      .select({ name: stations.name })
      .from(stations)
      .where(and(eq(stations.id, stationId), eq(stations.isActive, true)));
    if (!station) {
      res.status(400).json({ error: 'Station inconnue' });
      return;
    }
    const created = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(managerRequests)
        .values({ userId: user.id, stationId, message: message || null })
        .onConflictDoNothing()
        .returning();
      if (!row) return null;
      const admins = await tx.select({ id: users.id }).from(users).where(eq(users.role, 'ADMIN'));
      if (admins.length > 0) {
        await tx.insert(notifications).values(
          admins.map((admin) => ({
            userId: admin.id,
            type: 'SYSTEM' as const,
            title: 'Demande de gérant',
            message: `${user.name} (${user.phone}) demande à gérer ${station.name}. Répondez dans Admin › Comptes.`,
            stationId,
          })),
        );
      }
      await audit(tx, user.id, 'manager.request', `station:${stationId}`, { message: message || null });
      return row;
    });
    if (!created) {
      res.status(409).json({ error: 'Vous avez déjà une demande en attente' });
      return;
    }
    res.status(201).json((await listManagerRequests(db, eq(managerRequests.id, created.id)))[0]);
  });

  // The signed-in person's latest request, so their profile can show where it stands.
  router.get('/manager-requests/mine', requireRole(), async (req, res) => {
    const [latest] = await listManagerRequests(db, eq(managerRequests.userId, req.user!.id), 1);
    res.json(latest ?? null);
  });

  router.get('/manager-requests', adminOnly, async (_req, res) => {
    res.json(await listManagerRequests(db, eq(managerRequests.status, 'PENDING')));
  });

  router.post('/manager-requests/:id/:decision', adminOnly, async (req, res) => {
    const id = Number(req.params.id);
    const decision = String(req.params.decision);
    if (!Number.isInteger(id) || (decision !== 'accept' && decision !== 'reject')) {
      res.status(404).json({ error: 'Demande introuvable' });
      return;
    }
    const error = await db.transaction(async (tx) => {
      const [request] = await tx.select().from(managerRequests).where(eq(managerRequests.id, id)).for('update');
      if (!request) return { status: 404, message: 'Demande introuvable' };
      if (request.status !== 'PENDING') return { status: 409, message: 'Cette demande a déjà reçu une réponse' };
      const [station] = await tx.select({ name: stations.name }).from(stations).where(eq(stations.id, request.stationId));

      if (decision === 'accept') {
        const [target] = await tx.select().from(users).where(eq(users.id, request.userId)).for('update');
        if (target.role === 'ADMIN') return { status: 409, message: 'Ce compte est administrateur' };
        if (target.suspendedAt) return { status: 409, message: 'Ce compte est suspendu' };
        await tx.update(users).set({ role: 'STATION_PRO' }).where(eq(users.id, target.id));
        await tx.insert(stationManagers).values({ userId: target.id, stationId: request.stationId }).onConflictDoNothing();
      }
      await tx
        .update(managerRequests)
        .set({ status: decision === 'accept' ? 'ACCEPTED' : 'REJECTED', decidedAt: new Date(), decidedBy: req.user!.id })
        .where(eq(managerRequests.id, id));
      await tx.insert(notifications).values({
        userId: request.userId,
        type: 'SYSTEM',
        stationId: request.stationId,
        ...(decision === 'accept'
          ? {
              title: 'Espace Pro ouvert',
              message: `Vous gérez maintenant ${station.name} sur Pleino. Ouvrez l’Espace Pro pour mettre à jour vos stocks.`,
            }
          : {
              title: 'Demande de gérant refusée',
              message: `Votre demande pour gérer ${station.name} n’a pas été acceptée. Contactez Pleino si c’est une erreur.`,
            }),
      });
      await audit(tx, req.user!.id, `manager.${decision}`, `user:${request.userId}`, { stationId: request.stationId });
      return null;
    });
    if (error) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    res.json((await listManagerRequests(db, eq(managerRequests.id, id)))[0]);
  });

  // Premium is granted by an admin: a client's request notifies every admin.
  const requestLimit = rateLimit({ max: 3, windowMs: 3_600_000, key: (req) => `premium:${req.user?.id}` });
  router.post('/premium/request', requireRole(), requestLimit, async (req, res) => {
    const user = req.user!;
    if (user.isPremium) {
      res.status(409).json({ error: 'Votre pass Premium est déjà actif' });
      return;
    }
    const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, 'ADMIN'));
    if (admins.length > 0) {
      await db.insert(notifications).values(
        admins.map((admin) => ({
          userId: admin.id,
          type: 'PREMIUM' as const,
          title: 'Demande de Pass Premium',
          message: `${user.name} (${user.phone}) demande l’activation du pass Premium.`,
        })),
      );
    }
    await audit(db, user.id, 'premium.request', `user:${user.id}`);
    res.status(202).json({ message: 'Demande envoyée : un administrateur Pleino va activer votre pass.' });
  });

  return router;
}


async function listManagerRequests(db: Db, where: SQL, limit = 200): Promise<ManagerRequest[]> {
  const rows = await db
    .select({ request: managerRequests, userName: users.name, userPhone: users.phone, stationName: stations.name })
    .from(managerRequests)
    .innerJoin(users, eq(users.id, managerRequests.userId))
    .innerJoin(stations, eq(stations.id, managerRequests.stationId))
    .where(where)
    .orderBy(desc(managerRequests.createdAt), desc(managerRequests.id))
    .limit(limit);
  return rows.map(({ request, userName, userPhone, stationName }) => ({
    id: request.id,
    userId: request.userId,
    userName,
    userPhone,
    stationId: request.stationId,
    stationName,
    message: request.message,
    status: request.status,
    createdAt: request.createdAt.toISOString(),
  }));
}
