export type FuelType = 'SUPER' | 'GAZOLE' | 'MELANGE' | 'KEROSENE';

export interface FuelStock {
  availableLiters: number; // litres that can still be booked
  reservedLiters?: number; // held by pending tickets, still in the tank (API only)
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
  checkedAt?: string; // ISO date the staff last updated or confirmed stock, prices or waiting time (API only)
  reports?: StationReport[]; // client reports since then, within the last few hours (API only)
  rating?: StationRating | null; // clients' average mark, null before the first review (API only)
}

// Average of the clients' marks for a station (1 to 5 stars).
export interface StationRating {
  average: number; // one decimal, e.g. 4.3
  count: number;
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
  totalAmountXOF: number; // what was paid, after any fuel voucher
  serviceFeeXOF: number;
  voucherDiscountXOF?: number; // taken off by a fuel voucher, 0 without one
  paymentMethod: PaymentMethod;
  phonePayment: string;
  status: ReservationStatus;
  createdAt: string; // ISO String
  expiresAt: string; // ISO String
  validatedAt?: string;
  userName: string;
  userPhone: string;
  qrPayload?: string; // signed QR content, only sent to the ticket's owner
  servedBy?: string | null; // first name of whoever validated the ticket, only sent to its owner
  servedByPhotoUrl?: string | null; // their profile photo, so the client recognises them
  userPhotoUrl?: string | null; // the client's profile photo, so staff recognise them at the pump
  review?: TicketReview | null; // the owner's review of a served ticket, only sent to its owner
}

// What a client said about a served ticket: the station, and the person who served them.
export interface TicketReview {
  stationRating: number; // 1 to 5
  attendantRating: number | null; // 1 to 5, null when nobody is known to have served
  comment: string | null;
  createdAt: string; // ISO date
}

// A review as the station's manager or an admin sees it (GET /api/stations/:id/reviews, /api/reviews).
export interface StationReview extends TicketReview {
  id: number;
  stationId: string;
  stationName: string;
  clientName: string; // "Afi K." for a manager, the full name for an admin
  attendantId: string | null;
  attendantName: string | null;
  attendantPhotoUrl: string | null;
  fuelLabel: string;
  liters: number;
  servedAt: string | null; // ISO date the ticket was validated
  isHidden: boolean; // hidden by an admin: only admins still see it
}

// One staff member's marks from the clients they served.
export interface AttendantRating {
  attendantId: string;
  attendantName: string;
  attendantPhotoUrl: string | null;
  average: number;
  count: number;
  lowCount: number; // marks of 1 or 2 stars
}

export interface ReviewsSummary {
  reviews: StationReview[];
  attendants: AttendantRating[];
}

// ATTENDANT: a pump attendant, who only validates tickets at their station (added by its manager).
export type UserRole = 'CLIENT' | 'STATION_PRO' | 'ADMIN' | 'ATTENDANT';

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
  timestamp: string; // ISO date from the API, or a ready-made label in the demo data
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

// The signed-in user as returned by GET /api/me.
export interface AuthUser {
  id: string;
  name: string;
  phone: string; // +228XXXXXXXX
  email: string | null;
  role: UserRole;
  isPremium: boolean;
  managedStationIds: string[];
  mustChangePassword: boolean; // signed in with a temporary password from an admin
  photoUrl: string | null; // profile photo, null when the person has not added one
}

// A station's pump attendant as its manager sees it (GET /api/stations/:id/attendants).
export interface Attendant {
  id: string;
  name: string;
  phone: string;
  isSuspended: boolean;
  mustChangePassword: boolean; // has not yet replaced the temporary password
  photoUrl: string | null;
}

// An account as the admin console lists it (GET /api/users).
export interface AdminUser extends AuthUser {
  createdAt: string;
  isSuspended: boolean;
}

// A client asking to become the manager of a station.
export type ManagerRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface ManagerRequest {
  id: number;
  userId: string;
  userName: string;
  userPhone: string;
  stationId: string;
  stationName: string;
  message: string | null;
  status: ManagerRequestStatus;
  createdAt: string; // ISO date
}

// One line of the admin's action log (GET /api/audit).
export interface AuditEntry {
  id: number;
  action: string; // e.g. stock.update, user.update
  target: string; // e.g. station:st-01:SUPER, user:<id>
  details: Record<string, unknown>;
  actorName: string | null; // null once the account is deleted
  actorPhone: string | null;
  createdAt: string; // ISO date
}

// One price a station started charging (GET /api/stations/:id/price-history).
export interface PriceChange {
  fuelType: FuelType;
  pricePerLiter: number;
  effectiveFrom: string; // ISO date
}

// What a client can report about a station.
export type ReportKind = 'NO_FUEL' | 'LONG_QUEUE' | 'WRONG_PRICE' | 'CLOSED';

// Recent client reports of one kind (and fuel, for NO_FUEL) at a station.
export interface StationReport {
  kind: ReportKind;
  fuelType: FuelType | null;
  count: number;
  lastAt: string; // ISO date of the latest one
}

// A fuel voucher. AVAILABLE: can be used for a booking. UNCLAIMED: a contest code nobody typed yet.
// A station's voucher (validStationId) works only there; a Pleino one (null) at every partner station.
export type VoucherSource = 'GIFT' | 'CONTEST' | 'LOYALTY';
export type VoucherStatus = 'AVAILABLE' | 'UNCLAIMED' | 'USED' | 'EXPIRED' | 'CANCELLED';

export interface Voucher {
  id: string;
  code: string;
  amountXOF: number;
  source: VoucherSource;
  label: string | null;
  status: VoucherStatus;
  validStationId: string | null;
  validStationName: string | null;
  expiresAt: string; // ISO date
  createdAt: string; // ISO date
  usedAt: string | null;
  reservationId: string | null; // the booking it was used for
  usedStationName: string | null; // where it was used
}

// GET /api/vouchers/mine: the client's vouchers and how far they are from the next loyalty one.
export interface MyVouchers {
  vouchers: Voucher[];
  loyalty: { litersServed: number; stepLiters: number; amountXOF: number; litersToNext: number };
}

// A voucher as the admin console lists it (GET /api/vouchers).
export interface AdminVoucher extends Voucher {
  ownerName: string | null;
  ownerPhone: string | null;
  claimedAt: string | null;
}
