import React, { useState, useEffect } from 'react';
import { Station, Reservation, FuelType } from '../types';
import { Gauge } from './Gauge';
import { ShieldCheck, CheckCircle2, AlertTriangle, Search, QrCode, Sliders, Save, RefreshCw, Lock, Fuel, Clock, Sparkles } from 'lucide-react';
import { StationBrandLogo } from './StationBrandLogo';

interface ProDashboardProps {
  managedStation: Station;
  reservations: Reservation[];
  onValidateCode: (
    stationId: string,
    code: string,
  ) => Promise<{ success: boolean; message: string; reservation?: Reservation }>;
  onUpdateStock: (stationId: string, updatedStock: Station['stock']) => void;
  onUpdateQueueTime: (stationId: string, newQueueTime: number) => void;
}

export const ProDashboard: React.FC<ProDashboardProps> = ({
  managedStation,
  reservations,
  onValidateCode,
  onUpdateStock,
  onUpdateQueueTime,
}) => {
  const [inputCode, setInputCode] = useState('');
  const [validationResult, setValidationResult] = useState<{
    success: boolean;
    message: string;
    reservation?: Reservation;
  } | null>(null);

  // Station stock local editing state
  const [stockState, setStockState] = useState<Station['stock']>(managedStation.stock);
  const [queueTime, setQueueTime] = useState<number>(managedStation.queueTimeMinutes);
  const [stockSavedMessage, setStockSavedMessage] = useState(false);

  useEffect(() => {
    if (managedStation) {
      setStockState(managedStation.stock);
      setQueueTime(managedStation.queueTimeMinutes);
    }
  }, [managedStation]);

  const [isVerifying, setIsVerifying] = useState(false);

  // The API checks the code; signed QR contents are sent as scanned, typed codes in capitals.
  const handleVerifyCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = inputCode.trim();
    if (!code || isVerifying) return;

    setIsVerifying(true);
    try {
      setValidationResult(await onValidateCode(managedStation.id, code.startsWith('RNK1.') ? code : code.toUpperCase()));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSaveStock = () => {
    onUpdateStock(managedStation.id, stockState);
    onUpdateQueueTime(managedStation.id, queueTime);
    setStockSavedMessage(true);
    setTimeout(() => setStockSavedMessage(false), 3000);
  };

  const stationReservations = reservations.filter((r) => r.stationId === managedStation.id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-mono-code text-white">
      {/* Top Station Header Card */}
      <div className="bg-black/90 backdrop-blur-xl border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="px-2.5 py-0.5 bg-amber-400 text-black text-xs font-black uppercase rounded shadow">
              TERMINAL POMPISTE & GÉRANT
            </span>
            <span className="text-xs text-neutral-400 font-bold uppercase flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              {managedStation.district} • {managedStation.city}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <StationBrandLogo
              brand={managedStation.brand}
              size="lg"
              interactive={true}
              showBadge={false}
              className="bg-black/80 p-2 border border-neutral-700 rounded-xl"
            />
            <div>
              <h1 className="text-2xl sm:text-4xl font-black uppercase text-white tracking-tight">
                {managedStation.name}
              </h1>
              <p className="text-xs text-neutral-400 font-sans mt-0.5">
                Contrôle des pompes, validation instantanée des codes QR clients et synchronisation du réseau.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-black/80 border border-neutral-700 rounded-2xl text-center min-w-[180px] shadow-inner shrink-0">
          <span className="text-[10px] text-neutral-400 uppercase font-bold block flex items-center justify-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" /> ATTENTE DÉCLARÉE
          </span>
          <span className="text-3xl font-black text-amber-300 my-0.5 block">{queueTime} MIN</span>
          <span className="text-[10px] text-emerald-400 font-bold uppercase block">Flux en Direct</span>
        </div>
      </div>

      {/* Grid: Left Code Validation, Right Live Stock Control */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Client Code Verification Terminal */}
        <div className="lg:col-span-6 space-y-6">
          <div className="p-6 border border-neutral-800 bg-black/85 backdrop-blur-xl rounded-2xl shadow-2xl space-y-6">
            <div className="border-b border-neutral-800 pb-4">
              <span className="text-xs text-amber-400 font-bold uppercase block tracking-widest">
                TERMINAL DE SCAN & SAISIE POMPISTE
              </span>
              <h2 className="text-2xl font-black uppercase text-white tracking-tight">
                VALIDER UN CODE CLIENT
              </h2>
            </div>

            <form onSubmit={handleVerifyCodeSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase block text-neutral-300">
                  Saisir le code du ticket (ex: RNK-AB7K-Q3)
                </label>
                <div className="flex border border-neutral-700 rounded-xl overflow-hidden bg-black/80 focus-within:border-amber-400 transition-colors">
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    placeholder="RNK-AB7K-Q3"
                    className="w-full px-4 py-3.5 text-lg font-black font-mono-code tracking-widest text-amber-300 placeholder-neutral-600 bg-transparent focus:outline-none uppercase"
                  />
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="px-6 py-3.5 bg-amber-400 text-black font-black text-xs uppercase hover:bg-amber-300 transition-colors shrink-0 shadow-lg disabled:opacity-60"
                  >
                    {isVerifying ? '...' : 'VÉRIFIER'}
                  </button>
                </div>
              </div>
            </form>

            {/* Verification Result Display */}
            {validationResult && (
              <div
                className={`p-5 border rounded-xl space-y-3 ${
                  validationResult.success
                    ? 'border-emerald-500/60 bg-emerald-500/10 text-white'
                    : 'border-rose-500/60 bg-rose-500/10 text-white'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm uppercase border-b border-neutral-700/80 pb-2">
                  {validationResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                  )}
                  <span>{validationResult.message}</span>
                </div>

                {validationResult.reservation && (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-3 bg-black/90 p-4 border border-neutral-800 rounded-xl">
                      <div>
                        <span className="text-neutral-400 block text-[10px] font-bold">CARBURANT :</span>
                        <span className="font-black text-amber-300 text-sm">{validationResult.reservation.fuelLabel}</span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block text-[10px] font-bold">VOLUME À SERVIR :</span>
                        <span className="font-black text-white text-sm">{validationResult.reservation.liters} LITRES</span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block text-[10px] font-bold">CLIENT :</span>
                        <span className="font-bold text-neutral-200">{validationResult.reservation.userName}</span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block text-[10px] font-bold">PAIEMENT :</span>
                        <span className="font-extrabold text-emerald-400">{validationResult.reservation.totalAmountXOF.toLocaleString('fr-FR')} FCFA</span>
                      </div>
                    </div>

                    <div className="p-3 bg-amber-400 text-black text-center font-black uppercase text-xs rounded-xl shadow-md">
                      SERVEZ EXACTEMENT {validationResult.reservation.liters} LITRES SUR LA POMPE
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recent Station Transactions Log */}
          <div className="p-6 border border-neutral-800 bg-black/85 backdrop-blur-xl rounded-2xl shadow-2xl space-y-4">
            <h3 className="text-base font-black uppercase border-b border-neutral-800 pb-3 text-white flex items-center justify-between">
              <span>DERNIÈRES COMMANDES DE LA STATION</span>
              <span className="text-xs px-2.5 py-0.5 bg-neutral-800 text-amber-300 rounded font-bold">
                {stationReservations.length}
              </span>
            </h3>

            {stationReservations.length === 0 ? (
              <p className="text-xs text-neutral-400 italic py-4 text-center">Aucune commande reçue aujourd'hui.</p>
            ) : (
              <div className="space-y-2.5 text-xs max-h-64 overflow-y-auto pr-1">
                {stationReservations.map((r) => (
                  <div key={r.id} className="p-3.5 border border-neutral-800 rounded-xl bg-black/60 flex justify-between items-center hover:border-neutral-700 transition-colors">
                    <div>
                      <div className="font-black uppercase text-amber-300">{r.code} — {r.liters}L ({r.fuelLabel})</div>
                      <div className="text-[10px] text-neutral-400">{r.userName} • {r.totalAmountXOF.toLocaleString('fr-FR')} FCFA</div>
                    </div>
                    <span
                      className={`px-2.5 py-1 text-[10px] font-black uppercase rounded border ${
                        r.status === 'VALIDATED'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                      }`}
                    >
                      {r.status === 'VALIDATED' ? 'SERVI' : 'EN ATTENTE'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Real-Time Stock & Queue Control */}
        <div className="lg:col-span-6 p-6 border border-neutral-800 bg-black/85 backdrop-blur-xl rounded-2xl shadow-2xl space-y-6">
          <div className="border-b border-neutral-800 pb-4 flex justify-between items-center gap-2">
            <div>
              <span className="text-xs text-amber-400 font-bold uppercase block tracking-widest">
                GESTION DES STOCKS & FILES EN DIRECT
              </span>
              <h2 className="text-2xl font-black uppercase text-white tracking-tight">
                MISES À JOUR RÉSEAU
              </h2>
            </div>

            <button
              onClick={handleSaveStock}
              className="px-4 py-2.5 bg-amber-400 text-black font-black text-xs uppercase hover:bg-amber-300 transition-all rounded-xl flex items-center gap-1.5 shadow-lg shrink-0"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Enregistrer</span>
            </button>
          </div>

          {stockSavedMessage && (
            <div className="p-3.5 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-bold uppercase text-center rounded-xl animate-fadeIn">
              STOCKS ET TEMPS D'ATTENTE SYNCHRONISÉS AVEC SUCCÈS SUR LE RÉSEAU TOGO !
            </div>
          )}

          {/* Queue Wait Time Adjuster */}
          <div className="space-y-2 border-b border-neutral-800 pb-5">
            <label className="text-xs font-bold uppercase text-neutral-300 block flex justify-between items-center">
              <span>Temps d'attente estimé à la station :</span>
              <span className="text-amber-300 font-black text-sm">{queueTime} minutes</span>
            </label>
            <input
              type="range"
              min="0"
              max="60"
              step="5"
              value={queueTime}
              onChange={(e) => setQueueTime(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer bg-neutral-800 h-2 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-neutral-400 font-bold">
              <span>0 MIN (Fluide)</span>
              <span>30 MIN (Modéré)</span>
              <span>60 MIN (Forte Affluence)</span>
            </div>
          </div>

          {/* Fuel Stocks Inputs */}
          <div className="space-y-4">
            {(['SUPER', 'GAZOLE', 'MELANGE', 'KEROSENE'] as FuelType[]).map((f) => {
              const currentFuelStock = stockState[f];

              return (
                <div key={f} className="p-4 border border-neutral-800 rounded-xl space-y-3 bg-black/60">
                  <div className="flex justify-between items-center text-xs font-black uppercase border-b border-neutral-800 pb-2">
                    <span className="text-amber-300 flex items-center gap-1.5">
                      <Fuel className="w-3.5 h-3.5 text-amber-400" />
                      {f === 'SUPER' ? 'Super Sans Plomb' : f === 'GAZOLE' ? 'Gazole (Désel)' : f === 'MELANGE' ? 'Mélange 2T' : 'Pétrole / Kérosène'}
                    </span>
                    <span className="text-neutral-400">Capacité: {currentFuelStock.maxCapacityLiters}L</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold block mb-1">
                        LITRES EN STOCK
                      </label>
                      <input
                        type="number"
                        value={currentFuelStock.availableLiters}
                        onChange={(e) =>
                          setStockState({
                            ...stockState,
                            [f]: { ...currentFuelStock, availableLiters: Number(e.target.value) },
                          })
                        }
                        className="w-full p-2.5 border border-neutral-700 bg-black/80 text-white font-extrabold rounded-lg focus:border-amber-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold block mb-1">
                        PRIX DU LITRE (FCFA)
                      </label>
                      <input
                        type="number"
                        value={currentFuelStock.pricePerLiter}
                        onChange={(e) =>
                          setStockState({
                            ...stockState,
                            [f]: { ...currentFuelStock, pricePerLiter: Number(e.target.value) },
                          })
                        }
                        className="w-full p-2.5 border border-neutral-700 bg-black/80 text-emerald-400 font-extrabold rounded-lg focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <Gauge
                    value={(currentFuelStock.availableLiters / currentFuelStock.maxCapacityLiters) * 100}
                    type="bar"
                    showPercent={true}
                    sublabel={`${currentFuelStock.availableLiters} Litres disponibles`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
