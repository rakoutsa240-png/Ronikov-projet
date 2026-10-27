import { Router, type Response } from 'express';
import { z } from 'zod';
import { MAX_VOUCHER_BATCH, MAX_VOUCHER_VALIDITY_DAYS, MAX_VOUCHER_XOF } from '../../shared/vouchers';
import { rateLimit, requireRole } from '../auth';
import type { Db } from '../db/client';
import { cancelVoucher, claimVoucher, createVouchers, listAllVouchers, listMyVouchers, type NewVouchers, VoucherError } from '../vouchers';

const claimBody = z.object({ code: z.string().min(1).max(40) });

// Either `phone` (a gift to that account) or `count` (contest codes to hand out).
const createBody = z
  .object({
    stationId: z.string().min(1).optional(),
    amountXof: z.number().int().min(100, '100 FCFA au moins').max(MAX_VOUCHER_XOF, `${MAX_VOUCHER_XOF} FCFA au plus`),
    validDays: z.number().int().min(1).max(MAX_VOUCHER_VALIDITY_DAYS),
    label: z.string().trim().max(80).optional(),
    phone: z.string().min(1).max(30).optional(),
    count: z.number().int().min(1).max(MAX_VOUCHER_BATCH, `${MAX_VOUCHER_BATCH} codes au plus à la fois`).optional(),
  })
  .strict()
  .refine((body) => (body.phone === undefined) !== (body.count === undefined), 'Indiquez un numéro ou un nombre de codes');

function sendError(res: Response, err: unknown) {
  if (!(err instanceof VoucherError)) throw err;
  res.status(err.status).json({ error: err.message });
}

export function vouchersRouter(db: Db) {
  const router = Router();

  router.get('/vouchers/mine', requireRole(), async (req, res) => {
    res.json(await listMyVouchers(db, req.user!.id));
  });

  // Each try counts, so contest codes cannot be found by guessing.
  const claimLimit = rateLimit({ max: 10, windowMs: 60_000, key: (req) => `voucher:${req.user?.id}` });
  router.post('/vouchers/claim', requireRole(), claimLimit, async (req, res) => {
    const parsed = claimBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Code manquant' });
      return;
    }
    try {
      res.status(201).json(await claimVoucher(db, req.user!.id, parsed.data.code));
    } catch (err) {
      sendError(res, err);
    }
  });

  // An admin sees every voucher, a manager those of their stations.
  router.get('/vouchers', requireRole('ADMIN', 'STATION_PRO'), async (req, res) => {
    const user = req.user!;
    res.json(await listAllVouchers(db, undefined, user.role === 'ADMIN' ? undefined : user.managedStationIds));
  });

  router.post('/vouchers', requireRole('ADMIN', 'STATION_PRO'), async (req, res) => {
    const parsed = createBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' });
      return;
    }
    try {
      res.status(201).json(await createVouchers(db, req.user!, parsed.data as NewVouchers));
    } catch (err) {
      sendError(res, err);
    }
  });

  router.post('/vouchers/:id/cancel', requireRole('ADMIN', 'STATION_PRO'), async (req, res) => {
    if (!z.string().uuid().safeParse(String(req.params.id)).success) {
      res.status(404).json({ error: 'Bon introuvable' });
      return;
    }
    try {
      res.json(await cancelVoucher(db, req.user!, String(req.params.id)));
    } catch (err) {
      sendError(res, err);
    }
  });

  return router;
}
