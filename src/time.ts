import { locale, t } from './i18n';

// "à l'instant", "il y a 12 min", "il y a 3 h", then the date: how fresh a piece of information is.
export function timeAgo(iso: string, now = Date.now()): string {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (Number.isNaN(minutes)) return '';
  if (minutes < 1) return t("à l'instant");
  if (minutes < 60) return t('il y a {n} min', { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('il y a {n} h', { n: hours });
  if (hours < 48) return t('hier');
  return t('le {date}', { date: new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'short' }) });
}

// "Pas mis à jour depuis 7 h": for information older than STALE_AFTER_HOURS.
export function staleSince(iso: string, now = Date.now()): string {
  const hours = Math.floor((now - new Date(iso).getTime()) / 3_600_000);
  if (hours < 24) return t('Pas mis à jour depuis {n} h', { n: hours });
  if (hours < 48) return t('Pas mis à jour depuis hier');
  return t('Pas mis à jour depuis le {date}', { date: new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'short' }) });
}

// Stock and prices not touched for this long are flagged as possibly out of date.
export const STALE_AFTER_HOURS = 6;

export const isStale = (iso: string | undefined, now = Date.now()) =>
  iso !== undefined && now - new Date(iso).getTime() > STALE_AFTER_HOURS * 3_600_000;

// Time left on a ticket: "1 h 45", "1 h", "12 min", "moins d'1 min".
export function timeLeft(expiresAt: string, now = Date.now()): string {
  const minutes = Math.floor((new Date(expiresAt).getTime() - now) / 60_000);
  if (Number.isNaN(minutes) || minutes < 1) return t("moins d'1 min");
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return `${Math.floor(minutes / 60)} h${rest ? ` ${String(rest).padStart(2, '0')}` : ''}`;
}
