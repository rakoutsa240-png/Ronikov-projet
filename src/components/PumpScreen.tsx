import React from 'react';
import { createPortal } from 'react-dom';
import { Check, Navigation, X } from 'lucide-react';
import { Reservation } from '../types';
import { QRCodeImage } from './QRCodeImage';
import { useModal } from '../useModal';
import { useNow, useWakeLock } from '../storage';
import { directionsUrl, LatLng } from '../geo';
import { timeLeft } from '../time';
import { RESERVATION_VALIDITY_MINUTES } from '../../shared/reservations';
import { num, t } from '../i18n';

export const ticketQrPayload = (r: Reservation) =>
  r.qrPayload ??
  `PLEINO-TICKET|CODE:${r.code}|STATION:${r.stationName}|FUEL:${r.fuelLabel}|LITERS:${r.liters}L|AMOUNT:${r.totalAmountXOF}FCFA|EXPIRES:${r.expiresAt}`;

interface PumpScreenProps {
  reservation: Reservation;
  onClose: () => void;
  // The station's position, for the "Itinéraire" button.
  station?: LatLng;
  // Shown for an active ticket: cancelling gives the litres back to the station.
  onCancel?: () => void;
}

// Full-screen ticket for the pump, in the brand green. The QR code sits on a white card, as big as the
// screen allows, so the attendant's camera reads it first time even in sunlight. The screen stays on
// while it is shown, and the ticket is kept on the phone so it opens without network.
export const PumpScreen: React.FC<PumpScreenProps> = ({ reservation, onClose, station, onCancel }) => {
  useModal(true, onClose);
  useWakeLock(true);
  const now = useNow();
  // Leaves room for the details above and the buttons under the card.
  const size = Math.max(180, Math.min(window.innerWidth - 96, window.innerHeight - 440, 300));
  const msLeft = new Date(reservation.expiresAt).getTime() - now;
  const active = reservation.status === 'PENDING' && msLeft > 0;
  const validityShare = Math.max(0, Math.min(1, msLeft / (RESERVATION_VALIDITY_MINUTES * 60_000)));

  // Rendered at the root of the page: inside the booking window (which blurs what is behind it) a
  // "fixed" element would only cover that window, not the whole screen.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('Ticket à présenter au pompiste')}
      className="theme-fixed fixed inset-0 z-[100] bg-brand-800 text-white no-print overflow-y-auto"
    >
      <div className="min-h-full max-w-md mx-auto flex flex-col gap-4 px-5 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-3">
          <button onClick={onClose} aria-label={t('Fermer')} className="p-2.5 -ml-2 rounded-full hover:bg-white/10">
            <X className="w-6 h-6" />
          </button>
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 text-xs font-bold text-brand-100">
            {t('Enregistré sur ce téléphone')} <Check className="w-3.5 h-3.5" />
          </span>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-semibold text-brand-100">{t('Montrez ce code au pompiste')}</p>
          <h2 className="font-display text-3xl font-extrabold leading-tight">
            {t('{n} L de {fuel}', { n: reservation.liters, fuel: t(reservation.fuelLabel) })}
          </h2>
          <p className="text-sm text-brand-100">
            {reservation.stationName} • {t('payé {amount} FCFA', { amount: num(reservation.totalAmountXOF) })}
          </p>
        </div>

        <div className="bg-white text-ticket-ink rounded-3xl p-5 flex flex-col items-center gap-4 shadow-xl shadow-black/20">
          <QRCodeImage value={ticketQrPayload(reservation)} size={size} className="border-0 shadow-none p-0" />
          <div className="w-full border-t-2 border-dashed border-ticket-rule" />
          <div className="font-code text-3xl font-bold">{reservation.code}</div>
          <p className="text-xs font-medium text-ticket-muted -mt-2">{t('Le code est enregistré sur ce téléphone')}</p>
        </div>

        {active ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-brand-100">{t('Valable encore')}</span>
              <span className="font-display font-extrabold">{timeLeft(reservation.expiresAt, now)}</span>
            </div>
            <div className="h-2 rounded-full bg-white/15 overflow-hidden" aria-hidden="true">
              <div className="h-full rounded-full bg-amber-400" style={{ width: `${validityShare * 100}%` }} />
            </div>
          </div>
        ) : (
          <p className="text-sm font-semibold text-brand-100 text-center">
            {reservation.status === 'PENDING' ? t('Ce ticket a expiré.') : t('Ce ticket a déjà été utilisé ou annulé.')}
          </p>
        )}

        {(station || (active && onCancel)) && (
          <div className="grid grid-cols-2 gap-3 mt-auto pt-2">
            {station && (
              <a
                href={directionsUrl(station)}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center justify-center gap-2 h-[50px] rounded-2xl border-2 border-white/40 font-bold text-sm hover:bg-white/10 ${
                  active && onCancel ? '' : 'col-span-2'
                }`}
              >
                <Navigation className="w-4 h-4" /> {t('Itinéraire')}
              </a>
            )}
            {active && onCancel && (
              <button
                onClick={onCancel}
                className={`h-[50px] rounded-2xl border-2 border-white/40 font-bold text-sm hover:bg-white/10 ${station ? '' : 'col-span-2'}`}
              >
                {t('Annuler')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
