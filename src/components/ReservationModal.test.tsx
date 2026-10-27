import {fireEvent, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {INITIAL_STATIONS} from '../data/mockData';
import type {Reservation} from '../types';
import {num} from '../i18n';
import {ReservationModal} from './ReservationModal';

const station = INITIAL_STATIONS[0];

const ticket: Reservation = {
  id: 'r1',
  code: 'RNK-AB7K-Q3',
  stationId: station.id,
  stationName: station.name,
  stationBrand: station.brand,
  stationAddress: station.address,
  fuelType: 'SUPER',
  fuelLabel: 'Super Sans Plomb',
  liters: 10,
  pricePerLiter: 725,
  totalAmountXOF: 7400,
  serviceFeeXOF: 150,
  paymentMethod: 'MIXX_BY_YAS',
  phonePayment: '+22890000001',
  status: 'PENDING',
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 7_200_000).toISOString(),
  userName: 'Kofi Mensah',
  userPhone: '+22890000001',
  qrPayload: 'RNK1.r1.AB7KQ3.sig',
};

const noVouchers = {vouchers: [], loyalty: {litersServed: 0, stepLiters: 100, amountXOF: 1000, litersToNext: 100}};

// The API: the client's vouchers, then the booking itself.
function apiMock(booking: () => Response, vouchers: unknown = noVouchers) {
  return vi.fn(async (url: string) => (String(url).endsWith('/vouchers/mine') ? Response.json(vouchers) : booking()));
}

// Only the booking requests, without the voucher lookups.
const bookings = (fetchMock: ReturnType<typeof apiMock>) =>
  (fetchMock.mock.calls as unknown as [string, RequestInit][]).filter(([url]) => url === '/api/reservations');

function goToPayment() {
  fireEvent.click(screen.getByText('Continuer vers le paiement'));
}

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('ReservationModal', () => {
  it('books through the API and shows the code it returns', async () => {
    const fetchMock = apiMock(() => Response.json(ticket, {status: 201}));
    vi.stubGlobal('fetch', fetchMock);
    const onComplete = vi.fn();
    render(
      <ReservationModal
        station={station}
        isOpen
        onClose={() => {}}
        onCompleteReservation={onComplete}
        defaultPaymentPhone="+22890000001"
      />,
    );
    goToPayment();
    expect(screen.getByDisplayValue('90 00 00 01')).toBeTruthy();
    fireEvent.click(screen.getByText(/^Payer /));

    expect((await screen.findAllByText('RNK-AB7K-Q3')).length).toBeGreaterThan(0);
    expect(onComplete).toHaveBeenCalledWith(ticket);
    const [[, init]] = bookings(fetchMock);
    expect(JSON.parse(String(init.body))).toEqual({
      stationId: station.id,
      fuelType: 'SUPER',
      // The amount comes first: 5 000 FCFA, rounded to the litre.
      liters: Math.round(5000 / station.stock.SUPER.pricePerLiter),
      paymentMethod: 'MIXX_BY_YAS',
      paymentPhone: '90 00 00 01',
    });
  });

  it('remembers the last fuel, amount and payment for the next booking', async () => {
    const fetchMock = apiMock(() => Response.json(ticket, {status: 201}));
    vi.stubGlobal('fetch', fetchMock);
    const props = {station, onClose: () => {}, onCompleteReservation: () => {}};
    const {rerender} = render(<ReservationModal {...props} isOpen />);
    fireEvent.click(screen.getByText('En litres'));
    fireEvent.click(screen.getByText('20 L'));
    goToPayment();
    fireEvent.click(screen.getByText('Flooz').closest('button')!);
    fireEvent.change(screen.getByPlaceholderText('90 00 00 00'), {target: {value: '99 11 22 33'}});
    fireEvent.click(screen.getByText(/^Payer /));
    await screen.findAllByText('RNK-AB7K-Q3');

    rerender(<ReservationModal {...props} isOpen={false} />);
    rerender(<ReservationModal {...props} isOpen />);
    expect(screen.getByText('20 Litres')).toBeTruthy();
    goToPayment();
    expect(screen.getByDisplayValue('99 11 22 33')).toBeTruthy();
    fireEvent.click(screen.getByText(/^Payer /));
    await vi.waitFor(() => expect(bookings(fetchMock)).toHaveLength(2));
    const [, init] = bookings(fetchMock)[1];
    expect(JSON.parse(String(init.body))).toMatchObject({liters: 20, paymentMethod: 'MOOV_MONEY', paymentPhone: '99 11 22 33'});
  });

  it('shows why the API refused the booking', async () => {
    vi.stubGlobal('fetch', apiMock(() => Response.json({error: 'Stock insuffisant : 4 L disponibles'}, {status: 409})));
    render(<ReservationModal station={station} isOpen onClose={() => {}} onCompleteReservation={() => {}} />);
    goToPayment();
    fireEvent.click(screen.getByText(/^Payer /));
    expect((await screen.findByRole('alert')).textContent).toBe('Stock insuffisant : 4 L disponibles');
  });

  it('takes a chosen fuel voucher off the price', async () => {
    const voucher = {
      id: '9b2f0a3e-1c4d-4e5f-8a6b-7c8d9e0f1a2b',
      code: 'BON-7KQ2-M9XA',
      amountXOF: 2000,
      source: 'GIFT',
      label: null,
      status: 'AVAILABLE',
      expiresAt: new Date(Date.now() + 86_400_000 * 10).toISOString(),
      createdAt: new Date().toISOString(),
      usedAt: null,
      reservationId: null,
      validStationId: null, // a Pleino voucher: the station is a partner
      validStationName: null,
      usedStationName: null,
    };
    const fetchMock = apiMock(() => Response.json(ticket, {status: 201}), {...noVouchers, vouchers: [voucher]});
    vi.stubGlobal('fetch', fetchMock);
    render(<ReservationModal station={station} isOpen onClose={() => {}} onCompleteReservation={() => {}} />);
    goToPayment();
    const liters = Math.round(5000 / station.stock.SUPER.pricePerLiter);
    const full = liters * station.stock.SUPER.pricePerLiter + 150;
    expect(screen.getByText(/^Payer /).textContent).toBe(`Payer ${num(full)} FCFA`);

    fireEvent.click(await screen.findByText(/^2.000 FCFA$/));
    expect(screen.getByText(/^Payer /).textContent).toBe(`Payer ${num(full - 2000)} FCFA`);
    expect(screen.getByText('Bon d’essence')).toBeTruthy();
    fireEvent.click(screen.getByText(/^Payer /));
    await screen.findAllByText('RNK-AB7K-Q3');
    expect(JSON.parse(String(bookings(fetchMock)[0][1].body))).toMatchObject({voucherId: voucher.id});
  });

  it('only offers the vouchers that work at this station', async () => {
    const elsewhere = {
      id: '1b2f0a3e-1c4d-4e5f-8a6b-7c8d9e0f1a2b',
      code: 'BON-7KQ2-M9XB',
      amountXOF: 3000,
      source: 'GIFT',
      label: null,
      status: 'AVAILABLE',
      validStationId: 'st-02',
      validStationName: 'Autre station',
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      createdAt: new Date().toISOString(),
      usedAt: null,
      reservationId: null,
      usedStationName: null,
    };
    vi.stubGlobal('fetch', apiMock(() => Response.json(ticket, {status: 201}), {...noVouchers, vouchers: [elsewhere]}));
    render(<ReservationModal station={station} isOpen onClose={() => {}} onCompleteReservation={() => {}} />);
    goToPayment();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByText('Utiliser un bon d’essence')).toBeNull();
  });

  it('renders nothing while closed', () => {
    const {container} = render(
      <ReservationModal station={station} isOpen={false} onClose={() => {}} onCompleteReservation={() => {}} />,
    );
    expect(container.innerHTML).toBe('');
  });
});
