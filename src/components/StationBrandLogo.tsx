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

interface BrandInfo {
  name: string;
  label: string;
  badge: string;
  logo?: string;
}

// Official logo files live in public/logos/. Only add one taken from the brand itself
// (or a faithful copy such as Wikimedia Commons), never a redrawn imitation.
const BRANDS: { match: RegExp; info: BrandInfo }[] = [
  { match: /total/i, info: { name: 'TotalEnergies Togo', label: 'TOTAL', badge: 'bg-red-500 text-white border-red-400' } },
  { match: /shell/i, info: { name: 'Shell', label: 'SHELL', badge: 'bg-amber-400 text-black border-amber-300', logo: '/logos/shell.svg' } },
  { match: /sanol/i, info: { name: 'Sanol Togo', label: 'SANOL', badge: 'bg-emerald-500 text-black border-emerald-400' } },
  { match: /^cap\b/i, info: { name: 'CAP', label: 'CAP', badge: 'bg-blue-600 text-white border-blue-400' } },
  { match: /somayaf/i, info: { name: 'Somayaf', label: 'SOMAYAF', badge: 'bg-purple-600 text-white border-purple-400' } },
  { match: /yatt/i, info: { name: 'Yatt & Co', label: 'YATT', badge: 'bg-sky-600 text-white border-sky-400' } },
  { match: /oryx/i, info: { name: 'Oryx Energies', label: 'ORYX', badge: 'bg-orange-500 text-black border-orange-400' } },
  { match: /togo.?petro/i, info: { name: 'Togo-Petro', label: 'PETRO', badge: 'bg-teal-600 text-white border-teal-400' } },
];

function getBrandInfo(brand: string): BrandInfo {
  const known = BRANDS.find((b) => b.match.test(brand));
  if (known) return known.info;
  return { name: brand, label: brand.substring(0, 7).toUpperCase(), badge: 'bg-amber-500 text-black border-amber-400' };
}

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

  const brandInfo = getBrandInfo(normalizedBrand);

  // The official logo when we have its file, otherwise the brand's name written plainly:
  // never a made-up emblem that could pass for the brand's real logo.
  const renderLogoVector = () => {
    if (brandInfo.logo) {
      return (
        <div className="w-full h-full rounded-lg bg-white p-[12%] flex items-center justify-center">
          <img src={brandInfo.logo} alt={`Logo ${brandInfo.name}`} className="max-w-full max-h-full object-contain" draggable={false} />
        </div>
      );
    }
    const label = brandInfo.label;
    const fontSize = label.length <= 4 ? 30 : label.length <= 6 ? 22 : 16;
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full" role="img" aria-label={brandInfo.name}>
        <rect x="2" y="2" width="96" height="96" rx="18" fill="#18181B" stroke="#3F3F46" strokeWidth="3" />
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fill="#FFFFFF" fontSize={fontSize} fontWeight="900" letterSpacing="0.5">
          {label}
        </text>
      </svg>
    );
  };



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
            <span className={`px-2 py-0.5 text-[11px] font-mono-code font-black uppercase rounded tracking-wider border shadow-sm ${brandInfo.badge}`}>
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
                <span className={`inline-block px-2.5 py-0.5 text-[11px] font-extrabold uppercase rounded mb-1 border ${brandInfo.badge}`}>
                  Partenaire Réseau Togo
                </span>
                <h3 className="text-xl font-extrabold text-white leading-tight">
                  {brandInfo.name}
                </h3>
                <p className="text-xs text-amber-300 font-sans mt-0.5">
                  Réseau Officiel Certifié Pleino
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
                <div className="text-xs font-extrabold text-amber-300 flex items-center gap-1.5 uppercase">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Personnalisation de Logo & Design</span>
                </div>
                <p className="text-xs text-neutral-300 font-sans leading-relaxed">
                  Chaque station partenaire affiche son identité visuelle propre. Vous pourrez bientôt télécharger vos propres logos de stations personnalisés depuis l'Espace Pro.
                </p>
              </div>
            </div>

            {/* Modal Close Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="w-full py-3 bg-amber-400 text-black font-black text-xs rounded-xl hover:bg-amber-300 active:scale-98 transition-all shadow-lg shadow-amber-400/20"
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
