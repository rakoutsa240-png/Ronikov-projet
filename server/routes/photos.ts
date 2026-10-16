import { eq } from 'drizzle-orm';
import express, { Router } from 'express';
import { z } from 'zod';
import { PHOTO_MAX_BYTES } from '../../shared/photos';
import { audit } from '../audit';
import { rateLimit, requireRole, toAuthUser } from '../auth';
import type { Db } from '../db/client';
import { userPhotos, users } from '../db/schema';

// Only real images: the first bytes of the file must match the type it claims.
function imageType(data: Buffer): string | null {
  if (data.length > 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'image/jpeg';
  if (data.length > 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (data.length > 12 && data.toString('latin1', 0, 4) === 'RIFF' && data.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

const isUuid = (value: string) => z.string().uuid().safeParse(value).success;

// Everyone can put a face on their account, so clients recognise the pompiste who served them.
export function photosRouter(db: Db) {
  const router = Router();
  const perUser = rateLimit({ max: 10, windowMs: 60_000, key: (req) => `photo:${req.user?.id}` });
  const body = express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: PHOTO_MAX_BYTES });

  router.put('/me/photo', requireRole(), perUser, body, async (req, res) => {
    const data = Buffer.isBuffer(req.body) ? req.body : null;
    const contentType = data ? imageType(data) : null;
    if (!data || !contentType) {
      res.status(400).json({ error: 'Choisissez une photo (JPEG, PNG ou WebP)' });
      return;
    }
    const userId = req.user!.id;
    const updated = await db.transaction(async (tx) => {
      await tx
        .insert(userPhotos)
        .values({ userId, image: data, contentType })
        .onConflictDoUpdate({ target: userPhotos.userId, set: { image: data, contentType } });
      const [user] = await tx.update(users).set({ photoUpdatedAt: new Date() }).where(eq(users.id, userId)).returning();
      return user;
    });
    res.json(await toAuthUser(db, updated));
  });

  router.delete('/me/photo', requireRole(), perUser, async (req, res) => {
    const updated = await removePhoto(db, req.user!.id);
    res.json(await toAuthUser(db, updated!));
  });

  // An admin takes down a photo that is not a face or is offensive.
  router.delete('/users/:id/photo', requireRole('ADMIN'), async (req, res) => {
    const userId = String(req.params.id);
    const updated = isUuid(userId) ? await removePhoto(db, userId) : undefined;
    if (!updated) {
      res.status(404).json({ error: 'Compte introuvable' });
      return;
    }
    await audit(db, req.user!.id, 'user.photo.remove', `user:${userId}`);
    res.status(204).end();
  });

  // Photos are only shown to signed-in people. The address changes with each new photo.
  router.get('/users/:id/photo', requireRole(), async (req, res) => {
    const userId = String(req.params.id);
    const [photo] = isUuid(userId) ? await db.select().from(userPhotos).where(eq(userPhotos.userId, userId)) : [];
    if (!photo) {
      res.status(404).json({ error: 'Pas de photo' });
      return;
    }
    res.setHeader('Content-Type', photo.contentType);
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(photo.image);
  });

  return router;
}

async function removePhoto(db: Db, userId: string) {
  return db.transaction(async (tx) => {
    await tx.delete(userPhotos).where(eq(userPhotos.userId, userId));
    const [user] = await tx.update(users).set({ photoUpdatedAt: null }).where(eq(users.id, userId)).returning();
    return user;
  });
}
