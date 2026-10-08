import React from 'react';
import { Home, MapPin, Ticket, User, Crown, Store, ShieldCheck } from 'lucide-react';
import { UserRole } from '../types';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: UserRole;
  activeTicketCount: number;
}

// Phone menu, at the bottom of the screen where the thumb reaches it. Hidden on large screens,
// which keep the menu in the header.
export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, userRole, activeTicketCount }) => {
  const items = [
    { id: 'home', label: 'Accueil', Icon: Home },
    { id: 'map', label: 'Stations', Icon: MapPin },
    { id: 'history', label: 'Tickets', Icon: Ticket, badge: activeTicketCount },
    userRole === 'ADMIN'
      ? { id: 'admin', label: 'Admin', Icon: ShieldCheck }
      : userRole === 'STATION_PRO' || userRole === 'ATTENDANT'
        ? { id: 'pro', label: 'Espace Pro', Icon: Store }
        : { id: 'premium', label: 'Premium', Icon: Crown },
    { id: 'profile', label: 'Profil', Icon: User },
  ];

  return (
    <nav
      aria-label="Menu principal"
      className="xl:hidden fixed bottom-0 inset-x-0 z-40 bg-neutral-950/95 backdrop-blur border-t border-neutral-800 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5 max-w-lg mx-auto">
        {items.map(({ id, label, Icon, badge }) => {
          const isActive = activeTab === id || (id === 'map' && activeTab === 'station-detail');
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center gap-1 pt-2.5 pb-2 text-xs font-semibold transition-colors ${
                isActive ? 'text-amber-400' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
              <span>{label}</span>
              {badge ? (
                <span className="absolute top-1.5 left-1/2 ml-2 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-400 text-black text-xs font-bold flex items-center justify-center">
                  {badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
