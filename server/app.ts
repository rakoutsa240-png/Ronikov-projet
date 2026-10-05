import express, { type ErrorRequestHandler } from 'express';
import { z } from 'zod';
import { FUEL_TYPES } from '../shared/stock';
import { loadUser } from './auth';
import type { Db } from './db/client';
import { listPrices, listStations } from './db/queries';
import { authRouter } from './routes/auth';
import { reservationsRouter } from './routes/reservations';
import type { TicketKeys } from './tickets';

const stationsQuery = z.object({
  city: z.string().trim().min(1).optional(),
  fuel: z.enum(FUEL_TYPES as [string, ...string[]]).optional(),
  available: z.enum(['true', 'false']).optional(),
});

export interface AppOptions {
  ticketKeys: TicketKeys;
  secureCookies?: boolean;
}

export function createApp(db: Db, { ticketKeys, secureCookies = false }: AppOptions) {
  const app = express();
  app.set('trust proxy', 'loopback');
  app.use(express.json({ limit: '20kb' }));
  app.use('/api', loadUser(db));
  app.use('/api', authRouter(db, { secureCookies }));
  app.use('/api', reservationsRouter(db, ticketKeys));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/stations', async (req, res) => {
    const parsed = stationsQuery.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'Paramètres invalides', details: parsed.error.issues });
      return;
    }
    const { city, fuel, available } = parsed.data;

    let result = await listStations(db);
    if (city) result = result.filter((s) => s.city.toLowerCase() === city.toLowerCase());
    if (available === 'true') {
      result = result.filter((s) =>
        fuel
          ? s.stock[fuel as keyof typeof s.stock].status !== 'OUT_OF_STOCK'
          : Object.values(s.stock).some((f) => f.status !== 'OUT_OF_STOCK'),
      );
    }
    res.json(result);
  });

  app.get('/api/stations/:id', async (req, res) => {
    const station = (await listStations(db)).find((s) => s.id === req.params.id);
    if (!station) {
      res.status(404).json({ error: 'Station introuvable' });
      return;
    }
    res.json(station);
  });

  app.get('/api/prices', async (_req, res) => {
    res.json(await listPrices(db));
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Route inconnue' });
  });

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  };
  app.use(onError);

  return app;
}
