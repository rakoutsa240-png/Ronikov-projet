import React from 'react';
import { AuthUser, Reservation, Station, UserRole } from '../types';
import { ManagerRequestCard } from './ManagerRequestCard';
import { ProfilePhoto } from './ProfilePhoto';
import { VouchersCard } from './VouchersCard';
import { ReferralCard } from './ReferralCard';
import { User, ShieldCheck, Star, Fuel, Ticket, Wallet, MapPin, Crown, LogIn, LogOut, ChevronRight, Phone, Mail, Building2, KeyRound } from 'lucide-react';
import { locale, num, t } from '../i18n';

interface UserProfileViewProps {
  user: AuthUser | null;
  reservations: Reservation[];
  onOpenAuth: () => void;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
  onChangePassword: () => void;
  stations: Station[];
  onUserChanged: (user: AuthUser) => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  CLIENT: 'Client',
  STATION_PRO: 'Gérant de station',
  ADMIN: 'Administrateur',
  ATTENDANT: 'Pompiste',
};

// "+22890123456" -> "+228 90 12 34 56"
const formatPhone = (phone: string) => phone.replace(/^\+228(\d{2})(\d{2})(\d{2})(\d{2})$/, '+228 $1 $2 $3 $4');

// The signed-in account, with figures computed from its own tickets.
export const UserProfileView: React.FC<UserProfileViewProps> = ({
  user,
  reservations,
  onOpenAuth,
  onNavigate,
  onLogout,
  onChangePassword,
  stations,
  onUserChanged,
}) => {
  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 font-mono-code text-white">
        <div className="bg-black/90 backdrop-blur-xl border border-neutral-800 rounded-2xl p-8 text-center space-y-4 shadow-2xl">
          <User className="w-12 h-12 mx-auto text-amber-400" />
          <h1 className="text-2xl font-black">{t('Mon profil')}</h1>
          <p className="text-sm text-neutral-300 font-sans">
            {t('Connectez-vous pour retrouver vos tickets, vos litres servis et votre Pass Premium.')}
          </p>
          <button
            onClick={onOpenAuth}
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-400 text-black font-black text-xs rounded-xl hover:bg-amber-300"
          >
            <LogIn className="w-4 h-4" /> {t('Se connecter ou créer un compte')}
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
    { label: t('Tickets actifs'), value: String(active.length), icon: Ticket },
    { label: t('Pleins servis'), value: String(served.length), icon: Fuel },
    { label: t('Litres servis'), value: `${num(litersServed)} L`, icon: Fuel },
    { label: t('Dépensé'), value: `${num(amountSpent)} FCFA`, icon: Wallet },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-mono-code text-white">
      <div className="bg-black/90 backdrop-blur-xl border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <ProfilePhoto user={user} onUserChanged={onUserChanged}>
            {user.isPremium && (
              <div className="absolute -top-1 -right-1 bg-amber-400 text-black p-1 rounded-full border-2 border-black" title={t('Pass Premium actif')}>
                <Star className="w-4 h-4 fill-black" />
              </div>
            )}
          </ProfilePhoto>

          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 bg-amber-400 text-black text-xs font-black rounded">
                {t(ROLE_LABELS[user.role])}
              </span>
              {user.isPremium ? (
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-extrabold rounded">
                  {t('Pass Premium actif')}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-neutral-800 text-neutral-300 border border-neutral-700 text-xs font-bold rounded">
                  {t('Compte standard')}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight break-words">{user.name}</h1>
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
              <span className="text-[11px] text-neutral-400 font-bold flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5 text-amber-400" /> {label}
              </span>
              <span className="text-lg sm:text-xl font-black text-white block">{value}</span>
            </div>
          ))}
        </div>

        {lastServed && (
          <p className="text-xs text-neutral-400 font-sans flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            {t('Dernier plein : {n} L de {fuel} chez {station}', { n: lastServed.liters, fuel: t(lastServed.fuelLabel), station: lastServed.stationName })}
            {lastServed.validatedAt && ` ${t('le {date}', { date: new Date(lastServed.validatedAt).toLocaleDateString(locale(), { day: 'numeric', month: 'long' }) })}`}.
          </p>
        )}
      </div>

      <VouchersCard />

      <ReferralCard />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold">
        <ProfileLink icon={Ticket} label={t('Mes réservations')} detail={active.length ? t('{n} ticket(s) à récupérer', { n: active.length }) : t('Historique de vos tickets')} onClick={() => onNavigate('history')} />
        <ProfileLink icon={MapPin} label={t('Réserver du carburant')} detail={t('Stations, stocks et carte')} onClick={() => onNavigate('map')} />
        <ProfileLink
          icon={Crown}
          label={t('Pass Premium')}
          detail={user.isPremium ? t('Actif : pas de frais de réservation') : t('Réservations sans frais')}
          onClick={() => onNavigate('premium')}
        />
        {user.role === 'CLIENT' && (
          <div className="sm:col-span-2">
            <ManagerRequestCard stations={stations} onUserChanged={onUserChanged} />
          </div>
        )}
        {user.role !== 'CLIENT' && (
          <ProfileLink icon={Building2} label={t('Espace Pro')} detail={user.role === 'ATTENDANT' ? t('Valider les tickets') : t('Valider les tickets, stocks')} onClick={() => onNavigate('pro')} />
        )}
        {user.role === 'ADMIN' && (
          <ProfileLink icon={ShieldCheck} label={t('Console Admin')} detail={t('Prix, stations, comptes')} onClick={() => onNavigate('admin')} />
        )}
        <ProfileLink icon={KeyRound} label={t('Changer mon mot de passe')} detail={t('Déconnecte vos autres appareils')} onClick={onChangePassword} />
        <button
          onClick={onLogout}
          className="p-4 border border-neutral-800 bg-black/85 rounded-xl flex items-center gap-3 text-rose-300 hover:border-rose-400 transition-colors text-left"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span>{t('Se déconnecter')}</span>
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
      <span className="block text-xs text-neutral-400 normal-case font-sans font-normal">{detail}</span>
    </span>
    <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
  </button>
);
