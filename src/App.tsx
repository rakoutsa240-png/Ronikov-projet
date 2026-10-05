import React, { useState, useEffect } from 'react';
import { Station, Reservation, UserRole, NotificationItem, FuelPriceGlobal, AuthUser } from './types';
import { INITIAL_STATIONS, INITIAL_RESERVATIONS, INITIAL_NOTIFICATIONS, GLOBAL_FUEL_PRICES } from './data/mockData';
import { api } from './api';
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

const STATIONS_KEY = 'ronikov_stations_v2';
const RESERVATIONS_KEY = 'ronikov_reservations_v2';
const NOTIFICATIONS_KEY = 'ronikov_notifications_v2';
const GLOBAL_PRICES_KEY = 'ronikov_global_prices_v2';

export default function App() {
  const [stations, setStations] = useState<Station[]>(() => {
    try {
      const saved = localStorage.getItem(STATIONS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved stations', e);
    }
    return INITIAL_STATIONS;
  });

  const [reservations, setReservations] = useState<Reservation[]>(() => {
    try {
      const saved = localStorage.getItem(RESERVATIONS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved reservations', e);
    }
    return INITIAL_RESERVATIONS;
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const saved = localStorage.getItem(NOTIFICATIONS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved notifications', e);
    }
    return INITIAL_NOTIFICATIONS;
  });

  const [globalPrices, setGlobalPrices] = useState<FuelPriceGlobal[]>(() => {
    try {
      const saved = localStorage.getItem(GLOBAL_PRICES_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved global prices', e);
    }
    return GLOBAL_FUEL_PRICES;
  });

  // Stations and official prices come from the API. The saved copy above is only shown
  // until it answers, or kept as is when the API cannot be reached.
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

  // Save changes to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STATIONS_KEY, JSON.stringify(stations));
    } catch (e) {
      console.error('Failed to save stations', e);
    }
  }, [stations]);

  useEffect(() => {
    try {
      localStorage.setItem(RESERVATIONS_KEY, JSON.stringify(reservations));
    } catch (e) {
      console.error('Failed to save reservations', e);
    }
  }, [reservations]);

  useEffect(() => {
    try {
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
    } catch (e) {
      console.error('Failed to save notifications', e);
    }
  }, [notifications]);

  useEffect(() => {
    try {
      localStorage.setItem(GLOBAL_PRICES_KEY, JSON.stringify(globalPrices));
    } catch (e) {
      console.error('Failed to save global prices', e);
    }
  }, [globalPrices]);

  const [activeTab, setActiveTab] = useState<string>('home');
  const [selectedStation, setSelectedStation] = useState<Station | null>(stations[0] || null);
  // The signed-in account comes from the API, which alone decides the role.
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isDemoPremium, setIsDemoPremium] = useState<boolean>(false);
  const userRole: UserRole = currentUser?.role ?? 'CLIENT';
  const userName = currentUser?.name ?? '';
  const isUserPremium = Boolean(currentUser?.isPremium) || isDemoPremium;
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
  const handleOpenBooking = (station: Station) => {
    setSelectedStation(station);
    setIsBookingModalOpen(true);
  };

  // Open detail view for a station
  const handleViewStationDetails = (station: Station) => {
    setSelectedStation(station);
    setActiveTab('station-detail');
  };

  // On completed reservation
  const handleCompleteReservation = (newReservation: Reservation) => {
    setReservations((prev) => [newReservation, ...prev]);

    // Update station stock automatically
    setStations((prev) =>
      prev.map((s) => {
        if (s.id === newReservation.stationId) {
          const fuelStock = s.stock[newReservation.fuelType];
          const newAvailable = Math.max(0, fuelStock.availableLiters - newReservation.liters);
          return {
            ...s,
            stock: {
              ...s.stock,
              [newReservation.fuelType]: {
                ...fuelStock,
                availableLiters: newAvailable,
                status: newAvailable < 500 ? 'LOW' : 'AVAILABLE',
              },
            },
          };
        }
        return s;
      })
    );

    // Push notification
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: 'Réservation Confirmée',
      message: `Votre code ${newReservation.code} (${newReservation.liters}L ${newReservation.fuelLabel}) est actif chez ${newReservation.stationName}.`,
      timestamp: 'À l’instant',
      read: false,
      type: 'RESERVATION',
      stationBrand: newReservation.stationBrand,
      stationName: newReservation.stationName,
    };

    setNotifications((prev) => [newNotif, ...prev]);
  };

  // Cancel reservation
  const handleCancelReservation = (resId: string) => {
    setReservations((prev) =>
      prev.map((r) => (r.id === resId ? { ...r, status: 'CANCELLED' } : r))
    );
  };

  // Validate Code in Pro Dashboard (Station Operator)
  const handleValidateCodePro = (code: string) => {
    const targetRes = reservations.find((r) => r.code.toUpperCase() === code.toUpperCase());

    if (!targetRes) {
      return { success: false, message: 'Code invalide ou inexistant dans le système RONIKOV.' };
    }

    if (targetRes.status === 'VALIDATED') {
      return {
        success: false,
        message: 'Attention: Ce code a déjà été utilisé et validé à la pompe.',
        reservation: targetRes,
      };
    }

    if (targetRes.status === 'EXPIRED' || targetRes.status === 'CANCELLED') {
      return {
        success: false,
        message: `Impossible: Ce ticket est ${targetRes.status === 'EXPIRED' ? 'expiré' : 'annulé'}.`,
        reservation: targetRes,
      };
    }

    // Mark as validated
    setReservations((prev) =>
      prev.map((r) =>
        r.id === targetRes.id
          ? { ...r, status: 'VALIDATED', validatedAt: new Date().toISOString() }
          : r
      )
    );

    return {
      success: true,
      message: `CODE VALIDE ET CONFIRMÉ ! Vous pouvez distribuer ${targetRes.liters}L de ${targetRes.fuelLabel}.`,
      reservation: { ...targetRes, status: 'VALIDATED' },
    };
  };

  // Update Station Stock in Pro Dashboard
  const handleUpdateStockPro = (stationId: string, updatedStock: Station['stock']) => {
    setStations((prev) =>
      prev.map((s) => (s.id === stationId ? { ...s, stock: updatedStock } : s))
    );
  };

  // Update Station Queue Time in Pro Dashboard
  const handleUpdateQueueTimePro = (stationId: string, newQueueTime: number) => {
    setStations((prev) =>
      prev.map((s) => (s.id === stationId ? { ...s, queueTimeMinutes: newQueueTime } : s))
    );
  };

  // Toggle Partner Status in Admin Dashboard
  const handleToggleStationPartner = (stationId: string) => {
    setStations((prev) =>
      prev.map((s) => (s.id === stationId ? { ...s, isPartner: !s.isPartner } : s))
    );
  };

  // Update National/Global Fuel Price
  const handleUpdateGlobalPrices = (updatedPrices: FuelPriceGlobal[], updateAllStations: boolean = true) => {
    setGlobalPrices(updatedPrices);
    if (updateAllStations) {
      setStations((prev) =>
        prev.map((station) => {
          const newStock = { ...station.stock };
          updatedPrices.forEach((gp) => {
            if (newStock[gp.type]) {
              newStock[gp.type] = {
                ...newStock[gp.type],
                pricePerLiter: gp.officialPriceXOF,
              };
            }
          });
          return { ...station, stock: newStock };
        })
      );
    }
  };

  // Mark all notifications read
  const handleMarkAllNotifsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
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
            onActivatePremium={() => setIsDemoPremium(true)}
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
            managedStation={stations.find((s) => s.id === currentUser?.managedStationIds[0]) ?? stations[0]}
            reservations={reservations}
            onValidateCode={handleValidateCodePro}
            onUpdateStock={handleUpdateStockPro}
            onUpdateQueueTime={handleUpdateQueueTimePro}
          />
        )}

        {activeTab === 'admin' && (
          <AdminDashboard
            stations={stations}
            reservations={reservations}
            globalPrices={globalPrices}
            onToggleStationPartner={handleToggleStationPartner}
            onUpdateGlobalPrices={handleUpdateGlobalPrices}
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
        isUserPremium={isUserPremium}
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
