import React, { useEffect, useRef } from 'react';
import { Bell, User, LogOut, LogIn } from 'lucide-react';
import { UserRole, FuelPriceGlobal } from '../types';

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
  globalPrices?: FuelPriceGlobal[];
  stationCount?: number;
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
  globalPrices,
  stationCount,
}) => {
  // On phones the menu scrolls sideways: keep the current page's entry in view.
  const mobileNavRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const nav = mobileNavRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (nav && active) nav.scrollLeft = active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2;
  }, [activeTab]);

  const superPrice = globalPrices?.find((p) => p.type === 'SUPER')?.officialPriceXOF ?? 725;
  const gazolePrice = globalPrices?.find((p) => p.type === 'GAZOLE')?.officialPriceXOF ?? 750;
  const melangePrice = globalPrices?.find((p) => p.type === 'MELANGE')?.officialPriceXOF ?? 811;
  const kerosenePrice = globalPrices?.find((p) => p.type === 'KEROSENE')?.officialPriceXOF ?? 1040;

  // The Pro and Admin spaces only show for accounts the server gave that role.
  const navItems = [
    { id: 'home', label: 'Accueil' },
    { id: 'map', label: 'Stations & Carte' },
    { id: 'history', label: 'Mes Réservations' },
    { id: 'premium', label: 'Pass Premium' },
    { id: 'profile', label: 'Mon Profil' },
    ...(userRole === 'STATION_PRO' || userRole === 'ADMIN' ? [{ id: 'pro', label: 'Espace Pro' }] : []),
    ...(userRole === 'ADMIN' ? [{ id: 'admin', label: 'Admin' }] : []),
  ];


  return (
    <header className="sticky top-0 z-40 bg-black text-white border-b border-neutral-800">
      {/* Top Banner Ticker */}
      <div className="bg-neutral-900 border-b border-neutral-800 py-1 px-4 text-[11px] font-mono-code text-neutral-300 flex justify-between items-center gap-6 overflow-x-auto whitespace-nowrap">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 font-bold text-white">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
            TOGO EN DIRECT:
          </span>
          <span>Super: {superPrice} FCFA/L</span>
          <span className="text-neutral-600">|</span>
          <span>Gazole: {gazolePrice} FCFA/L</span>
          <span className="text-neutral-600">|</span>
          <span>Mélange: {melangePrice} FCFA/L</span>
          <span className="text-neutral-600">|</span>
          <span>Pétrole/Kérosène: {kerosenePrice} FCFA/L</span>
          {stationCount ? (
            <>
              <span className="text-neutral-600">|</span>
              <span className="text-neutral-300 font-semibold">{stationCount} stations connectées</span>
            </>
          ) : null}
        </div>
        <div className="hidden xl:flex items-center gap-3 text-neutral-400">
          <span>Service Client: +228 90 00 00 00</span>
          <span>•</span>
          <span>Lomé • Tsévié • Atakpamé • Kara</span>
        </div>
      </div>

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
                <span className="text-[10px] text-neutral-400 font-mono-code tracking-widest block uppercase mt-0.5">
                  CARBURANT TOGO
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
                    className={`px-2.5 py-1.5 text-xs font-semibold uppercase font-mono-code transition-all tracking-tight whitespace-nowrap ${
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
          <div className="flex items-center gap-3">
            {/* Notifications Trigger */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 border border-neutral-800 hover:border-neutral-600 bg-neutral-900 text-white transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-black font-mono-code text-[10px] font-bold flex items-center justify-center border border-black">
                  {unreadNotifsCount}
                </span>
              )}
            </button>

            {/* User Profile Button */}
            <button
              onClick={() => (isSignedIn ? setActiveTab('profile') : onOpenAuth())}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-mono-code font-bold uppercase transition-all border ${
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

        {/* Mobile Navigation Sub-bar */}
        <div ref={mobileNavRef} className="xl:hidden flex items-center gap-1 overflow-x-auto py-2 border-t border-neutral-800 font-mono-code text-xs [scrollbar-width:none]">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`px-2.5 py-1 whitespace-nowrap uppercase ${
                  isActive ? 'bg-white text-black font-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
