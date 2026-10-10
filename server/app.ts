import compression from 'compression';
import express, { type ErrorRequestHandler } from 'express';
import path from 'node:path';
import { z } from 'zod';
import { FUEL_TYPES } from '../shared/stock';
import { loadUser } from './auth';
import type { Db } from './db/client';
import { listPrices, listStationPriceHistory, listStations } from './db/queries';
import { adminRouter } from './routes/admin';
import { attendantsRouter } from './routes/attendants';
import { authRouter } from './routes/auth';
import { communityRouter } from './routes/community';
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
  // Express "trust proxy" setting; behind a hosting proxy it makes req.ip the visitor's address.
  trustProxy?: boolean | number | string;
  // Built front-end (dist/) to serve next to the API, so both share one address.
  staticDir?: string;
}

export function createApp(db: Db, { ticketKeys, secureCookies = false, trustProxy = 'loopback', staticDir }: AppOptions) {
  const app = express();
  app.set('trust proxy', trustProxy);
  // Gzip pages, code and API answers: about three times less to download on a mobile connection.
  app.use(compression());
  app.use(express.json({ limit: '20kb' }));
  app.use('/api', loadUser(db));
  app.use('/api', authRouter(db, { secureCookies }));
  app.use('/api', reservationsRouter(db, ticketKeys));
  app.use('/api', adminRouter(db));
  app.use('/api', attendantsRouter(db));
  app.use('/api', communityRouter(db));

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

  app.get('/api/stations/:id/price-history', async (req, res) => {
    const days = z.coerce.number().int().min(1).max(365).default(30).safeParse(req.query.days);
    if (!days.success) {
      res.status(400).json({ error: 'Période invalide' });
      return;
    }
    const station = (await listStations(db)).find((s) => s.id === req.params.id);
    if (!station) {
      res.status(404).json({ error: 'Station introuvable' });
      return;
    }
    res.json(await listStationPriceHistory(db, station.id, days.data));
  });

  app.get('/api/prices', async (_req, res) => {
    res.json(await listPrices(db));
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Route inconnue' });
  });

  if (staticDir) {
    app.use(
      express.static(staticDir, {
        index: false,
        setHeaders: (res, filePath) => {
          // Built files carry a content hash in their name, so browsers may keep them for a year.
          if (filePath.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          // The service worker must be checked on every visit so updates reach phones.
          else if (filePath.endsWith('sw.js')) res.setHeader('Cache-Control', 'no-cache');
        },
      }),
    );
    // Every other page is the single-page app.
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.sendFile(path.join(staticDir, 'index.html'));
    });
  }

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  };
  app.use(onError);

  return app;
}
