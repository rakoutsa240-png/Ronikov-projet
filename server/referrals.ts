import { randomInt } from 'node:crypto';
import { and, count, eq, isNotNull } from 'drizzle-orm';
import {
  MAX_REFERRAL_REWARDS,
  normalizeReferralCode,
  REFERRAL_AMOUNT_XOF,
  REFERRAL_VALIDITY_DAYS,
  VOUCHER_CODE_ALPHABET,
} from '../shared/vouchers';
import type { MyReferral } from '../shared/types';
import type { Db } from './db/client';
import { notifications, users, vouchers } from './db/schema';
import { generateVoucherCode } from './vouchers';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

const DAY_MS = 24 * 60 * 60_000;

export function generateReferralCode(): string {
  return `AMI-${Array.from({ length: 6 }, () => VOUCHER_CODE_ALPHABET[randomInt(VOUCHER_CODE_ALPHABET.length)]).join('')}`;
}

// The account behind a referral code typed at sign-up, or null when nobody has it.
export async function findReferrer(db: Db, input: string) {
  const code = normalizeReferralCode(input);
  if (!code) return null;
  const [row] = await db.select({ id: users.id }).from(users).where(eq(users.referralCode, code));
  return row ?? null;
}

// The user's code (made the first time) and how many friends it brought.
export async function getMyReferral(db: Db, userId: string): Promise<MyReferral> {
  let [me] = await db.select({ code: users.referralCode }).from(users).where(eq(users.id, userId));
  let code = me?.code ?? null;
  // The rare code already taken is simply drawn again.
  for (let attempt = 0; !code && attempt < 5; attempt++) {
    const [row] = await db
      .update(users)
      .set({ referralCode: generateReferralCode() })
      .where(eq(users.id, userId))
      .returning({ code: users.referralCode })
      .catch(() => []);
    code = row?.code ?? null;
  }
  if (!code) throw new Error('Could not generate a unique referral code');
  const [[{ invited }], [{ rewarded }]] = await Promise.all([
    db.select({ invited: count() }).from(users).where(eq(users.referredBy, userId)),
    db
      .select({ rewarded: count() })
      .from(users)
      .where(and(eq(users.referredBy, userId), isNotNull(users.referralRewardedAt))),
  ]);
  return {
    code,
    amountXOF: REFERRAL_AMOUNT_XOF,
    invited: Number(invited),
    rewarded: Number(rewarded),
    maxRewards: MAX_REFERRAL_REWARDS,
  };
}

async function giveReferralVoucher(tx: Tx, ownerId: string, label: string, now: Date) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const [row] = await tx
      .insert(vouchers)
      .values({
        code: generateVoucherCode(),
        amountXof: REFERRAL_AMOUNT_XOF,
        source: 'REFERRAL',
        label,
        ownerId,
        claimedAt: now,
        expiresAt: new Date(now.getTime() + REFERRAL_VALIDITY_DAYS * DAY_MS),
      })
      .onConflictDoNothing({ target: vouchers.code })
      .returning({ id: vouchers.id });
    if (row) return;
  }
  throw new Error('Could not generate a unique voucher code');
}

// After a ticket is served: if it is the first one of a client who was invited, both get their voucher.
// Called inside the validation transaction, after awardLoyaltyVouchers has locked the client's row.
export async function awardReferral(tx: Tx, userId: string) {
  const [friend] = await tx
    .select({ name: users.name, referredBy: users.referredBy, rewardedAt: users.referralRewardedAt })
    .from(users)
    .where(eq(users.id, userId));
  if (!friend?.referredBy || friend.rewardedAt) return;
  const now = new Date();
  await tx.update(users).set({ referralRewardedAt: now }).where(eq(users.id, userId));
  const amount = `${REFERRAL_AMOUNT_XOF} FCFA`;

  await giveReferralVoucher(tx, userId, 'Bienvenue (parrainage)', now);
  await tx.insert(notifications).values({
    userId,
    type: 'SYSTEM',
    title: 'Bon de parrainage gagné',
    message: `Merci d’avoir rejoint Pleino ! Votre premier plein vous rapporte un bon d’essence de ${amount}, valable ${REFERRAL_VALIDITY_DAYS} jours.`,
  });

  // The person who invited is locked too, so two friends served at once count right against the limit.
  const [referrer] = await tx.select({ id: users.id }).from(users).where(eq(users.id, friend.referredBy)).for('update');
  if (!referrer) return;
  const [{ rewarded }] = await tx
    .select({ rewarded: count() })
    .from(users)
    .where(and(eq(users.referredBy, referrer.id), isNotNull(users.referralRewardedAt)));
  // This friend is already counted above.
  if (Number(rewarded) > MAX_REFERRAL_REWARDS) return;
  const firstName = friend.name.trim().split(/\s+/)[0] ?? '';
  await giveReferralVoucher(tx, referrer.id, `Parrainage de ${firstName}`, now);
  await tx.insert(notifications).values({
    userId: referrer.id,
    type: 'SYSTEM',
    title: 'Bon de parrainage gagné',
    message: `${firstName} a fait son premier plein avec Pleino. Merci de l’avoir invité : voici un bon d’essence de ${amount}, valable ${REFERRAL_VALIDITY_DAYS} jours.`,
  });
}
