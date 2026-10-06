import React, { useState } from 'react';
import { Reservation } from '../types';
import { QRCodeImage } from './QRCodeImage';
import { PumpScreen, ticketQrPayload } from './PumpScreen';
import { PaymentMethodLabel } from './PaymentLogos';
import { Check, Copy, Printer, Clock, MapPin, Fuel, Maximize2, X, ShieldCheck } from 'lucide-react';

interface TicketCardProps {
  reservation: Reservation;
  onClose?: () => void;
  showCloseButton?: boolean;
}

export const TicketCard: React.FC<TicketCardProps> = ({
  reservation,
  onClose,
  showCloseButton = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [showFullQR, setShowFullQR] = useState(false);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  // The API signs the QR content so an edited screenshot is refused at the pump.
  const qrPayload = ticketQrPayload(reservation);

  return (
    <div className="space-y-6 relative">
      {showFullQR && <PumpScreen reservation={reservation} onClose={() => setShowFullQR(false)} />}

      {/* PRINTABLE RECEIPT CONTAINER (Targeted by @media print) */}
      <div id="printable-receipt" className="printable-receipt space-y-6 font-mono-code">
        {/* Banner */}
        <div className="bg-amber-400 text-black p-4 rounded-2xl text-center space-y-1 shadow-lg shadow-amber-400/20 relative">
          {showCloseButton && onClose && (
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 bg-black/10 hover:bg-black/20 text-black rounded-lg transition-colors no-print"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-black text-amber-300 text-[11px] font-bold uppercase rounded">
            <Check className="w-3.5 h-3.5 text-amber-400" /> Paiement confirmé & stock réservé
          </div>
          <h2 className="text-xl font-black tracking-tight text-black">
            Ticket de carburant RONIKOV
          </h2>
          <p className="text-xs text-black/80 font-medium font-sans">
            Présentez ce code ou scannez le QR Code directement au guichet/pompiste.
          </p>
        </div>

        {/* SECURE TICKET BOX */}
        <div className="border-2 border-amber-400/60 p-6 bg-black/90 text-center space-y-5 rounded-2xl shadow-2xl relative overflow-hidden">
          {/* Main Code Box */}
          <div>
            <span className="text-xs text-neutral-400 uppercase tracking-widest block font-bold">
              Code sécurisé unique pompiste
            </span>
            <div className="text-3xl sm:text-4xl font-black tracking-widest text-amber-300 my-2 py-3 bg-neutral-950 border border-neutral-800 rounded-xl select-all shadow-inner font-code">
              {reservation.code}
            </div>
          </div>

          {/* REAL SCANNABLE QR CODE DISPLAY */}
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="relative group cursor-pointer" onClick={() => setShowFullQR(true)}>
              <QRCodeImage value={qrPayload} size={170} />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center text-white text-xs font-bold gap-1 no-print">
                <Maximize2 className="w-4 h-4 text-amber-400" /> Agrandir
              </div>
            </div>

            <button
              onClick={() => setShowFullQR(true)}
              className="w-full sm:w-auto px-5 py-3 bg-amber-400 text-black text-sm font-extrabold rounded-xl hover:bg-amber-300 flex items-center justify-center gap-2 no-print"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Montrer à la pompe (plein écran)</span>
            </button>
          </div>

          {/* Detailed Info Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs border-t border-neutral-800 pt-4 text-left text-neutral-200">
            <div>
              <span className="text-neutral-400 block text-[11px] uppercase font-bold">Station :</span>
              <span className="font-bold text-white text-sm">{reservation.stationName}</span>
            </div>
            <div>
              <span className="text-neutral-400 block text-[11px] uppercase font-bold">Carburant :</span>
              <span className="font-bold text-white text-sm">
                {reservation.liters}L ({reservation.fuelLabel})
              </span>
            </div>
            <div>
              <span className="text-neutral-400 block text-[11px] uppercase font-bold">Montant payé :</span>
              <span className="font-bold text-amber-400 text-sm">
                {reservation.totalAmountXOF.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
            <div>
              <span className="text-neutral-400 block text-[11px] uppercase font-bold">Mode paiement :</span>
              <div className="mt-0.5">
                <PaymentMethodLabel method={reservation.paymentMethod} />
              </div>
            </div>
            <div className="col-span-2 border-t border-neutral-800/80 pt-2 flex items-center justify-between text-xs">
              <span className="text-neutral-400">Valide jusqu'à :</span>
              <span className="font-bold text-amber-300 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(reservation.expiresAt).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                (120 min)
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls (Hidden on Print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 no-print">
          <div className="flex gap-2">
            <button
              onClick={() => copyCode(reservation.code)}
              className="px-4 py-2.5 border border-neutral-700 bg-neutral-900 text-white text-xs font-bold hover:border-amber-400 rounded-xl flex items-center gap-2 transition-all shadow-md"
            >
              <Copy className="w-4 h-4 text-amber-400" />
              <span>{copied ? 'Code Copié !' : 'Copier Code'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2.5 border border-neutral-700 bg-neutral-900 text-white text-xs font-bold hover:border-amber-400 rounded-xl flex items-center gap-2 transition-all shadow-md"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Imprimer Ticket</span>
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-amber-400 text-black font-black text-xs hover:bg-amber-300 rounded-xl shadow-lg shadow-amber-400/20 transition-all"
            >
              Fermer
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
