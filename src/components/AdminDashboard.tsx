import React, { useState } from 'react';
import { Station, Reservation, FuelPriceGlobal, FuelType } from '../types';
import { ShieldCheck, Users, Fuel, DollarSign, AlertTriangle, CheckCircle2, XCircle, Plus, Building2, BarChart3, Save, Sparkles, MapPin } from 'lucide-react';
import { StationBrandLogo } from './StationBrandLogo';
import { AdminUsersPanel } from './AdminUsersPanel';
import { AuditLogPanel } from './AuditLogPanel';
import { AddStationForm } from './AddStationForm';
import { FUEL_LABELS, FUEL_TYPES } from '../../shared/stock';

interface AdminDashboardProps {
  stations: Station[];
  reservations: Reservation[];
  globalPrices: FuelPriceGlobal[];
  onToggleStationPartner: (stationId: string) => void;
  onStationAdded: (station: Station) => void;
  // Rejects with a message to show when the API refuses the change.
  onUpdateGlobalPrices: (updatedPrices: FuelPriceGlobal[], updateAllStations: boolean) => Promise<void>;
  currentUserId?: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  stations,
  reservations,
  globalPrices,
  onToggleStationPartner,
  onUpdateGlobalPrices,
  onStationAdded,
  currentUserId,
}) => {
  const [showAddStation, setShowAddStation] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'prices' | 'stations' | 'accounts' | 'incidents' | 'journal'>('overview');
  const [priceError, setPriceError] = useState<string | null>(null);
  const [editingPrices, setEditingPrices] = useState<FuelPriceGlobal[]>(globalPrices);
  const [applyToAllStations, setApplyToAllStations] = useState<boolean>(true);
  const [priceSaveSuccess, setPriceSaveSuccess] = useState<boolean>(false);

  React.useEffect(() => {
    setEditingPrices(globalPrices);
  }, [globalPrices]);

  const handlePriceChange = (type: FuelType, newPrice: number) => {
    setEditingPrices((prev) =>
      prev.map((gp) => (gp.type === type ? { ...gp, officialPriceXOF: newPrice } : gp))
    );
  };

  const handleSavePrices = async () => {
    setPriceError(null);
    try {
      await onUpdateGlobalPrices(editingPrices, applyToAllStations);
      setPriceSaveSuccess(true);
      setTimeout(() => setPriceSaveSuccess(false), 3000);
    } catch (e) {
      setPriceError(e instanceof Error ? e.message : 'Enregistrement impossible, réessayez.');
    }
  };

  // Cancelled and expired tickets brought no money in.
  const paidReservations = reservations.filter((r) => r.status === 'PENDING' || r.status === 'VALIDATED');
  const totalVolumeFCFA = paidReservations.reduce((acc, r) => acc + r.totalAmountXOF, 0);
  const totalLitersDispensed = paidReservations.reduce((acc, r) => acc + r.liters, 0);
  const partnerStationsCount = stations.filter((s) => s.isPartner).length;
  const cities = [...new Set(stations.map((s) => s.city))];
  // Every tank that is empty or low, worst first: the incidents an admin should look at.
  const stockAlerts = stations
    .flatMap((st) =>
      FUEL_TYPES.filter((f) => st.stock[f] && st.stock[f].status !== 'AVAILABLE').map((f) => ({ station: st, fuel: f, stock: st.stock[f] })),
    )
    .sort((a, b) => (a.stock.status === b.stock.status ? a.stock.availableLiters - b.stock.availableLiters : a.stock.status === 'OUT_OF_STOCK' ? -1 : 1));
  const tanks = stations.flatMap((st) => FUEL_TYPES.map((f) => st.stock[f]).filter(Boolean));
  const availabilityRate = tanks.length
    ? Math.round((tanks.filter((t) => t.status !== 'OUT_OF_STOCK').length / tanks.length) * 1000) / 10
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-mono-code text-white">
      {/* Top Header Card */}
      <div className="bg-black/90 backdrop-blur-xl border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="px-2.5 py-0.5 bg-amber-400 text-black text-xs font-black rounded shadow">
              Console administrateur nationale
            </span>
            <span className="text-xs text-neutral-400 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              Pleino Togo
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Tableau de bord global
          </h1>
          <p className="text-xs text-neutral-400 font-sans mt-1">
            Supervision du réseau national, homologation des tarifs officiels et gestion des stations partenaires.
          </p>
        </div>

        {/* Admin Tabs */}
        <div className="flex border border-neutral-700 bg-neutral-900 rounded-xl p-1 text-xs font-bold text-neutral-300 flex-wrap self-start md:self-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'overview' ? 'bg-amber-400 text-black font-black shadow-md' : 'hover:text-white'
            }`}
          >
            Vue d'ensemble
          </button>
          <button
            onClick={() => setActiveTab('prices')}
            className={`px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'prices' ? 'bg-amber-400 text-black font-black shadow-md' : 'hover:text-white'
            }`}
          >
            Prix Officiels Togo
          </button>
          <button
            onClick={() => setActiveTab('stations')}
            className={`px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'stations' ? 'bg-amber-400 text-black font-black shadow-md' : 'hover:text-white'
            }`}
          >
            Stations ({stations.length})
          </button>
          <button
            onClick={() => setActiveTab('accounts')}
            className={`px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'accounts' ? 'bg-amber-400 text-black font-black shadow-md' : 'hover:text-white'
            }`}
          >
            Comptes
          </button>
          <button
            onClick={() => setActiveTab('incidents')}
            className={`px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'incidents' ? 'bg-amber-400 text-black font-black shadow-md' : 'hover:text-white'
            }`}
          >
            Alertes stock ({stockAlerts.length})
          </button>
          <button
            onClick={() => setActiveTab('journal')}
            className={`px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'journal' ? 'bg-amber-400 text-black font-black shadow-md' : 'hover:text-white'
            }`}
          >
            Journal
          </button>
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 border border-neutral-800 bg-black/85 backdrop-blur-xl rounded-2xl space-y-2 shadow-2xl">
              <span className="text-xs text-amber-400 font-bold uppercase block tracking-widest">
                Volumétrie financière
              </span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono-code">
                {totalVolumeFCFA.toLocaleString('fr-FR')} FCFA
              </div>
              <span className="text-xs text-neutral-400 block font-sans">
                Tickets payés (hors annulés et expirés)
              </span>
            </div>

            <div className="p-6 border border-neutral-800 bg-black/85 backdrop-blur-xl rounded-2xl space-y-2 shadow-2xl">
              <span className="text-xs text-amber-400 font-bold uppercase block tracking-widest">
                Réservations totales
              </span>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono-code">
                {paidReservations.length} COMMANDES
              </div>
              <span className="text-xs text-neutral-400 block font-sans">
                {totalLitersDispensed.toLocaleString('fr-FR')} Litres réservés
              </span>
            </div>

            <div className="p-6 border border-neutral-800 bg-black/85 backdrop-blur-xl rounded-2xl space-y-2 shadow-2xl">
              <span className="text-xs text-amber-400 font-bold uppercase block tracking-widest">
                Stations partenaires
              </span>
              <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono-code">
                {partnerStationsCount} / {stations.length}
              </div>
              <span className="text-xs text-neutral-400 block font-sans">
                {cities.join(', ')}
              </span>
            </div>

            <div className="p-6 border border-neutral-800 bg-black/85 backdrop-blur-xl rounded-2xl space-y-2 shadow-2xl">
              <span className="text-xs text-amber-400 font-bold uppercase block tracking-widest">
                Taux de disponibilité
              </span>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono-code">
                {availabilityRate.toLocaleString('fr-FR')}%
              </div>
              <span className="text-xs text-neutral-400 block font-sans">
                Cuves non vides, tous carburants
              </span>
            </div>
          </div>

          {/* Nationwide Fuel Inventory Breakdown */}
          <div className="border border-neutral-800 p-6 bg-black/85 backdrop-blur-xl rounded-2xl space-y-4 shadow-2xl">
            <div className="border-b border-neutral-800 pb-3 flex justify-between items-center">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Fuel className="w-5 h-5 text-amber-400" />
                <span>Stocks de carburant du Togo</span>
              </h2>
              <span className="text-xs font-bold text-neutral-400">Mise à jour en direct</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono-code">
              {FUEL_TYPES.map((fuel) => {
                const totalLiters = stations.reduce((acc, s) => acc + (s.stock[fuel]?.availableLiters || 0), 0);
                return (
                  <div key={fuel} className="p-4 border border-neutral-800 bg-black/60 rounded-xl space-y-1">
                    <span className="text-[11px] text-amber-400 uppercase block font-bold tracking-wider">
                      {FUEL_LABELS[fuel]}
                    </span>
                    <div className="text-2xl font-black text-white">
                      {totalLiters.toLocaleString('fr-FR')} L
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* OFFICIAL FUEL PRICES TAB */}
      {activeTab === 'prices' && (
        <div className="border border-neutral-800 p-6 bg-black/85 backdrop-blur-xl rounded-2xl space-y-6 shadow-2xl">
          <div className="border-b border-neutral-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-white">
                Prix officiels homologués de carburant (Togo)
              </h2>
              <p className="text-xs text-neutral-400 font-sans mt-0.5">
                Ajustez les tarifs nationaux officiels fixés par le Ministère du Commerce du Togo.
              </p>
            </div>

            <button
              onClick={handleSavePrices}
              className="px-6 py-3 bg-amber-400 text-black font-black text-xs hover:bg-amber-300 transition-colors rounded-xl flex items-center gap-2 self-start md:self-auto shadow-lg"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer les Prix</span>
            </button>
          </div>

          {priceSaveSuccess && (
            <div className="p-3.5 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-bold text-center rounded-xl animate-fadeIn">
              Prix officiels et pompes synchronisés dans le système national !
            </div>
          )}

          {priceError && (
            <div role="alert" className="p-3.5 bg-red-500/20 border border-red-500/50 text-red-300 text-xs font-bold text-center rounded-xl">
              {priceError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {editingPrices.map((gp) => (
              <div key={gp.type} className="p-5 border border-neutral-800 bg-black/60 rounded-xl space-y-3">
                <div className="text-xs font-black border-b border-neutral-800 pb-2 text-amber-300">
                  {gp.label} ({gp.type})
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-neutral-400 font-bold uppercase block">
                    Prix Officiel (FCFA / Litre)
                  </label>
                  <input
                    type="number"
                    value={gp.officialPriceXOF}
                    onChange={(e) => handlePriceChange(gp.type, Number(e.target.value))}
                    className="w-full p-3 border border-neutral-700 bg-black/80 text-xl font-black text-emerald-400 font-mono-code rounded-lg focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="text-xs text-neutral-400">
                  Disponibilité estimée: <span className="font-bold text-white">{gp.avgAvailabilityPercent}%</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border border-neutral-800 bg-black/60 rounded-xl flex items-center gap-3">
            <input
              type="checkbox"
              id="applyAll"
              checked={applyToAllStations}
              onChange={(e) => setApplyToAllStations(e.target.checked)}
              className="w-4 h-4 accent-amber-400 cursor-pointer rounded"
            />
            <label htmlFor="applyAll" className="text-xs font-bold text-neutral-200 cursor-pointer">
              Appliquer directement ces nouveaux prix aux pompes de toutes les stations-service du réseau Togo
            </label>
          </div>
        </div>
      )}

      {/* STATIONS MANAGEMENT TAB */}
      {activeTab === 'stations' && (
        <div className="border border-neutral-800 p-6 bg-black/85 backdrop-blur-xl rounded-2xl space-y-6 shadow-2xl">
          <div className="border-b border-neutral-800 pb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <h2 className="text-xl font-black text-white">
                Gestion et validation des stations partenaires
              </h2>
              <p className="text-xs text-neutral-400 font-sans mt-0.5">
                Consultez les logos et statuts des enseignes partenaires au Togo.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-400 border border-amber-400/30 bg-amber-400/10 px-3 py-1 rounded-md">
                {partnerStationsCount} actives
              </span>
              {!showAddStation && (
                <button
                  onClick={() => setShowAddStation(true)}
                  className="px-3 py-1 text-xs font-black rounded-md bg-amber-400 text-black hover:bg-amber-300"
                >
                  + Ajouter une station
                </button>
              )}
            </div>
          </div>

          {showAddStation && <AddStationForm onAdded={onStationAdded} onClose={() => setShowAddStation(false)} />}

          <div className="space-y-4">
            {stations.map((st) => (
              <div
                key={st.id}
                className="p-4 border border-neutral-800 hover:border-amber-400/80 transition-all rounded-xl bg-black/60 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <StationBrandLogo
                    brand={st.brand}
                    size="md"
                    interactive={true}
                    showBadge={false}
                    className="bg-black p-1.5 border border-neutral-700 rounded-xl shrink-0"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-neutral-800 text-amber-300 text-[11px] font-black uppercase rounded">
                        {st.brand}
                      </span>
                      <span className="text-xs font-bold text-neutral-400">
                        {st.district} • {st.city}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-white">{st.name}</h3>
                    <p className="text-xs text-neutral-400 font-sans flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>{st.address} • Tél: {st.phone}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span
                    className={`px-3 py-1 text-xs font-black rounded border ${
                      st.isPartner
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                    }`}
                  >
                    {st.isPartner ? 'PARTENAIRE ACTIF' : 'SUSPENDU'}
                  </span>

                  <button
                    onClick={() => onToggleStationPartner(st.id)}
                    className="px-4 py-2 border border-neutral-700 bg-black/80 rounded-xl text-xs font-bold hover:bg-amber-400 hover:text-black hover:border-amber-400 transition-all text-white"
                  >
                    {st.isPartner ? 'Suspendre la station' : 'Activer comme partenaire'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ACCOUNTS TAB */}
      {activeTab === 'accounts' && <AdminUsersPanel stations={stations} currentUserId={currentUserId} />}

      {/* JOURNAL TAB */}
      {activeTab === 'journal' && <AuditLogPanel stations={stations} />}

      {/* INCIDENTS TAB */}
      {activeTab === 'incidents' && (
        <div className="border border-neutral-800 p-6 bg-black/85 backdrop-blur-xl rounded-2xl space-y-4 shadow-2xl">
          <h2 className="text-xl font-black text-white border-b border-neutral-800 pb-3">
            Cuves vides ou faibles
          </h2>

          {stockAlerts.length === 0 ? (
            <p className="text-sm text-emerald-300 font-bold">Aucune cuve vide ou faible en ce moment.</p>
          ) : (
            stockAlerts.map(({ station, fuel, stock }) => {
              const empty = stock.status === 'OUT_OF_STOCK';
              return (
                <div
                  key={`${station.id}-${fuel}`}
                  className={`p-4 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                    empty ? 'border-rose-500/40 bg-rose-500/10' : 'border-amber-500/40 bg-amber-500/10'
                  }`}
                >
                  <span className={`text-xs font-bold flex items-center gap-2 ${empty ? 'text-rose-300' : 'text-amber-300'}`}>
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {empty ? 'Rupture' : 'Stock faible'} — {FUEL_LABELS[fuel]} — {station.name}
                  </span>
                  <span className="text-xs text-neutral-300">
                    {stock.availableLiters.toLocaleString('fr-FR')} L libres / {stock.maxCapacityLiters.toLocaleString('fr-FR')} L
                    {station.phone ? ` • ${station.phone}` : ''}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
