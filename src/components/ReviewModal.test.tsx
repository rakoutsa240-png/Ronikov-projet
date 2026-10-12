import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Reservation } from '../types';
import { ReviewModal } from './ReviewModal';

const served: Reservation = {
  id: 'r1',
  code: 'RNK-AB7K-Q3',
  stationId: 'st-01',
  stationName: 'Total Bè',
  stationAddress: 'Bd du 13 Janvier',
  fuelType: 'GAZOLE',
  fuelLabel: 'Gazole',
  liters: 10,
  pricePerLiter: 680,
  totalAmountXOF: 6950,
  serviceFeeXOF: 150,
  paymentMethod: 'TMONEY',
  phonePayment: '+22890000001',
  status: 'VALIDATED',
  createdAt: new Date().toISOString(),
  expiresAt: new Date().toISOString(),
  validatedAt: new Date().toISOString(),
  userName: 'Kofi Mensah',
  userPhone: '+22890000001',
  servedBy: 'Kossi',
  review: null,
};

afterEach(() => vi.unstubAllGlobals());

describe('ReviewModal', () => {
  it('sends the station and attendant marks with the comment', async () => {
    const review = { stationRating: 4, attendantRating: 1, comment: 'Impoli', createdAt: new Date().toISOString() };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(review), { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    const onReviewed = vi.fn();
    render(<ReviewModal reservation={served} onClose={() => {}} onReviewed={onReviewed} />);

    // A station mark is required.
    fireEvent.click(screen.getByText('Envoyer mon avis'));
    expect(screen.getByRole('alert').textContent).toMatch(/note pour la station/);
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole('radio', { name: /4 sur 5/ })[0]);
    fireEvent.click(screen.getAllByRole('radio', { name: /1 sur 5/ })[1]);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Impoli' } });
    fireEvent.click(screen.getByText('Envoyer mon avis'));

    await waitFor(() => expect(onReviewed).toHaveBeenCalledWith('r1', review));
    expect(fetchMock.mock.calls[0][0]).toContain('/api/reservations/r1/review');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ stationRating: 4, attendantRating: 1, comment: 'Impoli' });
    expect(screen.getByRole('status').textContent).toMatch(/gérant de la station est prévenu/);
  });

  it('only asks about the station when nobody is known to have served', () => {
    render(<ReviewModal reservation={{ ...served, servedBy: null }} onClose={() => {}} onReviewed={() => {}} />);
    expect(screen.getAllByRole('radiogroup')).toHaveLength(1);
  });
});
