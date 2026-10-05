import React, { useState, useEffect } from 'react';
import { Station, Reservation, UserRole, NotificationItem, FuelPriceGlobal, AuthUser } from './types';
import { INITIAL_STATIONS, GLOBAL_FUEL_PRICES } from './data/mockData';
import { api, ApiError } from './api';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomeView } from './components/HomeView';
import { MapView } from './components/MapView';
import { StationDetailView } from './components/StationDetailView';
import { HistoryView } from './components/HistoryView';
import { ProDashboard } from './components/ProDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { PremiumView } from './components/PremiumView';
import { UserProfileView } from './components/UserProfileView';
import { ReservationModal } from './components/ReservationModal';
import { AuthModal } from './components/AuthModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { DynamicBackground } from './components/DynamicBackground';


export default function App() {
  // Everything comes from the API; the demo data is only shown until it answers.
  const [stations, setStations] = useState<Station[]>(INITIAL_STATIONS);
  // Tickets and notifications belong to the signed-in account and only come from the API.
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [staffReservations, setStaffReservations] = useState<Reservation[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [globalPrices, setGlobalPrices] = useState<FuelPriceGlobal[]>(GLOBAL_FUEL_PRICES);

  // Load stations and official prices.
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([api.stations(controller.signal), api.prices(controller.signal)])
      .then(([apiStations, apiPrices]) => {
        setStations(apiStations);
        setGlobalPrices(apiPrices);
      })
      .catch((e) => {
        if (!controller.signal.aborted) console.warn('API unavailable, using local data', e);
      });
    return () => controller.abort();
  }, []);

  // Stock changes after every booking, cancellation or validation.
  const refreshStations = () => {
    api
      .stations()
      .then(setStations)
      .catch((e) => console.warn('Could not refresh stations', e));
  };

  const [activeTab, setActiveTab] = useState<string>('home');
  const [selectedStation, setSelectedStation] = useState<Station | null>(stations[0] || null);
  // The signed-in account comes from the API, which alone decides the role.
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
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
        if (!controller.signal.aborted) console.warn('Could not load the signed-in user', e);
      });
    return () => controller.abort();
  }, []);

  const handleAuthenticated = (user: AuthUser) => {
    setCurrentUser(user);
    if (user.role === 'STATION_PRO') setActiveTab('pro');
    if (user.role === 'ADMIN') setActiveTab('admin');
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (e) {
      console.warn('Logout request failed', e);
    }
    setCurrentUser(null);
    setActiveTab('home');
  };

  // Load the account's tickets and notifications, and the tickets staff can see.
  const managedStationId = currentUser?.managedStationIds[0];
  const loadAccountData = () => {
    if (!currentUser) {
      setReservations([]);
      setNotifications([]);
      setStaffReservations([]);
      return;
    }
    api.myReservations().then(setReservations).catch((e) => console.warn('Could not load reservations', e));
    api.notifications().then(setNotifications).catch((e) => console.warn('Could not load notifications', e));
    const staffRequest =
      currentUser.role === 'ADMIN'
        ? api.allReservations()
        : currentUser.role === 'STATION_PRO' && managedStationId
          ? api.stationReservations(managedStationId)
          : Promise.resolve([]);
    staffRequest.then(setStaffReservations).catch((e) => console.warn('Could not load station reservations', e));
  };
  useEffect(loadAccountData, [currentUser?.id, currentUser?.role, managedStationId]);

  // Leave the Pro or Admin space when the account may not see it (signed out, or another role).
  useEffect(() => {
    if ((activeTab === 'pro' && !canUsePro) || (activeTab === 'admin' && userRole !== 'ADMIN')) {
      setActiveTab('home');
    }
  }, [activeTab, canUsePro, userRole]);

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

  // Open booking modal for a station
  // Booking needs an account: the ticket is tied to it.
  const handleOpenBooking = (station: Station) => {
    setSelectedStation(station);
    if (currentUser) setIsBookingModalOpen(true);
    else setIsAuthModalOpen(true);
  };

  // Open detail view for a station
  const handleViewStationDetails = (station: Station) => {
    setSelectedStation(station);
    setActiveTab('station-detail');
  };

  // The API created the ticket: show it, then refresh stock and notifications.
  const handleCompleteReservation = (newReservation: Reservation) => {
    setReservations((prev) => [newReservation, ...prev]);
    refreshStations();
    api.notifications().then(setNotifications).catch(() => {});
  };

  // Cancel reservation: the API gives the litres back to the station.
  const handleCancelReservation = async (resId: string) => {
    try {
      const cancelled = await api.cancelReservation(resId);
      setReservations((prev) => prev.map((r) => (r.id === resId ? cancelled : r)));
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
  const handleRequestPremium = async (): Promise<string | null> => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return null;
    }
    try {
      return (await api.requestPremium()).message;
    } catch (e) {
      return e instanceof ApiError ? e.message : 'Serveur RONIKOV injoignable. Réessayez.';
    }
  };

  // Mark all notifications read
  const handleMarkAllNotifsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (currentUser) api.markNotificationsRead().catch((e) => console.warn('Could not mark notifications read', e));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <DynamicBackground>
      <div className="min-h-screen text-slate-900 flex flex-col justify-between selection:bg-amber-400 selection:text-black">
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
        globalPrices={globalPrices}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {activeTab === 'home' && (
          <HomeView
            stations={stations}
            onNavigateMap={() => setActiveTab('map')}
            onBookStation={handleOpenBooking}
            onViewStation={handleViewStationDetails}
            onNavigatePro={() => {
              if (canUsePro) setActiveTab('pro');
              else setIsAuthModalOpen(true);
            }}
            onNavigateProfile={() => setActiveTab('profile')}
          />
        )}

        {activeTab === 'map' && (
          <MapView
            stations={stations}
            selectedStation={selectedStation}
            onSelectStation={setSelectedStation}
            onBookStation={handleOpenBooking}
            onViewStationDetails={handleViewStationDetails}
          />
        )}

        {activeTab === 'station-detail' && (
          <StationDetailView
            station={selectedStation}
            onBack={() => setActiveTab('map')}
            onBook={handleOpenBooking}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            reservations={reservations}
            onCancelReservation={handleCancelReservation}
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
            userName={userName}
            userRole={userRole}
            isPremium={isUserPremium}
            reservations={reservations}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onNavigateToMap={() => setActiveTab('map')}
          />
        )}

        {activeTab === 'pro' && (
          <ProDashboard
            managedStation={stations.find((s) => s.id === managedStationId) ?? stations[0]}
            reservations={staffReservations}
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
            onUpdateGlobalPrices={handleUpdateGlobalPrices}
            currentUserId={currentUser?.id}
          />
        )}
      </main>

      {/* Footer */}
      <Footer />

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
        onClose={() => setIsAuthModalOpen(false)}
        onAuthenticated={handleAuthenticated}
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
