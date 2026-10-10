import React, { useState } from 'react';
import { Station, FuelPriceGlobal } from '../types';
import { StationCard } from './StationCard';
import { FUEL_TYPES } from '../../shared/stock';
import { Gauge } from './Gauge';
import { NearestStationCard } from './NearestStationCard';
import { PricesCard } from './PricesCard';
import { StationSkeleton } from './Skeleton';
import { useFavorites } from '../storage';
import { StationFreshness } from './StationFreshness';
import { enableAlerts, useAlertPermission } from '../alerts';
import { MapPin, ShieldCheck, ArrowRight, Clock, Zap, CheckCircle2, ChevronRight, Phone, Award, Sparkles, Smile, Star, Heart, Fuel, Smartphone } from 'lucide-react';
import heroBg from '../assets/images/gas_station_bg_1785887453945.webp';
import managerBg from '../assets/images/station_manager_happy_1785888750849.webp';
import customerBg from '../assets/images/happy_customer_refuel_1785888766342.webp';

interface HomeViewProps {
  stations: Station[];
  onNavigateMap: () => void;
  onBookStation: (station: Station) => void;
  onViewStation: (station: Station) => void;
  onNavigatePro: () => void;
  globalPrices: FuelPriceGlobal[];
  loading?: boolean; // stations not received from the server yet
  isSignedIn: boolean;
  onOpenAuth: () => void;
}

// Under the favourites: how the visitor hears about fuel coming back or a new price.
const FavoriteAlertsHint: React.FC<{ isSignedIn: boolean; onOpenAuth: () => void }> = ({ isSignedIn, onOpenAuth }) => {
  const permission = useAlertPermission();
  if (!isSignedIn) {
    return (
      <p className="text-xs text-neutral-400">
        <button onClick={onOpenAuth} className="text-amber-300 font-semibold underline">
          Connectez-vous
        </button>{' '}
        pour être prévenu quand une de ces stations retrouve du carburant ou change de prix.
      </p>
    );
  }
  if (permission === 'default') {
    return (
      <button onClick={() => void enableAlerts()} className="text-xs text-amber-300 font-semibold underline text-left">
        Recevoir aussi les alertes sur ce téléphone
      </button>
    );
  }
  return (
    <p className="text-xs text-neutral-400">
      Vous êtes prévenu (cloche en haut{permission === 'granted' ? ' et alertes du téléphone' : ''}) quand une de ces stations retrouve du
      carburant ou change de prix.
    </p>
  );
};

export const HomeView: React.FC<HomeViewProps> = ({
  stations,
  onNavigateMap,
  onBookStation,
  onViewStation,
  onNavigatePro,
  globalPrices,
  loading = false,
  isSignedIn,
  onOpenAuth,
}) => {
  const favoriteIds = useFavorites();
  const favoriteStations = stations.filter((s) => favoriteIds.includes(s.id));
  // Live figures from the stations the API returned.
  const cities = [...new Set(stations.map((s) => s.city))];
  const totalLiters = stations.reduce(
    (sum, s) => sum + FUEL_TYPES.reduce((acc, f) => acc + Math.max(0, s.stock[f]?.availableLiters ?? 0), 0),
    0,
  );
  const averageWait = stations.length
    ? Math.round(stations.reduce((sum, s) => sum + s.queueTimeMinutes, 0) / stations.length)
    : 0;
  const hasStock = (s: Station) => FUEL_TYPES.some((f) => (s.stock[f]?.availableLiters ?? 0) > 0);
  // Three stations of Lomé that have fuel, shortest queue first.
  const featuredStations = [...stations]
    .filter((s) => s.city === 'Lomé' && hasStock(s))
    .sort((a, b) => a.queueTimeMinutes - b.queueTimeMinutes)
    .slice(0, 3);

  return (
    <div className="space-y-16 py-4">
      {/* Hero: what the visitor came for (a station with fuel, now), then today's prices */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Ne faites plus la queue <span className="text-amber-400">pour votre carburant.</span>
          </h1>
          <p className="text-sm sm:text-base text-neutral-300 max-w-2xl leading-relaxed">
            Trouvez une station qui a du stock, réservez vos litres, payez par Mixx by Yas ou Flooz et présentez votre code à la pompe.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
          <div className="lg:col-span-3">
            {loading ? (
              <StationSkeleton />
            ) : (
              <NearestStationCard stations={stations} onBook={onBookStation} onView={onViewStation} />
            )}
          </div>
          <div className="lg:col-span-2 space-y-5">
            <PricesCard prices={globalPrices} loading={loading} />
            {favoriteStations.length > 0 && (
              <section aria-labelledby="favorites-title" className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5 space-y-2">
                <h2 id="favorites-title" className="text-sm font-bold text-neutral-200 flex items-center gap-2">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> Mes stations favorites
                </h2>
                <ul className="divide-y divide-neutral-800 text-sm">
                  {favoriteStations.map((st) => (
                    <li key={st.id} className="flex items-center justify-between gap-3 py-2">
                      <button onClick={() => onViewStation(st)} className="text-left text-neutral-100 font-medium truncate hover:text-amber-300">
                        {st.name}
                        <span className="block text-xs text-neutral-400">{st.queueTimeMinutes} min d'attente</span>
                        <StationFreshness station={st} maxReports={1} className="mt-0.5" />
                      </button>
                      <button
                        onClick={() => onBookStation(st)}
                        className="px-3 py-2 rounded-lg bg-amber-400 text-black font-bold text-sm hover:bg-amber-300 shrink-0"
                      >
                        Réserver
                      </button>
                    </li>
                  ))}
                </ul>
                <FavoriteAlertsHint isSignedIn={isSignedIn} onOpenAuth={onOpenAuth} />
              </section>
            )}
            <button
              onClick={onNavigateMap}
              className="w-full py-3 rounded-xl border border-neutral-700 text-white font-semibold text-sm hover:border-amber-400 flex items-center justify-center gap-2"
            >
              Voir toutes les stations sur la carte <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Togo figures */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-white">
          {[
            { label: 'Stations', value: `${stations.length}`, hint: cities.join(', ') },
            { label: 'Stock à réserver', value: `${totalLiters.toLocaleString('fr-FR')} L`, hint: 'Tous carburants' },
            { label: 'Attente moyenne', value: `${averageWait} min`, hint: 'Déclarée par les stations' },
            { label: 'Ticket', value: 'Code + QR', hint: 'Valable 2 heures' },
          ].map((m) => (
            <div key={m.label} className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 sm:p-4">
              <div className="text-xs text-neutral-400">{m.label}</div>
              <div className="text-xl sm:text-2xl font-extrabold">{loading ? '…' : m.value}</div>
              <div className="text-xs text-neutral-300 truncate">{m.hint}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 4 Steps Section: a journey in the green and gold of the brand, the same in both themes */}
      <section className="theme-fixed bg-brand-900 text-white py-16 sm:py-20 relative overflow-hidden">
        <div aria-hidden="true" className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 relative">
          <div className="space-y-3 max-w-2xl">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
              Comment ça marche
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Votre carburant réservé en 4 étapes
            </h2>
            <p className="text-sm text-brand-100/80 leading-relaxed">
              De la recherche de station jusqu'à la pompe, sans faire la queue.
            </p>
          </div>

          <ol className="relative grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-6">
            {/* The road that links the steps: horizontal on large screens, one piece per step on phones */}
            <span aria-hidden="true" className="hidden md:block absolute top-6 left-[12.5%] right-[12.5%] border-t-2 border-dashed border-amber-400/40" />
            {[
              { icon: MapPin, title: 'Localiser', text: 'Trouvez les stations proches qui ont votre carburant (Super, Gazole, Mélange), avec le niveau de stock en temps réel.' },
              { icon: Fuel, title: 'Réserver', text: 'Choisissez votre volume en litres ou en FCFA. Le carburant est aussitôt mis de côté pour vous à la station.' },
              { icon: Smartphone, title: 'Payer', text: 'Réglez avec Mixx by Yas (ex-TMoney) ou Flooz (Moov Africa). Vous recevez un code unique valable 2 heures.' },
              { icon: CheckCircle2, title: 'Récupérer', text: 'Montrez votre code au pompiste, la pompe est débloquée. Servez-vous et repartez sans attendre !' },
            ].map((step, i) => (
              <li key={step.title} className="reveal relative flex md:flex-col md:items-center md:text-center gap-5 md:gap-4">
                {i < 3 && (
                  <span aria-hidden="true" className="md:hidden absolute left-6 top-12 -bottom-8 border-l-2 border-dashed border-amber-400/40" />
                )}
                <div className="relative z-10 shrink-0 w-12 h-12 rounded-full bg-amber-400 text-black font-display font-extrabold text-xl flex items-center justify-center ring-8 ring-brand-900 shadow-lg shadow-black/20">
                  {i + 1}
                </div>
                <div className="flex-1 rounded-2xl bg-white/5 border border-white/10 p-5 space-y-2 md:w-full">
                  <div className="flex md:justify-center items-center gap-2 text-amber-400">
                    <step.icon className="w-5 h-5" aria-hidden="true" />
                    <span className="text-xs font-bold uppercase tracking-widest">Étape {i + 1}</span>
                  </div>
                  <h3 className="text-xl font-bold tracking-tight">{step.title}</h3>
                  <p className="text-sm text-brand-100/80 leading-relaxed">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Featured Stations Near Lomé */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-mono-code font-bold uppercase text-amber-400 tracking-widest block">
              Stations partenaires en direct
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Stations à Lomé, attente la plus courte
            </h2>
          </div>

          <button
            onClick={onNavigateMap}
            className="px-4 py-2 border border-neutral-700 bg-black text-xs font-bold hover:bg-amber-400 hover:text-black hover:border-amber-400 transition-all flex items-center gap-1.5 self-start sm:self-auto rounded-full text-white"
          >
            <span>Voir toutes les stations</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredStations.map((st) => (
            <StationCard
              key={st.id}
              station={st}
              onBook={onBookStation}
              onViewDetails={onViewStation}
            />
          ))}
        </div>
      </section>

      {/* Happy Customers & Station Managers Photo Gallery Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase text-amber-400 tracking-widest block">
              Service client et accueil
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Des sourires à chaque plein
            </h2>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-400 text-black text-xs font-extrabold rounded-full">
            <Smile className="w-4 h-4" /> Satisfaction garantie
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              img: heroBg,
              alt: 'Station-service moderne à Lomé',
              tag: 'Pompes modernes',
              title: 'Des pompes rapides et connectées',
              text: 'Des stations équipées de jauges précises, reliées en direct à Pleino pour que le stock affiché soit le vrai.',
              who: 'TotalEnergies et Sanol',
              end: (
                <div className="flex text-amber-400" aria-label="5 étoiles sur 5">
                  {[0, 1, 2, 3, 4].map((i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />)}
                </div>
              ),
            },
            {
              img: managerBg,
              alt: 'Gérante de station souriante au Togo',
              tag: 'Gérants et pompistes formés',
              title: 'Un accueil pro et souriant',
              text: '« Nous accueillons chaque conducteur avec plaisir. Valider un code QR prend moins de 10 secondes ! »',
              who: 'Ablavi K., superviseure',
            },
            {
              img: customerBg,
              alt: 'Client satisfait qui fait le plein au Togo',
              tag: 'Clients satisfaits',
              title: 'Faites comme Kofi : réservez votre plein',
              text: '« Je ne perds plus de temps le matin avant d\'aller au bureau. Mon réservoir est plein en un clin d\'œil ! »',
              who: 'Kofi M., conducteur à Lomé',
              onClick: onNavigateMap,
            },
          ].map((card) => (
            <article
              key={card.title}
              onClick={card.onClick}
              className={`reveal group bg-black text-white border border-neutral-800 rounded-2xl overflow-hidden shadow-lg shadow-black/5 hover:border-brand-500/60 transition-colors flex flex-col ${card.onClick ? 'cursor-pointer' : ''}`}
            >
              <div className="relative h-52 overflow-hidden">
                <img
                  src={card.img}
                  alt={card.alt}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-brand-950/60 to-transparent" />
                <span className="absolute bottom-3 left-3 px-2.5 py-1 bg-amber-400 text-black text-[11px] font-bold rounded-full">
                  {card.tag}
                </span>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-extrabold text-white">{card.title}</h3>
                  <p className="text-sm text-neutral-300 leading-relaxed">{card.text}</p>
                </div>
                <div className="pt-3 border-t border-neutral-800 flex items-center justify-between text-xs font-bold text-neutral-400">
                  <span>{card.who}</span>
                  {card.end ?? (card.onClick && (
                    <span className="inline-flex items-center gap-1 text-amber-400">
                      Voir la carte <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Partner Station Call-To-Action (B2B), in the brand green on both themes */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="reveal theme-fixed relative overflow-hidden bg-brand-800 text-white p-8 md:p-12 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div aria-hidden="true" className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-amber-400/15 blur-3xl" />
          <div className="relative space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-amber-400 text-black text-[11px] font-extrabold uppercase rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" /> Espace Pro stations-service
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Vous gérez une station-service au Togo ?
            </h2>
            <p className="text-sm text-brand-100/85 leading-relaxed">
              Devenez station partenaire Pleino. Vendez à l'avance, étalez l'affluence à vos pompes, supprimez les impayés et validez chaque client en quelques secondes grâce au code.
            </p>
          </div>

          <button
            onClick={onNavigatePro}
            className="relative px-7 py-3.5 bg-amber-400 text-black font-extrabold text-sm hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0 rounded-full shadow-lg shadow-black/20 inline-flex items-center gap-2"
          >
            Accéder à l'Espace Pro <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* FAQ Section: questions open one at a time */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-8">
        <div className="text-center">
          <span className="text-xs font-bold uppercase text-amber-400 tracking-widest block">
            Des questions ?
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Foire aux questions
          </h2>
        </div>

        <div className="space-y-3">
          {[
            {
              q: 'Que se passe-t-il si le délai de 2 heures expire ?',
              a: "Si vous ne vous présentez pas à la station avant l'expiration du code (2 h), le ticket expire et les litres retournent à la station. Vous pouvez aussi annuler vous-même un ticket actif depuis « Mes réservations ».",
            },
            {
              q: 'Quels modes de paiement sont acceptés au Togo ?',
              a: 'Pleino accepte Mixx by Yas (ex-TMoney, Togocom), Flooz (Moov Africa) ainsi que les cartes bancaires Visa et Mastercard.',
            },
            {
              q: 'Comment le pompiste valide-t-il ma réservation ?',
              a: "Le pompiste saisit votre code (RNK-XXXX-XX) dans l'Espace Pro Pleino ou scanne votre QR code avec la caméra. Chaque ticket ne peut être servi qu'une fois, pour exactement les litres réservés.",
            },
            {
              q: 'Comment fonctionne le Pass Premium Pleino ?',
              a: "Le Pass Premium supprime les frais de réservation (150 FCFA par ticket). Demandez-le depuis la page Pass Premium : un administrateur Pleino l'active sur votre compte.",
            },
          ].map((item) => (
            <details key={item.q} className="group bg-black border border-neutral-800 rounded-2xl open:border-brand-500/50 transition-colors">
              <summary className="flex items-center justify-between gap-4 p-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <h3 className="font-bold text-white text-sm sm:text-base">{item.q}</h3>
                <span className="shrink-0 w-8 h-8 rounded-full bg-amber-400 text-black flex items-center justify-center transition-transform group-open:rotate-90">
                  <ChevronRight className="w-4 h-4" />
                </span>
              </summary>
              <p className="px-5 pb-5 -mt-1 text-neutral-300 text-sm leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
};
