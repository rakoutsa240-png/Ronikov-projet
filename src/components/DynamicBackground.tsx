import React, { useState, useEffect } from 'react';
import { Camera, Play, Pause, ChevronRight, ChevronLeft, Sparkles, Heart, Smile, UserCheck, ShieldCheck, Eye } from 'lucide-react';

import bgStation from '../assets/images/gas_station_bg_1785887453945.webp';
import bgManager from '../assets/images/station_manager_happy_1785888750849.webp';
import bgCustomer from '../assets/images/happy_customer_refuel_1785888766342.webp';

export interface BackgroundPhoto {
  id: string;
  src: string;
  title: string;
  subtitle: string;
  tag: string;
  description: string;
  quote: string;
  personName: string;
  role: string;
}

export const BACKGROUND_PHOTOS: BackgroundPhoto[] = [
  {
    id: 'station-modern',
    src: bgStation,
    title: 'Station TotalEnergies — Agoè Nyivé',
    subtitle: 'Services fluides & pompes automatisées à Lomé',
    tag: '⚡ Équipement Moderne',
    description: 'Une infrastructure moderne équipée de pompes électroniques de dernière génération.',
    quote: '« Grâce à la réservation RONIKOV, nos pompes fonctionnent sans embouteillage ! »',
    personName: 'M. Messan Lawson',
    role: 'Responsable de Station'
  },
  {
    id: 'manager-happy',
    src: bgManager,
    title: 'Gérant Souriant & Pompiste Accueillant',
    subtitle: 'Service client chaleureux et professionnel',
    tag: '😊 Accueil Chaleureux',
    description: 'Nos équipes sur le terrain vous accueillent avec le sourire pour une validation rapide de votre code.',
    quote: '« Le sourire du client qui repart en 2 minutes est notre plus belle satisfaction au quotidien. »',
    personName: 'Ablavi Kougan',
    role: 'Superviseure de Piste'
  },
  {
    id: 'customer-refuel',
    src: bgCustomer,
    title: 'Client Satisfait au Plein de Carburant',
    subtitle: 'Ravitaillement rapide pour automobilistes & motocyclistes',
    tag: '🚗 Client Heureux',
    description: 'Fini le stress des files d’attente. Ravitaillez-vous dans la sérénité avec votre famille.',
    quote: '« Je reserve avec TMoney dans mon salon et le pompiste me sert en 30 secondes. Extraordinaire ! »',
    personName: 'Kofi Mensah',
    role: 'Conducteur à Lomé'
  }
];

interface DynamicBackgroundProps {
  children: React.ReactNode;
  activePhotoIndex?: number;
}

export const DynamicBackground: React.FC<DynamicBackgroundProps> = ({ children }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [overlayOpacity, setOverlayOpacity] = useState(0.55); // 55% dark overlay by default for readability
  const [isWidgetExpanded, setIsWidgetExpanded] = useState(false);

  // Auto-slideshow timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % BACKGROUND_PHOTOS.length);
      }, 7000); // 7s smooth transition
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  const activePhoto = BACKGROUND_PHOTOS[currentIndex];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % BACKGROUND_PHOTOS.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + BACKGROUND_PHOTOS.length) % BACKGROUND_PHOTOS.length);
  };

  return (
    <div className="relative min-h-screen w-full bg-neutral-950 text-white overflow-hidden flex flex-col justify-between selection:bg-amber-400 selection:text-black">
      {/* BACKGROUND IMAGE CAROUSEL WITH DYNAMIC CROSSFADE */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {BACKGROUND_PHOTOS.map((photo, idx) => {
          const isActive = idx === currentIndex;
          return (
            <div
              key={photo.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
              }`}
              style={{ transitionProperty: 'opacity, transform' }}
            >
              <img
                src={photo.src}
                alt={photo.title}
                className="w-full h-full object-cover object-center filter saturate-110 brightness-90"
                referrerPolicy="no-referrer"
              />
            </div>
          );
        })}

        {/* Dynamic Dark Gradient & Glass Overlay for WCAG Contrast */}
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})`,
            backgroundImage: `radial-gradient(circle at 50% 30%, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.85) 100%)`
          }}
        />

        {/* Ambient Subtle Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:32px_32px] opacity-40 pointer-events-none" />
      </div>

      {/* FLOATING INTERACTIVE BACKGROUND CONTROL PANEL (BOTTOM-RIGHT) */}
      <div className="fixed bottom-6 right-6 z-40 font-mono-code">
        {!isWidgetExpanded ? (
          <button
            onClick={() => setIsWidgetExpanded(true)}
            className="group px-4 py-3 bg-black/90 text-white border-2 border-white/80 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-3 hover:bg-white hover:text-black transition-all transform hover:scale-105"
            title="Personnaliser l'arrière-plan dynamique"
          >
            <div className="relative">
              <Camera className="w-5 h-5 text-amber-400 group-hover:text-black animate-pulse" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-black"></span>
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-[10px] text-neutral-400 group-hover:text-neutral-700 uppercase font-extrabold leading-none">
                Arrière-Plan Dynamique
              </div>
              <div className="text-xs font-extrabold uppercase">
                {activePhoto.tag}
              </div>
            </div>
            <Eye className="w-4 h-4 ml-1 opacity-70 group-hover:opacity-100" />
          </button>
        ) : (
          <div className="bg-black/95 text-white border-2 border-white/80 p-5 rounded-2xl shadow-2xl backdrop-blur-xl max-w-sm w-80 space-y-4 animate-fadeIn">
            {/* Widget Header */}
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-extrabold uppercase text-white">
                  Photos & Ambiance
                </span>
              </div>
              <button
                onClick={() => setIsWidgetExpanded(false)}
                className="w-6 h-6 bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Current Active Photo Info Card */}
            <div className="p-3 bg-neutral-900/90 border border-neutral-700 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="px-2 py-0.5 bg-amber-400 text-black font-extrabold rounded-full uppercase">
                  {activePhoto.tag}
                </span>
                <span className="text-neutral-400">
                  {currentIndex + 1} / {BACKGROUND_PHOTOS.length}
                </span>
              </div>
              <h4 className="text-xs font-extrabold uppercase text-white leading-tight">
                {activePhoto.title}
              </h4>
              <p className="text-[11px] text-neutral-300 font-sans italic leading-snug">
                {activePhoto.quote}
              </p>
              <div className="text-[10px] text-amber-300 font-bold flex items-center gap-1.5 pt-1">
                <Smile className="w-3.5 h-3.5" />
                <span>{activePhoto.personName} ({activePhoto.role})</span>
              </div>
            </div>

            {/* Photo Thumbnail Selector Buttons */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-neutral-400 block">
                Changer de Photo :
              </label>
              <div className="grid grid-cols-3 gap-2">
                {BACKGROUND_PHOTOS.map((p, idx) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setIsPlaying(false);
                    }}
                    className={`relative rounded-lg overflow-hidden border-2 h-14 transition-all ${
                      idx === currentIndex ? 'border-amber-400 scale-105 shadow-md ring-2 ring-amber-400/50' : 'border-neutral-700 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={p.src} alt={p.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-[9px] font-extrabold text-white uppercase text-center px-1">
                      #{idx + 1}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Controls Toolbar (Play/Pause, Prev/Next, Opacity) */}
            <div className="pt-2 border-t border-neutral-800 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={handlePrev}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs flex items-center gap-1 font-bold"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Précédent</span>
                </button>

                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 font-extrabold transition-all ${
                    isPlaying ? 'bg-amber-400 text-black' : 'bg-white text-black'
                  }`}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5 fill-black" /> : <Play className="w-3.5 h-3.5 fill-black" />}
                  <span>{isPlaying ? 'Pause' : 'Défiler'}</span>
                </button>

                <button
                  onClick={handleNext}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs flex items-center gap-1 font-bold"
                >
                  <span>Suivant</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Opacity Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-neutral-400 font-bold uppercase">
                  <span>Assombrissement Arrière-Plan</span>
                  <span>{Math.round(overlayOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="0.85"
                  step="0.05"
                  value={overlayOpacity}
                  onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MAIN APP CONTENT WRAPPER */}
      <div className="relative z-10 flex-1 flex flex-col justify-between">
        {children}
      </div>
    </div>
  );
};
