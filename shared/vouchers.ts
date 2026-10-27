// Fuel voucher rules shared by the app (to display them) and the API (which enforces them).
// Every LOYALTY_STEP_LITERS litres served earn a voucher of LOYALTY_AMOUNT_XOF.
export const LOYALTY_STEP_LITERS = 100;
export const LOYALTY_AMOUNT_XOF = 1000;
export const LOYALTY_VALIDITY_DAYS = 60;
export const MAX_VOUCHER_XOF = 100_000;
export const MAX_VOUCHER_BATCH = 500;
export const MAX_VOUCHER_VALIDITY_DAYS = 365;

// Codes look like BON-7KQ2-M9XA: no 0/O or 1/I, so they can be read out on the radio.
export const VOUCHER_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

// "bon 7kq2 m9xa" -> "BON-7KQ2-M9XA"; null when it cannot be a voucher code.
export function normalizeVoucherCode(input: string): string | null {
  const raw = input.toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/^BON/, '');
  if (raw.length !== 8 || [...raw].some((c) => !VOUCHER_CODE_ALPHABET.includes(c))) return null;
  return `BON-${raw.slice(0, 4)}-${raw.slice(4)}`;
}
