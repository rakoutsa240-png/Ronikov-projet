// "à l'instant", "il y a 12 min", "il y a 3 h", then the date: how fresh a piece of information is.
export function timeAgo(iso: string, now = Date.now()): string {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (Number.isNaN(minutes)) return '';
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  if (hours < 48) return 'hier';
  return `le ${new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
}

// Stock and prices not touched for this long are flagged as possibly out of date.
export const STALE_AFTER_HOURS = 6;

export const isStale = (iso: string | undefined, now = Date.now()) =>
  iso !== undefined && now - new Date(iso).getTime() > STALE_AFTER_HOURS * 3_600_000;
