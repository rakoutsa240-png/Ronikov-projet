import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { and, eq, gt, ne } from 'drizzle-orm';
import type { CookieOptions, NextFunction, Request, RequestHandler, Response } from 'express';
import type { AuthUser, UserRole } from '../shared/types';
import type { Db } from './db/client';
import { sessions, stationManagers, users } from './db/schema';

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

export const SESSION_COOKIE = 'ronikov_session';
const SESSION_DAYS = 30;

// Stored as "scrypt$<salt>$<hash>", both base64.
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, salt, hash] = stored.split('$');
  if (algo !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = await scryptAsync(password, Buffer.from(salt, 'base64'), expected.length);
  return timingSafeEqual(actual, expected);
}

// No 0/o, 1/l/i: easy to read out over the phone.
const TEMP_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

export function temporaryPassword(): string {
  // 31 letters, so drop the bytes that would bias the first ones.
  const out: string[] = [];
  while (out.length < 8) {
    for (const byte of randomBytes(16)) {
      if (byte < 248 && out.length < 8) out.push(TEMP_ALPHABET[byte % TEMP_ALPHABET.length]);
    }
  }
  return out.join('');
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export function sessionCookieOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, secure, sameSite: 'lax', path: '/api', maxAge: SESSION_DAYS * 86_400_000 };
}

export async function createSession(db: Db, userId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await db.insert(sessions).values({
    tokenHash: hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000),
  });
  return token;
}

export async function deleteSession(db: Db, token: string) {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

export async function deleteOtherSessions(db: Db, userId: string, keepToken: string) {
  await db.delete(sessions).where(and(eq(sessions.userId, userId), ne(sessions.tokenHash, hashToken(keepToken))));
}

export function readCookie(req: Request, name: string): string | undefined {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

export async function toAuthUser(db: Db, user: typeof users.$inferSelect): Promise<AuthUser> {
  const managed = await db
    .select({ stationId: stationManagers.stationId })
    .from(stationManagers)
    .where(eq(stationManagers.userId, user.id));
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    isPremium: user.isPremium,
    managedStationIds: managed.map((m) => m.stationId).sort(),
    mustChangePassword: user.mustChangePassword,
  };
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

// Attaches req.user when the request carries a valid session cookie.
export function loadUser(db: Db): RequestHandler {
  return async (req, _res, next) => {
    const token = readCookie(req, SESSION_COOKIE);
    if (token) {
      const [row] = await db
        .select({ user: users })
        .from(sessions)
        .innerJoin(users, eq(users.id, sessions.userId))
        .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())));
      if (row) req.user = await toAuthUser(db, row.user);
    }
    next();
  };
}

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Connexion requise' });
      return;
    }
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Accès refusé' });
      return;
    }
    next();
  };
}

// Fixed-window limiter kept in memory: enough for one API process.
export function rateLimit({ max, windowMs, key }: { max: number; windowMs: number; key: (req: Request) => string }): RequestHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req, res, next) => {
    const now = Date.now();
    const k = key(req);
    let entry = hits.get(k);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(k, entry);
    }
    entry.count += 1;
    if (hits.size > 10_000) {
      for (const [key, value] of hits) if (value.resetAt <= now) hits.delete(key);
    }
    if (entry.count > max) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      res.status(429).json({ error: 'Trop de tentatives, réessayez dans une minute' });
      return;
    }
    next();
  };
}
