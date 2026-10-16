import { and, desc, eq, isNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { Router } from 'express';
import { z } from 'zod';
import { LOW_RATING, REVIEW_COMMENT_MAX, REVIEW_WINDOW_DAYS, shortName } from '../../shared/reviews';
import { photoUrl } from '../../shared/photos';
import { FUEL_LABELS } from '../../shared/stock';
import type { AttendantRating, ReviewsSummary, StationReview } from '../../shared/types';
import { notifyStationStaff } from '../alerts';
import { audit } from '../audit';
import { rateLimit, requireRole } from '../auth';
import type { Db } from '../db/client';
import { reservations, reviews, stations, users } from '../db/schema';
import { canManageStation } from './reservations';

const rating = z.number().int().min(1).max(5);

const reviewBody = z
  .object({
    stationRating: rating,
    attendantRating: rating.nullable().optional(),
    comment: z.string().trim().max(REVIEW_COMMENT_MAX, `${REVIEW_COMMENT_MAX} caractères au plus`).optional(),
  })
  .strict();

const hideBody = z.object({ hidden: z.boolean() }).strict();

const clients = alias(users, 'client');
const servers = alias(users, 'server');

// Who wrote what about which ticket, with the names a manager or an admin needs to read it.
function reviewRows(db: Db) {
  return db
    .select({
      review: reviews,
      stationName: stations.name,
      clientName: clients.name,
      attendantName: servers.name,
      attendantPhotoAt: servers.photoUpdatedAt,
      fuelType: reservations.fuelType,
      liters: reservations.liters,
      validatedAt: reservations.validatedAt,
    })
    .from(reviews)
    .innerJoin(stations, eq(stations.id, reviews.stationId))
    .innerJoin(reservations, eq(reservations.id, reviews.reservationId))
    .innerJoin(clients, eq(clients.id, reviews.userId))
    .leftJoin(servers, eq(servers.id, reviews.attendantId));
}

type ReviewRow = Awaited<ReturnType<ReturnType<typeof reviewRows>['execute']>>[number];

const toStationReview = (row: ReviewRow, forAdmin: boolean): StationReview => ({
  id: row.review.id,
  stationId: row.review.stationId,
  stationName: row.stationName,
  clientName: forAdmin ? row.clientName : shortName(row.clientName),
  attendantId: row.review.attendantId,
  attendantName: row.attendantName,
  attendantPhotoUrl: row.review.attendantId ? photoUrl(row.review.attendantId, row.attendantPhotoAt) : null,
  fuelLabel: FUEL_LABELS[row.fuelType],
  liters: row.liters,
  servedAt: row.validatedAt?.toISOString() ?? null,
  stationRating: row.review.stationRating,
  attendantRating: row.review.attendantRating,
  comment: row.review.comment,
  createdAt: row.review.createdAt.toISOString(),
  isHidden: row.review.hiddenAt !== null,
});

const round1 = (n: number) => Math.round(n * 10) / 10;

// Average mark of each person who served, from the visible reviews, worst first.
export function rateAttendants(list: StationReview[]): AttendantRating[] {
  const byPerson = new Map<string, { name: string; photoUrl: string | null; marks: number[] }>();
  for (const r of list) {
    if (r.isHidden || !r.attendantId || r.attendantRating === null) continue;
    const entry = byPerson.get(r.attendantId) ?? { name: r.attendantName ?? '', photoUrl: r.attendantPhotoUrl, marks: [] };
    entry.marks.push(r.attendantRating);
    byPerson.set(r.attendantId, entry);
  }
  return [...byPerson.entries()]
    .map(([attendantId, { name, photoUrl, marks }]) => ({
      attendantId,
      attendantName: name,
      attendantPhotoUrl: photoUrl,
      average: round1(marks.reduce((a, b) => a + b, 0) / marks.length),
      count: marks.length,
      lowCount: marks.filter((m) => m <= LOW_RATING).length,
    }))
    .sort((a, b) => a.average - b.average || b.count - a.count);
}

const MAX_LISTED = 300;

// Clients review a served ticket; the station's manager and the admins read the reviews.
export function reviewsRouter(db: Db) {
  const router = Router();
  const reviewLimit = rateLimit({ max: 20, windowMs: 3_600_000, key: (req) => `review:${req.user?.id}` });

  router.post('/reservations/:id/review', requireRole(), reviewLimit, async (req, res) => {
    const reservationId = String(req.params.id);
    const parsed = reviewBody.safeParse(req.body);
    if (!z.string().uuid().safeParse(reservationId).success) {
      res.status(404).json({ error: 'Ticket introuvable' });
      return;
    }
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Avis invalide' });
      return;
    }
    const { stationRating, attendantRating, comment } = parsed.data as {
      stationRating: number;
      attendantRating?: number | null;
      comment?: string;
    };

    const [ticket] = await db
      .select({ reservation: reservations, stationName: stations.name, serverName: servers.name })
      .from(reservations)
      .innerJoin(stations, eq(stations.id, reservations.stationId))
      .leftJoin(servers, eq(servers.id, reservations.validatedBy))
      .where(and(eq(reservations.id, reservationId), eq(reservations.userId, req.user!.id)));
    if (!ticket) {
      res.status(404).json({ error: 'Ticket introuvable' });
      return;
    }
    const r = ticket.reservation;
    if (r.status !== 'VALIDATED' || !r.validatedAt) {
      res.status(409).json({ error: 'Vous pourrez donner votre avis une fois servi à la pompe' });
      return;
    }
    if (Date.now() - r.validatedAt.getTime() > REVIEW_WINDOW_DAYS * 86_400_000) {
      res.status(409).json({ error: `Un avis se donne dans les ${REVIEW_WINDOW_DAYS} jours après le service` });
      return;
    }
    // Nobody to rate when the server's account is gone: the station mark alone is kept.
    const attendantId = r.validatedBy;
    const personMark = attendantId ? (attendantRating ?? null) : null;

    const [created] = await db
      .insert(reviews)
      .values({
        reservationId,
        userId: req.user!.id,
        stationId: r.stationId,
        attendantId,
        stationRating,
        attendantRating: personMark,
        comment: comment || null,
      })
      .onConflictDoNothing({ target: reviews.reservationId })
      .returning();
    if (!created) {
      res.status(409).json({ error: 'Vous avez déjà donné votre avis sur ce ticket' });
      return;
    }

    // A bad mark reaches the manager at once, so they can talk to the attendant.
    if (stationRating <= LOW_RATING || (personMark !== null && personMark <= LOW_RATING)) {
      const parts = [`${stationRating}/5 pour la station`];
      if (personMark !== null) parts.push(`${personMark}/5 pour ${ticket.serverName ?? 'la personne qui a servi'}`);
      await notifyStationStaff(
        db,
        r.stationId,
        `Avis négatif à ${ticket.stationName}`,
        `Un client a mis ${parts.join(' et ')}${created.comment ? ` : « ${created.comment.slice(0, 140)} »` : '.'} Détails dans l’Espace Pro, section Avis clients.`,
      );
    }

    res.status(201).json({
      stationRating: created.stationRating,
      attendantRating: created.attendantRating,
      comment: created.comment,
      createdAt: created.createdAt.toISOString(),
    });
  });

  // A station's reviews for its manager (hidden ones left out) or for an admin.
  router.get('/stations/:id/reviews', requireRole('STATION_PRO', 'ADMIN'), async (req, res) => {
    const stationId = String(req.params.id);
    if (!canManageStation(req.user!, stationId)) {
      res.status(403).json({ error: 'Cette station ne fait pas partie des vôtres' });
      return;
    }
    const forAdmin = req.user!.role === 'ADMIN';
    const rows = await reviewRows(db)
      .where(forAdmin ? eq(reviews.stationId, stationId) : and(eq(reviews.stationId, stationId), isNull(reviews.hiddenAt)))
      .orderBy(desc(reviews.createdAt), desc(reviews.id));
    const list = rows.map((row) => toStationReview(row, forAdmin));
    const summary: ReviewsSummary = { reviews: list.slice(0, MAX_LISTED), attendants: rateAttendants(list) };
    res.json(summary);
  });

  // Every station's latest reviews, hidden ones included, for the admins.
  router.get('/reviews', requireRole('ADMIN'), async (_req, res) => {
    const rows = await reviewRows(db).orderBy(desc(reviews.createdAt), desc(reviews.id)).limit(MAX_LISTED);
    const list = rows.map((row) => toStationReview(row, true));
    const summary: ReviewsSummary = { reviews: list, attendants: rateAttendants(list) };
    res.json(summary);
  });

  // An abusive review (insults, a phone number...) is hidden from the manager and the averages.
  router.patch('/reviews/:id', requireRole('ADMIN'), async (req, res) => {
    const id = z.coerce.number().int().positive().safeParse(req.params.id);
    const parsed = hideBody.safeParse(req.body);
    if (!id.success || !parsed.success) {
      res.status(400).json({ error: 'Demande invalide' });
      return;
    }
    const hidden = parsed.data.hidden as boolean;
    const [updated] = await db
      .update(reviews)
      .set(hidden ? { hiddenAt: new Date(), hiddenBy: req.user!.id } : { hiddenAt: null, hiddenBy: null })
      .where(eq(reviews.id, id.data))
      .returning();
    if (!updated) {
      res.status(404).json({ error: 'Avis introuvable' });
      return;
    }
    await audit(db, req.user!.id, hidden ? 'review.hide' : 'review.show', `review:${updated.id}`, { stationId: updated.stationId });
    const [row] = await reviewRows(db).where(eq(reviews.id, updated.id));
    res.json(toStationReview(row, true));
  });

  return router;
}
