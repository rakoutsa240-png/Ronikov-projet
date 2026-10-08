import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Reservation } from '../types';
import { QRCodeImage } from './QRCodeImage';
import { useModal } from '../useModal';
import { useWakeLock } from '../storage';

export const ticketQrPayload = (r: Reservation) =>
  r.qrPayload ??
  `RONIKOV-TICKET|CODE:${r.code}|STATION:${r.stationName}|FUEL:${r.fuelLabel}|LITERS:${r.liters}L|AMOUNT:${r.totalAmountXOF}FCFA|EXPIRES:${r.expiresAt}`;

// Full-screen ticket for the pump: white background and the biggest QR code the screen allows, so the
// attendant's camera reads it first time even in sunlight. The screen stays on while it is shown.
export const PumpScreen: React.FC<{ reservation: Reservation; onClose: () => void }> = ({ reservation, onClose }) => {
  useModal(true, onClose);
  useWakeLock(true);
  // Leaves room for the code and the details under the QR code.
  const size = Math.max(200, Math.min(window.innerWidth - 48, window.innerHeight - 300, 420));

  // Rendered at the root of the page: inside the booking window (which blurs what is behind it) a
  // "fixed" element would only cover that window, not the whole screen.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ticket à présenter au pompiste"
      className="theme-fixed fixed inset-0 z-[100] bg-white text-black flex flex-col items-center justify-center gap-4 p-6 no-print overflow-y-auto"
    >
      <button
        onClick={onClose}
        aria-label="Fermer"
        className="absolute top-4 right-4 p-3 rounded-full bg-neutral-100 hover:bg-neutral-200"
      >
        <X className="w-6 h-6" />
      </button>
      <p className="text-base font-semibold text-neutral-700 text-center">Présentez cet écran au pompiste</p>
      <QRCodeImage value={ticketQrPayload(reservation)} size={size} className="border-0 shadow-none p-0" />
      <div className="font-code text-3xl sm:text-4xl font-bold tracking-widest">{reservation.code}</div>
      <div className="text-lg font-semibold text-center">
        {reservation.liters} L de {reservation.fuelLabel}
        <span className="block text-base font-normal text-neutral-700">
          {reservation.stationName} • valable jusqu'à{' '}
          {new Date(reservation.expiresAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>,
    document.body,
  );
};
