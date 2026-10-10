import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Check, Star, Zap, Clock, Smartphone, Sparkles, ArrowRight, CheckCircle2, ShieldAlert, Award } from 'lucide-react';
import { StationBrandLogo, StationBrandType } from './StationBrandLogo';
import { SERVICE_FEE_XOF } from '../../shared/reservations';

interface PremiumViewProps {
  isPremium: boolean;
  // Sends an activation request to the admins; resolves to the message to show (null when sign-in opened instead).
  onRequestPremium: () => Promise<{ ok: boolean; message: string } | null>;
}

export const PremiumView: React.FC<PremiumViewProps> = ({
  isPremium,
  onRequestPremium,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [subscribedMessage, setSubscribedMessage] = useState<{ ok: boolean; message: string } | null>(null);
  const [isSending, setIsSending] = useState(false);
  // On a phone the answer appears below the plans: bring it into view.
  const messageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (subscribedMessage) messageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [subscribedMessage]);

  const handleSubscribe = async () => {
    if (isSending) return;
    setIsSending(true);
    try {
      const result = await onRequestPremium();
      if (result) setSubscribedMessage(result);
    } finally {
      setIsSending(false);
    }
  };

  const partnerBrands: StationBrandType[] = ['TotalEnergies', 'Shell', 'Sanol', 'Cap', 'Somayaf'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-mono-code text-white">
      {/* Top Banner Card matching dark background */}
      <div className="bg-black/90 backdrop-blur-xl border border-neutral-800 rounded-2xl p-6 sm:p-10 shadow-2xl relative overflow-hidden space-y-6">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 border-b border-neutral-800/80 pb-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400 text-black text-xs font-black rounded-md shadow-md shadow-amber-400/20">
              <Star className="w-3.5 h-3.5 fill-black" /> Abonnement privilège Togo
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
              Pass prioritaire <span className="text-amber-400">Pleino Premium</span>
            </h1>

            <p className="text-xs sm:text-sm text-neutral-300 font-sans max-w-3xl leading-relaxed">
              Garantissez votre accès au carburant même en période de forte tension ou de pénurie nationale. Profitez de la file prioritaire dans les stations du réseau et de zéro frais de réservation.
            </p>
          </div>

          {isPremium && (
            <div className="p-4 border border-emerald-500/50 bg-emerald-500/10 text-emerald-300 font-extrabold text-xs rounded-xl inline-flex items-center gap-2 shrink-0 shadow-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Pass prioritaire actif
            </div>
          )}
        </div>

        {/* Network Stations Interactive Logo Strip */}
        <div className="space-y-3 relative z-10 pt-2">
          <div className="text-[11px] uppercase font-bold text-amber-400 tracking-widest flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Accès express valable sur toutes les enseignes partenaires du Togo</span>
          </div>

          <div className="flex items-center gap-4 overflow-x-auto py-2">
            {partnerBrands.map((brand) => (
              <div
                key={brand}
                className="bg-black/60 border border-neutral-800 p-2 rounded-xl flex items-center gap-2.5 shrink-0 hover:border-amber-400 transition-colors"
              >
                <StationBrandLogo brand={brand} size="sm" interactive={true} showBadge={false} />
                <span className="text-xs font-extrabold text-neutral-200">{brand}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Subscription Plans Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        {/* Monthly Plan Card */}
        <div
          onClick={() => setSelectedPlan('monthly')}
          className={`p-8 border rounded-2xl transition-all cursor-pointer space-y-6 bg-black/85 backdrop-blur-xl flex flex-col justify-between shadow-2xl relative ${
            selectedPlan === 'monthly'
              ? 'border-amber-400 ring-2 ring-amber-400/30 bg-amber-400/5'
              : 'border-neutral-800 hover:border-neutral-700'
          }`}
        >
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <span className="text-xs font-bold text-neutral-400">Forfait mensuel</span>
              <span className="px-2.5 py-0.5 bg-neutral-800 border border-neutral-700 text-neutral-300 text-[11px] font-bold uppercase rounded">
                Sans engagement
              </span>
            </div>

            <div className="text-4xl font-black text-amber-300 font-mono-code tracking-tight">
              2 500 FCFA <span className="text-xs text-neutral-400 font-normal">/ mois</span>
            </div>

            <p className="text-xs text-neutral-300 font-sans leading-relaxed">
              Idéal pour les automobilistes, zémidjans et livreurs effectuant des déplacements quotidiens à Lomé et en région.
            </p>

            <ul className="space-y-2 text-xs text-neutral-300 pt-2 font-sans">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" /> Zéro frais de réservation sur chaque commande
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" /> File express coupe-file en station
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" /> Notifications de vos tickets dans l'application
              </li>
            </ul>
          </div>

          <button
            onClick={handleSubscribe}
            disabled={isPremium || isSending}
            className={`w-full py-3.5 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-black tracking-wider transition-all rounded-xl border shadow-lg ${
              selectedPlan === 'monthly'
                ? 'bg-amber-400 text-black border-amber-300 hover:bg-amber-300 shadow-amber-400/20'
                : 'bg-neutral-900 text-white border-neutral-700 hover:border-neutral-500'
            }`}
          >
            {isPremium ? 'Pass déjà actif sur votre compte' : isSending ? 'Envoi de la demande…' : "Demander le Pass mensuel (2 500 FCFA)"}
          </button>
        </div>

        {/* Yearly Plan Card */}
        <div
          onClick={() => setSelectedPlan('yearly')}
          className={`p-8 border rounded-2xl transition-all cursor-pointer space-y-6 bg-black/85 backdrop-blur-xl flex flex-col justify-between shadow-2xl relative ${
            selectedPlan === 'yearly'
              ? 'border-amber-400 ring-2 ring-amber-400/30 bg-amber-400/5'
              : 'border-neutral-800 hover:border-neutral-700'
          }`}
        >
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <span className="text-xs font-bold text-amber-400">Forfait annuel</span>
              <span className="px-2.5 py-0.5 bg-amber-400 text-black text-[11px] font-black uppercase rounded shadow">
                2 Mois offerts
              </span>
            </div>

            <div className="text-4xl font-black text-amber-300 font-mono-code tracking-tight">
              20 000 FCFA <span className="text-xs text-neutral-400 font-normal">/ an</span>
            </div>

            <p className="text-xs text-neutral-300 font-sans leading-relaxed">
              Économisez 5 000 FCFA par an et profitez de la garantie absolue Pleino en toutes saisons sans interruption.
            </p>

            <ul className="space-y-2 text-xs text-neutral-300 pt-2 font-sans">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" /> Tous les avantages du forfait mensuel
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" /> Réservation prioritaire garantie en période de pénurie
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" /> Ligne d'assistance prioritaire dédiée 24h/24
              </li>
            </ul>
          </div>

          <button
            onClick={handleSubscribe}
            disabled={isPremium || isSending}
            className={`w-full py-3.5 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-black tracking-wider transition-all rounded-xl border shadow-lg ${
              selectedPlan === 'yearly'
                ? 'bg-amber-400 text-black border-amber-300 hover:bg-amber-300 shadow-amber-400/20'
                : 'bg-neutral-900 text-white border-neutral-700 hover:border-neutral-500'
            }`}
          >
            {isPremium ? 'Pass déjà actif sur votre compte' : isSending ? 'Envoi de la demande…' : "Demander le Pass annuel (20 000 FCFA)"}
          </button>
        </div>
      </div>

      {subscribedMessage && (
        <div
          ref={messageRef}
          role={subscribedMessage.ok ? 'status' : 'alert'}
          className={`p-4 border text-xs font-bold text-center rounded-xl animate-fadeIn ${
            subscribedMessage.ok
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
              : 'bg-red-500/20 border-red-500/50 text-red-300'
          }`}
        >
          {subscribedMessage.message}
        </div>
      )}

      {/* Comparison Table with Dark Glass Theme */}
      <div className="border border-neutral-800 p-6 sm:p-8 bg-black/85 backdrop-blur-xl rounded-2xl space-y-6 shadow-2xl">
        <div className="border-b border-neutral-800 pb-4">
          <span className="text-xs text-amber-400 font-bold uppercase block tracking-widest">Comparatif officiel</span>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Tableau comparatif des avantages
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono-code border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900/90 text-amber-300 font-extrabold">
                <th className="p-3.5">Fonctionnalité / Avantage</th>
                <th className="p-3.5 text-neutral-400">Compte Standard</th>
                <th className="p-3.5 text-amber-400 font-black">Pass Premium Pleino</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80 text-neutral-300">
              <tr className="hover:bg-neutral-900/50 transition-colors">
                <td className="p-3.5 font-bold text-white">Frais de réservation par commande</td>
                <td className="p-3.5 text-neutral-400">{SERVICE_FEE_XOF} FCFA</td>
                <td className="p-3.5 font-black text-emerald-400">0 FCFA (gratuit)</td>
              </tr>
              <tr className="hover:bg-neutral-900/50 transition-colors">
                <td className="p-3.5 font-bold text-white">Accès à la file prioritaire en station</td>
                <td className="p-3.5 text-neutral-400">Non</td>
                <td className="p-3.5 font-black text-amber-300">OUI (Accès Express Coupe-File)</td>
              </tr>
              <tr className="hover:bg-neutral-900/50 transition-colors">
                <td className="p-3.5 font-bold text-white">Réservation prioritaire en pénurie</td>
                <td className="p-3.5 text-neutral-400">Quota standard</td>
                <td className="p-3.5 font-black text-amber-300">OUI (Quota Réservé Garanti)</td>
              </tr>
              <tr className="hover:bg-neutral-900/50 transition-colors">
                <td className="p-3.5 font-bold text-white">Assistance client téléphonique 24h/24</td>
                <td className="p-3.5 text-neutral-400">Standard</td>
                <td className="p-3.5 font-black text-amber-300">Ligne Prioritaire Dédiée</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
