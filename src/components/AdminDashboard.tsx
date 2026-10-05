import React, { useState } from 'react';
import { Station, Reservation, FuelPriceGlobal, FuelType } from '../types';
import { ShieldCheck, Users, Fuel, DollarSign, AlertTriangle, CheckCircle2, XCircle, Plus, Building2, BarChart3, Save, Sparkles, MapPin } from 'lucide-react';
import { StationBrandLogo } from './StationBrandLogo';
import { AdminUsersPanel } from './AdminUsersPanel';

interface AdminDashboardProps {
  stations: Station[];
  reservations: Reservation[];
  globalPrices: FuelPriceGlobal[];
  onToggleStationPartner: (stationId: string) => void;
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
  currentUserId,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'prices' | 'stations' | 'accounts' | 'incidents'>('overview');
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

  const totalVolumeFCFA = reservations.reduce((acc, r) => acc + r.totalAmountXOF, 0);
  const totalLitersDispensed = reservations.reduce((acc, r) => acc + r.liters, 0);
  const partnerStationsCount = stations.filter((s) => s.isPartner).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-mono-code text-white">
      {/* Top Header Card */}
      <div className="bg-black/90 backdrop-blur-xl border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="px-2.5 py-0.5 bg-amber-400 text-black text-xs font-black uppercase rounded shadow">
              CONSOLE ADMINISTRATEUR NATIONALE
            </span>
            <span className="text-xs text-neutral-400 font-bold uppercase flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              RONIKOV TOGO S.A.
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white">
            TABLEAU DE BORD GLOBAL
          </h1>
          <p className="text-xs text-neutral-400 font-sans mt-1">
            Supervision du réseau national, homologation des tarifs officiels et gestion des stations partenaires.
          </p>
        </div>

        {/* Admin Tabs */}
        <div className="flex border border-neutral-700 bg-neutral-900 rounded-xl p-1 text-xs font-bold text-neutral-300 flex-wrap">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2 uppercase rounded-lg transition-all ${
              activeTab === 'overview' ? 'bg-amber-400 text-black font-black shadow-md' : 'hover:text-white'
            }`}
          >
            Vue d'ensemble
          </button>
          <button
            onClick={() => setActiveTab('prices')}
            className={`px-3.5 py-2 uppercase rounded-lg transition-all ${
              activeTab === 'prices' ? 'bg-amber-400 text-black font-black shadow-md' : 'hover:text-white'
            }`}
          >
            Prix Officiels Togo
          </button>
          <button
            onClick={() => setActiveTab('stations')}
            className={`px-3.5 py-2 uppercase rounded-lg transition-all ${
              activeTab === 'stations' ? 'bg-amber-400 text-black font-black shadow-md' : 'hover:text-white'
            }`}
          >
            Stations ({stations.length})
          </button>
          <button
            onClick={() => setActiveTab('accounts')}
            className={`px-3.5 py-2 uppercase rounded-lg transition-all ${
              activeTab === 'accounts' ? 'bg-amber-400 text-black font-black shadow-md' : 'hover:text-white'
            }`}
          >
            Comptes
          </button>
          <button
            onClick={() => setActiveTab('incidents')}
            className={`px-3.5 py-2 uppercase rounded-lg transition-all ${
              activeTab === 'incidents' ? 'bg-amber-400 text-black font-black shadow-md' : 'hover:text-white'
            }`}
          >
            Incidents (1)
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
                VOLUMÉTRIE FINANCIÈRE
              </span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono-code">
                {totalVolumeFCFA.toLocaleString('fr-FR')} FCFA
              </div>
              <span className="text-[11px] text-neutral-400 block font-sans">
                Flux transactionnés via TMoney & Flooz
              </span>
            </div>

            <div className="p-6 border border-neutral-800 bg-black/85 backdrop-blur-xl rounded-2xl space-y-2 shadow-2xl">
              <span className="text-xs text-amber-400 font-bold uppercase block tracking-widest">
                RÉSERVATIONS TOTALES
              </span>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono-code">
                {reservations.length} COMMANDES
              </div>
              <span className="text-[11px] text-neutral-400 block font-sans">
                {totalLitersDispensed.toLocaleString('fr-FR')} Litres réservés
              </span>
            </div>

            <div className="p-6 border border-neutral-800 bg-black/85 backdrop-blur-xl rounded-2xl space-y-2 shadow-2xl">
              <span className="text-xs text-amber-400 font-bold uppercase block tracking-widest">
                STATIONS VÉRIFIÉES
              </span>
              <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono-code">
                {partnerStationsCount} / {stations.length}
              </div>
              <span className="text-[11px] text-neutral-400 block font-sans">
                Réseau Lomé, Tsévié, Atakpamé
              </span>
            </div>

            <div className="p-6 border border-neutral-800 bg-black/85 backdrop-blur-xl rounded-2xl space-y-2 shadow-2xl">
              <span className="text-xs text-amber-400 font-bold uppercase block tracking-widest">
                TAUX DE DISPONIBILITÉ
              </span>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono-code">
                92.4%
              </div>
              <span className="text-[11px] text-neutral-400 block font-sans">
                Surveillance nationale active
              </span>
            </div>
          </div>

          {/* Nationwide Fuel Inventory Breakdown */}
          <div className="border border-neutral-800 p-6 bg-black/85 backdrop-blur-xl rounded-2xl space-y-4 shadow-2xl">
            <div className="border-b border-neutral-800 pb-3 flex justify-between items-center">
              <h2 className="text-xl font-black uppercase text-white flex items-center gap-2">
                <Fuel className="w-5 h-5 text-amber-400" />
                <span>STOCKS DE CARBURANT DU TOGO</span>
              </h2>
              <span className="text-xs font-bold text-neutral-400">Mise à jour en direct</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono-code">
              {['SUPER', 'GAZOLE', 'MELANGE', 'KEROSENE'].map((fuel) => {
                const totalLiters = stations.reduce(
                  (acc, s) => acc + (s.stock[fuel as any]?.availableLiters || 0),
                  0
                );
                return (
                  <div key={fuel} className="p-4 border border-neutral-800 bg-black/60 rounded-xl space-y-1">
                    <span className="text-[10px] text-amber-400 uppercase block font-bold tracking-wider">
                      STOCK TOTAL {fuel}
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
              <h2 className="text-xl font-black uppercase text-white">
                PRIX OFFICIELS HOMOLOGUÉS DE CARBURANT (TOGO)
              </h2>
              <p className="text-xs text-neutral-400 font-sans mt-0.5">
                Ajustez les tarifs nationaux officiels fixés par le Ministère du Commerce du Togo.
              </p>
            </div>

            <button
              onClick={handleSavePrices}
              className="px-6 py-3 bg-amber-400 text-black font-black text-xs uppercase hover:bg-amber-300 transition-colors rounded-xl flex items-center gap-2 self-start md:self-auto shadow-lg"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer les Prix</span>
            </button>
          </div>

          {priceSaveSuccess && (
            <div className="p-3.5 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-bold uppercase text-center rounded-xl animate-fadeIn">
              PRIX OFFICIELS ET POMPES SYNCHRONISÉS DANS LE SYSTÈME NATIONAL !
            </div>
          )}

          {priceError && (
            <div role="alert" className="p-3.5 bg-red-500/20 border border-red-500/50 text-red-300 text-xs font-bold uppercase text-center rounded-xl">
              {priceError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {editingPrices.map((gp) => (
              <div key={gp.type} className="p-5 border border-neutral-800 bg-black/60 rounded-xl space-y-3">
                <div className="text-xs font-black uppercase border-b border-neutral-800 pb-2 text-amber-300">
                  {gp.label} ({gp.type})
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-400 font-bold uppercase block">
                    Prix Officiel (FCFA / Litre)
                  </label>
                  <input
                    type="number"
                    value={gp.officialPriceXOF}
                    onChange={(e) => handlePriceChange(gp.type, Number(e.target.value))}
                    className="w-full p-3 border border-neutral-700 bg-black/80 text-xl font-black text-emerald-400 font-mono-code rounded-lg focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="text-[11px] text-neutral-400">
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
            <label htmlFor="applyAll" className="text-xs font-bold text-neutral-200 uppercase cursor-pointer">
              Appliquer directement ces nouveaux prix aux pompes de toutes les stations-service du réseau Togo
            </label>
          </div>
        </div>
      )}

      {/* STATIONS MANAGEMENT TAB */}
      {activeTab === 'stations' && (
        <div className="border border-neutral-800 p-6 bg-black/85 backdrop-blur-xl rounded-2xl space-y-6 shadow-2xl">
          <div className="border-b border-neutral-800 pb-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black uppercase text-white">
                GESTION ET VALIDATION DES STATIONS PARTENAIRES
              </h2>
              <p className="text-xs text-neutral-400 font-sans mt-0.5">
                Consultez les logos et statuts des enseignes partenaires au Togo.
              </p>
            </div>
            <span className="text-xs font-bold text-amber-400 border border-amber-400/30 bg-amber-400/10 px-3 py-1 rounded-md">
              {partnerStationsCount} actives
            </span>
          </div>

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
                      <span className="px-2 py-0.5 bg-neutral-800 text-amber-300 text-[10px] font-black uppercase rounded">
                        {st.brand}
                      </span>
                      <span className="text-xs font-bold text-neutral-400">
                        {st.district} • {st.city}
                      </span>
                    </div>
                    <h3 className="text-base font-black uppercase text-white">{st.name}</h3>
                    <p className="text-xs text-neutral-400 font-sans flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>{st.address} • Tél: {st.phone}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span
                    className={`px-3 py-1 text-xs font-black uppercase rounded border ${
                      st.isPartner
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                    }`}
                  >
                    {st.isPartner ? 'PARTENAIRE ACTIF' : 'SUSPENDU'}
                  </span>

                  <button
                    onClick={() => onToggleStationPartner(st.id)}
                    className="px-4 py-2 border border-neutral-700 bg-black/80 rounded-xl text-xs font-bold uppercase hover:bg-amber-400 hover:text-black hover:border-amber-400 transition-all text-white"
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

      {/* INCIDENTS TAB */}
      {activeTab === 'incidents' && (
        <div className="border border-neutral-800 p-6 bg-black/85 backdrop-blur-xl rounded-2xl space-y-4 shadow-2xl">
          <h2 className="text-xl font-black uppercase text-white border-b border-neutral-800 pb-3">
            JOURNAL DES INCIDENTS & RUPTURES
          </h2>

          <div className="p-4 border border-rose-500/40 bg-rose-500/10 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-bold uppercase">
              <span className="text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Rupture partielle signalée — Cap Adidogomé
              </span>
              <span className="text-neutral-400">Il y a 45 min</span>
            </div>
            <p className="text-xs text-neutral-300 font-sans">
              Le stock de Super à la station Cap Adidogomé Douane est descendu sous les 500 Litres. Notification de réapprovisionnement envoyée au fournisseur.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
