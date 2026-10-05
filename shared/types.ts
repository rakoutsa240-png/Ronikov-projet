export type FuelType = 'SUPER' | 'GAZOLE' | 'MELANGE' | 'KEROSENE';

export interface FuelStock {
  availableLiters: number;
  maxCapacityLiters: number;
  pricePerLiter: number; // in XOF (FCFA)
  status: 'AVAILABLE' | 'LOW' | 'OUT_OF_STOCK';
}

export interface Station {
  id: string;
  name: string;
  brand: 'TotalEnergies' | 'Shell' | 'Sanol' | 'Cap' | 'Somayaf' | 'Yatt & Co' | 'Oryx' | 'Togo-Petro';
  district: string; // e.g. 'Agoè-Nyivé', 'Tokoin', 'Hedzranawoé', 'Bè', 'Adidogomé', 'Port'
  city: string; // 'Lomé', 'Tsévié', 'Atakpamé', 'Kara'
  address: string;
  lat: number;
  lng: number;
  phone: string;
  operatingHours: string;
  amenities: string[]; // e.g. ['Boutique 24/7', 'Gonflage', 'Vidange', 'Lavage', 'Distributeur DAB']
  queueTimeMinutes: number;
  isPartner: boolean;
  stock: Record<FuelType, FuelStock>;
}

export type PaymentMethod = 'MIXX_BY_YAS' | 'MOOV_MONEY' | 'CARD' | 'TMONEY' | 'FLOOZ';

export type ReservationStatus = 'PENDING' | 'VALIDATED' | 'EXPIRED' | 'CANCELLED';

export interface Reservation {
  id: string;
  code: string; // e.g. RNK-8942-X7
  stationId: string;
  stationName: string;
  stationBrand?: string;
  stationAddress: string;
  fuelType: FuelType;
  fuelLabel: string;
  liters: number;
  pricePerLiter: number;
  totalAmountXOF: number;
  serviceFeeXOF: number;
  paymentMethod: PaymentMethod;
  phonePayment: string;
  status: ReservationStatus;
  createdAt: string; // ISO String
  expiresAt: string; // ISO String
  validatedAt?: string;
  userName: string;
  userPhone: string;
}

export type UserRole = 'CLIENT' | 'STATION_PRO' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: UserRole;
  managedStationId?: string;
  isPremium: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'RESERVATION' | 'STOCK' | 'SYSTEM' | 'PREMIUM';
  stationBrand?: string;
  stationName?: string;
}

export interface FuelPriceGlobal {
  type: FuelType;
  label: string;
  officialPriceXOF: number;
  avgAvailabilityPercent: number;
}
