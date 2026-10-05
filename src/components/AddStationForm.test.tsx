import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {api} from '../api';
import {INITIAL_STATIONS} from '../data/mockData';
import {AddStationForm} from './AddStationForm';

afterEach(() => vi.restoreAllMocks());

const fill = (placeholder: string, value: string) =>
  fireEvent.change(screen.getByPlaceholderText(placeholder), {target: {value}});

describe('AddStationForm', () => {
  it('sends the station with its GPS position and starting stock', async () => {
    const created = INITIAL_STATIONS[0];
    const createStation = vi.spyOn(api, 'createStation').mockResolvedValue(created);
    const onAdded = vi.fn();
    render(<AddStationForm onAdded={onAdded} onClose={() => {}} />);

    fill('Oryx Adidogomé', 'Oryx Bè');
    fill('Adidogomé', 'Bè');
    fill('Route de Kpalimé, près du marché', 'Rue de Bè');
    fill('+228 22 00 00 00', '+228 22 11 11 11');
    fill('Latitude (ex. 6.1725)', '6,135');
    fill('Longitude (ex. 1.2314)', '1.24');
    fireEvent.change(screen.getAllByRole('spinbutton')[1], {target: {value: '4000'}});
    fireEvent.click(screen.getByRole('button', {name: /Ajouter la station/}));

    await waitFor(() => expect(onAdded).toHaveBeenCalledWith(created));
    expect(createStation.mock.calls[0][0]).toMatchObject({
      name: 'Oryx Bè',
      lat: 6.135,
      lng: 1.24,
      fuels: {GAZOLE: {stockLiters: 4000}},
    });
  });

  it('asks for the position before sending', () => {
    const createStation = vi.spyOn(api, 'createStation');
    render(<AddStationForm onAdded={() => {}} onClose={() => {}} />);
    fireEvent.submit(screen.getByRole('button', {name: /Ajouter la station/}).closest('form')!);
    expect(screen.getByRole('alert').textContent).toMatch(/position GPS/);
    expect(createStation).not.toHaveBeenCalled();
  });
});
