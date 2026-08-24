import React from 'react';
import { Station, FuelType } from '../types';
import { Gauge } from './Gauge';
import { ShieldCheck, MapPin, Clock, Phone, ChevronRight, Zap } from 'lucide-react';

interface StationCardProps {
  station: Station;
  onBook: (station: Station) => void;
  onViewDetails: (station: Station) => void;
  selectedFuelFilter?: FuelType | 'ALL';
}

export const StationCard: React.FC<StationCardProps> = ({
  station,
  onBook,
  onViewDetails,
  selectedFuelFilter = 'ALL',
}) => {
  const fuels: { type: FuelType; label: string }[] = [
    { type: 'SUPER', label: 'Super' },
    { type: 'GAZOLE', label: 'Gazole' },
    { type: 'MELANGE', label: 'Mélange 2T' },
    { type: 'KEROSENE', label: 'Kérosène' },
  ];

  // Brand-specific accent badges & border glows
  const getBrandBadge = (brand: string) => {
    switch (brand) {
      case 'TotalEnergies':
        return 'bg-gradient-to-r from-red-600 via-yellow-500 to-blue-600 text-white font-extrabold border-red-400';
      case 'Shell':
        return 'bg-amber-400 text-black font-extrabold border-amber-300 shadow-amber-500/20';
      case 'Sanol':
        return 'bg-emerald-500 text-black font-extrabold border-emerald-400 shadow-emerald-500/20';
      case 'CAP':
        return 'bg-blue-600 text-white font-extrabold border-blue-400';
      case 'Somayaf':
        return 'bg-purple-600 text-white font-extrabold border-purple-400';
      default:
        return 'bg-neutral-800 text-white font-extrabold border-neutral-600';
    }
  };

  const getBrandBorderGlow = (brand: string) => {
    switch (brand) {
      case 'TotalEnergies':
        return 'hover:border-red-500 hover:shadow-red-900/30';
      case 'Shell':
        return 'hover:border-amber-400 hover:shadow-amber-900/30';
      case 'Sanol':
        return 'hover:border-emerald-400 hover:shadow-emerald-900/30';
      default:
        return 'hover:border-amber-400 hover:shadow-amber-900/30';
    }
  };

  return (
    <div className={`bg-black/85 backdrop-blur-xl border border-neutral-800 transition-all duration-300 p-5 rounded-xl flex flex-col justify-between space-y-4 text-white shadow-2xl hover:scale-[1.01] ${getBrandBorderGlow(station.brand)}`}>
      {/* Header Info */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 text-[10px] font-mono-code uppercase tracking-wider rounded border shadow-sm ${getBrandBadge(station.brand)}`}>
                {station.brand}
              </span>
              <span className="text-xs font-mono-code text-neutral-400 font-semibold uppercase">
                {station.district} • {station.city}
              </span>
            </div>
            <h3 className="text-base font-extrabold uppercase tracking-tight text-white font-mono-code mt-1.5 leading-snug">
              {station.name}
            </h3>
          </div>

          {station.isPartner && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-mono-code border border-amber-400/80 bg-amber-400/10 text-amber-300 px-2 py-0.5 font-bold uppercase whitespace-nowrap rounded"
              title="Station partenaire vérifiée RONIKOV"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              Partenaire
            </span>
          )}
        </div>

        <p className="text-xs text-neutral-300 line-clamp-1">{station.address}</p>

        <div className="flex items-center gap-4 text-xs font-mono-code pt-1 text-neutral-300">
          <div className="flex items-center gap-1.5 font-bold text-amber-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Attente: {station.queueTimeMinutes} min</span>
          </div>
          <div className="flex items-center gap-1 text-neutral-400">
            <MapPin className="w-3.5 h-3.5" />
            <span>2.5 km</span>
          </div>
        </div>
      </div>

      {/* Fuel Stock Gauges Grid */}
      <div className="border-t border-b border-neutral-800/80 py-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {fuels.map((f) => {
          const stStock = station.stock[f.type];
          const isSelected = selectedFuelFilter === f.type;
          const percent = Math.round((stStock.availableLiters / stStock.maxCapacityLiters) * 100);

          return (
            <div
              key={f.type}
              className={`p-2 rounded border transition-all ${
                isSelected ? 'border-amber-400 bg-amber-400/10' : 'border-neutral-800 bg-neutral-900/90'
              }`}
            >
              <div className="flex justify-between items-center text-[11px] font-mono-code font-bold text-white mb-1">
                <span>{f.label}</span>
                <span className="text-[10px] text-neutral-400">{stStock.pricePerLiter} F</span>
              </div>
              <Gauge
                value={percent}
                type="bar"
                showPercent={true}
                sublabel={`${stStock.availableLiters}L`}
              />
            </div>
          );
        })}
      </div>

      {/* Amenities Tags */}
      <div className="flex flex-wrap gap-1.5 text-[10px] font-mono-code text-neutral-400">
        {station.amenities.map((a, i) => (
          <span key={i} className="px-2 py-0.5 bg-neutral-900/90 border border-neutral-800 rounded text-neutral-300">
            {a}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => onViewDetails(station)}
          className="flex-1 py-2 px-3 border border-neutral-700 bg-neutral-900/80 hover:bg-neutral-800 text-white text-xs font-mono-code font-bold uppercase rounded transition-colors"
        >
          Fiche Station
        </button>
        <button
          onClick={() => onBook(station)}
          className="flex-1 py-2 px-3 bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs font-mono-code uppercase rounded transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-amber-400/20"
        >
          <span>Réserver</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
