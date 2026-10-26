import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { reportLabel } from '../../shared/reports';
import { Station } from '../types';
import { isStale, staleSince, timeAgo } from '../time';
import { t, tServer } from '../i18n';

// Re-renders every minute so "il y a 3 min" keeps counting.
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

// When the station last updated its stock, and what clients reported since.
export const StationFreshness: React.FC<{ station: Station; className?: string; maxReports?: number }> = ({
  station,
  className = '',
  maxReports = 2,
}) => {
  const now = useNow();
  const reports = station.reports ?? [];
  if (!station.checkedAt && reports.length === 0) return null;
  const stale = isStale(station.checkedAt, now);
  return (
    <span className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${className}`}>
      {station.checkedAt && (
        <span className={`inline-flex items-center gap-1 ${stale ? 'text-amber-300' : 'text-neutral-400'}`}>
          <RefreshCw className="w-3 h-3" />
          {stale ? staleSince(station.checkedAt, now) : t('Mis à jour {time}', { time: timeAgo(station.checkedAt, now) })}
        </span>
      )}
      {reports.slice(0, maxReports).map((r) => (
        <span
          key={`${r.kind}-${r.fuelType ?? ''}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/15 border border-red-500/40 text-red-300 font-semibold"
          title={`${r.count > 1 ? t('{n} clients', { n: r.count }) : t('1 client')}, ${timeAgo(r.lastAt, now)}`}
        >
          <AlertTriangle className="w-3 h-3" />
          {tServer(reportLabel(r))}
          {r.count > 1 ? ` (${r.count})` : ''}
        </span>
      ))}
    </span>
  );
};
