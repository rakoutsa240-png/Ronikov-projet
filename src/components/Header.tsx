import React from 'react';
import { Bell, User, LogOut, LogIn, Sun, Moon } from 'lucide-react';
import { setTheme, useTheme } from '../theme';
import { UserRole } from '../types';
import { Logo } from './Logo';
import { setLang, t, useLang } from '../i18n';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: UserRole;
  isSignedIn: boolean;
  onLogout: () => void;
  unreadNotifsCount: number;
  onOpenNotifications: () => void;
  onOpenAuth: () => void;
  userName: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  userRole,
  isSignedIn,
  onLogout,
  unreadNotifsCount,
  onOpenNotifications,
  onOpenAuth,
  userName,
}) => {
  // The Pro and Admin spaces only show for accounts the server gave that role.
  const navItems = [
    { id: 'home', label: t('Accueil') },
    { id: 'map', label: t('Stations & Carte') },
    { id: 'history', label: t('Mes réservations') },
    { id: 'premium', label: t('Pass Premium') },
    { id: 'profile', label: t('Mon profil') },
    ...(userRole === 'STATION_PRO' || userRole === 'ATTENDANT' || userRole === 'ADMIN' ? [{ id: 'pro', label: t('Espace Pro') }] : []),
    ...(userRole === 'ADMIN' ? [{ id: 'admin', label: 'Admin' }] : []),
  ];
  const theme = useTheme();
  const lang = useLang();


  return (
    <header className="theme-fixed sticky top-0 z-40 bg-brand-800 text-white border-b border-brand-900">
      {/* Main Nav Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Region */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab('home')}
              className="flex items-center gap-2.5 group text-left text-white focus:outline-none"
            >
              <Logo subtitle={t('Carburant Togo')} />
            </button>

            {/* Desktop Nav Items */}
            <nav className="hidden xl:flex items-center space-x-1 ml-2 border-l border-white/20 pl-4">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`px-3 py-1.5 text-sm font-semibold transition-all whitespace-nowrap rounded-md ${
                      isActive
                        ? 'bg-white text-brand-800 border border-white'
                        : 'text-white/80 hover:text-white hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Actions: Persona Selector, Notifications, User Auth */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Français or English: shows the language the button switches to */}
            <button
              onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
              className="px-2 py-1.5 rounded-md border border-white/20 hover:border-white/50 bg-white/10 text-white text-xs font-mono-code font-bold transition-colors"
              aria-label={lang === 'fr' ? 'Switch to English' : 'Passer en français'}
              title={lang === 'fr' ? 'English' : 'Français'}
              lang={lang === 'fr' ? 'en' : 'fr'}
            >
              {lang === 'fr' ? 'EN' : 'FR'}
            </button>

            {/* Light theme for full sunlight, dark theme otherwise */}
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 rounded-md border border-white/20 hover:border-white/50 bg-white/10 text-white transition-colors"
              aria-label={theme === 'light' ? t('Passer en mode sombre') : t('Passer en mode clair (plein soleil)')}
              title={theme === 'light' ? t('Mode sombre') : t('Mode clair (plein soleil)')}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {/* Notifications Trigger */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 rounded-md border border-white/20 hover:border-white/50 bg-white/10 text-white transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-black font-mono-code text-[11px] font-bold flex items-center justify-center rounded-full">
                  {unreadNotifsCount}
                </span>
              )}
            </button>

            {/* User Profile Button */}
            <button
              onClick={() => (isSignedIn ? setActiveTab('profile') : onOpenAuth())}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono-code font-bold transition-all border ${
                activeTab === 'profile'
                  ? 'bg-amber-400 text-black border-amber-300 shadow-md'
                  : 'bg-white text-brand-800 border-white hover:bg-brand-50'
              }`}
              title={isSignedIn ? t('Ouvrir mon profil') : t('Se connecter ou créer un compte')}
            >
              {isSignedIn ? <User className="w-3.5 h-3.5" /> : <LogIn className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline max-w-[140px] truncate">{isSignedIn ? userName : t('Se connecter')}</span>
            </button>

            {isSignedIn && (
              <button
                onClick={onLogout}
                className="p-2 rounded-md border border-white/20 hover:border-white/50 bg-white/10 text-white transition-colors"
                aria-label={t('Se déconnecter')}
                title={t('Se déconnecter')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

      </div>
    </header>
  );
};
