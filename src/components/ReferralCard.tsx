import React, { useEffect, useState } from 'react';
import { Check, Copy, Share2, Users } from 'lucide-react';
import { api, ApiError } from '../api';
import { MyReferral } from '../types';
import { num, t } from '../i18n';

// The address a friend opens: it fills the code in the sign-up form for them.
export const referralLink = (code: string) => `${window.location.origin}/?parrain=${encodeURIComponent(code)}`;

// "Invitez vos amis": the client's referral code, a button to share it, and what it has brought so far.
export const ReferralCard: React.FC = () => {
  const [data, setData] = useState<MyReferral | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .myReferral()
      .then((mine) => !cancelled && setData(mine))
      .catch((e) => !cancelled && setError(e instanceof ApiError ? e.message : t('Le parrainage est indisponible pour le moment.')));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="text-xs text-neutral-400 font-sans">{error}</p>;
  if (!data) return null;

  const amount = num(data.amountXOF);
  const message = t('Je réserve mon carburant avec Pleino, sans faire la queue. Crée ton compte avec mon code {code} : après ton premier plein, on reçoit chacun un bon d’essence de {amount} FCFA.', { code: data.code, amount });
  const link = referralLink(data.code);

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Pleino', text: message, url: link });
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${message} ${link}`)}`, '_blank', 'noopener');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${message} ${link}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Some phones refuse the clipboard: the code stays on screen to be copied by hand.
    }
  };

  return (
    <section className="p-5 border border-neutral-800 bg-black/85 rounded-2xl space-y-4 font-sans">
      <h2 className="text-lg font-black text-white flex items-center gap-2 font-mono-code">
        <Users className="w-5 h-5 text-emerald-400" /> {t('Invitez vos amis')}
      </h2>
      <p className="text-sm text-neutral-300">
        {t('Quand un ami crée son compte avec votre code et fait son premier plein, vous recevez chacun un bon d’essence de {amount} FCFA.', { amount })}
      </p>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 px-4 py-3 bg-neutral-900 border border-dashed border-emerald-500/60 rounded-xl text-center">
          <span className="block text-[11px] text-neutral-400 font-bold">{t('Votre code')}</span>
          <span className="text-2xl font-black text-white font-mono-code">{data.code}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={share}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-3 bg-amber-400 hover:bg-amber-300 text-black font-black text-sm rounded-xl"
          >
            <Share2 className="w-4 h-4" /> {t('Partager')}
          </button>
          <button
            onClick={copy}
            aria-label={t('Copier le message')}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 border border-neutral-700 hover:border-amber-400 text-white font-bold text-sm rounded-xl"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span className="hidden sm:inline">{copied ? t('Copié !') : t('Copier')}</span>
          </button>
        </div>
      </div>
      <p className="text-xs text-neutral-400">
        {data.invited === 0
          ? t('Aucun ami inscrit avec votre code pour le moment.')
          : t('{invited} ami(s) inscrit(s), {rewarded} bon(s) gagné(s).', { invited: data.invited, rewarded: Math.min(data.rewarded, data.maxRewards) })}{' '}
        {t('Jusqu’à {max} amis récompensés.', { max: data.maxRewards })}
      </p>
    </section>
  );
};
