import {fireEvent, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {INITIAL_STATIONS} from '../data/mockData';
import type {Reservation} from '../types';
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

function goToPayment() {
  fireEvent.click(screen.getByText('Continuer vers le récapitulatif'));
  fireEvent.click(screen.getByText('Procéder au Paiement'));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ReservationModal', () => {
  it('books through the API and shows the code it returns', async () => {
    const fetchMock = vi.fn(async () => Response.json(ticket, {status: 201}));
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
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/reservations');
    expect(JSON.parse(String(init.body))).toEqual({
      stationId: station.id,
      fuelType: 'SUPER',
      liters: 10,
      paymentMethod: 'MIXX_BY_YAS',
      paymentPhone: '90 00 00 01',
    });
  });

  it('shows why the API refused the booking', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({error: 'Stock insuffisant : 4 L disponibles'}, {status: 409})));
    render(<ReservationModal station={station} isOpen onClose={() => {}} onCompleteReservation={() => {}} />);
    goToPayment();
    fireEvent.click(screen.getByText(/^Payer /));
    expect((await screen.findByRole('alert')).textContent).toBe('Stock insuffisant : 4 L disponibles');
  });

  it('renders nothing while closed', () => {
    const {container} = render(
      <ReservationModal station={station} isOpen={false} onClose={() => {}} onCompleteReservation={() => {}} />,
    );
    expect(container.innerHTML).toBe('');
  });
});
