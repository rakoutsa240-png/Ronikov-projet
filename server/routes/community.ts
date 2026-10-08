import { and, eq, gt } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { REPORT_KINDS, reportLabel } from '../../shared/reports';
import { FUEL_TYPES } from '../../shared/stock';
import type { FuelType, ReportKind } from '../../shared/types';
import { notifyStationStaff } from '../alerts';
import { audit } from '../audit';
import { rateLimit, requireRole } from '../auth';
import type { Db } from '../db/client';
import { listStations, reportWindowStart } from '../db/queries';
import { favorites, stationReports, stations } from '../db/schema';
import { canManageStation } from './reservations';

const reportBody = z
  .object({
    kind: z.enum(REPORT_KINDS as [ReportKind, ...ReportKind[]]),
    fuelType: z.enum(FUEL_TYPES as [FuelType, ...FuelType[]]).nullable().optional(),
  })
  .strict();

// Client reports, the staff's "nothing changed" check and favourite stations.
export function communityRouter(db: Db) {
  const router = Router();
  const signedIn = requireRole();

  const reportLimit = rateLimit({ max: 10, windowMs: 3_600_000, key: (req) => `report:${req.user?.id}` });
  router.post('/stations/:id/reports', signedIn, reportLimit, async (req, res) => {
    const stationId = String(req.params.id);
    const parsed = reportBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Signalement invalide' });
      return;
    }
    const kind = parsed.data.kind as ReportKind;
    const fuelType = (parsed.data.fuelType ?? null) as FuelType | null;
    if (kind === 'NO_FUEL' && !fuelType) {
      res.status(400).json({ error: 'Choisissez le carburant qui manque' });
      return;
    }
    const [station] = await db.select().from(stations).where(and(eq(stations.id, stationId), eq(stations.isActive, true)));
    if (!station) {
      res.status(404).json({ error: 'Station introuvable' });
      return;
    }

    const since = new Date(Math.max(reportWindowStart().getTime(), station.checkedAt.getTime()));
    const sameProblem = (await db
      .select()
      .from(stationReports)
      .where(and(eq(stationReports.stationId, stationId), eq(stationReports.kind, kind), gt(stationReports.createdAt, since))))
      .filter((r) => r.fuelType === fuelType);
    if (sameProblem.some((r) => r.userId === req.user!.id)) {
      res.status(409).json({ error: 'Vous avez déjà signalé ce problème, merci !' });
      return;
    }

    await db.insert(stationReports).values({ stationId, userId: req.user!.id, kind, fuelType });
    // The staff hear about a problem once, at its first report.
    if (sameProblem.length === 0) {
      await notifyStationStaff(
        db,
        stationId,
        `Signalement : ${reportLabel({ kind, fuelType })}`,
        `Un client signale « ${reportLabel({ kind, fuelType }).toLowerCase()} » à ${station.name}. Mettez la station à jour dans l’Espace Pro.`,
      );
    }
    res.status(201).json((await listStations(db)).find((s) => s.id === stationId));
  });

  // The staff confirm that what the site shows is still right: it clears client reports.
  router.post('/stations/:id/check', requireRole('STATION_PRO', 'ADMIN'), async (req, res) => {
    const stationId = String(req.params.id);
    if (!canManageStation(req.user!, stationId)) {
      res.status(403).json({ error: 'Cette station ne fait pas partie des vôtres' });
      return;
    }
    const [updated] = await db.update(stations).set({ checkedAt: new Date() }).where(eq(stations.id, stationId)).returning();
    if (!updated) {
      res.status(404).json({ error: 'Station introuvable' });
      return;
    }
    await audit(db, req.user!.id, 'station.check', `station:${stationId}`);
    res.json((await listStations(db)).find((s) => s.id === stationId) ?? null);
  });

  router.get('/favorites', signedIn, async (req, res) => {
    const rows = await db.select({ stationId: favorites.stationId }).from(favorites).where(eq(favorites.userId, req.user!.id));
    res.json(rows.map((r) => r.stationId));
  });

  // Replaces the whole list, so the phone's favourites (kept while signed out) are merged in one call.
  router.put('/favorites', signedIn, async (req, res) => {
    const parsed = z.array(z.string().min(1).max(64)).max(200).safeParse(req.body?.stationIds);
    if (!parsed.success) {
      res.status(400).json({ error: 'Liste invalide' });
      return;
    }
    const wanted = [...new Set(parsed.data)];
    const known = new Set((await db.select({ id: stations.id }).from(stations)).map((s) => s.id));
    const kept = wanted.filter((id) => known.has(id));
    await db.transaction(async (tx) => {
      await tx.delete(favorites).where(eq(favorites.userId, req.user!.id));
      if (kept.length > 0) await tx.insert(favorites).values(kept.map((stationId) => ({ userId: req.user!.id, stationId })));
    });
    res.json(kept);
  });

  return router;
}
