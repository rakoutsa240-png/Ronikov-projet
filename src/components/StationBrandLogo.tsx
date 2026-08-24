import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, Flame, ExternalLink, ShieldCheck, Fuel, MapPin, X } from 'lucide-react';

export type StationBrandType = 
  | 'TotalEnergies' 
  | 'Shell' 
  | 'Sanol' 
  | 'Cap' 
  | 'CAP'
  | 'Somayaf' 
  | 'Yatt & Co' 
  | 'Oryx' 
  | 'Togo-Petro' 
  | string;

interface StationBrandLogoProps {
  brand: StationBrandType;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  interactive?: boolean;
  className?: string;
  showBadge?: boolean;
}

export const StationBrandLogo: React.FC<StationBrandLogoProps> = ({
  brand,
  size = 'md',
  interactive = true,
  className = '',
  showBadge = true,
}) => {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowDetailsModal(false);
      }
    };
    if (showDetailsModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDetailsModal]);

  // Normalize brand name
  const normalizedBrand = (brand || 'TotalEnergies').trim();

  // Dimensions based on size
  const dimensions = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base',
    xl: 'w-20 h-20 text-lg',
  }[size];

  // Render SVG vector logo for each real station brand
  const renderLogoVector = () => {
    if (/total/i.test(normalizedBrand)) {
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
          {/* TotalEnergies multi-colored dynamic ribbon logo */}
          <defs>
            <linearGradient id="totRedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF1E27" />
              <stop offset="100%" stopColor="#B30006" />
            </linearGradient>
            <linearGradient id="totYellowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFD200" />
              <stop offset="100%" stopColor="#FF8000" />
            </linearGradient>
            <linearGradient id="totBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0072CE" />
              <stop offset="100%" stopColor="#002D62" />
            </linearGradient>
            <linearGradient id="totGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00E676" />
              <stop offset="100%" stopColor="#008A3C" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="48" fill="#0D0D0D" stroke="#262626" strokeWidth="2" />
          {/* Swirling ribbons */}
          <path d="M 22 50 C 22 28, 48 22, 58 35 C 68 48, 80 38, 80 22" fill="none" stroke="url(#totRedGrad)" strokeWidth="11" strokeLinecap="round" />
          <path d="M 22 62 C 22 80, 48 82, 60 72 C 72 62, 82 72, 84 84" fill="none" stroke="url(#totBlueGrad)" strokeWidth="11" strokeLinecap="round" />
          <path d="M 32 28 C 50 12, 75 18, 78 40 C 82 58, 62 80, 42 78" fill="none" stroke="url(#totYellowGrad)" strokeWidth="9" strokeLinecap="round" />
          <path d="M 18 38 C 36 38, 52 56, 38 72" fill="none" stroke="url(#totGreenGrad)" strokeWidth="8" strokeLinecap="round" />
          <text x="50" y="91" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="900" letterSpacing="0.5">
            TOTAL
          </text>
        </svg>
      );
    }

    if (/shell/i.test(normalizedBrand)) {
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
          {/* Shell Pecten Scallop Logo */}
          <defs>
            <linearGradient id="shellYellow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFF200" />
              <stop offset="100%" stopColor="#FFC700" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="48" fill="#0F0F0F" stroke="#DD1D21" strokeWidth="2.5" />
          {/* Scallop shell outline and ribs */}
          <path
            d="M 50 15 C 32 15, 16 32, 18 56 C 20 72, 30 80, 36 80 L 64 80 C 70 80, 80 72, 82 56 C 84 32, 68 15, 50 15 Z"
            fill="url(#shellYellow)"
            stroke="#DD1D21"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          {/* Shell radial lines */}
          <path d="M 50 18 L 50 78 M 38 24 L 43 78 M 62 24 L 57 78 M 28 36 L 36 78 M 72 36 L 64 78 M 22 50 L 30 78 M 78 50 L 70 78" stroke="#DD1D21" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 32 80 L 32 86 L 68 86 L 68 80 Z" fill="#DD1D21" />
        </svg>
      );
    }

    if (/sanol/i.test(normalizedBrand)) {
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
          {/* Sanol Togo Green & Gold Shield Logo */}
          <circle cx="50" cy="50" r="48" fill="#022013" stroke="#10B981" strokeWidth="2.5" />
          <path d="M 50 14 L 84 28 L 84 58 C 84 78, 50 90, 50 90 C 50 90, 16 78, 16 58 L 16 28 Z" fill="#10B981" stroke="#F59E0B" strokeWidth="3" />
          <path d="M 50 24 L 74 36 L 74 56 C 74 68, 50 78, 50 78 C 50 78, 26 68, 26 56 L 26 36 Z" fill="#F59E0B" />
          {/* Oil drop in center */}
          <path d="M 50 36 C 45 46, 40 52, 40 58 C 40 64, 44 68, 50 68 C 56 68, 60 64, 60 58 C 60 52, 55 46, 50 36 Z" fill="#022013" />
          <text x="50" y="86" textAnchor="middle" fill="#10B981" fontSize="10" fontWeight="900" letterSpacing="0.5">
            SANOL
          </text>
        </svg>
      );
    }

    if (/cap/i.test(normalizedBrand)) {
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
          {/* CAP Petroleum Blue Crest */}
          <circle cx="50" cy="50" r="48" fill="#061226" stroke="#2563EB" strokeWidth="2.5" />
          <rect x="20" y="20" width="60" height="60" rx="16" fill="#1D4ED8" stroke="#60A5FA" strokeWidth="2" />
          <path d="M 32 36 L 50 68 L 68 36" fill="none" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="50" cy="34" r="6" fill="#EF4444" />
          <text x="50" y="92" textAnchor="middle" fill="#60A5FA" fontSize="11" fontWeight="900">
            CAP TOGO
          </text>
        </svg>
      );
    }

    if (/somayaf/i.test(normalizedBrand)) {
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
          {/* Somayaf Purple & Gold Diamond */}
          <circle cx="50" cy="50" r="48" fill="#1E0A38" stroke="#A855F7" strokeWidth="2.5" />
          <path d="M 50 16 L 82 50 L 50 84 L 18 50 Z" fill="#7E22CE" stroke="#F59E0B" strokeWidth="3" />
          <path d="M 50 28 L 70 50 L 50 72 L 30 50 Z" fill="#F59E0B" />
          <text x="50" y="55" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="900">
            SOMAYAF
          </text>
        </svg>
      );
    }

    if (/oryx/i.test(normalizedBrand)) {
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
          {/* Oryx Energies Logo */}
          <circle cx="50" cy="50" r="48" fill="#200508" stroke="#DC2626" strokeWidth="2.5" />
          <path d="M 25 25 Q 50 10 75 25 Q 90 50 75 75 Q 50 90 25 75 Q 10 50 25 25 Z" fill="#DC2626" />
          <text x="50" y="58" textAnchor="middle" fill="#FFFFFF" fontSize="16" fontWeight="900">
            ORYX
          </text>
        </svg>
      );
    }

    // Default Brand Logo (Generic / Custom)
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
        <circle cx="50" cy="50" r="48" fill="#18181B" stroke="#F59E0B" strokeWidth="2.5" />
        <path d="M 50 18 C 35 38, 24 54, 24 68 C 24 82, 35 90, 50 90 C 65 90, 76 82, 76 68 C 76 54, 65 38, 50 18 Z" fill="#F59E0B" />
        <path d="M 50 34 C 42 48, 35 58, 35 66 C 35 74, 41 78, 50 78 C 59 78, 65 74, 65 66 C 65 58, 58 48, 50 34 Z" fill="#EF4444" />
        <text x="50" y="96" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="900">
          {normalizedBrand.substring(0, 8)}
        </text>
      </svg>
    );
  };

  // Get color badge background for brand
  const getBrandColors = () => {
    if (/total/i.test(normalizedBrand)) {
      return { 
        badge: 'bg-red-500 text-white border-red-400', 
        border: 'border-red-500', 
        glow: 'shadow-red-500/20',
        name: 'TotalEnergies Togo' 
      };
    }
    if (/shell/i.test(normalizedBrand)) {
      return { 
        badge: 'bg-amber-400 text-black border-amber-300', 
        border: 'border-amber-400', 
        glow: 'shadow-amber-400/20',
        name: 'Shell Togo' 
      };
    }
    if (/sanol/i.test(normalizedBrand)) {
      return { 
        badge: 'bg-emerald-500 text-black border-emerald-400', 
        border: 'border-emerald-500', 
        glow: 'shadow-emerald-500/20',
        name: 'Sanol Togo' 
      };
    }
    if (/cap/i.test(normalizedBrand)) {
      return { 
        badge: 'bg-blue-600 text-white border-blue-400', 
        border: 'border-blue-500', 
        glow: 'shadow-blue-500/20',
        name: 'CAP Petroleum' 
      };
    }
    if (/somayaf/i.test(normalizedBrand)) {
      return { 
        badge: 'bg-purple-600 text-white border-purple-400', 
        border: 'border-purple-500', 
        glow: 'shadow-purple-500/20',
        name: 'Somayaf Togo' 
      };
    }
    return { 
      badge: 'bg-amber-500 text-black border-amber-400', 
      border: 'border-amber-500', 
      glow: 'shadow-amber-500/20',
      name: normalizedBrand 
    };
  };

  const brandInfo = getBrandColors();

  return (
    <>
      <div className={`relative inline-flex items-center gap-2 ${className}`}>
        <button
          type="button"
          disabled={!interactive}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (interactive) setShowDetailsModal(true);
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`relative rounded-xl overflow-hidden p-1 transition-all duration-300 transform ${dimensions} ${
            interactive ? 'cursor-pointer hover:scale-110 active:scale-95 hover:rotate-3' : ''
          }`}
          title={`Logo ${brandInfo.name} — Cliquez pour aperçu`}
        >
          {renderLogoVector()}

          {/* Interactive Sparkle Ring on Hover */}
          {interactive && isHovered && (
            <div className="absolute inset-0 rounded-xl ring-2 ring-amber-400 ring-offset-1 ring-offset-black animate-pulse pointer-events-none" />
          )}
        </button>

        {showBadge && (
          <div className="flex flex-col">
            <span className={`px-2 py-0.5 text-[10px] font-mono-code font-black uppercase rounded tracking-wider border shadow-sm ${brandInfo.badge}`}>
              {normalizedBrand}
            </span>
            <span className="text-[9px] text-neutral-400 font-mono-code flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3 h-3 text-amber-400" />
              <span>Station Certifiée</span>
            </span>
          </div>
        )}
      </div>

      {/* BRAND INTERACTION MODAL (EASILY CLOSABLE VIA BACKDROP, CLOSE BUTTON, ESC KEY) */}
      {showDetailsModal && (
        <div 
          onClick={() => setShowDetailsModal(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn font-mono-code cursor-pointer overflow-y-auto"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-neutral-900 border-2 border-amber-400 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl relative space-y-5 my-auto cursor-default"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowDetailsModal(false)}
              className="absolute top-4 right-4 w-9 h-9 bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 rounded-full flex items-center justify-center font-bold text-sm transition-colors border border-neutral-700"
              title="Fermer l'aperçu"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header with Big Animated Logo */}
            <div className="flex items-center gap-4 border-b border-neutral-800 pb-4 pr-8">
              <div className="w-20 h-20 shrink-0 transform hover:scale-110 transition-transform">
                {renderLogoVector()}
              </div>
              <div>
                <span className={`inline-block px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded mb-1 border ${brandInfo.badge}`}>
                  Partenaire Réseau Togo
                </span>
                <h3 className="text-xl font-extrabold text-white uppercase leading-tight">
                  {brandInfo.name}
                </h3>
                <p className="text-xs text-amber-300 font-sans mt-0.5">
                  Réseau Officiel Certifié RONIKOV
                </p>
              </div>
            </div>

            {/* Brand Specs & Interactive Info */}
            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-black/70 border border-neutral-800 rounded-xl space-y-2.5">
                <div className="flex justify-between items-center text-neutral-300">
                  <span className="font-bold flex items-center gap-1.5">
                    <Fuel className="w-3.5 h-3.5 text-amber-400" /> Pompes & Automates :
                  </span>
                  <span className="text-emerald-400 font-bold">100% Compatibles QR Code</span>
                </div>
                <div className="flex justify-between items-center text-neutral-300">
                  <span className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Garantie Carburant :
                  </span>
                  <span className="text-amber-400 font-bold">Normes ISO / Européennes</span>
                </div>
                <div className="flex justify-between items-center text-neutral-300">
                  <span className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Paiement Accepté :
                  </span>
                  <span className="text-white font-bold">TMoney, Flooz, Carte Visa</span>
                </div>
              </div>

              <div className="p-3.5 bg-amber-400/10 border border-amber-400/30 rounded-xl space-y-1">
                <div className="text-[11px] font-extrabold text-amber-300 flex items-center gap-1.5 uppercase">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Personnalisation de Logo & Design</span>
                </div>
                <p className="text-[11px] text-neutral-300 font-sans leading-relaxed">
                  Chaque station partenaire affiche son identité visuelle propre. Vous pourrez bientôt télécharger vos propres logos de stations personnalisés depuis l'Espace Pro.
                </p>
              </div>
            </div>

            {/* Modal Close Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="w-full py-3 bg-amber-400 text-black font-black text-xs uppercase rounded-xl hover:bg-amber-300 active:scale-98 transition-all shadow-lg shadow-amber-400/20"
              >
                Fermer l'Aperçu du Logo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
