import React, { Suspense, lazy, useState, useEffect, useCallback } from 'react';
import { Station, Reservation, UserRole, NotificationItem, FuelPriceGlobal, AuthUser } from './types';
import { INITIAL_STATIONS, GLOBAL_FUEL_PRICES } from './data/mockData';
import { api, ApiError } from './api';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomeView } from './components/HomeView';
import { MapView } from './components/MapView';
import { ReservationModal } from './components/ReservationModal';
import { AuthModal } from './components/AuthModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { DynamicBackground } from './components/DynamicBackground';
import { BottomNav } from './components/BottomNav';
import { PageSkeleton } from './components/Skeleton';
import { loadJSON, saveJSON, useOnline } from './storage';
import { WifiOff, RefreshCw } from 'lucide-react';
import { parseHash, routeToHash, Route, Tab } from './routes';

// Pages other than the home page and the map are downloaded only when opened, so the first visit stays light.
const named = <K extends string>(load: () => Promise<Record<K, React.ComponentType<any>>>, name: K) =>
  lazy(() => load().then((m) => ({ default: m[name] })));
const StationDetailView = named(() => import('./components/StationDetailView'), 'StationDetailView');
const HistoryView = named(() => import('./components/HistoryView'), 'HistoryView');
const ProDashboard = named(() => import('./components/ProDashboard'), 'ProDashboard');
const AdminDashboard = named(() => import('./components/AdminDashboard'), 'AdminDashboard');
const PremiumView = named(() => import('./components/PremiumView'), 'PremiumView');
const UserProfileView = named(() => import('./components/UserProfileView'), 'UserProfileView');

const pageFallback = <PageSkeleton />;

// Last answers from the server, kept on the phone so the site still shows something without network.
const STATIONS_KEY = 'ronikov.stations';
const PRICES_KEY = 'ronikov.prices';
const TICKETS_KEY = 'ronikov.tickets';


export default function App() {
  // Everything comes from the API. Until it answers the pages show grey placeholders, or the stations
  // saved at the last visit; the demo data is only a last resort when the server can't be reached.
  const [stations, setStations] = useState<Station[]>(() => loadJSON<Station[]>(STATIONS_KEY, []));
  const [stationsLoaded, setStationsLoaded] = useState(false);
  // The server could not be reached: what is shown may be out of date.
  const [serverUnreachable, setServerUnreachable] = useState(false);
  const isOnline = useOnline();
  // Tickets and notifications belong to the signed-in account and only come from the API.
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [staffReservations, setStaffReservations] = useState<Reservation[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [globalPrices, setGlobalPrices] = useState<FuelPriceGlobal[]>(() => loadJSON<FuelPriceGlobal[]>(PRICES_KEY, []));

  // Load stations and official prices.
  const loadStationsAndPrices = useCallback((signal?: AbortSignal) => {
    Promise.all([api.stations(signal), api.prices(signal)])
      .then(([apiStations, apiPrices]) => {
        setStations(apiStations);
        setGlobalPrices(apiPrices);
        saveJSON(STATIONS_KEY, apiStations);
        saveJSON(PRICES_KEY, apiPrices);
        setServerUnreachable(false);
        setStationsLoaded(true);
      })
      .catch((e) => {
        if (signal?.aborted) return;
        console.warn('API unavailable, using saved or local data', e);
        setServerUnreachable(true);
        setStations((prev) => (prev.length > 0 ? prev : INITIAL_STATIONS));
        setGlobalPrices((prev) => (prev.length > 0 ? prev : GLOBAL_FUEL_PRICES));
        setStationsLoaded(true);
      });
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    loadStationsAndPrices(controller.signal);
    return () => controller.abort();
  }, [loadStationsAndPrices]);
  // Coming back online refreshes stocks and prices.
  useEffect(() => {
    if (isOnline && serverUnreachable) loadStationsAndPrices();
  }, [isOnline]);
  const loading = !stationsLoaded && stations.length === 0;

  // Stock changes after every booking, cancellation or validation.
  const refreshStations = () => {
    api
      .stations()
      .then(setStations)
      .catch((e) => console.warn('Could not refresh stations', e));
  };

  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  const activeTab = route.tab;
  // Opens a page: a new browser history entry, so the back button returns to the previous page.
  const navigate = useCallback((tab: Tab, stationId?: string) => {
    const next = { tab, stationId };
    const hash = routeToHash(next);
    if (window.location.hash !== hash) window.history.pushState(null, '', hash);
    setRoute(next);
    window.scrollTo(0, 0);
  }, []);
  const setActiveTab = (tab: string) => navigate(tab as Tab);
  useEffect(() => {
    const onPopState = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  const [selectedStation, setSelectedStation] = useState<Station | null>(stations[0] || null);
  // The signed-in account comes from the API, which alone decides the role.
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  // False until the server said who is signed in, so a refresh on #/admin does not bounce to the home page.
  const [authChecked, setAuthChecked] = useState(false);
  const [showingSavedTickets, setShowingSavedTickets] = useState(false);
  const userRole: UserRole = currentUser?.role ?? 'CLIENT';
  const userName = currentUser?.name ?? '';
  const isUserPremium = Boolean(currentUser?.isPremium);
  const canUsePro = userRole === 'STATION_PRO' || userRole === 'ADMIN';

  useEffect(() => {
    const controller = new AbortController();
    api
      .me(controller.signal)
      // A sign-in that finished first wins over a slower "nobody signed in" answer.
      .then((user) => setCurrentUser((prev) => prev ?? user))
      .catch((e) => {
        if (controller.signal.aborted) return;
        console.warn('Could not load the signed-in user', e);
        // Without network the tickets saved at the last visit stay visible, so the code can still be shown at the pump.
        setReservations(loadJSON<Reservation[]>(TICKETS_KEY, []));
        setShowingSavedTickets(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setAuthChecked(true);
      });
    return () => controller.abort();
  }, []);

  const handleAuthenticated = (user: AuthUser, password?: string) => {
    setCurrentUser(user);
    setAuthChecked(true);
    if (user.mustChangePassword) setPasswordModal({ forced: true, currentPassword: password });
    // Signing in to book goes straight on to the booking.
    if (pendingBooking) {
      setPendingBooking(false);
      setIsBookingModalOpen(true);
      return;
    }
    if (user.role === 'STATION_PRO') setActiveTab('pro');
    if (user.role === 'ADMIN') setActiveTab('admin');
  };

  // Open while the user changes their password; forced after signing in with a temporary one.
  const [passwordModal, setPasswordModal] = useState<{ forced: boolean; currentPassword?: string } | null>(null);
  useEffect(() => {
    if (currentUser?.mustChangePassword) setPasswordModal((open) => open ?? { forced: true });
  }, [currentUser?.id, currentUser?.mustChangePassword]);

  const handleLogout = async () => {
    setPasswordModal(null);
    try {
      await api.logout();
    } catch (e) {
      console.warn('Logout request failed', e);
    }
    setCurrentUser(null);
    setProStationId(undefined);
    saveJSON(TICKETS_KEY, []);
    setActiveTab('home');
  };

  // Load the account's tickets and notifications, and the tickets staff can see.
  const managedStationId = currentUser?.managedStationIds[0];
  // The station shown in the Pro space: an admin (or a manager of several stations) can switch.
  const [chosenProStationId, setProStationId] = useState<string | undefined>();
  const proStationId = chosenProStationId ?? managedStationId ?? stations[0]?.id;
  const loadAccountData = () => {
    if (!currentUser) {
      if (showingSavedTickets) return;
      setReservations([]);
      setNotifications([]);
      setStaffReservations([]);
      return;
    }
    setShowingSavedTickets(false);
    api
      .myReservations()
      .then((tickets) => {
        setReservations(tickets);
        saveJSON(TICKETS_KEY, tickets);
      })
      .catch((e) => {
        console.warn('Could not load reservations', e);
        setReservations(loadJSON<Reservation[]>(TICKETS_KEY, []));
      });
    api.notifications().then(setNotifications).catch((e) => console.warn('Could not load notifications', e));
    const staffRequest =
      currentUser.role === 'ADMIN'
        ? api.allReservations()
        : currentUser.role === 'STATION_PRO' && proStationId && currentUser.managedStationIds.includes(proStationId)
          ? api.stationReservations(proStationId)
          : Promise.resolve([]);
    staffRequest.then(setStaffReservations).catch((e) => console.warn('Could not load station reservations', e));
  };
  // Signed-in visitors get the tickets page downloaded in advance, so it opens even without network later.
  useEffect(() => {
    if (currentUser) void import('./components/HistoryView').catch(() => {});
  }, [currentUser?.id]);
  useEffect(loadAccountData, [currentUser?.id, currentUser?.role, currentUser?.role === 'STATION_PRO' ? proStationId : undefined]);

  // Leave the Pro or Admin space when the account may not see it (signed out, or another role).
  useEffect(() => {
    if (!authChecked) return;
    if ((activeTab === 'pro' && !canUsePro) || (activeTab === 'admin' && userRole !== 'ADMIN')) {
      window.history.replaceState(null, '', routeToHash({ tab: 'home' }));
      setRoute({ tab: 'home' });
    }
  }, [activeTab, canUsePro, userRole, authChecked]);

  // Keep selectedStation synchronized with stations state
  useEffect(() => {
    if (selectedStation) {
      const updated = stations.find((s) => s.id === selectedStation.id);
      if (updated) setSelectedStation(updated);
    } else if (stations.length > 0) {
      setSelectedStation(stations[0]);
    }
  }, [stations]);

  // Modals state
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState<boolean>(false);
  // The visitor clicked "Réserver" while signed out: the booking opens once they sign in.
  const [pendingBooking, setPendingBooking] = useState(false);

  // Open booking modal for a station
  // Booking needs an account: the ticket is tied to it.
  const handleOpenBooking = (station: Station) => {
    setSelectedStation(station);
    if (currentUser) setIsBookingModalOpen(true);
    else {
      setPendingBooking(true);
      setIsAuthModalOpen(true);
    }
  };

  // Open detail view for a station
  const handleViewStationDetails = (station: Station) => {
    setSelectedStation(station);
    navigate('station-detail', station.id);
  };

  // The API created the ticket: show it, then refresh stock and notifications.
  const handleCompleteReservation = (newReservation: Reservation) => {
    setReservations((prev) => {
      const next = [newReservation, ...prev];
      saveJSON(TICKETS_KEY, next);
      return next;
    });
    refreshStations();
    api.notifications().then(setNotifications).catch(() => {});
  };

  // Cancel reservation: the API gives the litres back to the station.
  const handleCancelReservation = async (resId: string) => {
    try {
      const cancelled = await api.cancelReservation(resId);
      setReservations((prev) => {
        const next = prev.map((r) => (r.id === resId ? cancelled : r));
        saveJSON(TICKETS_KEY, next);
        return next;
      });
      refreshStations();
    } catch (e) {
      window.alert(e instanceof ApiError ? e.message : 'Annulation impossible, réessayez.');
    }
  };

  // Validate a code at the pump (manager of the station, or admin).
  const handleValidateCodePro = async (stationId: string, code: string) => {
    try {
      const { message, reservation } = await api.validateTicket(stationId, code);
      setStaffReservations((prev) => prev.map((r) => (r.id === reservation.id ? reservation : r)));
      refreshStations();
      return { success: true, message, reservation };
    } catch (e) {
      if (e instanceof ApiError) {
        const reservation = e.data?.reservation as Reservation | undefined;
        if (reservation) setStaffReservations((prev) => prev.map((r) => (r.id === reservation.id ? reservation : r)));
        return { success: false, message: e.message, reservation };
      }
      return { success: false, message: 'Serveur RONIKOV injoignable. Réessayez.' };
    }
  };

  const replaceStation = (updated: Station | null, stationId: string) =>
    setStations((prev) =>
      updated ? prev.map((s) => (s.id === stationId ? updated : s)) : prev.filter((s) => s.id !== stationId),
    );

  // Save the tank levels (and, for an admin, the prices) that changed in the Pro dashboard.
  const handleUpdateStockPro = async (stationId: string, updatedStock: Station['stock']) => {
    const current = stations.find((s) => s.id === stationId);
    if (!current) return;
    try {
      for (const fuel of Object.keys(updatedStock) as (keyof Station['stock'])[]) {
        const before = current.stock[fuel];
        const after = updatedStock[fuel];
        const tankBefore = before.availableLiters + (before.reservedLiters ?? 0);
        const changes = {
          ...(after.availableLiters !== tankBefore ? { stockLiters: after.availableLiters } : {}),
          ...(userRole === 'ADMIN' && after.pricePerLiter !== before.pricePerLiter ? { pricePerLiter: after.pricePerLiter } : {}),
        };
        if (Object.keys(changes).length > 0) replaceStation(await api.updateStock(stationId, fuel, changes), stationId);
      }
    } catch (e) {
      throw new Error(e instanceof ApiError ? e.message : 'Serveur RONIKOV injoignable. Réessayez.');
    }
  };

  const handleUpdateQueueTimePro = async (stationId: string, newQueueTime: number) => {
    if (stations.find((s) => s.id === stationId)?.queueTimeMinutes === newQueueTime) return;
    try {
      replaceStation(await api.updateStation(stationId, { queueTimeMinutes: newQueueTime }), stationId);
    } catch (e) {
      throw new Error(e instanceof ApiError ? e.message : 'Serveur RONIKOV injoignable. Réessayez.');
    }
  };

  // Toggle Partner Status in Admin Dashboard
  const handleToggleStationPartner = async (stationId: string) => {
    const station = stations.find((s) => s.id === stationId);
    if (!station) return;
    if (station.isPartner && !window.confirm(`Suspendre ${station.name} ? Elle ne sera plus présentée comme partenaire.`)) return;
    try {
      replaceStation(await api.updateStation(stationId, { isPartner: !station.isPartner }), stationId);
    } catch (e) {
      window.alert(e instanceof ApiError ? e.message : 'Modification impossible, réessayez.');
    }
  };

  // Set the official prices, and optionally every station's price, from the Admin dashboard.
  const handleUpdateGlobalPrices = async (updatedPrices: FuelPriceGlobal[], updateAllStations: boolean = true) => {
    try {
      setGlobalPrices(
        await api.updatePrices(
          updatedPrices.map(({ type, officialPriceXOF }) => ({ type, officialPriceXOF })),
          updateAllStations,
        ),
      );
      if (updateAllStations) refreshStations();
    } catch (e) {
      throw new Error(e instanceof ApiError ? e.message : 'Serveur RONIKOV injoignable. Réessayez.');
    }
  };

  // Premium is granted by an admin: the button sends a request.
  const handleRequestPremium = async (): Promise<{ ok: boolean; message: string } | null> => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return null;
    }
    try {
      return { ok: true, message: (await api.requestPremium()).message };
    } catch (e) {
      return { ok: false, message: e instanceof ApiError ? e.message : 'Serveur RONIKOV injoignable. Réessayez.' };
    }
  };

  // Mark all notifications read
  const handleMarkAllNotifsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (currentUser) api.markNotificationsRead().catch((e) => console.warn('Could not mark notifications read', e));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const activeTicketCount = reservations.filter((r) => r.status === 'PENDING' && new Date(r.expiresAt) > new Date()).length;

  return (
    <DynamicBackground>
      {/* On phones the bottom menu covers the end of the page: leave room for it. */}
      <div className="min-h-screen text-slate-900 flex flex-col justify-between selection:bg-amber-400 selection:text-black pb-[calc(4.5rem+env(safe-area-inset-bottom))] xl:pb-0">
        {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={userRole}
        isSignedIn={currentUser !== null}
        onLogout={handleLogout}
        unreadNotifsCount={unreadCount}
        onOpenNotifications={() => setIsNotifDrawerOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        userName={userName}
      />

      {(!isOnline || serverUnreachable) && (
        <div role="status" className="bg-amber-400 text-black text-sm font-semibold">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-3">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span className="flex-1">
              {!isOnline ? 'Pas de connexion internet.' : 'Le serveur RONIKOV ne répond pas.'} Les stocks affichés peuvent ne pas être à jour
              {reservations.length > 0 ? ', vos tickets restent visibles dans « Tickets ».' : '.'}
            </span>
            {isOnline && (
              <button onClick={() => loadStationsAndPrices()} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-black/10 hover:bg-black/20 shrink-0">
                <RefreshCw className="w-4 h-4" /> Réessayer
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main View Router */}
      <main className="flex-1">
        <Suspense fallback={pageFallback}>
        {activeTab === 'home' && (
          <HomeView
            stations={stations}
            globalPrices={globalPrices}
            loading={loading}
            onNavigateMap={() => setActiveTab('map')}
            onBookStation={handleOpenBooking}
            onViewStation={handleViewStationDetails}
            onNavigatePro={() => {
              if (canUsePro) setActiveTab('pro');
              else setIsAuthModalOpen(true);
            }}
          />
        )}

        {activeTab === 'map' && (
          <MapView
            stations={stations}
            loading={loading}
            selectedStation={selectedStation}
            onSelectStation={setSelectedStation}
            onBookStation={handleOpenBooking}
            onViewStationDetails={handleViewStationDetails}
          />
        )}

        {activeTab === 'station-detail' && loading && <PageSkeleton />}
        {activeTab === 'station-detail' && !loading && (
          <StationDetailView
            station={stations.find((s) => s.id === route.stationId) ?? null}
            onBack={() => (window.history.length > 1 ? window.history.back() : setActiveTab('map'))}
            onBook={handleOpenBooking}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            reservations={reservations}
            onCancelReservation={handleCancelReservation}
            isSignedIn={currentUser !== null || (showingSavedTickets && reservations.length > 0)}
            offline={showingSavedTickets}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onNavigateToMap={() => setActiveTab('map')}
          />
        )}

        {activeTab === 'premium' && (
          <PremiumView
            isPremium={isUserPremium}
            onRequestPremium={handleRequestPremium}
          />
        )}

        {activeTab === 'profile' && (
          <UserProfileView
            user={currentUser}
            reservations={reservations}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onNavigate={setActiveTab}
            onLogout={handleLogout}
            onChangePassword={() => setPasswordModal({ forced: false })}
          />
        )}

        {activeTab === 'pro' && (
          <ProDashboard
            managedStation={stations.find((s) => s.id === proStationId) ?? stations[0]}
            stationChoices={userRole === 'ADMIN' ? stations : stations.filter((s) => currentUser?.managedStationIds.includes(s.id))}
            onChangeStation={setProStationId}
            reservations={staffReservations.filter((r) => r.stationId === proStationId)}
            onValidateCode={handleValidateCodePro}
            onUpdateStock={handleUpdateStockPro}
            onUpdateQueueTime={handleUpdateQueueTimePro}
            canEditPrice={userRole === 'ADMIN'}
          />
        )}

        {activeTab === 'admin' && (
          <AdminDashboard
            stations={stations}
            reservations={staffReservations}
            globalPrices={globalPrices}
            onToggleStationPartner={handleToggleStationPartner}
            onStationAdded={(station) => setStations((prev) => [...prev, station])}
            onUpdateGlobalPrices={handleUpdateGlobalPrices}
            currentUserId={currentUser?.id}
          />
        )}
        </Suspense>
      </main>

      {/* Footer */}
      <Footer />

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} userRole={userRole} activeTicketCount={activeTicketCount} />

      {/* Booking Modal */}
      <ReservationModal
        station={selectedStation}
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        onCompleteReservation={handleCompleteReservation}
        isUserPremium={Boolean(currentUser?.isPremium)}
        defaultPaymentPhone={currentUser?.phone}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        reason={pendingBooking ? 'Connectez-vous ou créez un compte gratuit pour réserver : votre ticket sera lié à votre compte.' : undefined}
        onClose={() => {
          setIsAuthModalOpen(false);
          setPendingBooking(false);
        }}
        onAuthenticated={handleAuthenticated}
      />

      <ChangePasswordModal
        isOpen={passwordModal !== null}
        forced={passwordModal?.forced ?? false}
        currentPassword={passwordModal?.currentPassword}
        onClose={() => setPasswordModal(null)}
        onLogout={handleLogout}
        onChanged={setCurrentUser}
      />

      {/* Notification Drawer */}
      <NotificationDrawer
        isOpen={isNotifDrawerOpen}
        onClose={() => setIsNotifDrawerOpen(false)}
        notifications={notifications}
        onMarkAllRead={handleMarkAllNotifsRead}
      />
    </div>
    </DynamicBackground>
  );
}
