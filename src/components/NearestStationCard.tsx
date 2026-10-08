import React, { useEffect, useState } from 'react';
import { Clock, LocateFixed, MapPin, Navigation, ChevronRight } from 'lucide-react';
import { Station, FuelType } from '../types';
import { FUEL_TYPES } from '../../shared/stock';
import { distanceKm, directionsUrl, formatDistance, LatLng, locateUser } from '../geo';
import { loadJSON, saveJSON } from '../storage';
import { FavoriteButton } from './FavoriteButton';
import { StationFreshness } from './StationFreshness';

const SHORT_LABELS: Record<FuelType, string> = { SUPER: 'Super', GAZOLE: 'Gazole', MELANGE: 'Mélange', KEROSENE: 'Kérosène' };
const FUEL_KEY = 'ronikov.homeFuel';
const MIN_LITERS = 2;

interface NearestStationCardProps {
  stations: Station[];
  onBook: (station: Station) => void;
  onView: (station: Station) => void;
}

// First thing on the home page: the closest station that has the visitor's fuel, ready to book.
// Without the visitor's position it falls back to the shortest queue.
export const NearestStationCard: React.FC<NearestStationCardProps> = ({ stations, onBook, onView }) => {
  const [fuel, setFuel] = useState<FuelType>(() => {
    const saved = loadJSON<string>(FUEL_KEY, 'SUPER');
    return FUEL_TYPES.includes(saved as FuelType) ? (saved as FuelType) : 'SUPER';
  });
  const [position, setPosition] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  // A silent attempt (on opening the page) shows no error: the shortest queue is shown instead.
  const locate = (silent = false) => {
    setLocating(true);
    setLocateError(null);
    locateUser()
      .then(setPosition)
      .catch((e: Error) => {
        if (!silent) setLocateError(e.message);
      })
      .finally(() => setLocating(false));
  };

  // Visitors who already allowed their position get the nearest station straight away, without a prompt.
  useEffect(() => {
    navigator.permissions
      ?.query({ name: 'geolocation' as PermissionName })
      .then((status) => {
        if (status.state === 'granted') locate(true);
      })
      .catch(() => {});
  }, []);

  const chooseFuel = (f: FuelType) => {
    setFuel(f);
    saveJSON(FUEL_KEY, f);
  };

  const candidates = stations
    .filter((s) => (s.stock[fuel]?.availableLiters ?? 0) >= MIN_LITERS)
    .map((s) => ({
      station: s,
      km: position ? distanceKm(position, s) : undefined,
      // Clients just said this fuel ran out there: suggest it last.
      reportedEmpty: (s.reports ?? []).some((r) => r.kind === 'NO_FUEL' && r.fuelType === fuel),
    }))
    .sort(
      (a, b) =>
        Number(a.reportedEmpty) - Number(b.reportedEmpty) ||
        (a.km !== undefined && b.km !== undefined ? a.km - b.km : a.station.queueTimeMinutes - b.station.queueTimeMinutes),
    );
  const best = candidates[0];
  const others = candidates.slice(1, 3);

  return (
    <section aria-labelledby="nearest-title" className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6 space-y-4 shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="nearest-title" className="text-lg sm:text-xl font-extrabold text-white">
          {position ? 'Station la plus proche' : 'Attente la plus courte'}
        </h2>
        {!position && (
          <button
            onClick={() => locate()}
            disabled={locating}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg border border-neutral-700 text-white hover:border-amber-400 disabled:opacity-60"
          >
            <LocateFixed className="w-4 h-4 text-amber-400" />
            {locating ? 'Recherche…' : 'Me localiser'}
          </button>
        )}
      </div>

      <div role="group" aria-label="Carburant" className="grid grid-cols-4 gap-1.5">
        {FUEL_TYPES.map((f) => (
          <button
            key={f}
            onClick={() => chooseFuel(f)}
            aria-pressed={fuel === f}
            className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${
              fuel === f ? 'bg-amber-400 text-black border-amber-400' : 'bg-black text-neutral-200 border-neutral-700 hover:border-neutral-500'
            }`}
          >
            {SHORT_LABELS[f]}
          </button>
        ))}
      </div>

      {locateError && <p role="alert" className="text-sm text-amber-300">{locateError}</p>}

      {best ? (
        <div className="space-y-3">
          <div className="bg-black border border-neutral-800 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <button onClick={() => onView(best.station)} className="text-left min-w-0">
                <div className="text-lg font-bold text-white leading-snug">{best.station.name}</div>
                <div className="text-sm text-neutral-300 truncate">
                  {best.station.district} • {best.station.city}
                </div>
              </button>
              <FavoriteButton stationId={best.station.id} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {best.km !== undefined && (
                <span className="inline-flex items-center gap-1 text-white font-semibold">
                  <MapPin className="w-4 h-4 text-amber-400" /> {formatDistance(best.km)}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-white font-semibold">
                <Clock className="w-4 h-4 text-amber-400" /> {best.station.queueTimeMinutes} min d'attente
              </span>
              <span className="text-neutral-200">
                {best.station.stock[fuel].pricePerLiter} FCFA/L • {best.station.stock[fuel].availableLiters.toLocaleString('fr-FR')} L dispo
              </span>
            </div>
            <StationFreshness station={best.station} />
            <div className="grid grid-cols-2 gap-2">
              <a
                href={directionsUrl(best.station, position)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 py-3 rounded-xl border border-neutral-700 text-white font-semibold text-sm hover:border-amber-400"
              >
                <Navigation className="w-4 h-4" /> Itinéraire
              </a>
              <button
                onClick={() => onBook(best.station)}
                className="inline-flex items-center justify-center gap-1 py-3 rounded-xl bg-amber-400 text-black font-extrabold text-sm hover:bg-amber-300"
              >
                Réserver <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {others.length > 0 && (
            <ul className="divide-y divide-neutral-800 text-sm">
              {others.map(({ station, km }) => (
                <li key={station.id}>
                  <button onClick={() => onView(station)} className="w-full flex items-center justify-between gap-3 py-2.5 text-left hover:text-amber-300">
                    <span className="text-neutral-100 font-medium truncate">{station.name}</span>
                    <span className="text-neutral-300 shrink-0">
                      {km !== undefined ? `${formatDistance(km)} • ` : ''}
                      {station.queueTimeMinutes} min
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="text-sm text-neutral-300">Aucune station n'a de {SHORT_LABELS[fuel]} à réserver pour le moment.</p>
      )}
    </section>
  );
};
