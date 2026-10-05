import { Router, type Response } from 'express';
import { z } from 'zod';
import { normalizeTogoPhone } from '../../shared/phone';
import { FUEL_TYPES } from '../../shared/stock';
import type { AuthUser, FuelType, PaymentMethod } from '../../shared/types';
import { rateLimit, requireRole } from '../auth';
import type { Db } from '../db/client';
import {
  cancelReservation,
  createReservation,
  listNotifications,
  listStationReservations,
  listUserReservations,
  markNotificationsRead,
  type NewReservation,
  ReservationError,
  validateTicket,
} from '../reservations';
import type { TicketKeys } from '../tickets';

const PAYMENT_METHODS: PaymentMethod[] = ['MIXX_BY_YAS', 'MOOV_MONEY', 'CARD', 'TMONEY', 'FLOOZ'];

// The project's tsconfig is not strict, so zod marks every field optional: the cast below is safe after parsing.
const createBody = z.object({
  stationId: z.string().min(1),
  fuelType: z.enum(FUEL_TYPES as [FuelType, ...FuelType[]]),
  liters: z.number().int(),
  paymentMethod: z.enum(PAYMENT_METHODS as [PaymentMethod, ...PaymentMethod[]]),
  paymentPhone: z
    .string()
    .refine((value) => normalizeTogoPhone(value) !== null, 'Numéro de paiement togolais invalide')
    .transform((value) => normalizeTogoPhone(value)!),
});

const validateBody = z.object({ code: z.string().min(1).max(200) });

export const canManageStation = (user: AuthUser, stationId: string) =>
  user.role === 'ADMIN' || (user.role === 'STATION_PRO' && user.managedStationIds.includes(stationId));

function sendError(res: Response, err: unknown) {
  if (!(err instanceof ReservationError)) throw err;
  res.status(err.status).json({ error: err.message, ...(err.reservation ? { reservation: err.reservation } : {}) });
}

export function reservationsRouter(db: Db, keys: TicketKeys) {
  const router = Router();
  const signedIn = requireRole();

  router.post('/reservations', signedIn, async (req, res) => {
    const parsed = createBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' });
      return;
    }
    try {
      res.status(201).json(await createReservation(db, keys, req.user!, parsed.data as NewReservation));
    } catch (err) {
      sendError(res, err);
    }
  });

  router.get('/reservations/mine', signedIn, async (req, res) => {
    res.json(await listUserReservations(db, keys, req.user!.id));
  });

  router.get('/reservations', requireRole('ADMIN'), async (_req, res) => {
    res.json(await listStationReservations(db));
  });

  router.post('/reservations/:id/cancel', signedIn, async (req, res) => {
    if (!z.string().uuid().safeParse(String(req.params.id)).success) {
      res.status(404).json({ error: 'Réservation introuvable' });
      return;
    }
    try {
      res.json(await cancelReservation(db, keys, req.user!, String(req.params.id)));
    } catch (err) {
      sendError(res, err);
    }
  });

  router.get('/stations/:id/reservations', requireRole('STATION_PRO', 'ADMIN'), async (req, res) => {
    if (!canManageStation(req.user!, String(req.params.id))) {
      res.status(403).json({ error: 'Cette station ne fait pas partie des vôtres' });
      return;
    }
    res.json(await listStationReservations(db, String(req.params.id)));
  });

  // Each wrong code costs a try, so codes cannot be guessed from the pump terminal.
  const validateLimit = rateLimit({ max: 10, windowMs: 60_000, key: (req) => `validate:${req.user?.id}` });
  router.post('/stations/:id/validate', requireRole('STATION_PRO', 'ADMIN'), validateLimit, async (req, res) => {
    if (!canManageStation(req.user!, String(req.params.id))) {
      res.status(403).json({ error: 'Cette station ne fait pas partie des vôtres' });
      return;
    }
    const parsed = validateBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Code manquant' });
      return;
    }
    try {
      res.json(await validateTicket(db, keys, req.user!, String(req.params.id), parsed.data.code));
    } catch (err) {
      sendError(res, err);
    }
  });

  router.get('/notifications', signedIn, async (req, res) => {
    res.json(await listNotifications(db, req.user!.id));
  });

  router.post('/notifications/read-all', signedIn, async (req, res) => {
    await markNotificationsRead(db, req.user!.id);
    res.status(204).end();
  });

  return router;
}
