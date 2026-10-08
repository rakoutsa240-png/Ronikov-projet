import React, { useState, useEffect, useCallback } from 'react';
import { Station, Reservation, FuelType } from '../types';
import { Gauge } from './Gauge';
import { ShieldCheck, CheckCircle2, AlertTriangle, Search, QrCode, Sliders, Save, RefreshCw, Lock, Fuel, Clock, Sparkles } from 'lucide-react';
import { StationBrandLogo } from './StationBrandLogo';
import { QrScanner } from './QrScanner';
import { StationFreshness } from './StationFreshness';

interface ProDashboardProps {
  managedStation: Station;
  stationChoices: Station[]; // stations this account may run (all of them for an admin)
  onChangeStation: (stationId: string) => void;
  reservations: Reservation[];
  onValidateCode: (
    stationId: string,
    code: string,
  ) => Promise<{ success: boolean; message: string; reservation?: Reservation }>;
  // Both resolve once the API saved the change, and reject with a message to show otherwise.
  onUpdateStock: (stationId: string, updatedStock: Station['stock']) => Promise<void>;
  onUpdateQueueTime: (stationId: string, newQueueTime: number) => Promise<void>;
  // Tells clients the station's figures are still right, even when nothing changed (clears their reports).
  onConfirmStation: (stationId: string) => Promise<void>;
  canEditPrice?: boolean; // only admins set prices
}

// The form edits what is physically in the tank: litres still bookable plus litres held by tickets.
const toTankLevels = (stock: Station['stock']): Station['stock'] =>
  Object.fromEntries(
    Object.entries(stock).map(([fuel, s]) => [fuel, { ...s, availableLiters: s.availableLiters + (s.reservedLiters ?? 0) }]),
  ) as Station['stock'];

export const ProDashboard: React.FC<ProDashboardProps> = ({
  managedStation,
  stationChoices,
  onChangeStation,
  reservations,
  onValidateCode,
  onUpdateStock,
  onUpdateQueueTime,
  onConfirmStation,
  canEditPrice = false,
}) => {
  const [inputCode, setInputCode] = useState('');
  const [validationResult, setValidationResult] = useState<{
    success: boolean;
    message: string;
    reservation?: Reservation;
  } | null>(null);

  // Station stock local editing state
  const [stockState, setStockState] = useState<Station['stock']>(toTankLevels(managedStation.stock));
  const [queueTime, setQueueTime] = useState<number>(managedStation.queueTimeMinutes);
  const [stockSavedMessage, setStockSavedMessage] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (managedStation) {
      setStockState(toTankLevels(managedStation.stock));
      setQueueTime(managedStation.queueTimeMinutes);
    }
  }, [managedStation]);

  const [isVerifying, setIsVerifying] = useState(false);

  const [isScanning, setIsScanning] = useState(false);

  // The API checks the code; signed QR contents are sent as scanned, typed codes in capitals.
  const verify = async (raw: string) => {
    const code = raw.trim();
    if (!code || isVerifying) return;

    setIsVerifying(true);
    try {
      setValidationResult(await onValidateCode(managedStation.id, code.startsWith('RNK1.') ? code : code.toUpperCase()));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void verify(inputCode);
  };

  // A scanned QR is checked at once; the field shows the readable code, not the signed content.
  const handleScan = useCallback(
    (text: string) => {
      setIsScanning(false);
      const parts = text.split('.');
      setInputCode(text.startsWith('RNK1.') && parts[2] ? `RNK-${parts[2].slice(0, 4)}-${parts[2].slice(4)}` : text);
      void verify(text);
    },
    // verify only depends on the station, which cannot change while the scanner is open.
    [managedStation.id],
  );

  const handleSaveStock = async () => {
    setIsSaving(true);
    setStockError(null);
    try {
      await onUpdateStock(managedStation.id, stockState);
      await onUpdateQueueTime(managedStation.id, queueTime);
      await onConfirmStation(managedStation.id);
      setStockSavedMessage(true);
      setTimeout(() => setStockSavedMessage(false), 3000);
    } catch (e) {
      setStockError(e instanceof Error ? e.message : 'Enregistrement impossible, réessayez.');
    } finally {
      setIsSaving(false);
    }
  };

  const stationReservations = reservations.filter((r) => r.stationId === managedStation.id);

  if (stationChoices.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 font-mono-code text-white">
        <div className="bg-black/90 border border-neutral-800 rounded-2xl p-8 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 mx-auto text-amber-400" />
          <h1 className="text-xl font-black">Aucune station attribuée</h1>
          <p className="text-sm text-neutral-300 font-sans">
            Votre compte gérant n'est relié à aucune station. Demandez à un administrateur RONIKOV de vous l'attribuer.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-mono-code text-white">
      {/* Top Station Header Card */}
      <div className="bg-black/90 backdrop-blur-xl border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3">
          {stationChoices.length > 1 && (
            <label className="flex flex-col gap-1 text-[11px] uppercase font-bold text-neutral-400">
              Station affichée
              <select
                value={managedStation.id}
                onChange={(e) => onChangeStation(e.target.value)}
                className="bg-black border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white normal-case font-mono-code max-w-full"
              >
                {stationChoices.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.city})
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="px-2.5 py-0.5 bg-amber-400 text-black text-xs font-black rounded shadow">
              Terminal pompiste & gérant
            </span>
            <span className="text-xs text-neutral-400 font-bold flex items-center gap-1">
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
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                {managedStation.name}
              </h1>
              <p className="text-xs text-neutral-400 font-sans mt-0.5">
                Contrôle des pompes, validation instantanée des codes QR clients et synchronisation du réseau.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-black/80 border border-neutral-700 rounded-2xl text-center min-w-[180px] shadow-inner shrink-0">
          <span className="text-[11px] text-neutral-400 uppercase font-bold block flex items-center justify-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" /> Attente déclarée
          </span>
          <span className="text-3xl font-black text-amber-300 my-0.5 block">{queueTime} MIN</span>
          <span className="text-[11px] text-emerald-400 font-bold uppercase block">Flux en Direct</span>
        </div>
      </div>

      {/* Grid: Left Code Validation, Right Live Stock Control */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Client Code Verification Terminal */}
        <div className="lg:col-span-6 space-y-6">
          <div className="p-6 border border-neutral-800 bg-black/85 backdrop-blur-xl rounded-2xl shadow-2xl space-y-6">
            <div className="border-b border-neutral-800 pb-4">
              <span className="text-xs text-amber-400 font-bold uppercase block tracking-widest">
                Terminal de scan & saisie pompiste
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Valider un code client
              </h2>
            </div>

            <form onSubmit={handleVerifyCodeSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold block text-neutral-300">
                  Saisir le code du ticket (ex: RNK-AB7K-Q3)
                </label>
                <div className="flex border border-neutral-700 rounded-xl overflow-hidden bg-black/80 focus-within:border-amber-400 transition-colors">
                  <input
                    type="text"
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    placeholder="RNK-AB7K-Q3"
                    className="w-full min-w-0 px-4 py-3.5 text-lg font-black font-mono-code tracking-widest text-amber-300 placeholder-neutral-600 bg-transparent focus:outline-none uppercase"
                  />
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="px-6 py-3.5 bg-amber-400 text-black font-black text-xs hover:bg-amber-300 transition-colors shrink-0 shadow-lg disabled:opacity-60"
                  >
                    {isVerifying ? '...' : 'VÉRIFIER'}
                  </button>
                </div>
              </div>
            </form>

            {isScanning ? (
              <QrScanner onResult={handleScan} onClose={() => setIsScanning(false)} />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setValidationResult(null);
                  setIsScanning(true);
                }}
                className="w-full py-3 border border-amber-400/70 bg-amber-400/10 text-amber-300 hover:bg-amber-400 hover:text-black rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-colors"
              >
                <QrCode className="w-4 h-4" /> Scanner le QR code du client
              </button>
            )}

            {/* Verification Result Display */}
            {validationResult && (
              <div
                className={`p-5 border rounded-xl space-y-3 ${
                  validationResult.success
                    ? 'border-emerald-500/60 bg-emerald-500/10 text-white'
                    : 'border-rose-500/60 bg-rose-500/10 text-white'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm border-b border-neutral-700/80 pb-2">
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
                        <span className="text-neutral-400 block text-[11px] font-bold">Carburant :</span>
                        <span className="font-black text-amber-300 text-sm">{validationResult.reservation.fuelLabel}</span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block text-[11px] font-bold">Volume à servir :</span>
                        <span className="font-black text-white text-sm">{validationResult.reservation.liters} LITRES</span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block text-[11px] font-bold">Client :</span>
                        <span className="font-bold text-neutral-200">{validationResult.reservation.userName}</span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block text-[11px] font-bold">Paiement :</span>
                        <span className="font-extrabold text-emerald-400">{validationResult.reservation.totalAmountXOF.toLocaleString('fr-FR')} FCFA</span>
                      </div>
                    </div>

                    <div className="p-3 bg-amber-400 text-black text-center font-black text-xs rounded-xl shadow-md">
                      SERVEZ EXACTEMENT {validationResult.reservation.liters} LITRES SUR LA POMPE
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recent Station Transactions Log */}
          <div className="p-6 border border-neutral-800 bg-black/85 backdrop-blur-xl rounded-2xl shadow-2xl space-y-4">
            <h3 className="text-base font-black border-b border-neutral-800 pb-3 text-white flex items-center justify-between">
              <span>Dernières commandes de la station</span>
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
                      <div className="font-black text-amber-300">{r.code} — {r.liters}L ({r.fuelLabel})</div>
                      <div className="text-[11px] text-neutral-400">{r.userName} • {r.totalAmountXOF.toLocaleString('fr-FR')} FCFA</div>
                    </div>
                    <span
                      className={`px-2.5 py-1 text-[11px] font-black uppercase rounded border ${
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
                Gestion des stocks & files en direct
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Mises à jour réseau
              </h2>
            </div>

            <button
              onClick={handleSaveStock}
              disabled={isSaving}
              className="px-4 py-2.5 bg-amber-400 text-black font-black text-xs hover:bg-amber-300 transition-all rounded-xl flex items-center gap-1.5 shadow-lg shrink-0 disabled:opacity-60"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Enregistrement...' : 'Enregistrer'}</span>
            </button>
          </div>

          <div className="space-y-1.5">
            <StationFreshness station={managedStation} maxReports={4} className="text-sm" />
            <p className="text-xs text-neutral-400 font-sans">
              Appuyez sur « Enregistrer » même si rien n'a changé : les clients voient que les chiffres sont à jour, et leurs signalements
              sont effacés.
            </p>
          </div>

          {stockSavedMessage && (
            <div className="p-3.5 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-bold text-center rounded-xl animate-fadeIn">
              Stocks et temps d'attente à jour : les clients le voient tout de suite.
            </div>
          )}

          {stockError && (
            <div role="alert" className="p-3.5 bg-red-500/20 border border-red-500/50 text-red-300 text-xs font-bold text-center rounded-xl">
              {stockError}
            </div>
          )}

          {/* Queue Wait Time Adjuster */}
          <div className="space-y-2 border-b border-neutral-800 pb-5">
            <label className="text-xs font-bold text-neutral-300 block flex justify-between items-center">
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
            <div className="flex justify-between text-[11px] text-neutral-400 font-bold">
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
                  <div className="flex justify-between items-center text-xs font-black border-b border-neutral-800 pb-2">
                    <span className="text-amber-300 flex items-center gap-1.5">
                      <Fuel className="w-3.5 h-3.5 text-amber-400" />
                      {f === 'SUPER' ? 'Super Sans Plomb' : f === 'GAZOLE' ? 'Gazole (Diesel)' : f === 'MELANGE' ? 'Mélange 2T' : 'Pétrole / Kérosène'}
                    </span>
                    <span className="text-neutral-400">Capacité: {currentFuelStock.maxCapacityLiters}L</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[11px] text-neutral-400 font-bold block mb-1">
                        Litres en stock
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
                      <label className="text-[11px] text-neutral-400 font-bold block mb-1">
                        Prix du litre (FCFA)
                      </label>
                      <input
                        type="number"
                        value={currentFuelStock.pricePerLiter}
                        readOnly={!canEditPrice}
                        title={canEditPrice ? undefined : 'Prix fixé par l’administrateur RONIKOV'}
                        onChange={(e) =>
                          setStockState({
                            ...stockState,
                            [f]: { ...currentFuelStock, pricePerLiter: Number(e.target.value) },
                          })
                        }
                        className="w-full p-2.5 border border-neutral-700 bg-black/80 text-emerald-400 font-extrabold rounded-lg focus:border-amber-400 focus:outline-none read-only:opacity-70 read-only:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <Gauge
                    value={(currentFuelStock.availableLiters / currentFuelStock.maxCapacityLiters) * 100}
                    type="bar"
                    showPercent={true}
                    sublabel={`${currentFuelStock.availableLiters} Litres en cuve${
                      currentFuelStock.reservedLiters ? `, dont ${currentFuelStock.reservedLiters} L réservés` : ''
                    }`}
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
