import React from 'react';
import { Station, FuelType } from '../types';
import { Gauge } from './Gauge';
import { ShieldCheck, MapPin, Phone, Clock, ArrowLeft, Navigation, Fuel, CheckCircle2, ChevronRight, Sparkles, AlertTriangle } from 'lucide-react';
import { StationBrandLogo } from './StationBrandLogo';
import { PriceHistoryChart } from './PriceHistoryChart';
import { directionsUrl } from '../geo';
import { FavoriteButton } from './FavoriteButton';
import { StationFreshness, useNow } from './StationFreshness';
import { reportLabel } from '../../shared/reports';
import { timeAgo } from '../time';

interface StationDetailViewProps {
  station: Station | null;
  onBack: () => void;
  onBook: (station: Station) => void;
  onReport: (station: Station) => void; // opens the "Signaler un problème" sheet
}

export const StationDetailView: React.FC<StationDetailViewProps> = ({
  station,
  onBack,
  onBook,
  onReport,
}) => {
  const now = useNow();
  if (!station) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center font-mono-code text-white">
        <p className="text-neutral-300">Station introuvable.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-amber-400 text-black text-xs font-bold rounded-xl">
          Retour à la carte
        </button>
      </div>
    );
  }

  const fuels: { type: FuelType; label: string }[] = [
    { type: 'SUPER', label: 'Super Sans Plomb' },
    { type: 'GAZOLE', label: 'Gazole (Diesel)' },
    { type: 'MELANGE', label: 'Mélange 2 Temps' },
    { type: 'KEROSENE', label: 'Pétrole / Kérosène' },
  ];

  const canBook = fuels.some((f) => (station.stock[f.type]?.availableLiters ?? 0) >= 2);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-28 md:pb-8 space-y-8 font-mono-code text-white">
      {/* Top Back Navigation */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 px-4 py-2 border border-neutral-700 bg-black/80 backdrop-blur-md text-neutral-300 hover:text-white hover:border-amber-400 transition-all text-xs font-bold rounded-xl shadow-lg"
      >
        <ArrowLeft className="w-4 h-4 text-amber-400" />
        <span>Retour aux stations</span>
      </button>

      {/* Main Station Header Banner */}
      <div className="bg-black/90 backdrop-blur-xl border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 text-white relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-neutral-800/80 pb-6 relative z-10">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <StationBrandLogo brand={station.brand} size="md" interactive={true} showBadge={false} className="p-1 bg-black border border-neutral-700 rounded-lg" />
              <span className="px-2.5 py-1 bg-amber-400 text-black text-xs font-black rounded shadow">
                {station.brand}
              </span>
              <span className="text-xs text-neutral-400 font-bold">
                {station.district} • {station.city}
              </span>
              {station.isPartner && (
                <span className="inline-flex items-center gap-1.5 text-xs border border-amber-400/60 bg-amber-400/10 text-amber-300 px-2.5 py-0.5 font-bold uppercase rounded-md shadow">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Partenaire sécurisé
                </span>
              )}
            </div>

            <div className="flex items-start gap-3">
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white flex-1">
                {station.name}
              </h1>
              <FavoriteButton stationId={station.id} />
            </div>

            <p className="text-xs sm:text-sm text-neutral-300 font-sans flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{station.address}</span>
            </p>
            <StationFreshness station={station} maxReports={0} className="text-sm" />
          </div>

          {/* Booking CTA (on phones it lives in the bar fixed at the bottom of the screen) */}
          <button
            onClick={() => onBook(station)}
            className="hidden md:flex px-8 py-4 bg-amber-400 text-black font-black text-xs tracking-wider hover:bg-amber-300 transition-all items-center justify-center gap-2 rounded-xl shadow-lg shadow-amber-400/20 shrink-0 border border-amber-300"
          >
            <span>Réserver dans cette station</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs relative z-10">
          <div className="p-3.5 bg-black/60 border border-neutral-800 rounded-xl space-y-1">
            <div className="text-neutral-400 uppercase text-[11px] font-bold">Attente estimée</div>
            <div className="text-lg font-black text-amber-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>{station.queueTimeMinutes} min</span>
            </div>
          </div>

          <div className="p-3.5 bg-black/60 border border-neutral-800 rounded-xl space-y-1">
            <div className="text-neutral-400 uppercase text-[11px] font-bold">Horaires d'ouverture</div>
            <div className="text-sm font-bold text-white">{station.operatingHours}</div>
          </div>

          <div className="p-3.5 bg-black/60 border border-neutral-800 rounded-xl space-y-1">
            <div className="text-neutral-400 uppercase text-[11px] font-bold">Téléphone de la station</div>
            <div className="text-sm font-bold text-white flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <a href={`tel:${station.phone.replace(/\s/g, '')}`} className="whitespace-nowrap text-[13px] sm:text-sm hover:text-amber-300">
                {station.phone}
              </a>
            </div>
          </div>

          <div className="p-3.5 bg-black/60 border border-neutral-800 rounded-xl space-y-1">
            <div className="text-neutral-400 uppercase text-[11px] font-bold">Itinéraire</div>
            <a
              href={directionsUrl(station)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-bold text-amber-400 hover:underline"
            >
              Ouvrir dans Google Maps
            </a>
          </div>
        </div>
      </div>

      {/* Stock Breakdown Section */}
      <div className="space-y-4">
        <div className="border-b border-neutral-800 pb-3 flex justify-between items-end">
          <div>
            <span className="text-xs text-amber-400 font-bold uppercase tracking-widest block flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Jauge de stock en direct
            </span>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Disponibilité des carburants
            </h2>
          </div>
        </div>

        {/* What clients saw at the station since its last update */}
        <div className="bg-black/85 border border-neutral-800 rounded-2xl p-4 space-y-3">
          {(station.reports ?? []).length > 0 ? (
            <ul className="space-y-2">
              {station.reports!.map((r) => (
                <li key={`${r.kind}-${r.fuelType ?? ''}`} className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="font-bold text-red-300">{reportLabel(r)}</span>
                  <span className="text-neutral-400">
                    · {r.count > 1 ? `${r.count} clients` : '1 client'}, {timeAgo(r.lastAt, now)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-400">Aucun problème signalé par les clients ces dernières heures.</p>
          )}
          <button
            onClick={() => onReport(station)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-neutral-700 text-sm font-bold text-white hover:border-amber-400 inline-flex items-center justify-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" /> Signaler un problème
          </button>
        </div>

        {/* Phones: one line per fuel with price and stock */}
        <ul className="sm:hidden divide-y divide-neutral-800 bg-black/85 border border-neutral-800 rounded-2xl">
          {fuels.map((f) => {
            const stock = station.stock[f.type];
            const percent = Math.round((stock.availableLiters / stock.maxCapacityLiters) * 100);
            const empty = stock.availableLiters <= 0;
            return (
              <li key={f.type} className="flex items-center gap-3 p-3.5">
                <div className="flex-1 min-w-0">
                  <div className="text-base font-bold text-white">{f.label}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-2 flex-1 max-w-[120px] rounded-full bg-neutral-800 overflow-hidden">
                      <div
                        className={`h-full ${empty ? '' : stock.status === 'LOW' ? 'bg-amber-400' : 'bg-emerald-400'}`}
                        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
                      />
                    </div>
                    <span className={`text-sm ${empty ? 'text-neutral-400' : 'text-neutral-200'}`}>
                      {empty ? 'Épuisé' : `${stock.availableLiters.toLocaleString('fr-FR')} L`}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-extrabold text-amber-300 tabular-nums">{stock.pricePerLiter}</div>
                  <div className="text-xs text-neutral-400">FCFA/L</div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-6">
          {fuels.map((f) => {
            const stock = station.stock[f.type];
            const percent = Math.round((stock.availableLiters / stock.maxCapacityLiters) * 100);

            return (
              <div key={f.type} className="p-6 border border-neutral-800 bg-black/85 backdrop-blur-xl hover:border-amber-400/80 rounded-2xl space-y-4 text-center text-white shadow-2xl transition-all">
                <div className="text-xs font-black text-amber-300 border-b border-neutral-800/80 pb-2">
                  {f.label}
                </div>

                <Gauge
                  value={percent}
                  size="lg"
                  label={`${stock.availableLiters} L`}
                  sublabel={`Sur ${stock.maxCapacityLiters} L max`}
                  darkMode={true}
                />

                <div className="border-t border-neutral-800/80 pt-3 text-xs space-y-1.5 text-neutral-300">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Prix officiel :</span>
                    <span className="font-bold text-white">{stock.pricePerLiter} FCFA / L</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">État de la pompe :</span>
                    <span
                      className={`font-bold ${
                        stock.status === 'AVAILABLE'
                          ? 'text-emerald-400'
                          : stock.status === 'LOW'
                          ? 'text-amber-400'
                          : 'text-neutral-500 line-through'
                      }`}
                    >
                      {stock.status === 'AVAILABLE'
                        ? 'En stock'
                        : stock.status === 'LOW'
                        ? 'Stock limité'
                        : 'Épuisé'}
                    </span>
                  </div>
                </div>

                <button
                  disabled={stock.availableLiters <= 0}
                  onClick={() => onBook(station)}
                  className={`w-full py-3 text-xs font-black tracking-wider transition-all rounded-xl shadow-lg ${
                    stock.availableLiters > 0
                      ? 'bg-amber-400 text-black hover:bg-amber-300 shadow-amber-400/20'
                      : 'bg-neutral-900 text-neutral-500 border border-neutral-800 cursor-not-allowed'
                  }`}
                >
                  {stock.availableLiters > 0 ? 'Réserver ce carburant' : 'Rupture'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fuel Price History Recharts Chart */}
      <PriceHistoryChart station={station} />

      {/* Amenities & Itinerary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        {/* Services & Equipments */}
        <div className="border border-neutral-800 p-6 space-y-4 bg-black/85 backdrop-blur-xl rounded-2xl text-white shadow-2xl">
          <h3 className="text-base font-black border-b border-neutral-800 pb-2 text-white flex items-center gap-2">
            <Fuel className="w-4 h-4 text-amber-400" />
            <span>Services et équipements</span>
          </h3>
          <ul className="grid grid-cols-2 gap-3 text-xs">
            {station.amenities.map((item, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold text-neutral-200">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Access Guidance */}
        <div className="border border-neutral-800 p-6 space-y-4 bg-black/85 backdrop-blur-xl rounded-2xl text-white shadow-2xl">
          <h3 className="text-base font-black border-b border-neutral-800 pb-2 text-white flex items-center gap-2">
            <Navigation className="w-4 h-4 text-amber-400" />
            <span>Accès et itinéraire</span>
          </h3>
          <div className="space-y-3 text-xs text-neutral-300">
            <p className="font-bold text-amber-300">{station.address}</p>
            <p className="font-sans text-neutral-300 leading-relaxed">
              Depuis le centre-ville de Lomé, prenez l'axe principal en direction de {station.district}. La station est facilement identifiable par son totem lumineux {station.brand}.
            </p>
            <div className="pt-1">
              <a
                href={directionsUrl(station)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-3 bg-amber-400 text-black font-black text-xs inline-flex items-center gap-2 rounded-xl hover:bg-amber-300 transition-all shadow-lg shadow-amber-400/20"
              >
                <Navigation className="w-4 h-4" />
                <span>Lancer le GPS</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Phones: booking button always in reach, just above the bottom menu */}
      <div className="md:hidden fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 px-4 pb-2">
        <div className="bg-neutral-950/95 backdrop-blur border border-neutral-700 rounded-2xl p-3 flex items-center gap-3 shadow-2xl">
          <div className="flex-1 min-w-0 text-sm">
            <div className="font-bold text-white truncate">{station.name}</div>
            <div className="text-neutral-300">{station.queueTimeMinutes} min d'attente</div>
          </div>
          <button
            onClick={() => onBook(station)}
            disabled={!canBook}
            className="px-6 py-3 bg-amber-400 text-black font-extrabold text-sm rounded-xl hover:bg-amber-300 disabled:opacity-40 shrink-0"
          >
            {canBook ? 'Réserver' : 'Rupture'}
          </button>
        </div>
      </div>
    </div>
  );
};
