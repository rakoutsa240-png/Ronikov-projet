import React, { useState, useEffect } from 'react';
import { Station, FuelType, PaymentMethod, Reservation } from '../types';
import { Gauge } from './Gauge';
import { MixxByYasBadge, MoovAfricaBadge, CardPaymentBadge, PaymentMethodLabel } from './PaymentLogos';
import { TicketCard } from './TicketCard';
import { X, Check, ShieldCheck, ArrowRight, Printer, Copy, Clock, AlertTriangle, Phone, Smartphone, CreditCard } from 'lucide-react';
import { api, ApiError } from '../api';
import { MAX_LITERS_PER_RESERVATION, SERVICE_FEE_XOF } from '../../shared/reservations';
import { FUEL_LABELS, FUEL_TYPES } from '../../shared/stock';
import { useModal } from '../useModal';
import { loadJSON, saveJSON } from '../storage';

interface ReservationModalProps {
  station: Station | null;
  isOpen: boolean;
  onClose: () => void;
  onCompleteReservation: (reservation: Reservation) => void;
  isUserPremium?: boolean;
  defaultPaymentPhone?: string; // +228XXXXXXXX
}

const MIN_LITERS = 2;

// The last booking's choices, so a regular customer books again in two taps.
const LAST_BOOKING_KEY = 'ronikov.lastBooking';
interface LastBooking {
  fuel?: FuelType;
  inputMode?: 'liters' | 'fcfa';
  liters?: number;
  fcfaAmount?: number;
  paymentMethod?: PaymentMethod;
  phone?: string;
}
const FCFA_PRESETS = [2000, 5000, 10000, 20000];

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
  const [literInput, setLiters] = useState<number>(10);
  const [inputMode, setInputMode] = useState<'liters' | 'fcfa'>('liters');
  const [fcfaAmount, setFcfaAmount] = useState<number>(7000);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MIXX_BY_YAS');
  const [phoneNumber, setPhoneNumber] = useState<string>(formatLocalPhone(defaultPaymentPhone));
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [generatedReservation, setGeneratedReservation] = useState<Reservation | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  useModal(isOpen, onClose);

  // Each opening starts a fresh booking, on the first fuel the station still has.
  useEffect(() => {
    if (!isOpen) return;
    const last = loadJSON<LastBooking>(LAST_BOOKING_KEY, {});
    setStep(1);
    setPaymentError(null);
    setGeneratedReservation(null);
    setPhoneNumber(last.phone ?? formatLocalPhone(defaultPaymentPhone));
    setPaymentMethod(last.paymentMethod ?? 'MIXX_BY_YAS');
    // Drivers usually ask for an amount ("5 000 de super"), so FCFA comes first.
    setInputMode(last.inputMode ?? 'fcfa');
    setLiters(last.liters ?? 10);
    setFcfaAmount(last.fcfaAmount ?? 5000);
    const hasFuel = (f: FuelType) => (station?.stock[f]?.availableLiters ?? 0) >= MIN_LITERS;
    const firstAvailable = last.fuel && hasFuel(last.fuel) ? last.fuel : FUEL_TYPES.find(hasFuel);
    if (firstAvailable) setSelectedFuel(firstAvailable);
  }, [isOpen, station?.id, defaultPaymentPhone]);

  const fuelStock = station?.stock[selectedFuel];
  const pricePerLiter = fuelStock?.pricePerLiter || 700;
  // A ticket holds at most 100 L, and never more than the station can still book.
  const maxLiters = Math.min(MAX_LITERS_PER_RESERVATION, Math.floor(fuelStock?.availableLiters ?? 0));
  const canBook = maxLiters >= MIN_LITERS;
  useEffect(() => {
    if (canBook && literInput > maxLiters) setLiters(maxLiters);
    if (canBook && literInput < MIN_LITERS) setLiters(MIN_LITERS);
  }, [literInput, maxLiters, canBook]);

  // Litres booked: typed in litres, or worked out from the amount in FCFA (rounded to the litre).
  const liters =
    inputMode === 'liters'
      ? literInput
      : Math.min(Math.max(Math.round(fcfaAmount / pricePerLiter), MIN_LITERS), Math.max(MIN_LITERS, maxLiters));
  // Switching unit keeps the same quantity.
  const switchInputMode = (mode: 'liters' | 'fcfa') => {
    if (mode === inputMode) return;
    if (mode === 'liters') setLiters(liters);
    else setFcfaAmount(liters * pricePerLiter);
    setInputMode(mode);
  };

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
      saveJSON(LAST_BOOKING_KEY, {
        fuel: selectedFuel,
        inputMode,
        liters: literInput,
        fcfaAmount,
        paymentMethod,
        phone: phoneNumber,
      } satisfies LastBooking);
      setStep(4);
    } catch (e) {
      setPaymentError(e instanceof ApiError ? e.message : 'Serveur Pleino injoignable. Réessayez.');
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
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div role="dialog" aria-modal="true" className="bg-neutral-950/95 backdrop-blur-2xl border border-neutral-800 rounded-2xl max-w-xl w-full p-6 sm:p-8 space-y-6 text-white relative my-8 shadow-2xl shadow-black/90 overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="absolute top-4 right-4 p-2 border border-neutral-700 hover:border-amber-400 bg-neutral-900/90 text-neutral-300 hover:text-white rounded-xl transition-all z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header & Step Indicator */}
        <div className="border-b border-neutral-800 pb-4 space-y-3 relative z-10 pr-12">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 bg-amber-400 text-black text-[11px] font-mono-code font-black uppercase rounded shadow">
              Réservation Pleino
            </span>
            <span className="text-xs font-mono-code text-neutral-400 font-bold">
              {station.name} ({station.district})
            </span>
          </div>

          {/* Stepper: choice, payment, ticket */}
          <ol className="pt-2 grid grid-cols-3 gap-2 text-xs font-semibold">
            {['Carburant', 'Paiement', 'Ticket'].map((label, i) => {
              const stage = step === 1 ? 0 : step === 4 ? 2 : 1;
              return (
                <li key={label} aria-current={i === stage ? 'step' : undefined} className="space-y-1.5">
                  <div className={`h-1.5 rounded-full ${i <= stage ? 'bg-amber-400' : 'bg-neutral-800'}`} />
                  <span className={i === stage ? 'text-amber-300' : 'text-neutral-400'}>
                    {i + 1}. {label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        {/* STEP 1: Fuel & Quantity Selection */}
        {step === 1 && (
          <div className="space-y-5 relative z-10">
            {/* Fuel Type Selector */}
            <div className="space-y-2">
              <label className="text-xs font-mono-code font-bold text-neutral-200 block">
                1. Sélectionner le type de carburant
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {(['SUPER', 'GAZOLE', 'MELANGE', 'KEROSENE'] as FuelType[]).map((f) => {
                  const stock = station.stock[f];
                  const isAvailable = stock && stock.availableLiters >= MIN_LITERS;
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
                      <div className={`text-sm font-bold ${isSelected ? 'text-amber-300' : 'text-white'}`}>{fuelLabels[f]}</div>
                      <div className="text-sm font-semibold text-amber-400 mt-0.5">{stock?.pricePerLiter} FCFA/L</div>
                      <div className="text-xs mt-0.5 text-neutral-300">
                        {isAvailable ? `${stock.availableLiters.toLocaleString('fr-FR')} L dispo` : 'Rupture de stock'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantity Selector: Liters or FCFA Amount */}
            <div className="space-y-3 pt-3 border-t border-neutral-800">
              <div className="flex justify-between items-center">
                <label className="text-xs font-mono-code font-bold text-neutral-200">
                  2. Quantité à réserver
                </label>
                <div className="flex border border-neutral-800 rounded-lg overflow-hidden font-mono-code text-xs bg-black">
                  <button
                    onClick={() => switchInputMode('fcfa')}
                    className={`px-3 py-2 text-sm font-bold transition-all ${
                      inputMode === 'fcfa' ? 'bg-amber-400 text-black' : 'bg-neutral-900 text-neutral-400 hover:text-white'
                    }`}
                  >
                    En FCFA
                  </button>
                  <button
                    onClick={() => switchInputMode('liters')}
                    className={`px-3 py-2 text-sm font-bold transition-all ${
                      inputMode === 'liters' ? 'bg-amber-400 text-black' : 'bg-neutral-900 text-neutral-400 hover:text-white'
                    }`}
                  >
                    En litres
                  </button>
                </div>
              </div>

              {/* Slider & Presets */}
              {inputMode === 'liters' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border border-neutral-800 p-4 bg-black/60 rounded-xl font-mono-code">
                    <span className="text-xs text-neutral-400 font-bold">Volume choisi :</span>
                    <span className="text-2xl font-black text-amber-300">{liters} Litres</span>
                  </div>

                  <input
                    type="range"
                    min={MIN_LITERS}
                    max={Math.max(MIN_LITERS, maxLiters)}
                    value={liters}
                    onChange={(e) => setLiters(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />

                  {/* Preset Liters Buttons */}
                  <div className="grid grid-cols-4 gap-2 text-xs font-mono-code">
                    {[5, 10, 20, maxLiters].map((preset, i) => (
                      <button
                        key={i}
                        disabled={preset > maxLiters || preset < MIN_LITERS}
                        onClick={() => setLiters(preset)}
                        className={`py-3 text-sm border font-bold rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                          liters === preset ? 'border-amber-400 bg-amber-400 text-black shadow' : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        {i === 3 ? `Max ${preset} L` : `${preset} L`}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border border-neutral-800 p-4 bg-black/60 rounded-xl font-mono-code">
                    <span className="text-xs text-neutral-400 font-bold">Montant souhaité :</span>
                    <span className="text-2xl font-black text-amber-300">{fcfaAmount.toLocaleString('fr-FR')} FCFA</span>
                  </div>

                  <input
                    type="range"
                    min={MIN_LITERS * pricePerLiter}
                    max={Math.max(MIN_LITERS, maxLiters) * pricePerLiter}
                    step="500"
                    value={fcfaAmount}
                    onChange={(e) => setFcfaAmount(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />

                  {/* Preset Amounts Buttons */}
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-xs font-mono-code">
                    {[...FCFA_PRESETS, maxLiters * pricePerLiter].map((preset, i) => (
                      <button
                        key={i}
                        disabled={preset > maxLiters * pricePerLiter || preset < MIN_LITERS * pricePerLiter}
                        onClick={() => setFcfaAmount(preset)}
                        className={`py-3 text-sm border font-bold rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                          fcfaAmount === preset ? 'border-amber-400 bg-amber-400 text-black shadow' : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        {i === FCFA_PRESETS.length ? `Max (${maxLiters} L)` : preset.toLocaleString('fr-FR')}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {inputMode === 'fcfa' && (
              <p className="text-xs font-mono-code text-neutral-400">
                Soit {liters} litres, arrondi au litre : {(liters * pricePerLiter).toLocaleString('fr-FR')} FCFA de carburant.
              </p>
            )}

            {!canBook && (
              <p role="alert" className="text-xs font-mono-code font-bold text-red-300 border border-red-500/60 bg-red-500/10 p-3 rounded-xl">
                Cette station n'a plus de carburant à réserver pour le moment.
              </p>
            )}

            <div className="pt-4 border-t border-neutral-800 flex justify-end">
              <button
                disabled={!canBook}
                onClick={() => setStep(3)}
                className="w-full sm:w-auto justify-center px-6 py-3.5 bg-amber-400 text-black font-mono-code font-black text-xs tracking-wider hover:bg-amber-300 transition-all rounded-xl shadow-lg shadow-amber-400/20 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Continuer vers le paiement</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Payment Method Selection */}
        {step === 3 && (
          <div className="space-y-5 relative z-10">
            {/* Short summary of the order */}
            <div className="border border-neutral-800 bg-black/60 rounded-xl p-4 text-sm space-y-1.5">
              <div className="flex justify-between gap-3">
                <span className="text-neutral-300">{liters} L de {fuelLabels[selectedFuel]}</span>
                <span className="font-semibold text-white">{totalFuelCost.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-neutral-300">Frais de réservation</span>
                <span className="font-semibold text-white">{isUserPremium ? 'Offerts (Premium)' : `${serviceFee} FCFA`}</span>
              </div>
              <p className="text-xs text-neutral-400 pt-1">
                Carburant gardé pour vous 2 heures à {station.name}. Sans passage, le ticket expire et les litres retournent à la station.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-mono-code font-bold text-neutral-200 block">
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
                <label className="text-xs font-bold block text-neutral-200">
                  Numéro de téléphone pour la validation push USSD
                </label>
                <div className="flex border border-neutral-700 bg-neutral-900 rounded-lg overflow-hidden focus-within:border-amber-400">
                  <span className="px-3 py-2 bg-neutral-800 border-r border-neutral-700 font-bold text-xs text-amber-300 flex items-center">
                    +228
                  </span>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="90 00 00 00"
                    className="w-full px-3 py-2 text-xs font-bold font-mono-code text-white bg-transparent focus:outline-none"
                  />
                </div>
                <p className="text-xs text-neutral-400 flex items-center gap-1.5 mt-1">
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
                onClick={() => setStep(1)}
                className="px-4 py-2.5 border border-neutral-700 bg-neutral-900 text-neutral-300 font-mono-code font-bold text-xs hover:border-amber-400 rounded-xl transition-all"
              >
                Retour
              </button>

              <button
                disabled={isProcessing}
                onClick={handleProcessPayment}
                className="px-8 py-3.5 bg-amber-400 text-black font-mono-code font-black text-xs tracking-wider hover:bg-amber-300 transition-all rounded-xl shadow-lg shadow-amber-400/20 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
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
