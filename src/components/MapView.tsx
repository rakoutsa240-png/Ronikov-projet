import React, { Suspense, lazy, useState } from 'react';
import { Station, FuelType } from '../types';
import { StationCard } from './StationCard';
import { distanceKm, LatLng, locateUser } from '../geo';
import { FUEL_TYPES } from '../../shared/stock';
import { useFavorites } from '../storage';
import { StationListSkeleton } from './Skeleton';

// The map library is heavy, so it only loads when this page opens.
const InteractiveMap = lazy(() => import('./InteractiveMap'));

const mapFallback = (
  <div className="h-[420px] sm:h-[520px] border-2 border-black bg-neutral-900 text-neutral-400 flex items-center justify-center text-xs font-mono-code">
    Chargement de la carte…
  </div>
);
import { Search, Filter, SlidersHorizontal, MapPin, Grid, ListFilter } from 'lucide-react';

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
      <p className="text-sm font-bold text-white">Aucune station ne correspond à vos critères</p>
      <button
        onClick={() => {
          setSearchTerm('');
          setSelectedFuel('ALL');
          setOnlyInStock(false);
        }}
        className="px-4 py-2 bg-amber-400 text-black text-xs font-black rounded-lg hover:bg-amber-300"
      >
        Effacer les filtres
      </button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Page Title Header */}
      <div className="border-b-2 border-neutral-700/80 pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4 font-mono-code">
        <div>
          <div className="hidden sm:block text-xs text-amber-400 font-bold uppercase tracking-widest">
            Réseau de carburant en temps réel
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            Carte & recherche des stations
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Layout Toggle Buttons */}
          <div className="flex border border-black text-xs font-bold">
            <button
              onClick={() => setViewLayout('split')}
              className={`px-3 py-1.5 ${
                viewLayout === 'split' ? 'bg-black text-white' : 'bg-white text-black'
              }`}
            >
              Vue Mixte
            </button>
            <button
              onClick={() => setViewLayout('mapOnly')}
              className={`px-3 py-1.5 ${
                viewLayout === 'mapOnly' ? 'bg-black text-white' : 'bg-white text-black'
              }`}
            >
              Carte Seule
            </button>
            <button
              onClick={() => setViewLayout('listOnly')}
              className={`px-3 py-1.5 ${
                viewLayout === 'listOnly' ? 'bg-black text-white' : 'bg-white text-black'
              }`}
            >
              Liste Seule
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
              placeholder="Quartier, ville ou enseigne (Agoè, Kara, Shell…)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black border border-neutral-700 text-white pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-white font-mono-code"
            />
          </div>

          {/* Fuel Filter Buttons */}
          <div className="md:col-span-4 flex items-center gap-1 overflow-x-auto py-1">
            <button
              onClick={() => setSelectedFuel('ALL')}
              className={`px-2.5 py-1.5 font-bold whitespace-nowrap ${
                selectedFuel === 'ALL'
                  ? 'bg-white text-black border border-white'
                  : 'bg-black text-neutral-300 border border-neutral-700 hover:border-white'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setSelectedFuel('SUPER')}
              className={`px-2.5 py-1.5 font-bold whitespace-nowrap ${
                selectedFuel === 'SUPER'
                  ? 'bg-white text-black border border-white'
                  : 'bg-black text-neutral-300 border border-neutral-700 hover:border-white'
              }`}
            >
              Super
            </button>
            <button
              onClick={() => setSelectedFuel('GAZOLE')}
              className={`px-2.5 py-1.5 font-bold whitespace-nowrap ${
                selectedFuel === 'GAZOLE'
                  ? 'bg-white text-black border border-white'
                  : 'bg-black text-neutral-300 border border-neutral-700 hover:border-white'
              }`}
            >
              Gazole
            </button>
            <button
              onClick={() => setSelectedFuel('MELANGE')}
              className={`px-2.5 py-1.5 font-bold whitespace-nowrap ${
                selectedFuel === 'MELANGE'
                  ? 'bg-white text-black border border-white'
                  : 'bg-black text-neutral-300 border border-neutral-700 hover:border-white'
              }`}
            >
              Mélange
            </button>
            <button
              onClick={() => setSelectedFuel('KEROSENE')}
              className={`px-2.5 py-1.5 font-bold whitespace-nowrap ${
                selectedFuel === 'KEROSENE'
                  ? 'bg-white text-black border border-white'
                  : 'bg-black text-neutral-300 border border-neutral-700 hover:border-white'
              }`}
            >
              Kérosène
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="md:col-span-3 flex items-center md:justify-end gap-2">
            <span className="text-neutral-400 uppercase text-[11px]">Trier:</span>
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
              <option value="queue">Attente la plus courte</option>
              <option value="stock">Stock le plus élevé</option>
              <option value="distance">Proximité</option>
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
            <span className=" font-semibold">Afficher uniquement les stations avec du stock réel</span>
          </label>

          <span className="font-bold text-white">
            {filtered.length} station(s) trouvée(s) sur {stations.length}
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

          {/* List Column */}
          {/* On a computer the list scrolls beside the map; on a phone it simply follows the map. */}
          <div className="lg:col-span-5 space-y-4 lg:max-h-[720px] lg:overflow-y-auto pr-1">
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
