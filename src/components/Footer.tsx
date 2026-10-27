import React from 'react';
import { MessageCircle } from 'lucide-react';
import { Logo } from './Logo';
import { t } from '../i18n';
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_DISPLAY, whatsappUrl } from '../contact';

export const Footer: React.FC = () => {
  return (
    <footer className="theme-fixed bg-brand-950 text-white font-mono-code pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-white/15 text-xs">
          {/* Col 1: Brand & Identity */}
          <div className="space-y-4">
            <Logo />
            <p className="text-white/70 font-sans text-xs leading-relaxed">
              {t('Plateforme togolaise de localisation, réservation et paiement anticipé de carburant en stations-service.')}
            </p>
            <div className="text-xs text-white/55 font-bold uppercase">
              {t('République togolaise — Togo')}
            </div>
          </div>

          {/* Col 2: Villes & Couverture Togo */}
          <div className="space-y-3">
            <h4 className="font-bold text-white border-b border-white/15 pb-1">
              {t('Couverture nationale')}
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
              {t('Réseaux partenaires')}
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
              {t('Nous contacter')}
            </h4>
            <div className="space-y-2 text-white/85">
              <p>
                {t('Service Client Togo')} :{' '}
                <a href={`tel:${SUPPORT_PHONE}`} className="text-white hover:underline whitespace-nowrap">{SUPPORT_PHONE_DISPLAY}</a>
              </p>
              <p>
                <a href={whatsappUrl(t('Bonjour Pleino, j’ai besoin d’aide :'))} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[#25D366] font-bold hover:underline">
                  <MessageCircle className="w-3.5 h-3.5" /> {t('Écrire sur WhatsApp')}
                </a>
              </p>
              <p className="break-all">
                Email : <a href={`mailto:${SUPPORT_EMAIL}`} className="text-white hover:underline">{SUPPORT_EMAIL}</a>
              </p>
              <p className="text-[11px] text-white/55 font-sans pt-1">
                {t('Paiements via Mixx by Yas (Togocom) et Flooz (Moov Africa).')}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom copyright & legal */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/55">
          <div>© {new Date().getFullYear()} Pleino. {t('Tous droits réservés.')}</div>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="#/carte" className="hover:text-white">{t('Stations & carte')}</a>
            <a href="#/premium" className="hover:text-white">{t('Pass Premium')}</a>
            <a href="#/conditions" className="hover:text-white">{t('Conditions d’utilisation')}</a>
            <a href="#/confidentialite" className="hover:text-white">{t('Confidentialité')}</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
