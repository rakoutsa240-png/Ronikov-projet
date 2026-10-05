import React, { useState, useEffect } from 'react';
import { Station, FuelType, PaymentMethod, Reservation } from '../types';
import { Gauge } from './Gauge';
import { MixxByYasBadge, MoovAfricaBadge, CardPaymentBadge, PaymentMethodLabel } from './PaymentLogos';
import { TicketCard } from './TicketCard';
import { X, Check, ShieldCheck, ArrowRight, Printer, Copy, Clock, AlertTriangle, Phone, Smartphone, CreditCard } from 'lucide-react';
import { api, ApiError } from '../api';
import { MAX_LITERS_PER_RESERVATION, SERVICE_FEE_XOF } from '../../shared/reservations';
import { FUEL_LABELS } from '../../shared/stock';

interface ReservationModalProps {
  station: Station | null;
  isOpen: boolean;
  onClose: () => void;
  onCompleteReservation: (reservation: Reservation) => void;
  isUserPremium?: boolean;
  defaultPaymentPhone?: string; // +228XXXXXXXX
}

// "+22890123456" -> "90 12 34 56"
const formatLocalPhone = (phone?: string) =>
  (phone ?? '').replace(/^\+228/, '').replace(/(\d{2})(?=\d)/g, '$1 ');

export const ReservationModal: React.FC<ReservationModalProps> = ({
  station,
  isOpen,
  onClose,
  onCompleteReservation,
  isUserPremium = false,
  defaultPaymentPhone,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedFuel, setSelectedFuel] = useState<FuelType>('SUPER');
  const [liters, setLiters] = useState<number>(10);
  const [inputMode, setInputMode] = useState<'liters' | 'fcfa'>('liters');
  const [fcfaAmount, setFcfaAmount] = useState<number>(7000);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MIXX_BY_YAS');
  const [phoneNumber, setPhoneNumber] = useState<string>(formatLocalPhone(defaultPaymentPhone));
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [generatedReservation, setGeneratedReservation] = useState<Reservation | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Each opening starts a fresh booking.
  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setPaymentError(null);
    setGeneratedReservation(null);
    setPhoneNumber(formatLocalPhone(defaultPaymentPhone));
  }, [isOpen, station?.id, defaultPaymentPhone]);

  const fuelStock = station?.stock[selectedFuel];
  const pricePerLiter = fuelStock?.pricePerLiter || 700;

  // Sync FCFA / Liters
  useEffect(() => {
    if (inputMode === 'liters') {
      setFcfaAmount(liters * pricePerLiter);
    } else {
      setLiters(Math.round(fcfaAmount / pricePerLiter));
    }
  }, [liters, fcfaAmount, selectedFuel, inputMode, pricePerLiter]);

  const fuelLabels = FUEL_LABELS;

  const totalFuelCost = liters * pricePerLiter;
  // Shown for information: the API computes the amount actually charged.
  const serviceFee = isUserPremium ? 0 : SERVICE_FEE_XOF;
  const totalPayable = totalFuelCost + serviceFee;

  // Payment is simulated; the API creates the ticket and its code.
  const handleProcessPayment = async () => {
    if (!station) return;
    setIsProcessing(true);
    setPaymentError(null);
    try {
      const reservation = await api.createReservation({
        stationId: station.id,
        fuelType: selectedFuel,
        liters,
        paymentMethod,
        paymentPhone: phoneNumber,
      });
      setGeneratedReservation(reservation);
      onCompleteReservation(reservation);
      setStep(4);
    } catch (e) {
      setPaymentError(e instanceof ApiError ? e.message : 'Serveur RONIKOV injoignable. Réessayez.');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (!isOpen || !station) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-neutral-950/95 backdrop-blur-2xl border border-neutral-800 rounded-2xl max-w-xl w-full p-6 sm:p-8 space-y-6 text-white relative my-8 shadow-2xl shadow-black/90 overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 border border-neutral-700 hover:border-amber-400 bg-neutral-900/90 text-neutral-300 hover:text-white rounded-xl transition-all z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header & Step Indicator */}
        <div className="border-b border-neutral-800 pb-4 space-y-3 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-amber-400 text-black text-[10px] font-mono-code font-black uppercase rounded shadow">
              RÉSERVATION RONIKOV
            </span>
            <span className="text-xs font-mono-code text-neutral-400 uppercase font-bold">
              {station.name} ({station.district})
            </span>
          </div>

          {/* Stepper Gauge */}
          <div className="pt-2">
            <div className="flex justify-between items-center text-xs font-mono-code font-bold uppercase mb-1.5 text-neutral-300">
              <span>Étape {step} / 4: {step === 1 ? 'Choix Carburant' : step === 2 ? 'Récapitulatif' : step === 3 ? 'Paiement' : 'Ticket Sécurisé'}</span>
              <span className="text-amber-400">{(step / 4) * 100}%</span>
            </div>
            <div className="w-full bg-neutral-900 border border-neutral-800 h-2.5 rounded-full overflow-hidden p-0.5">
              <div
                className="bg-amber-400 h-full rounded-full transition-all duration-300 shadow-sm shadow-amber-400/50"
                style={{ width: `${(step / 4) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* STEP 1: Fuel & Quantity Selection */}
        {step === 1 && (
          <div className="space-y-5 relative z-10">
            {/* Fuel Type Selector */}
            <div className="space-y-2">
              <label className="text-xs font-mono-code font-bold uppercase text-neutral-200 block">
                1. Sélectionner le type de carburant
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {(['SUPER', 'GAZOLE', 'MELANGE', 'KEROSENE'] as FuelType[]).map((f) => {
                  const stock = station.stock[f];
                  const isAvailable = stock && stock.availableLiters > 0;
                  const isSelected = selectedFuel === f;

                  return (
                    <button
                      key={f}
                      disabled={!isAvailable}
                      onClick={() => setSelectedFuel(f)}
                      className={`p-3.5 text-left border font-mono-code transition-all rounded-xl ${
                        !isAvailable
                          ? 'opacity-40 border-neutral-900 bg-neutral-900/40 text-neutral-500 cursor-not-allowed'
                          : isSelected
                          ? 'border-2 border-amber-400 bg-amber-400/10 text-white shadow-lg shadow-amber-400/10'
                          : 'border-neutral-800 bg-black/60 hover:border-neutral-700 text-neutral-200'
                      }`}
                    >
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className={isSelected ? 'text-amber-300' : 'text-white'}>{fuelLabels[f]}</span>
                        <span className="text-amber-400">{stock?.pricePerLiter} XOF/L</span>
                      </div>
                      <div className="text-[11px] mt-1 text-neutral-400">
                        {isAvailable ? `Disponible: ${stock.availableLiters} Litres` : 'Rupture de Stock'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantity Selector: Liters or FCFA Amount */}
            <div className="space-y-3 pt-3 border-t border-neutral-800">
              <div className="flex justify-between items-center">
                <label className="text-xs font-mono-code font-bold uppercase text-neutral-200">
                  2. Quantité à réserver
                </label>
                <div className="flex border border-neutral-800 rounded-lg overflow-hidden font-mono-code text-xs bg-black">
                  <button
                    onClick={() => setInputMode('liters')}
                    className={`px-3 py-1 font-bold transition-all ${
                      inputMode === 'liters' ? 'bg-amber-400 text-black' : 'bg-neutral-900 text-neutral-400 hover:text-white'
                    }`}
                  >
                    En Litres
                  </button>
                  <button
                    onClick={() => setInputMode('fcfa')}
                    className={`px-3 py-1 font-bold transition-all ${
                      inputMode === 'fcfa' ? 'bg-amber-400 text-black' : 'bg-neutral-900 text-neutral-400 hover:text-white'
                    }`}
                  >
                    En FCFA
                  </button>
                </div>
              </div>

              {/* Slider & Presets */}
              {inputMode === 'liters' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border border-neutral-800 p-4 bg-black/60 rounded-xl font-mono-code">
                    <span className="text-xs text-neutral-400 font-bold uppercase">Volume Choisis:</span>
                    <span className="text-2xl font-black text-amber-300">{liters} Litres</span>
                  </div>

                  <input
                    type="range"
                    min="2"
                    max={Math.min(MAX_LITERS_PER_RESERVATION, fuelStock?.availableLiters || 50)}
                    value={liters}
                    onChange={(e) => setLiters(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />

                  {/* Preset Liters Buttons */}
                  <div className="grid grid-cols-4 gap-2 text-xs font-mono-code">
                    {[5, 10, 20, 50].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setLiters(preset)}
                        className={`py-2 border font-bold rounded-lg transition-all ${
                          liters === preset ? 'border-amber-400 bg-amber-400 text-black shadow' : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        {preset} L
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border border-neutral-800 p-4 bg-black/60 rounded-xl font-mono-code">
                    <span className="text-xs text-neutral-400 font-bold uppercase">Montant Souhaité:</span>
                    <span className="text-2xl font-black text-amber-300">{fcfaAmount.toLocaleString('fr-FR')} FCFA</span>
                  </div>

                  <input
                    type="range"
                    min="1400"
                    max="50000"
                    step="700"
                    value={fcfaAmount}
                    onChange={(e) => setFcfaAmount(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />

                  {/* Preset Amounts Buttons */}
                  <div className="grid grid-cols-4 gap-2 text-xs font-mono-code">
                    {[3500, 7000, 14000, 35000].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setFcfaAmount(preset)}
                        className={`py-2 border font-bold rounded-lg transition-all ${
                          fcfaAmount === preset ? 'border-amber-400 bg-amber-400 text-black shadow' : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        {(preset / 1000).toFixed(1)}k FCFA
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-neutral-800 flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3.5 bg-amber-400 text-black font-mono-code font-black text-xs uppercase tracking-wider hover:bg-amber-300 transition-all rounded-xl shadow-lg shadow-amber-400/20 flex items-center gap-2"
              >
                <span>Continuer vers le récapitulatif</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Order Breakdown & Service Fee */}
        {step === 2 && (
          <div className="space-y-5 relative z-10">
            <div className="border border-neutral-800 p-4 space-y-3 font-mono-code text-xs bg-black/60 rounded-xl text-neutral-200">
              <div className="text-xs font-black uppercase tracking-wider border-b border-neutral-800 pb-2 text-amber-300">
                Détail de la Commande
              </div>

              <div className="flex justify-between py-1 border-b border-neutral-800/80">
                <span className="text-neutral-400">Station sélectionnée:</span>
                <span className="font-bold text-white">{station.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-800/80">
                <span className="text-neutral-400">Type de carburant:</span>
                <span className="font-bold text-white">{fuelLabels[selectedFuel]}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-800/80">
                <span className="text-neutral-400">Volume réservé:</span>
                <span className="font-bold text-white">{liters} Litres</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-800/80">
                <span className="text-neutral-400">Prix unitaire officiel Togo:</span>
                <span className="font-bold text-white">{pricePerLiter} FCFA / Litre</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-800/80">
                <span className="text-neutral-400">Sous-total Carburant:</span>
                <span className="font-bold text-white">{totalFuelCost.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-800/80">
                <span className="text-neutral-400">Frais de service & réservation RONIKOV:</span>
                <span className="font-bold text-amber-400">
                  {isUserPremium ? '0 FCFA (Offerts - Client Premium)' : `${serviceFee} FCFA`}
                </span>
              </div>

              <div className="flex justify-between pt-2 text-sm font-black border-t border-neutral-800 text-amber-300">
                <span>TOTAL À PAYER:</span>
                <span>{totalPayable.toLocaleString('fr-FR')} FCFA</span>
              </div>
            </div>

            {/* Validity Notice */}
            <div className="border border-amber-400/30 bg-amber-400/10 p-3.5 text-xs font-mono-code text-amber-200 flex items-start gap-2.5 rounded-xl">
              <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Garantie de stock :</strong> Une fois payé, votre carburant est réservé physiquement à la station pendant <strong>2 heures (120 min)</strong>. Passé ce délai, si non récupéré, votre réservation expire et un remboursement est déclenché.
              </span>
            </div>

            <div className="pt-4 border-t border-neutral-800 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2.5 border border-neutral-700 bg-neutral-900 text-neutral-300 font-mono-code font-bold text-xs uppercase hover:border-amber-400 rounded-xl transition-all"
              >
                Retour
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-6 py-3.5 bg-amber-400 text-black font-mono-code font-black text-xs uppercase tracking-wider hover:bg-amber-300 transition-all rounded-xl shadow-lg shadow-amber-400/20 flex items-center gap-2"
              >
                <span>Procéder au Paiement</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Payment Method Selection */}
        {step === 3 && (
          <div className="space-y-5 relative z-10">
            <div className="space-y-3">
              <label className="text-xs font-mono-code font-bold uppercase text-neutral-200 block">
                Sélectionner le mode de paiement Mobile Money Togo / Carte
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono-code text-xs">
                {/* Mixx by Yas (Togocom) */}
                <button
                  onClick={() => setPaymentMethod('MIXX_BY_YAS')}
                  className={`p-3.5 border font-bold flex flex-col items-start justify-center transition-all rounded-xl relative ${
                    paymentMethod === 'MIXX_BY_YAS' || paymentMethod === 'TMONEY'
                      ? 'border-2 border-yellow-400 bg-yellow-400/10 text-white shadow-lg shadow-yellow-400/10'
                      : 'border-neutral-800 bg-black/60 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  <MixxByYasBadge selected={paymentMethod === 'MIXX_BY_YAS' || paymentMethod === 'TMONEY'} />
                </button>

                {/* Moov Africa (Flooz) */}
                <button
                  onClick={() => setPaymentMethod('MOOV_MONEY')}
                  className={`p-3.5 border font-bold flex flex-col items-start justify-center transition-all rounded-xl relative ${
                    paymentMethod === 'MOOV_MONEY' || paymentMethod === 'FLOOZ'
                      ? 'border-2 border-blue-400 bg-blue-500/10 text-white shadow-lg shadow-blue-500/10'
                      : 'border-neutral-800 bg-black/60 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  <MoovAfricaBadge selected={paymentMethod === 'MOOV_MONEY' || paymentMethod === 'FLOOZ'} />
                </button>

                {/* Bank Card */}
                <button
                  onClick={() => setPaymentMethod('CARD')}
                  className={`p-3.5 border font-bold flex flex-col items-start justify-center transition-all rounded-xl relative ${
                    paymentMethod === 'CARD'
                      ? 'border-2 border-amber-400 bg-amber-400/10 text-white shadow-lg shadow-amber-400/10'
                      : 'border-neutral-800 bg-black/60 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  <CardPaymentBadge selected={paymentMethod === 'CARD'} />
                </button>
              </div>
            </div>

            {/* Mobile Money Phone Number Input */}
            {(paymentMethod === 'MIXX_BY_YAS' || paymentMethod === 'MOOV_MONEY' || paymentMethod === 'TMONEY' || paymentMethod === 'FLOOZ') && (
              <div className="space-y-2 border border-neutral-800 p-4 bg-black/60 rounded-xl font-mono-code">
                <label className="text-xs font-bold uppercase block text-neutral-200">
                  Numéro de téléphone pour la validation push USSD
                </label>
                <div className="flex border border-neutral-700 bg-neutral-900 rounded-lg overflow-hidden focus-within:border-amber-400">
                  <span className="px-3 py-2 bg-neutral-800 border-r border-neutral-700 font-bold text-xs text-amber-300 flex items-center">
                    +228
                  </span>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="90 00 00 00"
                    className="w-full px-3 py-2 text-xs font-bold font-mono-code text-white bg-transparent focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-neutral-400 flex items-center gap-1.5 mt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>
                    Un pop-up de confirmation PIN sera envoyé directement sur votre ligne Togo{' '}
                    <strong className="text-amber-300">
                      {paymentMethod === 'MIXX_BY_YAS' || paymentMethod === 'TMONEY' ? 'mixx by yas (Togocom)' : 'Moov Africa Flooz'}
                    </strong>
                  </span>
                </p>
              </div>
            )}

            {paymentError && (
              <p role="alert" className="text-xs font-mono-code font-bold text-red-300 border border-red-500/60 bg-red-500/10 p-3 rounded-xl">
                {paymentError}
              </p>
            )}

            {/* Summary Banner */}
            <div className="border-t border-b border-neutral-800 py-3 flex justify-between items-center font-mono-code text-xs text-white">
              <span className="text-neutral-400">Total à débiter:</span>
              <span className="text-lg font-black text-amber-400">{totalPayable.toLocaleString('fr-FR')} FCFA</span>
            </div>

            <div className="pt-2 flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2.5 border border-neutral-700 bg-neutral-900 text-neutral-300 font-mono-code font-bold text-xs uppercase hover:border-amber-400 rounded-xl transition-all"
              >
                Retour
              </button>

              <button
                disabled={isProcessing}
                onClick={handleProcessPayment}
                className="px-8 py-3.5 bg-amber-400 text-black font-mono-code font-black text-xs uppercase tracking-wider hover:bg-amber-300 transition-all rounded-xl shadow-lg shadow-amber-400/20 flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent animate-spin rounded-full"></span>
                    <span>Validation du Paiement...</span>
                  </>
                ) : (
                  <>
                    <span>Payer {totalPayable.toLocaleString('fr-FR')} FCFA</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Success Voucher & Secure Code */}
        {step === 4 && generatedReservation && (
          <TicketCard reservation={generatedReservation} onClose={onClose} />
        )}
      </div>
    </div>
  );
};
