import React, { useState } from 'react';
import { Station, FuelType } from '../types';
import { InteractiveMap } from './InteractiveMap';
import { StationCard } from './StationCard';
import { Search, Filter, SlidersHorizontal, MapPin, Grid, ListFilter } from 'lucide-react';

interface MapViewProps {
  stations: Station[];
  selectedStation: Station | null;
  onSelectStation: (station: Station) => void;
  onBookStation: (station: Station) => void;
  onViewStationDetails: (station: Station) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  stations,
  selectedStation,
  onSelectStation,
  onBookStation,
  onViewStationDetails,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFuel, setSelectedFuel] = useState<FuelType | 'ALL'>('ALL');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortBy, setSortBy] = useState<'queue' | 'distance' | 'stock'>('queue');
  const [viewLayout, setViewLayout] = useState<'split' | 'mapOnly' | 'listOnly'>('split');

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
    if (onlyInStock) {
      const primaryStock = selectedFuel === 'ALL' ? s.stock.SUPER : s.stock[selectedFuel];
      if (!primaryStock || primaryStock.availableLiters <= 100) return false;
    }

    return true;
  });

  // Sorting logic
  filtered.sort((a, b) => {
    if (sortBy === 'queue') {
      return a.queueTimeMinutes - b.queueTimeMinutes;
    }
    if (sortBy === 'stock') {
      const stockA = selectedFuel === 'ALL' ? a.stock.SUPER.availableLiters : a.stock[selectedFuel].availableLiters;
      const stockB = selectedFuel === 'ALL' ? b.stock.SUPER.availableLiters : b.stock[selectedFuel].availableLiters;
      return stockB - stockA;
    }
    return 0; // Default distance
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Page Title Header */}
      <div className="border-b-2 border-black pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4 font-mono-code">
        <div>
          <div className="text-xs text-neutral-500 font-bold uppercase tracking-widest">
            RÉSEAU DE CARBURANT EN TEMPS RÉEL
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-black">
            CARTE & RECHERCHE DES STATIONS
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Layout Toggle Buttons */}
          <div className="flex border border-black text-xs font-bold">
            <button
              onClick={() => setViewLayout('split')}
              className={`px-3 py-1.5 uppercase ${
                viewLayout === 'split' ? 'bg-black text-white' : 'bg-white text-black'
              }`}
            >
              Vue Mixte
            </button>
            <button
              onClick={() => setViewLayout('mapOnly')}
              className={`px-3 py-1.5 uppercase ${
                viewLayout === 'mapOnly' ? 'bg-black text-white' : 'bg-white text-black'
              }`}
            >
              Carte Seule
            </button>
            <button
              onClick={() => setViewLayout('listOnly')}
              className={`px-3 py-1.5 uppercase ${
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
              placeholder="Rechercher par quartier (Agoè, Tokoin, Hedzranawoé...) ou enseigne (Total, Shell...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black border border-neutral-700 text-white pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-white font-mono-code"
            />
          </div>

          {/* Fuel Filter Buttons */}
          <div className="md:col-span-4 flex items-center gap-1 overflow-x-auto py-1">
            <button
              onClick={() => setSelectedFuel('ALL')}
              className={`px-2.5 py-1.5 font-bold uppercase whitespace-nowrap ${
                selectedFuel === 'ALL'
                  ? 'bg-white text-black border border-white'
                  : 'bg-black text-neutral-300 border border-neutral-700 hover:border-white'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setSelectedFuel('SUPER')}
              className={`px-2.5 py-1.5 font-bold uppercase whitespace-nowrap ${
                selectedFuel === 'SUPER'
                  ? 'bg-white text-black border border-white'
                  : 'bg-black text-neutral-300 border border-neutral-700 hover:border-white'
              }`}
            >
              Super
            </button>
            <button
              onClick={() => setSelectedFuel('GAZOLE')}
              className={`px-2.5 py-1.5 font-bold uppercase whitespace-nowrap ${
                selectedFuel === 'GAZOLE'
                  ? 'bg-white text-black border border-white'
                  : 'bg-black text-neutral-300 border border-neutral-700 hover:border-white'
              }`}
            >
              Gazole
            </button>
            <button
              onClick={() => setSelectedFuel('MELANGE')}
              className={`px-2.5 py-1.5 font-bold uppercase whitespace-nowrap ${
                selectedFuel === 'MELANGE'
                  ? 'bg-white text-black border border-white'
                  : 'bg-black text-neutral-300 border border-neutral-700 hover:border-white'
              }`}
            >
              Mélange
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="md:col-span-3 flex items-center justify-end gap-2">
            <span className="text-neutral-400 uppercase text-[10px]">Trier:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-black text-white border border-neutral-700 px-3 py-1.5 text-xs font-mono-code focus:outline-none"
            >
              <option value="queue">Attente la plus courte</option>
              <option value="stock">Stock le plus élevé</option>
              <option value="distance">Proximité</option>
            </select>
          </div>
        </div>

        {/* Sub-row: Availability toggle & counter */}
        <div className="flex justify-between items-center pt-2 border-t border-neutral-800 text-[11px] text-neutral-400">
          <label className="flex items-center gap-2 cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={onlyInStock}
              onChange={(e) => setOnlyInStock(e.target.checked)}
              className="accent-white cursor-pointer"
            />
            <span className="uppercase font-semibold">Afficher uniquement les stations avec du stock réel</span>
          </label>

          <span className="font-bold text-white uppercase">
            {filtered.length} station(s) trouvée(s) sur {stations.length}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      {viewLayout === 'mapOnly' && (
        <InteractiveMap
          stations={filtered}
          selectedStation={selectedStation}
          onSelectStation={onSelectStation}
          onBookStation={onBookStation}
          selectedFuelFilter={selectedFuel}
        />
      )}

      {viewLayout === 'listOnly' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((st) => (
            <StationCard
              key={st.id}
              station={st}
              onBook={onBookStation}
              onViewDetails={onViewStationDetails}
              selectedFuelFilter={selectedFuel}
            />
          ))}
        </div>
      )}

      {viewLayout === 'split' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Interactive Map Column */}
          <div className="lg:col-span-7 sticky top-20">
            <InteractiveMap
              stations={filtered}
              selectedStation={selectedStation}
              onSelectStation={onSelectStation}
              onBookStation={onBookStation}
              selectedFuelFilter={selectedFuel}
            />
          </div>

          {/* List Column */}
          <div className="lg:col-span-5 space-y-4 max-h-[720px] overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <div className="p-8 border border-neutral-300 text-center font-mono-code space-y-2 bg-white">
                <p className="text-sm font-bold uppercase text-black">Aucune station ne correspond à vos critères</p>
                <p className="text-xs text-neutral-500">Essayez de modifier votre recherche ou d'effacer les filtres.</p>
              </div>
            ) : (
              filtered.map((st) => (
                <StationCard
                  key={st.id}
                  station={st}
                  onBook={onBookStation}
                  onViewDetails={onViewStationDetails}
                  selectedFuelFilter={selectedFuel}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
