import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

// No 0/O or 1/I, so a code read aloud or typed at the pump is not mistaken.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

export interface TicketKeys {
  hmacKey: Buffer;
  encKey: Buffer;
}

export function deriveTicketKeys(secret: string): TicketKeys {
  const derive = (info: string) => Buffer.from(hkdfSync('sha256', secret, 'ronikov-tickets', info, 32));
  return { hmacKey: derive('code-hash'), encKey: derive('code-encryption') };
}

// 32^6, about 1 billion possible codes, drawn with a cryptographic generator.
export function generateTicketCode(): string {
  let raw = '';
  for (let i = 0; i < CODE_LENGTH; i++) raw += ALPHABET[randomInt(ALPHABET.length)];
  return formatTicketCode(raw);
}

export function formatTicketCode(raw: string): string {
  return `RNK-${raw.slice(0, 4)}-${raw.slice(4)}`;
}

// Accepts "RNK-ABCD-EF", "rnk abcdef" or "ABCDEF" and returns the 6 code characters, or null.
export function parseTicketCode(input: string): string | null {
  let raw = input.toUpperCase().replace(/[\s-]/g, '');
  if (raw.startsWith('RNK')) raw = raw.slice(3);
  if (raw.length !== CODE_LENGTH) return null;
  for (const c of raw) if (!ALPHABET.includes(c)) return null;
  return raw;
}

export function hashTicketCode(keys: TicketKeys, raw: string): string {
  return createHmac('sha256', keys.hmacKey).update(raw).digest('hex');
}

// AES-256-GCM, stored as base64url "iv.tag.ciphertext".
export function encryptTicketCode(keys: TicketKeys, code: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keys.encKey, iv);
  const encrypted = Buffer.concat([cipher.update(code, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((b) => b.toString('base64url')).join('.');
}

export function decryptTicketCode(keys: TicketKeys, stored: string): string {
  const [iv, tag, data] = stored.split('.').map((part) => Buffer.from(part, 'base64url'));
  const decipher = createDecipheriv('aes-256-gcm', keys.encKey, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

export function maskTicketCode(last4: string): string {
  return `RNK-••${last4.slice(0, 2)}-${last4.slice(2)}`;
}

const qrSignature = (keys: TicketKeys, reservationId: string, raw: string) =>
  createHmac('sha256', keys.hmacKey).update(`qr:${reservationId}:${raw}`).digest().subarray(0, 16);

// What the QR code on a ticket holds: the code plus a signature, so an edited screenshot is refused.
export function createQrPayload(keys: TicketKeys, reservationId: string, code: string): string {
  const raw = parseTicketCode(code)!;
  return `RNK1.${reservationId}.${raw}.${qrSignature(keys, reservationId, raw).toString('base64url')}`;
}

// Returns the 6 code characters from a scanned QR payload, or null when it was tampered with.
export function readQrPayload(keys: TicketKeys, payload: string): { reservationId: string; raw: string } | null {
  const [version, reservationId, raw, sig] = payload.trim().split('.');
  if (version !== 'RNK1' || !reservationId || !raw || !sig || parseTicketCode(raw) !== raw) return null;
  const expected = qrSignature(keys, reservationId, raw);
  const actual = Buffer.from(sig, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  return { reservationId, raw };
}
