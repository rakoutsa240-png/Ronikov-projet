import React from 'react';
import { Fuel, ShieldCheck, MapPin, Phone, Mail } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-black text-white border-t-2 border-black font-mono-code pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-neutral-800 text-xs">
          {/* Col 1: Brand & Identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-white text-black font-bold text-lg flex items-center justify-center border border-white">
                R
              </div>
              <span className="text-xl font-extrabold tracking-widest uppercase">RONIKOV</span>
            </div>
            <p className="text-neutral-400 font-sans text-xs leading-relaxed">
              Plateforme togolaise de localisation, réservation et paiement anticipé de carburant en stations-service.
            </p>
            <div className="text-[11px] text-neutral-500 font-bold uppercase">
              RÉPUBLIQUE TOGOLAISE — TOGO
            </div>
          </div>

          {/* Col 2: Villes & Couverture Togo */}
          <div className="space-y-3">
            <h4 className="font-bold uppercase text-white border-b border-neutral-800 pb-1">
              COUVERTURE NATIONALE
            </h4>
            <ul className="space-y-1.5 text-neutral-400">
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
            <h4 className="font-bold uppercase text-white border-b border-neutral-800 pb-1">
              RESEAUX PARTENAIRES
            </h4>
            <ul className="space-y-1.5 text-neutral-400">
              <li>TotalEnergies Marketing Togo</li>
              <li>Vivo Energy Togo (Shell)</li>
              <li>Sanol Togo</li>
              <li>Cap Petroleum</li>
              <li>Somayaf & Oryx</li>
            </ul>
          </div>

          {/* Col 4: Service Client */}
          <div className="space-y-3">
            <h4 className="font-bold uppercase text-white border-b border-neutral-800 pb-1">
              ASSISTANCE 24H/7J
            </h4>
            <div className="space-y-2 text-neutral-300">
              <p>Service Client Togo: +228 90 00 00 00</p>
              <p>Email: contact@ronikov.tg</p>
              <p className="text-[10px] text-neutral-500 font-sans pt-1">
                Paiements sécurisés via TMoney (Togocom) et Flooz (Moov Africa).
              </p>
            </div>
          </div>
        </div>

        {/* Bottom copyright & legal */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-neutral-500">
          <div>
            © {new Date().getFullYear()} RONIKOV S.A. Tous droits réservés. Minimalisme suisse & sécurité bancaire.
          </div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white uppercase">Conditions Générales</a>
            <a href="#" className="hover:text-white uppercase">Confidentialité</a>
            <a href="#" className="hover:text-white uppercase">Station Partner Portal</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
