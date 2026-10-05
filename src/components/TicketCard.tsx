import React, { useState } from 'react';
import { Reservation } from '../types';
import { QRCodeImage } from './QRCodeImage';
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
  const qrPayload = reservation.qrPayload ?? `RONIKOV-TICKET|CODE:${reservation.code}|STATION:${reservation.stationName}|FUEL:${reservation.fuelLabel}|LITERS:${reservation.liters}L|AMOUNT:${reservation.totalAmountXOF}FCFA|EXPIRES:${reservation.expiresAt}`;

  return (
    <div className="space-y-6 relative">
      {/* Fullscreen QR Modal for Easy Scanning at Station */}
      {showFullQR && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 no-print">
          <div className="bg-neutral-900 border border-neutral-700 rounded-3xl p-8 max-w-sm w-full text-center space-y-6 relative shadow-2xl">
            <button
              onClick={() => setShowFullQR(false)}
              className="absolute top-4 right-4 p-2 bg-neutral-800 text-neutral-300 hover:text-white rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="px-3 py-1 bg-amber-400 text-black text-[11px] font-black uppercase rounded-full">
                CODE QR SCANNER POMPISTE
              </span>
              <h3 className="text-xl font-black text-white uppercase mt-2 font-mono-code">
                {reservation.code}
              </h3>
              <p className="text-xs text-neutral-400 font-sans mt-1">
                Présentez cet écran directement au pompiste de la station {reservation.stationName}.
              </p>
            </div>

            <div className="flex justify-center p-4 bg-white rounded-2xl border-4 border-amber-400 shadow-xl">
              <QRCodeImage value={qrPayload} size={240} />
            </div>

            <div className="text-xs font-mono-code text-amber-300 font-bold bg-black/50 p-3 rounded-xl border border-neutral-800">
              {reservation.liters}L de {reservation.fuelLabel} • {reservation.totalAmountXOF.toLocaleString('fr-FR')} FCFA
            </div>

            <button
              onClick={() => setShowFullQR(false)}
              className="w-full py-3 bg-neutral-800 text-white font-bold text-xs uppercase rounded-xl hover:bg-neutral-700 transition-colors"
            >
              Fermer le plein écran
            </button>
          </div>
        </div>
      )}

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

          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-black text-amber-300 text-[10px] font-bold uppercase rounded">
            <Check className="w-3.5 h-3.5 text-amber-400" /> PAIEMENT CONFIRMÉ & STOCK RÉSERVÉ
          </div>
          <h2 className="text-xl font-black tracking-tight uppercase text-black">
            TICKET DE CARBURANT RONIKOV
          </h2>
          <p className="text-xs text-black/80 font-medium font-sans">
            Présentez ce code ou scannez le QR Code directement au guichet/pompiste.
          </p>
        </div>

        {/* SECURE TICKET BOX */}
        <div className="border-2 border-amber-400/60 p-6 bg-black/90 text-center space-y-5 rounded-2xl shadow-2xl relative overflow-hidden">
          {/* Main Code Box */}
          <div>
            <span className="text-[11px] text-neutral-400 uppercase tracking-widest block font-bold">
              CODE SÉCURISÉ UNIQUE POMPISTE
            </span>
            <div className="text-3xl sm:text-4xl font-black tracking-widest text-amber-300 my-2 py-3 bg-neutral-950 border border-neutral-800 rounded-xl select-all shadow-inner font-mono-code">
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
              className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 transition-colors no-print"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Cliquer pour agrandir le QR Code (Scanner)</span>
            </button>
          </div>

          {/* Detailed Info Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs border-t border-neutral-800 pt-4 text-left text-neutral-200">
            <div>
              <span className="text-neutral-400 block text-[10px] uppercase font-bold">STATION :</span>
              <span className="font-bold text-white text-sm">{reservation.stationName}</span>
            </div>
            <div>
              <span className="text-neutral-400 block text-[10px] uppercase font-bold">CARBURANT :</span>
              <span className="font-bold text-white text-sm">
                {reservation.liters}L ({reservation.fuelLabel})
              </span>
            </div>
            <div>
              <span className="text-neutral-400 block text-[10px] uppercase font-bold">MONTANT PAYÉ :</span>
              <span className="font-bold text-amber-400 text-sm">
                {reservation.totalAmountXOF.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
            <div>
              <span className="text-neutral-400 block text-[10px] uppercase font-bold">MODE PAIEMENT :</span>
              <div className="mt-0.5">
                <PaymentMethodLabel method={reservation.paymentMethod} />
              </div>
            </div>
            <div className="col-span-2 border-t border-neutral-800/80 pt-2 flex items-center justify-between text-[11px]">
              <span className="text-neutral-400">VALIDE JUSQU'À :</span>
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
              className="px-4 py-2.5 border border-neutral-700 bg-neutral-900 text-white text-xs font-bold uppercase hover:border-amber-400 rounded-xl flex items-center gap-2 transition-all shadow-md"
            >
              <Copy className="w-4 h-4 text-amber-400" />
              <span>{copied ? 'Code Copié !' : 'Copier Code'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2.5 border border-neutral-700 bg-neutral-900 text-white text-xs font-bold uppercase hover:border-amber-400 rounded-xl flex items-center gap-2 transition-all shadow-md"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Imprimer Ticket</span>
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-amber-400 text-black font-black text-xs uppercase hover:bg-amber-300 rounded-xl shadow-lg shadow-amber-400/20 transition-all"
            >
              Fermer
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
