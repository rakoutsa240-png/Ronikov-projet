import React, { useState } from 'react';
import { UserRole, Reservation } from '../types';
import { User, ShieldCheck, Sparkles, Star, MapPin, Fuel, Clock, CheckCircle2, Heart, MessageSquare, Award, QrCode, ExternalLink, ChevronRight } from 'lucide-react';
import happyStationClientsImg from '../assets/images/happy_station_clients_1785892026094.webp';
import happyManagerImg from '../assets/images/station_manager_happy_1785888750849.webp';
import happyCustomerRefuelImg from '../assets/images/happy_customer_refuel_1785888766342.webp';

interface UserProfileViewProps {
  userName: string;
  userRole: UserRole;
  isPremium: boolean;
  reservations: Reservation[];
  onOpenAuth: () => void;
  onNavigateToMap: () => void;
}

interface Hotspot {
  id: string;
  xPercent: number;
  yPercent: number;
  title: string;
  role: string;
  description: string;
  badge: string;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  userName,
  userRole,
  isPremium,
  reservations,
  onOpenAuth,
  onNavigateToMap,
}) => {
  const [activeHotspot, setActiveHotspot] = useState<string | null>('gerant');
  const [selectedTab, setSelectedTab] = useState<'overview' | 'gallery' | 'satisfaction'>('overview');
  const [likeCount, setLikeCount] = useState(148);
  const [hasLiked, setHasLiked] = useState(false);

  const hotspots: Hotspot[] = [
    {
      id: 'gerant',
      xPercent: 35,
      yPercent: 45,
      title: 'Ablam — Gérant Principal',
      role: 'Équipe Gérance Station TotalEnergies Agoè',
      description: '« Notre plus grande satisfaction est de voir nos clients repartir avec le sourire, servis en moins de 3 minutes sans stress ! »',
      badge: 'Gérant Certifié 5 Stars',
    },
    {
      id: 'client',
      xPercent: 68,
      yPercent: 55,
      title: 'Kofi Mensah & Conducteurs',
      role: 'Clientèle Satisfaite Lomé',
      description: '« Avec la réservation QR Code RONIKOV, plus besoin de faire la queue. Je choisis ma station et mon carburant est garanti ! »',
      badge: 'Automobiliste VIP',
    },
    {
      id: 'pompiste',
      xPercent: 52,
      yPercent: 65,
      title: 'Équipe de Pompes Rapides',
      role: 'Service Pompiste Professionnel',
      description: 'Service courtois, vérification gratuite de la pression des pneus et scan instantané du code réservation.',
      badge: 'Service Ultra-Fluide',
    },
    {
      id: 'carburant',
      xPercent: 20,
      yPercent: 70,
      title: 'Automates & Carburant Norme ISO',
      role: 'Pompes Électroniques Haute Précision',
      description: 'Carburant 100% filtré, certifié sans impuretés au prix officiel homologué par le Ministère du Commerce du Togo.',
      badge: 'Qualité Garantie 100%',
    },
  ];

  const handleLike = () => {
    if (!hasLiked) {
      setLikeCount((prev) => prev + 1);
      setHasLiked(true);
    } else {
      setLikeCount((prev) => prev - 1);
      setHasLiked(false);
    }
  };

  const activeHotspotData = hotspots.find((h) => h.id === activeHotspot) || hotspots[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-mono-code text-white">
      {/* Top Header Profile Banner */}
      <div className="bg-black/90 backdrop-blur-xl border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-5 relative z-10">
          <div className="relative">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center text-black font-black text-2xl sm:text-3xl shadow-xl border-2 border-amber-300">
              {userName ? userName.charAt(0).toUpperCase() : 'K'}
            </div>
            {isPremium && (
              <div className="absolute -bottom-1 -right-1 bg-amber-400 text-black p-1 rounded-full border-2 border-black" title="Pass Premium Actif">
                <Star className="w-4 h-4 fill-black" />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 bg-amber-400 text-black text-xs font-black uppercase rounded shadow">
                PROFIL CLIENT
              </span>
              {isPremium ? (
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-extrabold uppercase rounded">
                  PASS PREMIUM ACTIF
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-neutral-800 text-neutral-300 border border-neutral-700 text-xs font-bold uppercase rounded">
                  MEMBRE STANDARD
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white">
              {userName || 'Kofi Mensah'}
            </h1>

            <p className="text-xs text-neutral-400 font-sans flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Compte vérifié Togolais (+228 90 ** ** 56) • Lomé, Togo</span>
            </p>
          </div>
        </div>

        {/* User Stats Quick Box */}
        <div className="flex items-center gap-3 shrink-0 relative z-10 flex-wrap">
          <div className="p-3.5 bg-black/80 border border-neutral-700 rounded-xl text-center min-w-[110px]">
            <span className="text-[10px] text-neutral-400 uppercase font-bold block">RÉSERVATIONS</span>
            <span className="text-xl font-black text-amber-300 my-0.5 block">{reservations.length}</span>
            <span className="text-[9px] text-emerald-400 font-bold uppercase block">Confirmées</span>
          </div>

          <div className="p-3.5 bg-black/80 border border-neutral-700 rounded-xl text-center min-w-[110px]">
            <span className="text-[10px] text-neutral-400 uppercase font-bold block">LITRES SERVIS</span>
            <span className="text-xl font-black text-white my-0.5 block">145 L</span>
            <span className="text-[9px] text-amber-400 font-bold uppercase block">100% Sans Attente</span>
          </div>

          <button
            onClick={onOpenAuth}
            className="px-4 py-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-amber-400 text-xs font-bold uppercase rounded-xl transition-colors text-white"
          >
            Changer Profil
          </button>
        </div>
      </div>

      {/* Main Interactive Photo Feature Section */}
      <div className="bg-black/90 backdrop-blur-xl border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="border-b border-neutral-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-amber-400 font-bold uppercase tracking-widest flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-amber-400" />
              EXPÉRIENCE EN STATION DE CARBURANT TOGO
            </div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight">
              INTERAGISSEZ AVEC L'ÉQUIPE ET LES CLIENTS SATISFAITS
            </h2>
            <p className="text-xs text-neutral-400 font-sans mt-0.5">
              Cliquez sur les points lumineux interactifs de la photo ci-dessous pour découvrir le témoignage de Koffi Mensah et l'accueil du gérant de station.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleLike}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase border flex items-center gap-2 transition-all ${
                hasLiked
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                  : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:border-amber-400'
              }`}
            >
              <Heart className={`w-4 h-4 ${hasLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
              <span>{likeCount} Satisfactions Client</span>
            </button>
          </div>
        </div>

        {/* INTERACTIVE PHOTO CONTAINER */}
        <div className="relative rounded-2xl overflow-hidden border-2 border-amber-400/40 group shadow-2xl">
          {/* Main Photo Image */}
          <img
            src={happyStationClientsImg}
            alt="Station de carburant Togo avec clients et gérant heureux"
            referrerPolicy="no-referrer"
            className="w-full h-[380px] sm:h-[480px] object-cover object-center filter brightness-95 group-hover:brightness-100 transition-all duration-500"
          />

          {/* Dark Gradient Overlay for Badges */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/30 pointer-events-none" />

          {/* Interactive Hotspot Buttons over Image */}
          {hotspots.map((spot) => {
            const isSelected = activeHotspot === spot.id;
            return (
              <button
                key={spot.id}
                type="button"
                onClick={() => setActiveHotspot(spot.id)}
                style={{ top: `${spot.yPercent}%`, left: `${spot.xPercent}%` }}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 z-20 group/spot focus:outline-none transition-all duration-300 ${
                  isSelected ? 'scale-125 z-30' : 'hover:scale-110'
                }`}
                title={spot.title}
              >
                {/* Pulsing Outer Ring */}
                <span
                  className={`absolute -inset-2 rounded-full animate-ping opacity-75 ${
                    isSelected ? 'bg-amber-400' : 'bg-white'
                  }`}
                />
                {/* Center Core Button */}
                <div
                  className={`relative w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center font-black text-xs shadow-2xl transition-all ${
                    isSelected
                      ? 'bg-amber-400 text-black border-white shadow-amber-400/80 scale-110'
                      : 'bg-black/90 text-amber-300 border-amber-400 hover:bg-amber-400 hover:text-black'
                  }`}
                >
                  <Sparkles className="w-4 h-4 animate-spin-slow" />
                </div>

                {/* Micro Tag Label */}
                <span
                  className={`absolute left-1/2 -translate-x-1/2 top-10 whitespace-nowrap text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-lg border pointer-events-none transition-all ${
                    isSelected
                      ? 'bg-amber-400 text-black border-amber-300 scale-105'
                      : 'bg-black/90 text-white border-neutral-700 opacity-90'
                  }`}
                >
                  {spot.title.split('—')[0]}
                </span>
              </button>
            );
          })}

          {/* Active Hotspot Overlay Card inside Image (Bottom Left) */}
          <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-lg z-20 p-5 bg-black/95 backdrop-blur-2xl border-2 border-amber-400 rounded-2xl shadow-2xl space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="px-2.5 py-0.5 bg-amber-400 text-black text-[10px] font-black uppercase rounded shadow">
                {activeHotspotData.badge}
              </span>
              <span className="text-[10px] text-neutral-400 font-bold uppercase">
                EXPÉRIENCE VERIFIÉE RONIKOV
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-black uppercase text-white flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>{activeHotspotData.title}</span>
            </h3>

            <p className="text-xs text-neutral-300 font-sans italic leading-relaxed">
              {activeHotspotData.description}
            </p>

            <div className="pt-1 flex items-center justify-between text-[10px] text-neutral-400">
              <span className="font-bold text-amber-300">{activeHotspotData.role}</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Lomé, Togo
              </span>
            </div>
          </div>
        </div>

        {/* Hotspot Switcher Buttons below image */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold">
          {hotspots.map((spot) => (
            <button
              key={spot.id}
              onClick={() => setActiveHotspot(spot.id)}
              className={`p-3.5 rounded-xl border text-left transition-all uppercase flex flex-col justify-between gap-1.5 ${
                activeHotspot === spot.id
                  ? 'bg-amber-400 text-black border-amber-300 shadow-lg font-black'
                  : 'bg-black/80 text-neutral-300 border-neutral-800 hover:border-neutral-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] opacity-80">{spot.badge}</span>
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-extrabold line-clamp-1">{spot.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Additional Interactive Showcase: Manager & Client Spotlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Card 1: Happy Station Manager Spotlight */}
        <div className="p-6 border border-neutral-800 bg-black/85 backdrop-blur-xl rounded-2xl shadow-2xl space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-400/10 border border-amber-400/30 text-amber-400 rounded-xl">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">
                  CÔTÉ GÉRANTS DE STATION
                </span>
                <h3 className="text-lg font-black uppercase text-white">
                  LE SOURIRE ET LA FLUIDITÉ AUX POMPES
                </h3>
              </div>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-neutral-800 h-48">
              <img
                src={happyManagerImg}
                alt="Gérant de station souriant au Togo"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center filter brightness-95 hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent p-4 flex items-end">
                <p className="text-xs text-white font-sans font-medium">
                  « Grâce aux pré-réservations RONIKOV, nous gérons notre stock avec clarté et nos pompistes travaillent dans la sérénité. »
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-neutral-300 font-sans flex items-center justify-between">
            <span className="font-bold text-amber-300">Gérants Partenaires Lomé</span>
            <span className="text-emerald-400 font-bold">100% Satisfaction</span>
          </div>
        </div>

        {/* Card 2: Happy Customer Refueling Spotlight */}
        <div className="p-6 border border-neutral-800 bg-black/85 backdrop-blur-xl rounded-2xl shadow-2xl space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">
                  CÔTÉ CLIENTS AUTOMOBILISTES
                </span>
                <h3 className="text-lg font-black uppercase text-white">
                  KOFİ MENSAH & LES CONDUCTEURS DE LOMÉ
                </h3>
              </div>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-neutral-800 h-48">
              <img
                src={happyCustomerRefuelImg}
                alt="Client satisfait faisant le plein au Togo"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center filter brightness-95 hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent p-4 flex items-end">
                <p className="text-xs text-white font-sans font-medium">
                  « Le code reçu sur mon téléphone est validé par le pompiste en quelques secondes. Mon voyage vers Atakpamé se fait en toute tranquillité ! »
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onNavigateToMap}
            className="w-full py-3 bg-amber-400 text-black font-black text-xs uppercase rounded-xl hover:bg-amber-300 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <span>Réserver Mon Carburant sur la Carte</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
