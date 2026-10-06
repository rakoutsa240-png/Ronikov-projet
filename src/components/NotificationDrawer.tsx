import React from 'react';
import { NotificationItem } from '../types';
import { X, Bell, CheckCheck, Clock, Fuel, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { StationBrandLogo, StationBrandType } from './StationBrandLogo';
import { useModal } from '../useModal';

// API notifications carry an ISO date; the demo data already holds a label like "Il y a 5 min".
function formatNotificationTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(timestamp) || Number.isNaN(date.getTime())) return timestamp;
  const minutes = Math.round((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return 'À l’instant';
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (minutes < 24 * 60) return `Il y a ${Math.round(minutes / 60)} h`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
}) => {
  useModal(isOpen, onClose);
  if (!isOpen) return null;

  // Detect station brand from notification props or text content
  const detectBrandFromNotification = (n: NotificationItem): StationBrandType | null => {
    if (n.stationBrand) return n.stationBrand;
    const text = `${n.title} ${n.message}`.toLowerCase();
    if (text.includes('total')) return 'TotalEnergies';
    if (text.includes('shell')) return 'Shell';
    if (text.includes('sanol')) return 'Sanol';
    if (text.includes('cap')) return 'Cap';
    if (text.includes('somayaf')) return 'Somayaf';
    if (text.includes('oryx')) return 'Oryx';
    return null;
  };

  const getBrandAccent = (brand: StationBrandType | null) => {
    if (!brand) {
      return {
        unreadBorder: 'border-amber-400/60 bg-amber-400/10',
        badgeBg: 'bg-amber-400 text-black',
        textAccent: 'text-amber-300',
      };
    }
    if (/total/i.test(brand)) {
      return {
        unreadBorder: 'border-red-500/60 bg-red-500/10',
        badgeBg: 'bg-red-500 text-white',
        textAccent: 'text-red-400',
      };
    }
    if (/shell/i.test(brand)) {
      return {
        unreadBorder: 'border-amber-400/60 bg-amber-400/10',
        badgeBg: 'bg-amber-400 text-black',
        textAccent: 'text-amber-300',
      };
    }
    if (/sanol/i.test(brand)) {
      return {
        unreadBorder: 'border-emerald-500/60 bg-emerald-500/10',
        badgeBg: 'bg-emerald-500 text-black',
        textAccent: 'text-emerald-300',
      };
    }
    if (/cap/i.test(brand)) {
      return {
        unreadBorder: 'border-blue-500/60 bg-blue-500/10',
        badgeBg: 'bg-blue-600 text-white',
        textAccent: 'text-sky-300',
      };
    }
    if (/somayaf/i.test(brand)) {
      return {
        unreadBorder: 'border-purple-500/60 bg-purple-500/10',
        badgeBg: 'bg-purple-600 text-white',
        textAccent: 'text-purple-300',
      };
    }
    return {
      unreadBorder: 'border-amber-400/60 bg-amber-400/10',
      badgeBg: 'bg-amber-400 text-black',
      textAccent: 'text-amber-300',
    };
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-mono-code">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-fadeIn" 
        onClick={onClose} 
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-neutral-950/95 backdrop-blur-2xl border-l border-neutral-800 p-6 space-y-6 text-white flex flex-col justify-between shadow-2xl relative">
          
          <div className="space-y-6 overflow-y-auto pr-1">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-400/10 border border-amber-400/30 text-amber-400 rounded-xl">
                  <Bell className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 bg-amber-400 text-black text-[11px] font-black rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </h2>
                  <p className="text-[11px] text-neutral-400 font-sans">
                    Alertes stations & confirmations en direct
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkAllRead}
                    className="text-[11px] uppercase font-bold text-amber-300 hover:text-white border border-neutral-700 hover:border-amber-400 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    Tout lire
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 border border-neutral-700 text-neutral-300 hover:text-white hover:border-amber-400 rounded-lg transition-colors bg-neutral-900"
                  title="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Notification List */}
            {notifications.length === 0 ? (
              <div className="py-16 text-center text-xs text-neutral-500 space-y-2 border border-dashed border-neutral-800 rounded-2xl bg-black/40">
                <Bell className="w-8 h-8 mx-auto text-neutral-700" />
                <p className="font-bold text-neutral-400">Aucune notification pour le moment</p>
                <p className="text-xs text-neutral-600 font-sans">Vos confirmations et recharges apparaîtront ici.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => {
                  const brand = detectBrandFromNotification(n);
                  const accent = getBrandAccent(brand);

                  return (
                    <div
                      key={n.id}
                      className={`p-4 border rounded-xl transition-all space-y-2.5 relative overflow-hidden ${
                        !n.read
                          ? `${accent.unreadBorder} shadow-lg`
                          : 'border-neutral-800/90 bg-black/60 opacity-80'
                      }`}
                    >
                      {/* Top Row with Station Brand Logo & Title */}
                      <div className="flex items-start justify-between gap-3 border-b border-neutral-800/80 pb-2">
                        <div className="flex items-center gap-2.5">
                          {brand ? (
                            <StationBrandLogo
                              brand={brand}
                              size="sm"
                              interactive={true}
                              showBadge={false}
                              className="bg-black p-1 border border-neutral-700 rounded-lg shrink-0"
                            />
                          ) : (
                            <div className="p-1.5 bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded-lg shrink-0">
                              <Sparkles className="w-4 h-4" />
                            </div>
                          )}

                          <div>
                            <span className={`text-xs font-black block ${accent.textAccent}`}>
                              {n.title}
                            </span>
                            {brand && (
                              <span className="text-[9px] text-neutral-400 font-bold">
                                Station {brand}
                              </span>
                            )}
                          </div>
                        </div>

                        <span className="text-[11px] text-neutral-400 font-sans shrink-0">
                          {formatNotificationTime(n.timestamp)}
                        </span>
                      </div>

                      {/* Message Body */}
                      <p className="text-xs text-neutral-200 font-sans leading-relaxed">
                        {n.message}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Drawer Footer Close Action */}
          <div className="pt-2 border-t border-neutral-800">
            <button
              onClick={onClose}
              className="w-full py-3 bg-amber-400 text-black text-xs font-black tracking-wider hover:bg-amber-300 active:scale-98 transition-all rounded-xl shadow-lg shadow-amber-400/20"
            >
              Fermer les Notifications
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
