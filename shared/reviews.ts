// A served ticket can be reviewed for this long after the pump.
export const REVIEW_WINDOW_DAYS = 30;

export const REVIEW_COMMENT_MAX = 500;

// At or below this mark the station's manager is told at once.
export const LOW_RATING = 2;

export const RATING_LABELS: Record<number, string> = {
  1: 'Très mauvais',
  2: 'Mauvais',
  3: 'Correct',
  4: 'Bien',
  5: 'Excellent',
};

// "Afi Koffi Mensah" -> "Afi M.", so a manager knows who wrote without seeing the full name.
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? '';
  return `${parts[0]} ${parts[parts.length - 1][0]?.toUpperCase()}.`;
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? '';
