import React from 'react';
import { Fuel, ShieldCheck, MapPin, Phone, Mail } from 'lucide-react';
import { Logo } from './Logo';

export const Footer: React.FC = () => {
  return (
    <footer className="theme-fixed bg-brand-950 text-white font-mono-code pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-white/15 text-xs">
          {/* Col 1: Brand & Identity */}
          <div className="space-y-4">
            <Logo />
            <p className="text-white/70 font-sans text-xs leading-relaxed">
              Plateforme togolaise de localisation, réservation et paiement anticipé de carburant en stations-service.
            </p>
            <div className="text-xs text-white/55 font-bold uppercase">
              République togolaise — Togo
            </div>
          </div>

          {/* Col 2: Villes & Couverture Togo */}
          <div className="space-y-3">
            <h4 className="font-bold text-white border-b border-white/15 pb-1">
              Couverture nationale
            </h4>
            <ul className="space-y-1.5 text-white/70">
              <li>Lomé (Golfe & Agoè-Nyivé)</li>
              <li>Tsévié (Maritime)</li>
              <li>Atakpamé (Plateaux)</li>
              <li>Sokodé (Centrale)</li>
              <li>Kara (Kara)</li>
              <li>Dapaong (Savanes)</li>
            </ul>
          </div>

          {/* Col 3: Partenaires & Services */}
          <div className="space-y-3">
            <h4 className="font-bold text-white border-b border-white/15 pb-1">
              Reseaux partenaires
            </h4>
            <ul className="space-y-1.5 text-white/70">
              <li>TotalEnergies Marketing Togo</li>
              <li>Vivo Energy Togo (Shell)</li>
              <li>Sanol Togo</li>
              <li>Cap Petroleum</li>
              <li>Somayaf & Oryx</li>
            </ul>
          </div>

          {/* Col 4: Service Client */}
          <div className="space-y-3">
            <h4 className="font-bold text-white border-b border-white/15 pb-1">
              Assistance 24h/7j
            </h4>
            <div className="space-y-2 text-white/85">
              <p>Service Client Togo: +228 90 00 00 00</p>
              <p>Email: contact@pleino.tg</p>
              <p className="text-[11px] text-white/55 font-sans pt-1">
                Paiements via Mixx by Yas (Togocom) et Flooz (Moov Africa).
              </p>
            </div>
          </div>
        </div>

        {/* Bottom copyright & legal */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/55">
          <div>© {new Date().getFullYear()} Pleino. Tous droits réservés.</div>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="#/carte" className="hover:text-white">Stations & carte</a>
            <a href="#/premium" className="hover:text-white">Pass Premium</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
