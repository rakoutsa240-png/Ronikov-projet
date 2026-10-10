import React from 'react';
import { Station, FuelType } from '../types';
import { StationBrandLogo, StationBrandType } from './StationBrandLogo';
import { formatDistance } from '../geo';
import { FavoriteButton } from './FavoriteButton';
import { StationFreshness } from './StationFreshness';
import { ShieldCheck, MapPin, Clock, ChevronRight } from 'lucide-react';

interface StationCardProps {
  station: Station;
  onBook: (station: Station) => void;
  onViewDetails: (station: Station) => void;
  selectedFuelFilter?: FuelType | 'ALL';
  distanceKm?: number; // from the visitor, once they shared their position
}

export const StationCard: React.FC<StationCardProps> = ({
  station,
  onBook,
  onViewDetails,
  selectedFuelFilter = 'ALL',
  distanceKm,
}) => {
  const fuels: { type: FuelType; label: string }[] = [
    { type: 'SUPER', label: 'Super' },
    { type: 'GAZOLE', label: 'Gazole' },
    { type: 'MELANGE', label: 'Mélange 2T' },
    { type: 'KEROSENE', label: 'Kérosène' },
  ];

  const canBook = fuels.some((f) => (station.stock[f.type]?.availableLiters ?? 0) >= 2);

  // Stock level reads at a glance: green when there is plenty, gold when it runs low, red when empty.
  const levelTone = (percent: number, liters: number) =>
    liters <= 0 ? 'bg-red-500' : percent < 25 ? 'bg-amber-400' : 'bg-brand-500';

  return (
    <div className="reveal group bg-black border border-neutral-800 hover:border-brand-500/60 transition-all duration-300 p-5 rounded-2xl flex flex-col justify-between gap-4 text-white shadow-lg shadow-black/5 hover:shadow-xl">
      {/* Header: brand logo, name, favourite */}
      <div className="flex items-start gap-3">
        <StationBrandLogo brand={station.brand as StationBrandType} size="md" interactive={false} showBadge={false} className="shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-extrabold tracking-tight text-white leading-snug">{station.name}</h3>
          <p className="text-xs text-neutral-400 line-clamp-1">{station.address}</p>
        </div>
        <FavoriteButton stationId={station.id} />
      </div>

      {/* Key facts as pills */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400 text-black font-bold">
          <Clock className="w-3.5 h-3.5" />
          {station.queueTimeMinutes} min d'attente
        </span>
        {distanceKm !== undefined && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-900 text-neutral-200 font-semibold">
            <MapPin className="w-3.5 h-3.5" />
            {formatDistance(distanceKm)}
          </span>
        )}
        {station.isPartner && (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-500/15 text-brand-400 font-semibold"
            title="Station partenaire vérifiée Pleino"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Partenaire
          </span>
        )}
        <span className="text-neutral-400">{station.district}, {station.city}</span>
      </div>

      <StationFreshness station={station} />

      {/* One line per fuel: name, price, stock bar and litres left */}
      <ul className="rounded-xl bg-neutral-900/70 divide-y divide-neutral-800/80">
        {fuels.map((f) => {
          const stStock = station.stock[f.type];
          const isSelected = selectedFuelFilter === f.type;
          const percent = Math.round((stStock.availableLiters / stStock.maxCapacityLiters) * 100);
          const empty = stStock.availableLiters <= 0;

          return (
            <li
              key={f.type}
              className={`grid grid-cols-[5.5rem_1fr_4.5rem] items-center gap-3 px-3 py-2 text-xs ${isSelected ? 'bg-amber-400/10' : ''}`}
            >
              <div className="min-w-0">
                <div className="font-bold text-white truncate">{f.label}</div>
                <div className="text-neutral-400 tabular-nums">{stStock.pricePerLiter} F/L</div>
              </div>
              <div className="h-2 rounded-full bg-neutral-800 overflow-hidden" title={`${percent}% du stock`}>
                <div
                  className={`gauge-fill h-full rounded-full ${levelTone(percent, stStock.availableLiters)}`}
                  style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                />
              </div>
              <div className={`text-right font-semibold tabular-nums ${empty ? 'text-red-400' : 'text-neutral-200'}`}>
                {empty ? 'Rupture' : `${stStock.availableLiters.toLocaleString('fr-FR')} L`}
              </div>
            </li>
          );
        })}
      </ul>

      {station.amenities.length > 0 && (
        <div className="flex flex-wrap gap-1.5 text-[11px] text-neutral-400">
          {station.amenities.map((a, i) => (
            <span key={i} className="px-2 py-0.5 rounded-full border border-neutral-800">
              {a}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onViewDetails(station)}
          className="flex-1 py-2.5 px-3 border border-neutral-700 hover:bg-neutral-900 text-white text-xs font-bold rounded-full transition-colors"
        >
          Voir la station
        </button>
        <button
          onClick={() => onBook(station)}
          disabled={!canBook}
          className="flex-1 py-2.5 px-3 disabled:opacity-40 disabled:cursor-not-allowed bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs rounded-full transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-amber-400/20"
        >
          <span>{canBook ? 'Réserver' : 'Rupture'}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
