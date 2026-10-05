import React, { useState } from 'react';
import { Reservation } from '../types';
import { Ticket, Clock, CheckCircle2, AlertOctagon, Printer, Copy, XCircle, MapPin, Sparkles, ShieldCheck, QrCode, Fuel, Maximize2, X } from 'lucide-react';
import { StationBrandLogo, StationBrandType } from './StationBrandLogo';
import { PaymentMethodLabel } from './PaymentLogos';
import { QRCodeImage } from './QRCodeImage';
import { TicketCard } from './TicketCard';

interface HistoryViewProps {
  reservations: Reservation[];
  onCancelReservation: (resId: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  reservations,
  onCancelReservation,
}) => {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'VALIDATED' | 'EXPIRED'>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTicketModal, setActiveTicketModal] = useState<Reservation | null>(null);

  const filteredReservations = reservations.filter((r) => {
    if (filterStatus === 'ALL') return true;
    return r.status === filterStatus;
  });

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const detectBrand = (name: string): StationBrandType => {
    if (/total/i.test(name)) return 'TotalEnergies';
    if (/shell/i.test(name)) return 'Shell';
    if (/sanol/i.test(name)) return 'Sanol';
    if (/cap/i.test(name)) return 'Cap';
    if (/somayaf/i.test(name)) return 'Somayaf';
    return 'TotalEnergies';
  };

  const getBrandTheme = (brandName: string) => {
    if (/total/i.test(brandName)) {
      return {
        cardBorder: 'border-red-500/50 hover:border-red-500',
        topGradient: 'bg-gradient-to-r from-red-600 via-yellow-400 to-blue-600',
        badgeBg: 'bg-red-500/20 text-red-300 border-red-500/40',
        accentText: 'text-red-400',
        codeText: 'text-amber-300',
        brandTag: 'TOTALENERGIES TOGO',
      };
    }
    if (/shell/i.test(brandName)) {
      return {
        cardBorder: 'border-amber-400/50 hover:border-amber-400',
        topGradient: 'bg-gradient-to-r from-amber-400 via-red-600 to-amber-400',
        badgeBg: 'bg-amber-400/20 text-amber-300 border-amber-400/40',
        accentText: 'text-amber-400',
        codeText: 'text-yellow-300',
        brandTag: 'SHELL TOGO',
      };
    }
    if (/sanol/i.test(brandName)) {
      return {
        cardBorder: 'border-emerald-500/50 hover:border-emerald-500',
        topGradient: 'bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400',
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        accentText: 'text-emerald-400',
        codeText: 'text-emerald-300',
        brandTag: 'SANOL TOGO',
      };
    }
    if (/cap/i.test(brandName)) {
      return {
        cardBorder: 'border-blue-500/50 hover:border-blue-500',
        topGradient: 'bg-gradient-to-r from-blue-600 via-sky-400 to-indigo-600',
        badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        accentText: 'text-blue-400',
        codeText: 'text-sky-300',
        brandTag: 'CAP PETROLEUM',
      };
    }
    if (/somayaf/i.test(brandName)) {
      return {
        cardBorder: 'border-purple-500/50 hover:border-purple-500',
        topGradient: 'bg-gradient-to-r from-purple-600 via-fuchsia-500 to-amber-400',
        badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        accentText: 'text-purple-400',
        codeText: 'text-fuchsia-300',
        brandTag: 'SOMAYAF TOGO',
      };
    }
    return {
      cardBorder: 'border-amber-400/50 hover:border-amber-400',
      topGradient: 'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400',
      badgeBg: 'bg-amber-400/20 text-amber-300 border-amber-400/40',
      accentText: 'text-amber-400',
      codeText: 'text-amber-300',
      brandTag: 'STATION AGRÉÉE TOGO',
    };
  };

  const getStatusBadge = (status: Reservation['status']) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400 text-black border border-amber-300 font-mono-code font-black text-xs uppercase rounded-md shadow-md shadow-amber-400/20">
            <Clock className="w-3.5 h-3.5" /> CODE ACTIF (À RÉCUPÉRER)
          </span>
        );
      case 'VALIDATED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono-code font-bold text-xs uppercase rounded-md">
            <CheckCircle2 className="w-3.5 h-3.5" /> CARBURANT SERVI
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/30 font-mono-code font-bold text-xs uppercase rounded-md">
            <AlertOctagon className="w-3.5 h-3.5" /> EXPIRÉ (REMBOURSÉ)
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-800 text-neutral-400 border border-neutral-700 font-mono-code font-bold text-xs uppercase rounded-md">
            <XCircle className="w-3.5 h-3.5" /> ANNULÉ
          </span>
        );
    }
  };

  const partnerBrands: StationBrandType[] = ['TotalEnergies', 'Shell', 'Sanol', 'Cap', 'Somayaf'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-mono-code text-white">
      {/* Top Interactive Partner Stations Brand Bar */}
      <div className="bg-black/90 backdrop-blur-xl border border-neutral-800 rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-400/10 border border-amber-400/30 rounded-xl text-amber-400">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-widest block">
              RESEAU OFFICIEL TOGO
            </span>
            <h2 className="text-sm sm:text-base font-extrabold text-white uppercase tracking-tight">
              INTERAGISSEZ AVEC LES LOGOS OFFICIELS DES STATIONS
            </h2>
          </div>
        </div>

        {/* Row of Interactive Station Logos */}
        <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto py-1 max-w-full">
          {partnerBrands.map((b) => (
            <StationBrandLogo
              key={b}
              brand={b}
              size="md"
              interactive={true}
              showBadge={false}
              className="bg-black/60 p-1.5 border border-neutral-800 rounded-xl hover:border-amber-400 transition-colors"
            />
          ))}
        </div>
      </div>

      {/* Page Header Container */}
      <div className="bg-black/90 backdrop-blur-xl border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="border-b border-neutral-800 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs text-amber-400 font-bold uppercase tracking-widest flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              HISTORIQUE DE VOS TICKET SÉCURISÉS
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold uppercase text-white tracking-tight">
              MES RÉSERVATIONS DE CARBURANT
            </h1>
            <p className="text-xs text-neutral-400 font-sans mt-1">
              Chaque réservation arbore le logo et les couleurs uniques de la station choisie.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex border border-neutral-700 bg-neutral-900 rounded-lg p-1 text-xs font-bold text-neutral-300">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3.5 py-2 rounded-md uppercase transition-all ${
                filterStatus === 'ALL' ? 'bg-amber-400 text-black font-extrabold shadow-md' : 'hover:text-white'
              }`}
            >
              Toutes ({reservations.length})
            </button>
            <button
              onClick={() => setFilterStatus('PENDING')}
              className={`px-3.5 py-2 rounded-md uppercase transition-all ${
                filterStatus === 'PENDING' ? 'bg-amber-400 text-black font-extrabold shadow-md' : 'hover:text-white'
              }`}
            >
              Actives ({reservations.filter((r) => r.status === 'PENDING').length})
            </button>
            <button
              onClick={() => setFilterStatus('VALIDATED')}
              className={`px-3.5 py-2 rounded-md uppercase transition-all ${
                filterStatus === 'VALIDATED' ? 'bg-amber-400 text-black font-extrabold shadow-md' : 'hover:text-white'
              }`}
            >
              Servies ({reservations.filter((r) => r.status === 'VALIDATED').length})
            </button>
          </div>
        </div>

        {/* Reservation List */}
        {filteredReservations.length === 0 ? (
          <div className="p-12 border border-dashed border-neutral-800 rounded-2xl text-center space-y-3 bg-neutral-950/60">
            <Ticket className="w-12 h-12 mx-auto text-neutral-600" />
            <p className="text-base font-bold uppercase text-white">
              Aucune réservation enregistrée dans cette catégorie
            </p>
            <p className="text-xs text-neutral-400 font-sans max-w-md mx-auto">
              Sélectionnez une station partenaire sur la carte de Lomé pour bloquer vos litres de carburant à l'avance.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredReservations.map((res) => {
              const brand = res.stationBrand || detectBrand(res.stationName);
              const theme = getBrandTheme(brand);

              return (
                <div
                  key={res.id}
                  className={`border transition-all p-6 rounded-2xl bg-black/85 backdrop-blur-xl space-y-6 relative overflow-hidden shadow-2xl ${
                    res.status === 'PENDING'
                      ? `${theme.cardBorder}`
                      : 'border-neutral-800/80 opacity-80'
                  }`}
                >
                  {/* Distinct Brand Top Gradient Banner */}
                  <div className={`absolute top-0 left-0 right-0 h-1.5 ${theme.topGradient}`} />

                  {/* Header Row with Brand Logo & Custom Styling */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-neutral-800/80 pb-5">
                    <div className="flex items-start gap-4">
                      {/* Interactive Station Brand Logo */}
                      <StationBrandLogo
                        brand={brand}
                        size="lg"
                        interactive={true}
                        showBadge={true}
                        className="bg-black/90 p-2.5 border border-neutral-700/80 rounded-2xl shadow-xl shrink-0"
                      />

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getStatusBadge(res.status)}
                          <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded border ${theme.badgeBg}`}>
                            {theme.brandTag}
                          </span>
                        </div>

                        <h3 className="text-xl sm:text-2xl font-black uppercase text-white tracking-tight flex items-center gap-2">
                          <span>{res.stationName}</span>
                        </h3>

                        <p className="text-xs text-neutral-300 font-sans flex items-center gap-1.5">
                          <MapPin className={`w-3.5 h-3.5 ${theme.accentText} shrink-0`} />
                          <span>{res.stationAddress}</span>
                        </p>
                      </div>
                    </div>

                    {/* Code Badge Box with Real Scannable QR Code */}
                    <div className="bg-black/95 text-white p-4 border border-neutral-700 rounded-2xl text-center min-w-[240px] shadow-2xl shrink-0 flex flex-col items-center justify-center space-y-2">
                      <span className="text-[10px] text-neutral-400 uppercase tracking-widest block font-bold">
                        CODE SÉCURISÉ POMPISTE
                      </span>
                      <div className={`text-2xl font-black font-mono-code tracking-widest ${theme.codeText}`}>
                        {res.code}
                      </div>

                      {/* Real Scannable QR Code */}
                      <div 
                        onClick={() => setActiveTicketModal(res)} 
                        className="cursor-pointer hover:scale-105 transition-transform p-1 bg-white rounded-xl"
                        title="Cliquer pour ouvrir le ticket et le QR Code grand format"
                      >
                        <QRCodeImage 
                          value={res.qrPayload ?? `RONIKOV-TICKET|CODE:${res.code}|STATION:${res.stationName}|FUEL:${res.fuelLabel}|LITERS:${res.liters}L|AMOUNT:${res.totalAmountXOF}FCFA`} 
                          size={90} 
                        />
                      </div>

                      <button
                        onClick={() => setActiveTicketModal(res)}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center justify-center gap-1 transition-colors"
                      >
                        <Maximize2 className="w-3 h-3 text-amber-400" />
                        <span>Agrandir / Scanner le QR Code</span>
                      </button>
                    </div>
                  </div>

                  {/* Order Details Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs border-b border-neutral-800/80 pb-5">
                    <div className="bg-black/60 p-3.5 rounded-xl border border-neutral-800/80 space-y-1">
                      <span className="text-neutral-400 block text-[10px] uppercase font-bold flex items-center gap-1">
                        <Fuel className="w-3 h-3 text-amber-400" /> CARBURANT :
                      </span>
                      <span className={`font-black text-sm ${theme.accentText}`}>{res.fuelLabel}</span>
                    </div>

                    <div className="bg-black/60 p-3.5 rounded-xl border border-neutral-800/80 space-y-1">
                      <span className="text-neutral-400 block text-[10px] uppercase font-bold">QUANTITÉ RÉSERVÉE :</span>
                      <span className="font-extrabold text-white text-sm">{res.liters} Litres</span>
                    </div>

                    <div className="bg-black/60 p-3.5 rounded-xl border border-neutral-800/80 space-y-1">
                      <span className="text-neutral-400 block text-[10px] uppercase font-bold">MONTANT PAYÉ :</span>
                      <span className="font-extrabold text-emerald-400 text-sm">
                        {res.totalAmountXOF.toLocaleString('fr-FR')} FCFA
                      </span>
                      <div className="mt-1">
                        <PaymentMethodLabel method={res.paymentMethod} showDetails={false} />
                      </div>
                    </div>

                    <div className="bg-black/60 p-3.5 rounded-xl border border-neutral-800/80 space-y-1">
                      <span className="text-neutral-400 block text-[10px] uppercase font-bold">VALIDE JUSQU'À :</span>
                      <span className="font-extrabold text-amber-300 text-sm">
                        {new Date(res.expiresAt).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => copyCode(res.code, res.id)}
                        className="px-4 py-2.5 border border-neutral-700 bg-black/80 rounded-xl font-bold uppercase hover:bg-amber-400 hover:text-black hover:border-amber-400 transition-all flex items-center gap-2 text-white shadow-md"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedId === res.id ? 'Code Copié !' : 'Copier Code'}</span>
                      </button>

                      <button
                        onClick={() => setActiveTicketModal(res)}
                        className="px-4 py-2.5 border border-amber-400/80 bg-amber-400/10 hover:bg-amber-400 hover:text-black rounded-xl font-bold uppercase transition-all flex items-center gap-2 text-amber-300 shadow-md"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Imprimer Reçu / QR Code</span>
                      </button>
                    </div>

                    {res.status === 'PENDING' && (
                      <button
                        onClick={() => onCancelReservation(res.id)}
                        className="px-4 py-2.5 border border-rose-500/40 text-rose-400 bg-rose-500/10 hover:bg-rose-500 hover:text-white rounded-xl font-bold uppercase text-[11px] transition-colors"
                      >
                        Annuler la réservation (Remboursement)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ticket Modal for Viewing & Printing */}
      {activeTicketModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto no-print">
          <div className="bg-neutral-950 border border-neutral-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 text-white relative my-8 shadow-2xl">
            <TicketCard
              reservation={activeTicketModal}
              onClose={() => setActiveTicketModal(null)}
              showCloseButton={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};
