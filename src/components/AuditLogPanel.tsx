import React, { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { api, ApiError } from '../api';
import { AdminUser, AuditEntry, FuelType, Station } from '../types';
import { FUEL_LABELS } from '../../shared/stock';
import { locale, t } from '../i18n';

interface AuditLogPanelProps {
  stations: Station[];
}

const ROLE_NAMES: Record<string, string> = { CLIENT: 'client', STATION_PRO: 'gérant de station', ADMIN: 'administrateur', ATTENDANT: 'pompiste' };

const fuelName = (type: unknown) => (FUEL_LABELS[type as FuelType] ? t(FUEL_LABELS[type as FuelType]) : String(type));

// One plain sentence per logged action. Unknown actions fall back to their raw name.
export function describeEntry(entry: AuditEntry, stationName: (id: string) => string, userName: (id: string) => string): string {
  const [kind, id = '', fuel] = entry.target.split(':');
  const d = entry.details as Record<string, any>;
  const station = kind === 'station' ? stationName(id) : d.stationId ? stationName(d.stationId) : '';
  const user = kind === 'user' ? userName(id) : '';

  switch (entry.action) {
    case 'stock.update': {
      const parts = [t('{fuel} à {station}', { fuel: fuelName(fuel), station })];
      if (d.before?.availableLiters !== d.after?.availableLiters) parts.push(t('stock {before} → {after} L', { before: d.before?.availableLiters, after: d.after?.availableLiters }));
      if (d.before?.maxCapacityLiters !== d.after?.maxCapacityLiters) parts.push(t('cuve {n} L', { n: d.after?.maxCapacityLiters }));
      if (d.before?.pricePerLiterXof !== d.after?.pricePerLiterXof) parts.push(t('prix {before} → {after} FCFA/L', { before: d.before?.pricePerLiterXof, after: d.after?.pricePerLiterXof }));
      return t('Stock mis à jour : {details}', { details: parts.join(', ') });
    }
    case 'station.create':
      return t('Station ajoutée : {name}', { name: d.name ?? station });
    case 'station.update': {
      const parts: string[] = [];
      if (d.queueTimeMinutes !== undefined) parts.push(t('attente {n} min', { n: d.queueTimeMinutes }));
      if (d.isPartner !== undefined) parts.push(d.isPartner ? t('devient partenaire') : t('n’est plus partenaire'));
      if (d.isActive !== undefined) parts.push(d.isActive ? t('réactivée') : t('désactivée'));
      return `${station} : ${parts.join(', ') || t('modifiée')}`;
    }
    case 'station.check':
      return t('Stock confirmé à {station}', { station });
    case 'prices.update': {
      const list = (d.prices ?? []).map((p: { type: FuelType; officialPriceXOF: number }) => `${fuelName(p.type)} ${p.officialPriceXOF} FCFA`);
      return t('Prix officiels changés : {list}', { list: list.join(', ') }) + (d.applyToAllStations ? ` ${t('(appliqués à toutes les stations)')}` : '');
    }
    case 'user.update': {
      const parts: string[] = [];
      if (d.role) parts.push(t('devient {role}', { role: ROLE_NAMES[d.role] ? t(ROLE_NAMES[d.role]) : d.role }));
      if (Array.isArray(d.stationIds)) parts.push(d.stationIds.length ? t('gère {stations}', { stations: d.stationIds.map(stationName).join(', ') }) : t('ne gère plus de station'));
      if (d.isPremium !== undefined) parts.push(d.isPremium ? t('Premium activé') : t('Premium retiré'));
      if (d.isSuspended !== undefined) parts.push(d.isSuspended ? t('compte suspendu') : t('compte réactivé'));
      return `${user} : ${parts.join(', ') || t('compte modifié')}`;
    }
    case 'user.password_reset':
      return t('Mot de passe temporaire donné à {user}', { user });
    case 'attendant.add':
      return t('{user} ajouté comme pompiste à {station}', { user, station });
    case 'attendant.remove':
      return t('{user} n’est plus pompiste à {station}', { user, station });
    case 'attendant.password_reset':
      return t('Mot de passe temporaire donné au pompiste {user}', { user });
    case 'manager.request':
      return t('Demande pour gérer {station}', { station });
    case 'manager.accept':
      return t('{user} accepté comme gérant de {station}', { user, station });
    case 'manager.reject':
      return t('Demande de {user} pour gérer {station} refusée', { user, station });
    case 'premium.request':
      return t('Demande de Pass Premium');
    case 'ticket.validate':
      return t('Ticket servi à {station} : {n} L de {fuel}', { station, n: d.liters, fuel: fuelName(d.fuelType) });
    case 'review.hide':
      return t('Avis client masqué à {station}', { station });
    case 'review.show':
      return t('Avis client réaffiché à {station}', { station });
    default:
      return `${entry.action} (${entry.target})`;
  }
}

// Admin tab listing who changed what on the site, newest first.
export const AuditLogPanel: React.FC<AuditLogPanelProps> = ({ stations }) => {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    api
      .auditLog()
      .then((page) => {
        setEntries(page);
        setHasMore(page.length === 100);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : t('Journal indisponible.')));
    api.users().then(setUsers).catch(() => {});
  }, []);

  const loadMore = async () => {
    if (!entries?.length) return;
    setLoadingMore(true);
    try {
      const page = await api.auditLog(entries[entries.length - 1].id);
      setEntries([...entries, ...page]);
      setHasMore(page.length === 100);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('Journal indisponible.'));
    } finally {
      setLoadingMore(false);
    }
  };

  const stationName = (id: string) => stations.find((s) => s.id === id)?.name ?? id;
  const userName = (id: string) => {
    const user = users.find((u) => u.id === id);
    return user ? `${user.name} (${user.phone})` : t('un compte');
  };

  return (
    <div className="border border-neutral-800 p-6 bg-black/85 backdrop-blur-xl rounded-2xl space-y-4 shadow-2xl">
      <h2 className="text-xl font-black text-white border-b border-neutral-800 pb-3 flex items-center gap-2">
        <History className="w-5 h-5 text-amber-400" />
        {t('Journal des actions')}
      </h2>
      <p className="text-xs text-neutral-400 font-sans">
        {t('Chaque changement de stock, de prix, de station ou de compte, et chaque ticket servi, avec qui l’a fait.')}
      </p>

      {error && (
        <p role="alert" className="text-xs font-bold text-red-300 border border-red-500/60 bg-red-500/10 p-3 rounded-xl">
          {error}
        </p>
      )}
      {entries === null && !error && <p className="text-xs text-neutral-400">{t('Chargement du journal…')}</p>}
      {entries?.length === 0 && <p className="text-xs text-neutral-400">{t('Aucune action enregistrée pour l’instant.')}</p>}

      <ol className="divide-y divide-neutral-800 text-xs">
        {entries?.map((entry) => (
          <li key={entry.id} className="py-2.5 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
            <time dateTime={entry.createdAt} className="text-neutral-500 shrink-0 sm:w-32">
              {new Date(entry.createdAt).toLocaleString(locale(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </time>
            <span className="flex-1 min-w-0 text-white font-sans break-words">{describeEntry(entry, stationName, userName)}</span>
            <span className="text-amber-300 font-bold shrink-0">{entry.actorName ?? t('Compte supprimé')}</span>
          </li>
        ))}
      </ol>

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="w-full py-2.5 border border-neutral-700 rounded-xl text-xs font-bold text-neutral-200 hover:border-amber-400 disabled:opacity-60"
        >
          {loadingMore ? t('Chargement…') : t('Voir les actions plus anciennes')}
        </button>
      )}
    </div>
  );
};
