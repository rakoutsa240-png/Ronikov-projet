import React, { useState } from 'react';
import { Fuel, MapPin, Ticket, Crown, Shield, Bell, User, ChevronDown, Check } from 'lucide-react';
import { UserRole, FuelPriceGlobal } from '../types';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  unreadNotifsCount: number;
  onOpenNotifications: () => void;
  onOpenAuth: () => void;
  userName: string;
  globalPrices?: FuelPriceGlobal[];
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  userRole,
  setUserRole,
  unreadNotifsCount,
  onOpenNotifications,
  onOpenAuth,
  userName,
  globalPrices,
}) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const superPrice = globalPrices?.find((p) => p.type === 'SUPER')?.officialPriceXOF ?? 725;
  const gazolePrice = globalPrices?.find((p) => p.type === 'GAZOLE')?.officialPriceXOF ?? 750;
  const melangePrice = globalPrices?.find((p) => p.type === 'MELANGE')?.officialPriceXOF ?? 811;
  const kerosenePrice = globalPrices?.find((p) => p.type === 'KEROSENE')?.officialPriceXOF ?? 1040;

  const navItems = [
    { id: 'home', label: 'Accueil' },
    { id: 'map', label: 'Stations & Carte' },
    { id: 'history', label: 'Mes Réservations' },
    { id: 'premium', label: 'Pass Premium' },
    { id: 'profile', label: 'Mon Profil (Kofi)' },
    { id: 'pro', label: 'Espace Pro' },
    { id: 'admin', label: 'Admin' },
  ];

  const roleLabels: Record<UserRole, { title: string; subtitle: string }> = {
    CLIENT: { title: 'Client (Automobiliste)', subtitle: 'Réservation & Code' },
    STATION_PRO: { title: 'Station-Service (Gérant)', subtitle: 'Validation & Stock' },
    ADMIN: { title: 'Administrateur RONIKOV', subtitle: 'Gestion Globale Togo' },
  };

  return (
    <header className="sticky top-0 z-40 bg-black text-white border-b border-neutral-800">
      {/* Top Banner Ticker */}
      <div className="bg-neutral-900 border-b border-neutral-800 py-1 px-4 text-[11px] font-mono-code text-neutral-300 flex justify-between items-center overflow-x-auto whitespace-nowrap">
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
          <span className="text-neutral-600">|</span>
          <span className="text-neutral-300 font-semibold">8/8 Stations Togo Connectées</span>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-neutral-400">
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
            <nav className="hidden lg:flex items-center space-x-1 ml-4 border-l border-neutral-800 pl-6">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`px-3 py-1.5 text-xs font-semibold uppercase font-mono-code transition-all tracking-tight ${
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
            {/* Persona Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="hidden md:flex items-center gap-2 px-2.5 py-1.5 text-xs font-mono-code border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 transition-colors"
                title="Changer de rôle pour tester les fonctionnalités"
              >
                <span className="text-[10px] uppercase text-neutral-400">Rôle:</span>
                <span className="font-bold text-white">{roleLabels[userRole].title.split(' ')[0]}</span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
              </button>

              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-black border border-neutral-700 shadow-2xl py-2 z-50">
                  <div className="px-3 py-1.5 border-b border-neutral-800 text-[10px] uppercase font-mono-code text-neutral-400">
                    Sélectionner un profil de démonstration
                  </div>
                  {(['CLIENT', 'STATION_PRO', 'ADMIN'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        setUserRole(r);
                        setShowRoleMenu(false);
                        if (r === 'STATION_PRO') setActiveTab('pro');
                        else if (r === 'ADMIN') setActiveTab('admin');
                        else if (activeTab === 'pro' || activeTab === 'admin') setActiveTab('home');
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-neutral-900 ${
                        userRole === r ? 'bg-neutral-900 text-white font-bold' : 'text-neutral-300'
                      }`}
                    >
                      <div>
                        <div className="font-mono-code">{roleLabels[r].title}</div>
                        <div className="text-[10px] text-neutral-500">{roleLabels[r].subtitle}</div>
                      </div>
                      {userRole === r && <Check className="w-3.5 h-3.5 text-white ml-2" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

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
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-mono-code font-bold uppercase transition-all border ${
                activeTab === 'profile'
                  ? 'bg-amber-400 text-black border-amber-300 shadow-md'
                  : 'bg-white text-black border-white hover:bg-neutral-200'
              }`}
              title="Ouvrir mon profil Kofi Mensah & station interactive"
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{userName || 'Kofi Mensah'}</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Sub-bar */}
        <div className="lg:hidden flex items-center gap-1 overflow-x-auto py-2 border-t border-neutral-800 font-mono-code text-xs">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
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
