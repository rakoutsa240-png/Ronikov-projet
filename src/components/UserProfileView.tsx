import React from 'react';
import { AuthUser, Reservation, UserRole } from '../types';
import { User, ShieldCheck, Star, Fuel, Ticket, Wallet, MapPin, Crown, LogIn, LogOut, ChevronRight, Phone, Mail, Building2 } from 'lucide-react';

interface UserProfileViewProps {
  user: AuthUser | null;
  reservations: Reservation[];
  onOpenAuth: () => void;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  CLIENT: 'Client',
  STATION_PRO: 'Gérant de station',
  ADMIN: 'Administrateur',
};

// "+22890123456" -> "+228 90 12 34 56"
const formatPhone = (phone: string) => phone.replace(/^\+228(\d{2})(\d{2})(\d{2})(\d{2})$/, '+228 $1 $2 $3 $4');

// The signed-in account, with figures computed from its own tickets.
export const UserProfileView: React.FC<UserProfileViewProps> = ({ user, reservations, onOpenAuth, onNavigate, onLogout }) => {
  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 font-mono-code text-white">
        <div className="bg-black/90 backdrop-blur-xl border border-neutral-800 rounded-2xl p-8 text-center space-y-4 shadow-2xl">
          <User className="w-12 h-12 mx-auto text-amber-400" />
          <h1 className="text-2xl font-black uppercase">Mon profil</h1>
          <p className="text-sm text-neutral-300 font-sans">
            Connectez-vous pour retrouver vos tickets, vos litres servis et votre Pass Premium.
          </p>
          <button
            onClick={onOpenAuth}
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-400 text-black font-black text-xs uppercase rounded-xl hover:bg-amber-300"
          >
            <LogIn className="w-4 h-4" /> Se connecter ou créer un compte
          </button>
        </div>
      </div>
    );
  }

  const served = reservations.filter((r) => r.status === 'VALIDATED');
  const active = reservations.filter((r) => r.status === 'PENDING');
  const litersServed = served.reduce((sum, r) => sum + r.liters, 0);
  const amountSpent = served.reduce((sum, r) => sum + r.totalAmountXOF, 0);
  const lastServed = served[0];

  const stats = [
    { label: 'Tickets actifs', value: String(active.length), icon: Ticket },
    { label: 'Pleins servis', value: String(served.length), icon: Fuel },
    { label: 'Litres servis', value: `${litersServed.toLocaleString('fr-FR')} L`, icon: Fuel },
    { label: 'Dépensé', value: `${amountSpent.toLocaleString('fr-FR')} FCFA`, icon: Wallet },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-mono-code text-white">
      <div className="bg-black/90 backdrop-blur-xl border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="relative shrink-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center text-black font-black text-2xl sm:text-3xl shadow-xl border-2 border-amber-300">
              {user.name.charAt(0).toUpperCase()}
            </div>
            {user.isPremium && (
              <div className="absolute -bottom-1 -right-1 bg-amber-400 text-black p-1 rounded-full border-2 border-black" title="Pass Premium actif">
                <Star className="w-4 h-4 fill-black" />
              </div>
            )}
          </div>

          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 bg-amber-400 text-black text-xs font-black uppercase rounded">
                {ROLE_LABELS[user.role]}
              </span>
              {user.isPremium ? (
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-extrabold uppercase rounded">
                  Pass Premium actif
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-neutral-800 text-neutral-300 border border-neutral-700 text-xs font-bold uppercase rounded">
                  Compte standard
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight break-words">{user.name}</h1>
            <div className="text-xs text-neutral-300 font-sans flex flex-wrap gap-x-4 gap-y-1">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-amber-400" /> {formatPhone(user.phone)}
              </span>
              {user.email && (
                <span className="flex items-center gap-1.5 break-all">
                  <Mail className="w-3.5 h-3.5 text-amber-400" /> {user.email}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="p-4 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-1">
              <span className="text-[10px] text-neutral-400 uppercase font-bold flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5 text-amber-400" /> {label}
              </span>
              <span className="text-lg sm:text-xl font-black text-white block">{value}</span>
            </div>
          ))}
        </div>

        {lastServed && (
          <p className="text-xs text-neutral-400 font-sans flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            Dernier plein : {lastServed.liters} L de {lastServed.fuelLabel} chez {lastServed.stationName}
            {lastServed.validatedAt && ` le ${new Date(lastServed.validatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`}.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold uppercase">
        <ProfileLink icon={Ticket} label="Mes réservations" detail={active.length ? `${active.length} ticket(s) à récupérer` : 'Historique de vos tickets'} onClick={() => onNavigate('history')} />
        <ProfileLink icon={MapPin} label="Réserver du carburant" detail="Stations, stocks et carte" onClick={() => onNavigate('map')} />
        <ProfileLink
          icon={Crown}
          label="Pass Premium"
          detail={user.isPremium ? 'Actif : pas de frais de réservation' : 'Réservations sans frais'}
          onClick={() => onNavigate('premium')}
        />
        {user.role !== 'CLIENT' && (
          <ProfileLink icon={Building2} label="Espace Pro" detail="Valider les tickets, stocks" onClick={() => onNavigate('pro')} />
        )}
        {user.role === 'ADMIN' && (
          <ProfileLink icon={ShieldCheck} label="Console Admin" detail="Prix, stations, comptes" onClick={() => onNavigate('admin')} />
        )}
        <button
          onClick={onLogout}
          className="p-4 border border-neutral-800 bg-black/85 rounded-xl flex items-center gap-3 text-rose-300 hover:border-rose-400 transition-colors text-left"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span>Se déconnecter</span>
        </button>
      </div>
    </div>
  );
};

const ProfileLink: React.FC<{ icon: React.ComponentType<{ className?: string }>; label: string; detail: string; onClick: () => void }> = ({
  icon: Icon,
  label,
  detail,
  onClick,
}) => (
  <button
    onClick={onClick}
    className="p-4 border border-neutral-800 bg-black/85 rounded-xl flex items-center gap-3 hover:border-amber-400 transition-colors text-left text-white"
  >
    <Icon className="w-5 h-5 text-amber-400 shrink-0" />
    <span className="flex-1 min-w-0">
      <span className="block">{label}</span>
      <span className="block text-[11px] text-neutral-400 normal-case font-sans font-normal">{detail}</span>
    </span>
    <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
  </button>
);
