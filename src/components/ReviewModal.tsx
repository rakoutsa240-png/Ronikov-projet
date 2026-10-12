import React, { useEffect, useState } from 'react';
import { CheckCircle2, MessageSquareHeart, X } from 'lucide-react';
import { api, ApiError } from '../api';
import { REVIEW_COMMENT_MAX } from '../../shared/reviews';
import { Reservation, TicketReview } from '../types';
import { useModal } from '../useModal';
import { StarInput } from './StarRating';

interface ReviewModalProps {
  reservation: Reservation | null; // null when closed
  onClose: () => void;
  onReviewed: (reservationId: string, review: TicketReview) => void;
}

// After the pump: the client marks the station and the person who served them, and can say why.
export const ReviewModal: React.FC<ReviewModalProps> = ({ reservation, onClose, onReviewed }) => {
  useModal(reservation !== null, onClose);
  const [stationRating, setStationRating] = useState<number | null>(null);
  const [attendantRating, setAttendantRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setStationRating(null);
    setAttendantRating(null);
    setComment('');
    setError(null);
    setDone(false);
  }, [reservation?.id]);

  if (!reservation) return null;
  const servedBy = reservation.servedBy;
  const lowMark = (stationRating ?? 5) <= 2 || (attendantRating ?? 5) <= 2;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationRating) {
      setError('Choisissez une note pour la station.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      const review = await api.reviewTicket(reservation.id, {
        stationRating,
        attendantRating: servedBy ? attendantRating : null,
        comment: comment.trim() || undefined,
      });
      onReviewed(reservation.id, review);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Serveur Pleino injoignable. Réessayez.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-neutral-950 border border-neutral-700 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-4 text-white max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="review-title" className="text-lg font-extrabold flex items-center gap-2">
              <MessageSquareHeart className="w-5 h-5 text-amber-400" /> Donner mon avis
            </h2>
            <p className="text-sm text-neutral-400">
              {reservation.stationName} • {reservation.liters} L {reservation.fuelLabel}
            </p>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="p-2 rounded-lg border border-neutral-700 hover:border-amber-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="space-y-4">
            <p role="status" className="flex items-start gap-2 text-sm text-emerald-300">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              {lowMark
                ? 'Merci. Le gérant de la station est prévenu et l’équipe Pleino peut voir votre avis.'
                : 'Merci pour votre avis ! Il aide les autres clients à choisir leur station.'}
            </p>
            <button onClick={onClose} className="w-full py-3 rounded-xl bg-amber-400 text-black font-bold">
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={send} className="space-y-4">
            <StarInput label="La station (propreté, attente, service)" value={stationRating} onChange={setStationRating} disabled={sending} />
            {servedBy && (
              <StarInput
                label={`${servedBy}, qui vous a servi (accueil, politesse, honnêteté)`}
                value={attendantRating}
                onChange={setAttendantRating}
                disabled={sending}
              />
            )}
            <label className="block space-y-1.5">
              <span className="text-sm font-bold text-neutral-200">
                Un commentaire <span className="font-normal text-neutral-400">(facultatif)</span>
              </span>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={REVIEW_COMMENT_MAX}
                rows={3}
                disabled={sending}
                placeholder={lowMark ? 'Que s’est-il passé ? Ex. : pompiste impoli, litres manquants…' : 'Ce qui vous a plu ou déplu'}
                className="w-full p-3 border border-neutral-700 bg-black/80 text-white text-sm rounded-xl focus:border-amber-400 focus:outline-none"
              />
            </label>
            <p className="text-xs text-neutral-400">
              La note de la station est publique. Votre commentaire et la note de {servedBy ?? 'la personne qui vous a servi'} ne sont lus
              que par le gérant de la station et l’équipe Pleino.
            </p>
            {error && (
              <p role="alert" className="text-sm text-red-300">
                {error}
              </p>
            )}
            <button type="submit" disabled={sending} className="w-full py-3 rounded-xl bg-amber-400 text-black font-black disabled:opacity-60">
              {sending ? 'Envoi…' : 'Envoyer mon avis'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
