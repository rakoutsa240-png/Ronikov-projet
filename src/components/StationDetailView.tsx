import React from 'react';
import { Station, FuelType } from '../types';
import { Gauge } from './Gauge';
import { ShieldCheck, MapPin, Phone, Clock, ArrowLeft, Navigation, Fuel, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import { StationBrandLogo } from './StationBrandLogo';
import { PriceHistoryChart } from './PriceHistoryChart';

interface StationDetailViewProps {
  station: Station | null;
  onBack: () => void;
  onBook: (station: Station) => void;
}

export const StationDetailView: React.FC<StationDetailViewProps> = ({
  station,
  onBack,
  onBook,
}) => {
  if (!station) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center font-mono-code text-white">
        <p className="text-neutral-300">Station introuvable.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-amber-400 text-black text-xs font-bold uppercase rounded-xl">
          Retour à la carte
        </button>
      </div>
    );
  }

  const fuels: { type: FuelType; label: string }[] = [
    { type: 'SUPER', label: 'Super Sans Plomb' },
    { type: 'GAZOLE', label: 'Gazole (Désel)' },
    { type: 'MELANGE', label: 'Mélange 2 Temps' },
    { type: 'KEROSENE', label: 'Pétrole / Kérosène' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-mono-code text-white">
      {/* Top Back Navigation */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 px-4 py-2 border border-neutral-700 bg-black/80 backdrop-blur-md text-neutral-300 hover:text-white hover:border-amber-400 transition-all text-xs font-bold uppercase rounded-xl shadow-lg"
      >
        <ArrowLeft className="w-4 h-4 text-amber-400" />
        <span>Retour au Réseau de Stations</span>
      </button>

      {/* Main Station Header Banner */}
      <div className="bg-black/90 backdrop-blur-xl border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 text-white relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-neutral-800/80 pb-6 relative z-10">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <StationBrandLogo brand={station.brand} size="md" interactive={true} showBadge={false} className="p-1 bg-black border border-neutral-700 rounded-lg" />
              <span className="px-2.5 py-1 bg-amber-400 text-black text-xs font-black uppercase rounded shadow">
                ENSEIGNE {station.brand}
              </span>
              <span className="text-xs text-neutral-400 font-bold uppercase">
                {station.district} • {station.city}
              </span>
              {station.isPartner && (
                <span className="inline-flex items-center gap-1.5 text-[11px] border border-amber-400/60 bg-amber-400/10 text-amber-300 px-2.5 py-0.5 font-bold uppercase rounded-md shadow">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> PARTENAIRE SÉCURISÉ
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight uppercase text-white">
              {station.name}
            </h1>

            <p className="text-xs sm:text-sm text-neutral-300 font-sans flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{station.address}</span>
            </p>
          </div>

          {/* Booking CTA */}
          <button
            onClick={() => onBook(station)}
            className="px-8 py-4 bg-amber-400 text-black font-black text-xs uppercase tracking-wider hover:bg-amber-300 transition-all flex items-center justify-center gap-2 rounded-xl shadow-lg shadow-amber-400/20 shrink-0 border border-amber-300"
          >
            <span>Réserver à cette station</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs relative z-10">
          <div className="p-3.5 bg-black/60 border border-neutral-800 rounded-xl space-y-1">
            <div className="text-neutral-400 uppercase text-[10px] font-bold">Attente Estimée</div>
            <div className="text-lg font-black text-amber-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>{station.queueTimeMinutes} Minutes</span>
            </div>
          </div>

          <div className="p-3.5 bg-black/60 border border-neutral-800 rounded-xl space-y-1">
            <div className="text-neutral-400 uppercase text-[10px] font-bold">Horaires d'ouverture</div>
            <div className="text-sm font-bold text-white">{station.operatingHours}</div>
          </div>

          <div className="p-3.5 bg-black/60 border border-neutral-800 rounded-xl space-y-1">
            <div className="text-neutral-400 uppercase text-[10px] font-bold">Téléphone Station</div>
            <div className="text-sm font-bold text-white flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-neutral-400" />
              <span>{station.phone}</span>
            </div>
          </div>

          <div className="p-3.5 bg-black/60 border border-neutral-800 rounded-xl space-y-1">
            <div className="text-neutral-400 uppercase text-[10px] font-bold">Distance Estimée</div>
            <div className="text-sm font-bold text-white">2.8 km de votre position</div>
          </div>
        </div>
      </div>

      {/* Stock Breakdown Section */}
      <div className="space-y-4">
        <div className="border-b border-neutral-800 pb-3 flex justify-between items-end">
          <div>
            <span className="text-xs text-amber-400 font-bold uppercase tracking-widest block flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> JAUGE DE STOCK EN DIRECT
            </span>
            <h2 className="text-2xl font-black uppercase text-white tracking-tight">
              DISPONIBILITÉ DES CARBURANTS
            </h2>
          </div>
          <span className="text-xs font-bold text-neutral-400">Actualisé il y a 3 minutes</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {fuels.map((f) => {
            const stock = station.stock[f.type];
            const percent = Math.round((stock.availableLiters / stock.maxCapacityLiters) * 100);

            return (
              <div key={f.type} className="p-6 border border-neutral-800 bg-black/85 backdrop-blur-xl hover:border-amber-400/80 rounded-2xl space-y-4 text-center text-white shadow-2xl transition-all">
                <div className="text-xs font-black uppercase text-amber-300 border-b border-neutral-800/80 pb-2">
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
                    <span className="text-neutral-400">Prix Officiel Togo:</span>
                    <span className="font-bold text-white">{stock.pricePerLiter} FCFA / L</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Statut Pompe:</span>
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
                        ? 'En Stock'
                        : stock.status === 'LOW'
                        ? 'Stock Limité'
                        : 'Épuisé'}
                    </span>
                  </div>
                </div>

                <button
                  disabled={stock.availableLiters <= 0}
                  onClick={() => onBook(station)}
                  className={`w-full py-3 text-xs font-black uppercase tracking-wider transition-all rounded-xl shadow-lg ${
                    stock.availableLiters > 0
                      ? 'bg-amber-400 text-black hover:bg-amber-300 shadow-amber-400/20'
                      : 'bg-neutral-900 text-neutral-500 border border-neutral-800 cursor-not-allowed'
                  }`}
                >
                  {stock.availableLiters > 0 ? 'Réserver ce Carburant' : 'Rupture'}
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
          <h3 className="text-base font-black uppercase border-b border-neutral-800 pb-2 text-white flex items-center gap-2">
            <Fuel className="w-4 h-4 text-amber-400" />
            <span>SERVICES & ÉQUIPEMENTS DE LA STATION</span>
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
          <h3 className="text-base font-black uppercase border-b border-neutral-800 pb-2 text-white flex items-center gap-2">
            <Navigation className="w-4 h-4 text-amber-400" />
            <span>ACCÈS & ITINÉRAIRE DÉTAILLÉ</span>
          </h3>
          <div className="space-y-3 text-xs text-neutral-300">
            <p className="font-bold text-amber-300">{station.address}</p>
            <p className="font-sans text-neutral-300 leading-relaxed">
              Depuis le centre-ville de Lomé, prenez l'axe principal en direction de {station.district}. La station est facilement identifiable par son totem lumineux {station.brand}.
            </p>
            <div className="pt-1">
              <button className="px-4 py-3 bg-amber-400 text-black font-black text-xs uppercase inline-flex items-center gap-2 rounded-xl hover:bg-amber-300 transition-all shadow-lg shadow-amber-400/20">
                <Navigation className="w-4 h-4" />
                <span>Lancer le GPS vers cette station</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
