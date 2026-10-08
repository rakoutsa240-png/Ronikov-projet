import React from 'react';
import { Bell, User, LogOut, LogIn, Sun, Moon } from 'lucide-react';
import { setTheme, useTheme } from '../theme';
import { UserRole } from '../types';

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
    { id: 'home', label: 'Accueil' },
    { id: 'map', label: 'Stations & Carte' },
    { id: 'history', label: 'Mes Réservations' },
    { id: 'premium', label: 'Pass Premium' },
    { id: 'profile', label: 'Mon Profil' },
    ...(userRole === 'STATION_PRO' || userRole === 'ATTENDANT' || userRole === 'ADMIN' ? [{ id: 'pro', label: 'Espace Pro' }] : []),
    ...(userRole === 'ADMIN' ? [{ id: 'admin', label: 'Admin' }] : []),
  ];
  const theme = useTheme();


  return (
    <header className="sticky top-0 z-40 bg-black text-white border-b border-neutral-800">
      {/* Main Nav Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Region */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab('home')}
              className="flex items-center gap-2.5 group text-left text-white focus:outline-none"
            >
              <div className="w-9 h-9 bg-white text-black font-mono-code font-bold text-xl flex items-center justify-center border border-white tracking-tighter">
                R
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-widest block uppercase leading-none font-mono-code">
                  RONIKOV
                </span>
                <span className="text-[11px] text-neutral-400 font-mono-code tracking-widest block uppercase mt-0.5">
                  Carburant Togo
                </span>
              </div>
            </button>

            {/* Desktop Nav Items */}
            <nav className="hidden xl:flex items-center space-x-1 ml-2 border-l border-neutral-800 pl-4">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`px-3 py-1.5 text-sm font-semibold transition-all whitespace-nowrap rounded-md ${
                      isActive
                        ? 'bg-white text-black border border-white'
                        : 'text-neutral-300 hover:text-white hover:bg-neutral-900 border border-transparent'
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
            {/* Light theme for full sunlight, dark theme otherwise */}
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 border border-neutral-800 hover:border-neutral-600 bg-neutral-900 text-white transition-colors"
              aria-label={theme === 'light' ? 'Passer en mode sombre' : 'Passer en mode clair (plein soleil)'}
              title={theme === 'light' ? 'Mode sombre' : 'Mode clair (plein soleil)'}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {/* Notifications Trigger */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 border border-neutral-800 hover:border-neutral-600 bg-neutral-900 text-white transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-black font-mono-code text-[11px] font-bold flex items-center justify-center border border-black">
                  {unreadNotifsCount}
                </span>
              )}
            </button>

            {/* User Profile Button */}
            <button
              onClick={() => (isSignedIn ? setActiveTab('profile') : onOpenAuth())}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-mono-code font-bold transition-all border ${
                activeTab === 'profile'
                  ? 'bg-amber-400 text-black border-amber-300 shadow-md'
                  : 'bg-white text-black border-white hover:bg-neutral-200'
              }`}
              title={isSignedIn ? 'Ouvrir mon profil' : 'Se connecter ou créer un compte'}
            >
              {isSignedIn ? <User className="w-3.5 h-3.5" /> : <LogIn className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline max-w-[140px] truncate">{isSignedIn ? userName : 'Se connecter'}</span>
            </button>

            {isSignedIn && (
              <button
                onClick={onLogout}
                className="p-2 border border-neutral-800 hover:border-neutral-600 bg-neutral-900 text-white transition-colors"
                aria-label="Se déconnecter"
                title="Se déconnecter"
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
