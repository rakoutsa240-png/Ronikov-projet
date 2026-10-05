// Accepts "90 12 34 56", "+228 90123456" or "0022890123456" and returns "+22890123456", or null.
export function normalizeTogoPhone(input: string): string | null {
  let digits = input.replace(/[\s.\-()]/g, '');
  if (digits.startsWith('+228')) digits = digits.slice(4);
  else if (digits.startsWith('00228')) digits = digits.slice(5);
  else if (digits.length === 11 && digits.startsWith('228')) digits = digits.slice(3);
  return /^\d{8}$/.test(digits) ? `+228${digits}` : null;
}
