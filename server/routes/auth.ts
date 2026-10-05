import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { normalizeTogoPhone } from '../../shared/phone';
import {
  createSession,
  deleteSession,
  hashPassword,
  rateLimit,
  readCookie,
  requireRole,
  SESSION_COOKIE,
  sessionCookieOptions,
  toAuthUser,
  verifyPassword,
} from '../auth';
import type { Db } from '../db/client';
import { users } from '../db/schema';

const phone = z
  .string()
  .transform((value, ctx) => {
    const normalized = normalizeTogoPhone(value);
    if (!normalized) {
      ctx.addIssue({ code: 'custom', message: 'Numéro togolais invalide (8 chiffres)' });
      return z.NEVER;
    }
    return normalized;
  });

const registerBody = z.object({
  name: z.string().trim().min(2).max(80),
  phone,
  email: z.string().trim().email().max(120).optional().or(z.literal('').transform(() => undefined)),
  password: z.string().min(8, 'Mot de passe : 8 caractères minimum').max(200),
});

const loginBody = z.object({ phone, password: z.string().min(1).max(200) });

// Compared against when the phone is unknown, so both failures take the same time.
const DUMMY_HASH = hashPassword('ronikov-dummy-password');

export function authRouter(db: Db, { secureCookies }: { secureCookies: boolean }) {
  const router = Router();
  const cookieOptions = sessionCookieOptions(secureCookies);
  // Mobile carriers share IPs between many people, so the per-IP limit is looser than per number.
  const perIp = rateLimit({ max: 30, windowMs: 60_000, key: (req) => `ip:${req.ip}` });
  const perPhone = rateLimit({
    max: 10,
    windowMs: 60_000,
    key: (req) => `phone:${normalizeTogoPhone(String(req.body?.phone ?? '')) ?? 'invalid'}`,
  });

  router.post('/auth/register', perIp, async (req, res) => {
    const parsed = registerBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' });
      return;
    }
    const { name, phone, email, password } = parsed.data;

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone));
    if (existing) {
      res.status(409).json({ error: 'Un compte existe déjà avec ce numéro' });
      return;
    }

    // Sign-up always creates a client; only an admin can grant other roles.
    const [user] = await db
      .insert(users)
      .values({ name, phone, email: email ?? null, passwordHash: await hashPassword(password) })
      .onConflictDoNothing({ target: users.phone })
      .returning();
    if (!user) {
      // Another sign-up with the same number landed between the check above and this insert.
      res.status(409).json({ error: 'Un compte existe déjà avec ce numéro' });
      return;
    }
    res.cookie(SESSION_COOKIE, await createSession(db, user.id), cookieOptions);
    res.status(201).json(await toAuthUser(db, user));
  });

  router.post('/auth/login', perIp, perPhone, async (req, res) => {
    const parsed = loginBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' });
      return;
    }
    const [user] = await db.select().from(users).where(eq(users.phone, parsed.data.phone));
    const ok = await verifyPassword(parsed.data.password, user?.passwordHash ?? (await DUMMY_HASH));
    if (!user || !ok) {
      res.status(401).json({ error: 'Numéro ou mot de passe incorrect' });
      return;
    }
    res.cookie(SESSION_COOKIE, await createSession(db, user.id), cookieOptions);
    res.json(await toAuthUser(db, user));
  });

  router.post('/auth/logout', async (req, res) => {
    const token = readCookie(req, SESSION_COOKIE);
    if (token) await deleteSession(db, token);
    res.clearCookie(SESSION_COOKIE, { ...cookieOptions, maxAge: undefined });
    res.status(204).end();
  });

  router.get('/me', requireRole(), (req, res) => {
    res.json(req.user);
  });

  return router;
}
