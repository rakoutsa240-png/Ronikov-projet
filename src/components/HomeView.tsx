import React, { useState } from 'react';
import { Station } from '../types';
import { StationCard } from './StationCard';
import { FUEL_TYPES } from '../../shared/stock';
import { Gauge } from './Gauge';
import { InteractiveHeadline } from './InteractiveHeadline';
import { MapPin, ShieldCheck, ArrowRight, Clock, Zap, CheckCircle2, ChevronRight, Phone, Award, Sparkles, Smile, Star, Heart } from 'lucide-react';
import heroBg from '../assets/images/gas_station_bg_1785887453945.webp';
import managerBg from '../assets/images/station_manager_happy_1785888750849.webp';
import customerBg from '../assets/images/happy_customer_refuel_1785888766342.webp';

interface HomeViewProps {
  stations: Station[];
  onNavigateMap: () => void;
  onBookStation: (station: Station) => void;
  onViewStation: (station: Station) => void;
  onNavigatePro: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  stations,
  onNavigateMap,
  onBookStation,
  onViewStation,
  onNavigatePro,
}) => {
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
      {/* Dynamic Hero Banner with Background Image */}
      <section className="relative w-full overflow-hidden border-b-2 border-black bg-black text-white">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src={heroBg}
            alt="Station Service Togo RONIKOV"
            className="w-full h-full object-cover object-center opacity-35 scale-105 filter saturate-125"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-8">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 bg-white text-black text-xs font-mono-code font-extrabold uppercase tracking-wider border-2 border-white shadow-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
            <Sparkles className="w-3.5 h-3.5 text-black" />
            <span>PLATEFORME NATIONALE DE CARBURANT — TOGO</span>
          </div>

          <InteractiveHeadline />

          <p className="text-base sm:text-lg text-neutral-200 max-w-2xl font-sans leading-relaxed drop-shadow-sm font-medium">
            Localisez les stations-service disposant de stock réel à Lomé et dans tout le Togo, réservez vos litres, payez en Mixx by Yas ou Flooz, et récupérez votre carburant immédiatement via code sécurisé.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-4 font-mono-code">
            <button
              onClick={onNavigateMap}
              className="px-8 py-4 bg-white text-black font-extrabold text-xs uppercase tracking-wider border-2 border-white hover:bg-neutral-100 transition-all transform hover:-translate-y-0.5 flex items-center gap-3 shadow-xl"
            >
              <span>Trouver du Carburant Près de Moi</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onNavigatePro}
              className="px-8 py-4 bg-black/80 backdrop-blur-md text-white font-bold text-xs uppercase tracking-wider border-2 border-white hover:bg-white hover:text-black transition-all shadow-lg"
            >
              Espace Station-Service (Pro)
            </button>
          </div>

          {/* Live Togo Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-black/90 backdrop-blur-md text-white font-mono-code border-2 border-white/20 mt-12">
            <div className="space-y-1 border-r border-neutral-800 pr-4">
              <div className="text-[10px] text-neutral-400 uppercase font-bold">STATIONS ACTIVES</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white">{stations.length} STATIONS</div>
              <div className="text-[11px] text-neutral-300">{cities.join(', ')}</div>
            </div>
            <div className="space-y-1 md:border-r border-neutral-800 pr-4">
              <div className="text-[10px] text-neutral-400 uppercase font-bold">STOCK DISPONIBLE</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white">{totalLiters.toLocaleString('fr-FR')} L</div>
              <div className="text-[11px] text-neutral-300">Tous carburants, à réserver</div>
            </div>
            <div className="space-y-1 border-r border-neutral-800 pr-4">
              <div className="text-[10px] text-neutral-400 uppercase font-bold">ATTENTE MOYENNE</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white">{averageWait} MIN</div>
              <div className="text-[11px] text-neutral-300">Déclarée par les stations</div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] text-neutral-400 uppercase font-bold">TICKET SÉCURISÉ</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white">CODE + QR</div>
              <div className="text-[11px] text-neutral-300">Valable 2 heures, servi une fois</div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Steps Section */}
      <section className="bg-neutral-950 text-white py-16 border-t border-b border-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="space-y-2 border-b border-neutral-800 pb-6">
            <span className="text-xs font-mono-code font-bold text-neutral-400 uppercase tracking-widest">
              FONCTIONNEMENT RONIKOV
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono-code uppercase">
              RÉSERVER VOTRE CARBURANT EN 4 ÉTAPES SIMPLES
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 font-mono-code">
            {/* Step 1 */}
            <div className="p-6 border border-neutral-800 bg-black space-y-4 relative">
              <div className="w-10 h-10 bg-white text-black font-extrabold text-lg flex items-center justify-center border border-white">
                01
              </div>
              <h3 className="text-lg font-bold uppercase tracking-tight">1. LOCALISER</h3>
              <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                Recherchez les stations partenaires à proximité disposant du carburant souhaité (Super, Gazole, Mélange) avec jauges de stock en temps réel.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 border border-neutral-800 bg-black space-y-4 relative">
              <div className="w-10 h-10 bg-white text-black font-extrabold text-lg flex items-center justify-center border border-white">
                02
              </div>
              <h3 className="text-lg font-bold uppercase tracking-tight">2. RÉSERVER</h3>
              <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                Choisissez votre volume exact (litres ou montant en FCFA). Le carburant est immédiatement bloqué pour vous à la station.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 border border-neutral-800 bg-black space-y-4 relative">
              <div className="w-10 h-10 bg-white text-black font-extrabold text-lg flex items-center justify-center border border-white">
                03
              </div>
              <h3 className="text-lg font-bold uppercase tracking-tight">3. PAYER</h3>
              <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                Réglez via Mixx by Yas (ex-TMoney) ou Flooz (Moov Africa). Vous recevez un code sécurisé unique valide 2 heures.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-6 border border-neutral-800 bg-black space-y-4 relative">
              <div className="w-10 h-10 bg-white text-black font-extrabold text-lg flex items-center justify-center border border-white">
                04
              </div>
              <h3 className="text-lg font-bold uppercase tracking-tight">4. RÉCUPÉRER</h3>
              <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                Présentez votre code au pompiste. La pompe est débloquée instantanément. Servez-vous et repartez sans faire la queue !
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Stations Near Lomé */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b-2 border-neutral-700/80 pb-4">
          <div>
            <span className="text-xs font-mono-code font-bold uppercase text-amber-400 tracking-widest block">
              STATIONS PARTENAIRES EN DIRECT
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold uppercase font-mono-code tracking-tight text-white">
              STATIONS À LOMÉ, ATTENTE LA PLUS COURTE
            </h2>
          </div>

          <button
            onClick={onNavigateMap}
            className="px-4 py-2 border border-neutral-700 bg-black/60 backdrop-blur-md font-mono-code text-xs font-bold uppercase hover:bg-amber-400 hover:text-black hover:border-amber-400 transition-all flex items-center gap-1.5 self-start sm:self-auto rounded text-white"
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
              SERVICE CLIENT & ACCUEIL CHALEUREUX
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold uppercase font-mono-code tracking-tight text-white">
              SOURIRES & SATISFACTION AU QUOTIDIEN
            </h2>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-400 text-black text-xs font-mono-code font-extrabold uppercase border border-amber-300 rounded shadow-lg">
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
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 filter saturate-125"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/90 text-white text-[10px] font-mono-code font-bold uppercase border border-neutral-600 rounded">
                ⚡ Infrastructure Haute Qualité
              </div>
            </div>
            <div className="p-6 space-y-3 font-mono-code flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-extrabold uppercase text-white">Pompes Électroniques Rapides</h3>
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
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 filter saturate-125"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-3 left-3 px-2.5 py-1 bg-emerald-500 text-black text-[10px] font-mono-code font-extrabold uppercase border border-black rounded">
                😊 Gérants & Pompistes Qualifiés
              </div>
            </div>
            <div className="p-6 space-y-3 font-mono-code flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-extrabold uppercase text-white">Un Accueil Pro & Souriant</h3>
                <p className="text-xs text-neutral-300 font-sans mt-2 leading-relaxed">
                  « Nous accueillons chaque conducteur avec enthousiasme. La validation par code QR prend moins de 10 secondes ! »
                </p>
              </div>
              <div className="pt-4 border-t border-neutral-800 flex items-center justify-between text-xs text-emerald-400 font-bold">
                <span>Ablavi K. (Superviseure)</span>
                <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-700 text-[10px] rounded">
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
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 filter saturate-125"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-3 left-3 px-2.5 py-1 bg-amber-400 text-black text-[10px] font-mono-code font-extrabold uppercase border border-black rounded shadow">
                🚗 Kofi Mensah & Clients Satisfaits
              </div>
            </div>
            <div className="p-6 space-y-3 font-mono-code flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-extrabold uppercase text-white group-hover:text-amber-400 transition-colors">
                  Faire comme Kofi : réserver son plein
                </h3>
                <p className="text-xs text-neutral-300 font-sans mt-2 leading-relaxed">
                  « Plus besoin de perdre mon temps le matin avant d'aller au bureau. Mon réservoir est plein en un clin d'œil ! »
                </p>
              </div>
              <div className="pt-4 border-t border-neutral-800 flex items-center justify-between text-xs text-amber-300 font-bold">
                <span className="underline decoration-amber-400 underline-offset-4">Kofi M. (Conducteur Lomé)</span>
                <span className="px-2 py-0.5 bg-amber-400 text-black font-black text-[10px] rounded shadow">
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
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-amber-400 text-black text-[10px] font-extrabold uppercase rounded">
              <ShieldCheck className="w-3.5 h-3.5" /> ESPACE PRO STATIONS-SERVICE
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tight text-white">
              VOUS GÉREZ UNE STATION-SERVICE AU TOGO ?
            </h2>
            <p className="text-xs sm:text-sm text-neutral-300 font-sans leading-relaxed">
              Devenez station partenaire RONIKOV. Digitalisez vos ventes, optimisez l'affluence à vos pompes, éliminez les impayés et offrez une expérience fluide à vos clients grâce à notre terminal de validation par code.
            </p>
          </div>

          <button
            onClick={onNavigatePro}
            className="px-8 py-4 bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0 border border-amber-300 rounded shadow-lg shadow-amber-400/20"
          >
            Accéder au Terminal Pro
          </button>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 pb-8">
        <div className="border-b-2 border-neutral-700/80 pb-4">
          <span className="text-xs font-mono-code font-bold uppercase text-amber-400 tracking-widest block">
            DES QUESTIONS ?
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold uppercase font-mono-code tracking-tight text-white">
            FOIRE AUX QUESTIONS
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono-code text-xs">
          <div className="p-5 border border-neutral-800 space-y-2 bg-black/80 backdrop-blur-md rounded-xl">
            <h3 className="font-bold uppercase text-amber-300 text-sm">
              Que se passe-t-il si le délai de 2 heures expire ?
            </h3>
            <p className="text-neutral-300 font-sans text-xs leading-relaxed">
              Si vous ne vous présentez pas à la station avant l'expiration du code (2h), le ticket expire et les litres retournent à la station. Vous pouvez aussi annuler vous-même un ticket actif depuis « Mes Réservations ».
            </p>
          </div>

          <div className="p-5 border border-neutral-800 space-y-2 bg-black/80 backdrop-blur-md rounded-xl">
            <h3 className="font-bold uppercase text-amber-300 text-sm">
              Quels modes de paiement sont acceptés au Togo ?
            </h3>
            <p className="text-neutral-300 font-sans text-xs leading-relaxed">
              RONIKOV accepte Mixx by Yas (ex-TMoney, Togocom), Flooz (Moov Africa) ainsi que les cartes bancaires Visa et Mastercard.
            </p>
          </div>

          <div className="p-5 border border-neutral-800 space-y-2 bg-black/80 backdrop-blur-md rounded-xl">
            <h3 className="font-bold uppercase text-amber-300 text-sm">
              Comment le pompiste valide-t-il ma réservation ?
            </h3>
            <p className="text-neutral-300 font-sans text-xs leading-relaxed">
              Le pompiste saisit votre code (RNK-XXXX-XX) dans l'Espace Pro RONIKOV ou scanne votre QR Code avec la caméra. Chaque ticket ne peut être servi qu'une fois, pour exactement les litres réservés.
            </p>
          </div>

          <div className="p-5 border border-neutral-800 space-y-2 bg-black/80 backdrop-blur-md rounded-xl">
            <h3 className="font-bold uppercase text-amber-300 text-sm">
              Comment fonctionne le Pass Premium RONIKOV ?
            </h3>
            <p className="text-neutral-300 font-sans text-xs leading-relaxed">
              Le Pass Premium supprime les frais de réservation (150 FCFA par ticket). Demandez-le depuis la page Pass Premium : un administrateur RONIKOV l'active sur votre compte.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
