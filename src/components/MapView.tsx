import React, { Suspense, lazy, useState } from 'react';
import { Station, FuelType } from '../types';
import { StationCard } from './StationCard';
import { distanceKm, formatDistance, LatLng, locateUser } from '../geo';
import { StationBrandLogo } from './StationBrandLogo';
import { FUEL_TYPES } from '../../shared/stock';
import { useFavorites } from '../storage';
import { StationListSkeleton } from './Skeleton';

// The map library is heavy, so it only loads when this page opens.
const InteractiveMap = lazy(() => import('./InteractiveMap'));

const MapLoading = () => (
  <div className="h-[420px] sm:h-[520px] border-2 border-black bg-neutral-900 text-neutral-400 flex items-center justify-center text-xs font-mono-code">
    {t('Chargement de la carte…')}
  </div>
);
const mapFallback = <MapLoading />;
import { Search, Filter, SlidersHorizontal, MapPin, Grid, ListFilter, ChevronRight } from 'lucide-react';
import { t } from '../i18n';

const SORT_LABELS = { queue: 'attente', stock: 'stock', distance: 'proximité' } as const;

// Stock chip of the phone list: the chosen fuel, or super when every fuel is shown.
function stockChip(st: Station, fuel: FuelType | 'ALL') {
  const stock = fuel === 'ALL' ? st.stock.SUPER : st.stock[fuel];
  if (!stock || stock.status === 'OUT_OF_STOCK' || stock.availableLiters <= 0)
    return { label: t('Vide'), className: 'bg-[#fde7eb] text-[#a10c28]' };
  if (stock.status === 'LOW') return { label: t('Stock faible'), className: 'bg-[#fff1c7] text-[#7a5400]' };
  return { label: t('En stock'), className: 'bg-brand-50 text-brand-700' };
}

// On phones the stations under the map come as a sheet of short rows (brand, name, distance, wait,
// price, stock), like a maps app; a tap opens the station page where it can be booked.
const StationSheet: React.FC<{
  stations: Station[];
  fuel: FuelType | 'ALL';
  sortBy: keyof typeof SORT_LABELS;
  distanceTo: (s: Station) => number | undefined;
  onView: (s: Station) => void;
}> = ({ stations, fuel, sortBy, distanceTo, onView }) => (
  <section
    aria-label={t('Liste des stations')}
    className="lg:hidden relative bg-black rounded-t-[28px] shadow-sheet px-4 pt-2.5 pb-3"
  >
    <div aria-hidden="true" className="mx-auto w-10 h-1.5 rounded-full bg-neutral-700" />
    <div className="flex items-baseline justify-between gap-3 pt-3 pb-1">
      <h2 className="font-display text-lg font-extrabold text-white">
        {stations.length > 1 ? t('{n} stations', { n: stations.length }) : t('{n} station', { n: stations.length })}
      </h2>
      <span className="text-xs font-bold text-active">{t('Trier : {by}', { by: t(SORT_LABELS[sortBy]) })}</span>
    </div>
    <ul className="divide-y divide-neutral-800">
      {stations.map((st) => {
        const km = distanceTo(st);
        const chip = stockChip(st, fuel);
        const price = (fuel === 'ALL' ? st.stock.SUPER : st.stock[fuel])?.pricePerLiter;
        return (
          // The brand tile is a button of its own, so the row is not one: a tap anywhere on it opens the station.
          <li key={st.id} onClick={() => onView(st)} className="flex items-center gap-3 py-3 cursor-pointer">
            <StationBrandLogo brand={st.brand} size="md" interactive={false} showBadge={false} className="shrink-0" />
            <button className="flex-1 min-w-0 text-left">
              <span className="block font-bold text-white truncate">{st.name}</span>
              <span className="block text-xs text-neutral-400 truncate">
                {km !== undefined ? `${formatDistance(km)} • ` : ''}
                {st.queueTimeMinutes} min{price ? ` • ${price} F/L` : ''}
              </span>
            </button>
            <span className={`theme-fixed shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold ${chip.className}`}>{chip.label}</span>
            <ChevronRight className="w-4 h-4 shrink-0 text-neutral-500" />
          </li>
        );
      })}
    </ul>
  </section>
);

interface MapViewProps {
  stations: Station[];
  selectedStation: Station | null;
  onSelectStation: (station: Station) => void;
  onBookStation: (station: Station) => void;
  onViewStationDetails: (station: Station) => void;
  loading?: boolean;
}

export const MapView: React.FC<MapViewProps> = ({
  stations,
  selectedStation,
  onSelectStation,
  onBookStation,
  onViewStationDetails,
  loading = false,
}) => {
  const favoriteIds = useFavorites();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFuel, setSelectedFuel] = useState<FuelType | 'ALL'>('ALL');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortBy, setSortBy] = useState<'queue' | 'distance' | 'stock'>('queue');
  const [viewLayout, setViewLayout] = useState<'split' | 'mapOnly' | 'listOnly'>('split');
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const locate = async () => {
    setLocating(true);
    setLocateError(null);
    try {
      setUserLocation(await locateUser());
      return true;
    } catch (e) {
      setLocateError((e as Error).message);
      return false;
    } finally {
      setLocating(false);
    }
  };

  const distanceTo = (s: Station) => (userLocation ? distanceKm(userLocation, s) : undefined);

  // Filter logic
  let filtered = stations.filter((s) => {
    // Search query match
    const matchQuery =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.address.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchQuery) return false;

    // Fuel filter match
    if (selectedFuel !== 'ALL') {
      const fuelStock = s.stock[selectedFuel];
      if (!fuelStock || fuelStock.availableLiters <= 0) return false;
    }

    // Only in stock match
    // "Real stock": more than 100 L left of the chosen fuel, or of any fuel when none is chosen.
    if (onlyInStock) {
      const fuels = selectedFuel === 'ALL' ? FUEL_TYPES : [selectedFuel];
      if (!fuels.some((f) => (s.stock[f]?.availableLiters ?? 0) > 100)) return false;
    }

    return true;
  });

  // Sorting logic
  filtered.sort((a, b) => {
    // Favourite stations come first, then the chosen order.
    const favoriteOrder = Number(favoriteIds.includes(b.id)) - Number(favoriteIds.includes(a.id));
    if (favoriteOrder !== 0) return favoriteOrder;
    if (sortBy === 'queue') {
      return a.queueTimeMinutes - b.queueTimeMinutes;
    }
    if (sortBy === 'stock') {
      const stockA = selectedFuel === 'ALL' ? a.stock.SUPER.availableLiters : a.stock[selectedFuel].availableLiters;
      const stockB = selectedFuel === 'ALL' ? b.stock.SUPER.availableLiters : b.stock[selectedFuel].availableLiters;
      return stockB - stockA;
    }
    if (userLocation) return distanceKm(userLocation, a) - distanceKm(userLocation, b);
    return 0;
  });

  const noResults = (
    <div className="p-8 border border-neutral-800 rounded-xl text-center font-mono-code space-y-3 bg-black/85">
      <p className="text-sm font-bold text-white">{t('Aucune station ne correspond à vos critères')}</p>
      <button
        onClick={() => {
          setSearchTerm('');
          setSelectedFuel('ALL');
          setOnlyInStock(false);
        }}
        className="px-4 py-2 bg-amber-400 text-black text-xs font-black rounded-lg hover:bg-amber-300"
      >
        {t('Effacer les filtres')}
      </button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Page Title Header */}
      <div className="border-b-2 border-neutral-700/80 pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4 font-mono-code">
        <div>
          <div className="hidden sm:block text-xs text-amber-400 font-bold">
            {t('Stock mis à jour par les stations')}
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            {t('Carte & recherche des stations')}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Layout Toggle Buttons */}
          <div className="flex border border-neutral-700 rounded-md overflow-hidden text-xs font-bold">
            <button
              onClick={() => setViewLayout('split')}
              className={`px-3 py-1.5 ${
                viewLayout === 'split' ? 'chip-selected' : 'bg-neutral-900 text-neutral-300 hover:text-white'
              }`}
            >
              {t('Carte et liste')}
            </button>
            <button
              onClick={() => setViewLayout('mapOnly')}
              className={`px-3 py-1.5 ${
                viewLayout === 'mapOnly' ? 'chip-selected' : 'bg-neutral-900 text-neutral-300 hover:text-white'
              }`}
            >
              {t('Carte')}
            </button>
            <button
              onClick={() => setViewLayout('listOnly')}
              className={`px-3 py-1.5 ${
                viewLayout === 'listOnly' ? 'chip-selected' : 'bg-neutral-900 text-neutral-300 hover:text-white'
              }`}
            >
              {t('Liste')}
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-neutral-900 text-white p-4 border border-neutral-800 space-y-4 font-mono-code text-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder={t('Quartier, ville ou enseigne (Agoè, Kara, Shell…)')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black border border-neutral-700 text-white pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-white font-mono-code"
            />
          </div>

          {/* Fuel Filter Buttons */}
          <div className="md:col-span-4 flex items-center gap-1 overflow-x-auto py-1">
            <button
              onClick={() => setSelectedFuel('ALL')}
              className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap ${
                selectedFuel === 'ALL'
                  ? 'chip-selected border'
                  : 'bg-black text-neutral-300 border border-neutral-700 hover:border-white'
              }`}
            >
              {t('Tous')}
            </button>
            <button
              onClick={() => setSelectedFuel('SUPER')}
              className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap ${
                selectedFuel === 'SUPER'
                  ? 'chip-selected border'
                  : 'bg-black text-neutral-300 border border-neutral-700 hover:border-white'
              }`}
            >
              {t('Super')}
            </button>
            <button
              onClick={() => setSelectedFuel('GAZOLE')}
              className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap ${
                selectedFuel === 'GAZOLE'
                  ? 'chip-selected border'
                  : 'bg-black text-neutral-300 border border-neutral-700 hover:border-white'
              }`}
            >
              {t('Gazole')}
            </button>
            <button
              onClick={() => setSelectedFuel('MELANGE')}
              className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap ${
                selectedFuel === 'MELANGE'
                  ? 'chip-selected border'
                  : 'bg-black text-neutral-300 border border-neutral-700 hover:border-white'
              }`}
            >
              {t('Mélange')}
            </button>
            <button
              onClick={() => setSelectedFuel('KEROSENE')}
              className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap ${
                selectedFuel === 'KEROSENE'
                  ? 'chip-selected border'
                  : 'bg-black text-neutral-300 border border-neutral-700 hover:border-white'
              }`}
            >
              {t('Kérosène')}
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="md:col-span-3 flex items-center md:justify-end gap-2">
            <span className="text-neutral-400 text-[11px]">{t('Trier :')}</span>
            <select
              value={sortBy}
              onChange={(e) => {
                const value = e.target.value as typeof sortBy;
                setSortBy(value);
                // Sorting by distance needs the visitor's position.
                if (value === 'distance' && !userLocation) void locate();
              }}
              className="bg-black text-white border border-neutral-700 px-3 py-1.5 text-xs font-mono-code focus:outline-none"
            >
              <option value="queue">{t('Attente la plus courte')}</option>
              <option value="stock">{t('Stock le plus élevé')}</option>
              <option value="distance">{t('Proximité')}</option>
            </select>
          </div>
        </div>

        {/* Sub-row: Availability toggle & counter */}
        <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-neutral-800 text-xs text-neutral-400">
          <label className="flex items-center gap-2 cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={onlyInStock}
              onChange={(e) => setOnlyInStock(e.target.checked)}
              className="accent-white cursor-pointer"
            />
            <span className=" font-semibold">{t('Afficher uniquement les stations avec du stock réel')}</span>
          </label>

          <span className="font-bold text-white">
            {t('{n} station(s) trouvée(s) sur {total}', { n: filtered.length, total: stations.length })}
          </span>
        </div>
        {locateError && <p role="alert" className="text-amber-300 font-bold">{locateError}</p>}
      </div>

      {/* Main Content Area */}
      {viewLayout === 'mapOnly' && (
        <Suspense fallback={mapFallback}>
          <InteractiveMap
            stations={filtered}
            selectedStation={selectedStation}
            onSelectStation={onSelectStation}
            onBookStation={onBookStation}
            selectedFuelFilter={selectedFuel}
            userLocation={userLocation}
            locating={locating}
            onLocate={locate}
          />
        </Suspense>
      )}

      {viewLayout === 'listOnly' && loading && <StationListSkeleton />}
      {viewLayout === 'listOnly' && !loading && filtered.length === 0 && noResults}

      {viewLayout === 'listOnly' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((st) => (
            <StationCard
              key={st.id}
              station={st}
              onBook={onBookStation}
              onViewDetails={onViewStationDetails}
              selectedFuelFilter={selectedFuel}
              distanceKm={distanceTo(st)}
            />
          ))}
        </div>
      )}

      {viewLayout === 'split' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Interactive Map Column */}
          <div className="lg:col-span-7 lg:sticky lg:top-20">
            <Suspense fallback={mapFallback}>
              <InteractiveMap
                stations={filtered}
                selectedStation={selectedStation}
                onSelectStation={onSelectStation}
                onBookStation={onBookStation}
                selectedFuelFilter={selectedFuel}
                userLocation={userLocation}
                locating={locating}
                onLocate={locate}
              />
            </Suspense>
          </div>

          {!loading && filtered.length > 0 && (
            <StationSheet
              stations={filtered}
              fuel={selectedFuel}
              sortBy={sortBy}
              distanceTo={distanceTo}
              onView={onViewStationDetails}
            />
          )}

          {/* List Column */}
          {/* On a computer the list scrolls beside the map; on a phone the sheet above replaces it. */}
          <div className={`lg:col-span-5 space-y-4 lg:max-h-[720px] lg:overflow-y-auto pr-1 ${!loading && filtered.length > 0 ? 'hidden lg:block' : ''}`}>
            {loading ? (
              <StationListSkeleton />
            ) : filtered.length === 0 ? (
              noResults
            ) : (
              filtered.map((st) => (
                <StationCard
                  key={st.id}
                  station={st}
                  onBook={onBookStation}
                  onViewDetails={onViewStationDetails}
                  selectedFuelFilter={selectedFuel}
                  distanceKm={distanceTo(st)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
