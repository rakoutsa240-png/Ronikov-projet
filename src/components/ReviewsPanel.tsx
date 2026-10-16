import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, MessageSquareHeart, ThumbsDown } from 'lucide-react';
import { api, ApiError } from '../api';
import { LOW_RATING } from '../../shared/reviews';
import { ReviewsSummary, StationReview } from '../types';
import { Stars } from './StarRating';
import { Avatar } from './Avatar';

interface ReviewsPanelProps {
  stationId?: string; // one station (Espace Pro); every station when left out (admin)
  canHide?: boolean; // admins hide abusive reviews
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

const isLow = (r: StationReview) => r.stationRating <= LOW_RATING || (r.attendantRating !== null && r.attendantRating <= LOW_RATING);

// What clients said after being served: the marks of each attendant, then every review, newest first.
export const ReviewsPanel: React.FC<ReviewsPanelProps> = ({ stationId, canHide = false }) => {
  const [data, setData] = useState<ReviewsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [onlyLow, setOnlyLow] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    (stationId ? api.stationReviews(stationId) : api.allReviews())
      .then((summary) => !cancelled && setData(summary))
      .catch((e) => !cancelled && setError(e instanceof ApiError ? e.message : 'Avis indisponibles pour le moment.'));
    return () => {
      cancelled = true;
    };
  }, [stationId]);

  const toggleHidden = async (review: StationReview) => {
    if (!review.isHidden && !window.confirm('Masquer cet avis ? Il ne comptera plus dans les notes et le gérant ne le verra plus.')) return;
    setBusy(review.id);
    setError(null);
    try {
      const updated = await api.hideReview(review.id, !review.isHidden);
      setData((d) => d && { ...d, reviews: d.reviews.map((r) => (r.id === updated.id ? updated : r)) });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Action impossible, réessayez.');
    } finally {
      setBusy(null);
    }
  };

  const shown = (data?.reviews ?? []).filter((r) => !onlyLow || isLow(r));

  return (
    <section className="p-6 border border-neutral-800 bg-black/85 backdrop-blur-xl rounded-2xl shadow-2xl space-y-5">
      <div className="border-b border-neutral-800 pb-4">
        <span className="text-xs text-amber-400 font-bold uppercase block tracking-widest flex items-center gap-1.5">
          <MessageSquareHeart className="w-3.5 h-3.5" /> Ce que disent les clients
        </span>
        <h2 className="text-2xl font-black text-white tracking-tight">Avis clients</h2>
        <p className="text-xs text-neutral-400 font-sans mt-1">
          Seuls les clients servis avec un ticket Pleino peuvent noter, une fois par ticket.{' '}
          {canHide
            ? 'Masquez un avis abusif (insultes, numéro de téléphone…) : il ne compte plus nulle part.'
            : 'Les notes des pompistes et les commentaires ne sont visibles que par vous et l’équipe Pleino.'}
        </p>
      </div>

      {error && (
        <p role="alert" className="p-3 border border-red-500/50 bg-red-500/10 rounded-lg text-red-300 text-xs font-bold">
          {error}
        </p>
      )}

      {data === null ? (
        !error && <p className="text-xs text-neutral-400">Chargement...</p>
      ) : data.reviews.length === 0 ? (
        <p className="text-xs text-neutral-400 italic text-center py-2">Aucun avis pour l'instant.</p>
      ) : (
        <>
          {data.attendants.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-black text-white">Note des pompistes</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {data.attendants.map((a) => (
                  <li
                    key={a.attendantId}
                    className={`p-3 rounded-xl border bg-black/60 flex items-center justify-between gap-3 ${
                      a.average <= LOW_RATING ? 'border-rose-500/60' : 'border-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={a.attendantName} photoUrl={a.attendantPhotoUrl} className="w-9 h-9 rounded-full text-sm" />
                      <div>
                        <div className="font-black text-white">{a.attendantName}</div>
                        <div className="text-neutral-400">
                          {a.count} avis
                          {a.lowCount > 0 && <span className="text-rose-300 font-bold"> • {a.lowCount} mauvais</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Stars value={a.average} />
                      <div className="font-black text-amber-300 tabular-nums">{a.average.toLocaleString('fr-FR')} / 5</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-black text-white">Derniers avis</h3>
            <label className="inline-flex items-center gap-2 text-xs font-bold text-neutral-300">
              <input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} className="accent-amber-400" />
              Mauvais avis seulement
            </label>
          </div>

          <ul className="space-y-2.5 text-xs">
            {shown.map((r) => (
              <li
                key={r.id}
                className={`p-3.5 rounded-xl border bg-black/60 space-y-2 ${isLow(r) ? 'border-rose-500/50' : 'border-neutral-800'} ${
                  r.isHidden ? 'opacity-60' : ''
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-bold text-white">
                    {r.clientName}
                    <span className="font-normal text-neutral-400">
                      {' '}
                      • {formatDate(r.createdAt)} • {r.liters} L {r.fuelLabel}
                      {!stationId && ` • ${r.stationName}`}
                    </span>
                  </div>
                  {isLow(r) && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 font-bold">
                      <ThumbsDown className="w-3 h-3" /> Mauvais avis
                    </span>
                  )}
                  {r.isHidden && <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-bold">Masqué</span>}
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-neutral-300">
                  <span className="inline-flex items-center gap-1.5">
                    Station <Stars value={r.stationRating} />
                  </span>
                  {r.attendantRating !== null && (
                    <span className="inline-flex items-center gap-1.5">
                      {r.attendantName ?? 'Compte supprimé'} <Stars value={r.attendantRating} />
                    </span>
                  )}
                </div>
                {r.comment && <p className="text-sm text-neutral-100 font-sans">« {r.comment} »</p>}
                {canHide && (
                  <button
                    onClick={() => toggleHidden(r)}
                    disabled={busy === r.id}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 underline hover:text-amber-200 disabled:opacity-60"
                  >
                    {r.isHidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {r.isHidden ? 'Réafficher' : 'Masquer cet avis'}
                  </button>
                )}
              </li>
            ))}
            {shown.length === 0 && <li className="text-neutral-400 italic text-center py-2">Aucun mauvais avis.</li>}
          </ul>
        </>
      )}
    </section>
  );
};
