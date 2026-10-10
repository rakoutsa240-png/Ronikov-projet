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
              <li key={step.title} className="relative flex md:flex-col md:items-center md:text-center gap-5 md:gap-4">
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
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b-2 border-neutral-700/80 pb-4">
          <div>
            <span className="text-xs font-mono-code font-bold uppercase text-amber-400 tracking-widest block">
              Stations partenaires en direct
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-mono-code tracking-tight text-white">
              Stations à Lomé, attente la plus courte
            </h2>
          </div>

          <button
            onClick={onNavigateMap}
            className="px-4 py-2 border border-neutral-700 bg-black/60 backdrop-blur-md font-mono-code text-xs font-bold hover:bg-amber-400 hover:text-black hover:border-amber-400 transition-all flex items-center gap-1.5 self-start sm:self-auto rounded text-white"
          >
            <span>Voir Toutes les Stations sur la Carte</span>
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
        <div className="border-b-2 border-neutral-700/80 pb-4 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-mono-code font-bold uppercase text-amber-400 tracking-widest block">
              Service client & accueil chaleureux
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-mono-code tracking-tight text-white">
              Sourires & satisfaction au quotidien
            </h2>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-400 text-black text-xs font-mono-code font-extrabold border border-amber-300 rounded shadow-lg">
            <Smile className="w-4 h-4" /> 100% Satisfaction Garantie
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: Station Infrastructure */}
          <div className="group bg-black/85 backdrop-blur-xl text-white border border-neutral-800 rounded-xl overflow-hidden shadow-2xl hover:border-amber-400/80 transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between">
            <div className="relative h-56 overflow-hidden">
              <img
                src={heroBg}
                alt="Station Modern Lomé"
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 filter saturate-125"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/90 text-white text-[11px] font-mono-code font-bold uppercase border border-neutral-600 rounded">
                ⚡ Infrastructure Haute Qualité
              </div>
            </div>
            <div className="p-6 space-y-3 font-mono-code flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-white">Pompes Électroniques Rapides</h3>
                <p className="text-xs text-neutral-300 font-sans mt-2 leading-relaxed">
                  Des stations modernes équipées de jauges haute précision connectées en direct avec notre système de réservation.
                </p>
              </div>
              <div className="pt-4 border-t border-neutral-800 flex items-center justify-between text-xs text-amber-400 font-bold">
                <span>TotalEnergies & Sanol</span>
                <div className="flex text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Station Manager */}
          <div className="group bg-black/85 backdrop-blur-xl text-white border border-neutral-800 rounded-xl overflow-hidden shadow-2xl hover:border-emerald-400/80 transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between">
            <div className="relative h-56 overflow-hidden">
              <img
                src={managerBg}
                alt="Gérant de Station Souriant Togo"
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 filter saturate-125"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-3 left-3 px-2.5 py-1 bg-emerald-500 text-black text-[11px] font-mono-code font-extrabold uppercase border border-black rounded">
                😊 Gérants & Pompistes Qualifiés
              </div>
            </div>
            <div className="p-6 space-y-3 font-mono-code flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-white">Un Accueil Pro & Souriant</h3>
                <p className="text-xs text-neutral-300 font-sans mt-2 leading-relaxed">
                  « Nous accueillons chaque conducteur avec enthousiasme. La validation par code QR prend moins de 10 secondes ! »
                </p>
              </div>
              <div className="pt-4 border-t border-neutral-800 flex items-center justify-between text-xs text-emerald-400 font-bold">
                <span>Ablavi K. (Superviseure)</span>
                <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-700 text-[11px] rounded">
                  Service Pro
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Happy Customer */}
          <div
            onClick={onNavigateMap}
            className="group bg-black/85 backdrop-blur-xl text-white border-2 border-neutral-800 rounded-xl overflow-hidden shadow-2xl hover:border-amber-400 transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between cursor-pointer"
          >
            <div className="relative h-56 overflow-hidden">
              <img
                src={customerBg}
                alt="Client Refuel Heureux Togo"
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 filter saturate-125"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-3 left-3 px-2.5 py-1 bg-amber-400 text-black text-[11px] font-mono-code font-extrabold uppercase border border-black rounded shadow">
                🚗 Kofi Mensah & Clients Satisfaits
              </div>
            </div>
            <div className="p-6 space-y-3 font-mono-code flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-white group-hover:text-amber-400 transition-colors">
                  Faire comme Kofi : réserver son plein
                </h3>
                <p className="text-xs text-neutral-300 font-sans mt-2 leading-relaxed">
                  « Plus besoin de perdre mon temps le matin avant d'aller au bureau. Mon réservoir est plein en un clin d'œil ! »
                </p>
              </div>
              <div className="pt-4 border-t border-neutral-800 flex items-center justify-between text-xs text-amber-300 font-bold">
                <span className="underline decoration-amber-400 underline-offset-4">Kofi M. (Conducteur Lomé)</span>
                <span className="px-2 py-0.5 bg-amber-400 text-black font-black text-[11px] rounded shadow">
                  Voir la carte
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partner Station Call-To-Action (B2B) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-black/90 backdrop-blur-xl text-white p-8 md:p-12 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-8 font-mono-code">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-amber-400 text-black text-[11px] font-extrabold uppercase rounded">
              <ShieldCheck className="w-3.5 h-3.5" /> Espace Pro stations-service
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Vous gérez une station-service au Togo ?
            </h2>
            <p className="text-xs sm:text-sm text-neutral-300 font-sans leading-relaxed">
              Devenez station partenaire Pleino. Digitalisez vos ventes, optimisez l'affluence à vos pompes, éliminez les impayés et offrez une expérience fluide à vos clients grâce à notre terminal de validation par code.
            </p>
          </div>

          <button
            onClick={onNavigatePro}
            className="px-8 py-4 bg-amber-400 text-black font-extrabold text-xs tracking-wider hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0 border border-amber-300 rounded shadow-lg shadow-amber-400/20"
          >
            Accéder au Terminal Pro
          </button>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 pb-8">
        <div className="border-b-2 border-neutral-700/80 pb-4">
          <span className="text-xs font-mono-code font-bold uppercase text-amber-400 tracking-widest block">
            Des questions ?
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-mono-code tracking-tight text-white">
            Foire aux questions
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono-code text-xs">
          <div className="p-5 border border-neutral-800 space-y-2 bg-black/80 backdrop-blur-md rounded-xl">
            <h3 className="font-bold text-amber-300 text-sm">
              Que se passe-t-il si le délai de 2 heures expire ?
            </h3>
            <p className="text-neutral-300 font-sans text-xs leading-relaxed">
              Si vous ne vous présentez pas à la station avant l'expiration du code (2h), le ticket expire et les litres retournent à la station. Vous pouvez aussi annuler vous-même un ticket actif depuis « Mes Réservations ».
            </p>
          </div>

          <div className="p-5 border border-neutral-800 space-y-2 bg-black/80 backdrop-blur-md rounded-xl">
            <h3 className="font-bold text-amber-300 text-sm">
              Quels modes de paiement sont acceptés au Togo ?
            </h3>
            <p className="text-neutral-300 font-sans text-xs leading-relaxed">
              Pleino accepte Mixx by Yas (ex-TMoney, Togocom), Flooz (Moov Africa) ainsi que les cartes bancaires Visa et Mastercard.
            </p>
          </div>

          <div className="p-5 border border-neutral-800 space-y-2 bg-black/80 backdrop-blur-md rounded-xl">
            <h3 className="font-bold text-amber-300 text-sm">
              Comment le pompiste valide-t-il ma réservation ?
            </h3>
            <p className="text-neutral-300 font-sans text-xs leading-relaxed">
              Le pompiste saisit votre code (RNK-XXXX-XX) dans l'Espace Pro Pleino ou scanne votre QR Code avec la caméra. Chaque ticket ne peut être servi qu'une fois, pour exactement les litres réservés.
            </p>
          </div>

          <div className="p-5 border border-neutral-800 space-y-2 bg-black/80 backdrop-blur-md rounded-xl">
            <h3 className="font-bold text-amber-300 text-sm">
              Comment fonctionne le Pass Premium Pleino ?
            </h3>
            <p className="text-neutral-300 font-sans text-xs leading-relaxed">
              Le Pass Premium supprime les frais de réservation (150 FCFA par ticket). Demandez-le depuis la page Pass Premium : un administrateur Pleino l'active sur votre compte.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
