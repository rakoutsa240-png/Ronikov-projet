import React, { useEffect, useState } from 'react';
import { Gift, Sparkles } from 'lucide-react';
import { api, ApiError } from '../api';
import { MyVouchers, Voucher } from '../types';
import { VOUCHER_STATUS_LABELS, VOUCHER_STATUS_STYLES } from './VouchersPanel';
import { locale, num, t } from '../i18n';

const formatDate = (iso: string) => new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'long' });

const where = (v: Voucher) =>
  v.validStationName ? t('Valable seulement à {station}', { station: v.validStationName }) : t('Valable dans toutes les stations partenaires');

// The client's fuel vouchers in their profile: typing a contest code, what they have, and how many
// litres are left before the next loyalty voucher.
export const VouchersCard: React.FC = () => {
  const [data, setData] = useState<MyVouchers | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [won, setWon] = useState<Voucher | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .myVouchers()
      .then((mine) => !cancelled && setData(mine))
      .catch((e) => !cancelled && setError(e instanceof ApiError ? e.message : t('Vos bons sont indisponibles pour le moment.')));
    return () => {
      cancelled = true;
    };
  }, []);

  const claim = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setWon(null);
    try {
      const voucher = await api.claimVoucher(code);
      setWon(voucher);
      setCode('');
      setData((d) => d && { ...d, vouchers: [voucher, ...d.vouchers] });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('Serveur Pleino injoignable. Réessayez.'));
    } finally {
      setBusy(false);
    }
  };

  const usable = data?.vouchers.filter((v) => v.status === 'AVAILABLE') ?? [];
  const past = data?.vouchers.filter((v) => v.status !== 'AVAILABLE').slice(0, 5) ?? [];
  const loyalty = data?.loyalty;

  return (
    <section className="p-5 border border-neutral-800 bg-black/85 rounded-2xl space-y-4 font-sans">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-black text-white flex items-center gap-2 font-mono-code">
          <Gift className="w-5 h-5 text-emerald-400" /> {t('Mes bons d’essence')}
        </h2>
        {usable.length > 0 && (
          <span className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300 text-xs font-black">
            {t('{amount} FCFA à utiliser', { amount: num(usable.reduce((sum, v) => sum + v.amountXOF, 0)) })}
          </span>
        )}
      </div>

      <form onSubmit={claim} className="flex flex-col sm:flex-row gap-2">
        <label className="sr-only" htmlFor="voucher-code">
          {t('Code de bon')}
        </label>
        <input
          id="voucher-code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="BON-XXXX-XXXX"
          autoCapitalize="characters"
          autoComplete="off"
          className="flex-1 px-3 py-2.5 bg-neutral-900 border border-neutral-700 rounded-lg text-sm font-mono-code text-white focus:outline-none focus:border-amber-400"
        />
        <button
          type="submit"
          disabled={busy || !code.trim()}
          className="px-5 py-2.5 bg-amber-400 text-black font-black text-xs rounded-lg hover:bg-amber-300 disabled:opacity-50"
        >
          {t('Ajouter mon code')}
        </button>
      </form>
      <p className="text-xs text-neutral-400 -mt-2">{t('Vous avez gagné un code lors d’un concours ? Tapez-le ici.')}</p>

      {error && (
        <p role="alert" className="p-3 border border-red-500/50 bg-red-500/10 rounded-lg text-red-300 text-xs font-bold">
          {error}
        </p>
      )}
      {won && (
        <p role="status" className="p-3 border border-emerald-500/50 bg-emerald-500/10 rounded-lg text-emerald-300 text-xs font-bold">
          {t('Bravo ! Bon de {amount} FCFA ajouté. Choisissez-le à votre prochaine réservation.', { amount: num(won.amountXOF) })}
        </p>
      )}

      {data === null ? (
        !error && <p className="text-xs text-neutral-400">{t('Chargement…')}</p>
      ) : (
        <>
          {usable.length === 0 ? (
            <p className="text-xs text-neutral-400 italic">{t('Aucun bon à utiliser pour le moment.')}</p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {usable.map((v) => (
                <li key={v.id} className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/5 space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xl font-black text-emerald-300 font-mono-code">{num(v.amountXOF)} FCFA</span>
                    <span className="text-[11px] text-neutral-400">{t('jusqu’au {date}', { date: formatDate(v.expiresAt) })}</span>
                  </div>
                  <div className="text-xs text-neutral-200">{where(v)}</div>
                  {v.source === 'LOYALTY' && <div className="text-[11px] text-amber-300 font-bold">{t('Bon fidélité')}</div>}
                  {v.source === 'REFERRAL' && <div className="text-[11px] text-amber-300 font-bold">{t('Bon parrainage')}</div>}
                  {v.label && v.source !== 'LOYALTY' && v.source !== 'REFERRAL' && <div className="text-[11px] text-neutral-400">{v.label}</div>}
                </li>
              ))}
            </ul>
          )}

          {loyalty && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-neutral-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> {t('Fidélité')}
                </span>
                <span className="text-neutral-300">
                  {t('Encore {n} L avant un bon de {amount} FCFA', { n: loyalty.litersToNext, amount: num(loyalty.amountXOF) })}
                </span>
              </div>
              <div
                className="h-2 rounded-full bg-neutral-800 overflow-hidden"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={loyalty.stepLiters}
                aria-valuenow={loyalty.stepLiters - loyalty.litersToNext}
              >
                <div className="h-full bg-brand-500" style={{ width: `${((loyalty.stepLiters - loyalty.litersToNext) / loyalty.stepLiters) * 100}%` }} />
              </div>
              <p className="text-[11px] text-neutral-400">
                {t('Tous les {step} L servis, Pleino vous offre {amount} FCFA.', { step: loyalty.stepLiters, amount: num(loyalty.amountXOF) })}
              </p>
            </div>
          )}

          {past.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-neutral-300 font-bold">{t('Bons utilisés ou expirés')}</summary>
              <ul className="mt-2 space-y-1.5">
                {past.map((v) => (
                  <li key={v.id} className="flex flex-wrap items-center gap-2 text-neutral-400">
                    <span className="font-bold text-neutral-200">{num(v.amountXOF)} FCFA</span>
                    <span className={`px-2 py-0.5 rounded font-bold ${VOUCHER_STATUS_STYLES[v.status]}`}>{t(VOUCHER_STATUS_LABELS[v.status])}</span>
                    {v.usedStationName && <span>{t('à {station}', { station: v.usedStationName })}</span>}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </section>
  );
};
