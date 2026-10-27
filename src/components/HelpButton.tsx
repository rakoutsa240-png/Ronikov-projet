import React from 'react';
import { MessageCircle } from 'lucide-react';
import { whatsappUrl } from '../contact';
import { t } from '../i18n';

interface HelpButtonProps {
  // Above the booking bar of a station page on phones, the button would hide it.
  hideOnPhone?: boolean;
}

// "Besoin d'aide ?": a WhatsApp chat with Pleino's customer service, always one tap away.
// On phones it sits just above the bottom menu.
export const HelpButton: React.FC<HelpButtonProps> = ({ hideOnPhone = false }) => (
  <a
    href={whatsappUrl(t('Bonjour Pleino, j’ai besoin d’aide :'))}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={t('Besoin d’aide ? Écrivez-nous sur WhatsApp')}
    className={`${hideOnPhone ? 'hidden md:inline-flex' : 'inline-flex'} theme-fixed no-print fixed right-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] xl:bottom-6 z-30 items-center gap-2 pl-3 pr-4 py-3 rounded-full bg-[#25D366] text-black font-bold text-sm shadow-lg shadow-black/30 hover:brightness-105 transition`}
  >
    <MessageCircle className="w-5 h-5" strokeWidth={2.5} />
    <span className="sm:hidden">{t('Aide')}</span>
    <span className="hidden sm:inline">{t('Besoin d’aide ?')}</span>
  </a>
);
