import {render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import App from './App';
import {GLOBAL_FUEL_PRICES, INITIAL_STATIONS} from './data/mockData';

function mockApi(stations: unknown, prices: unknown) {
  const fetchMock = vi.fn(async (url: string) => {
    const body = url.endsWith('/api/stations') ? stations : url.endsWith('/api/prices') ? prices : null;
    return new Response(JSON.stringify(body), {status: body ? 200 : 404});
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('renders the home page with the main navigation', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    render(<App />);
    expect(screen.getAllByText('Accueil').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Stations & Carte').length).toBeGreaterThan(0);
  });

  it('shows the stations returned by the API', async () => {
    const fromApi = [{...INITIAL_STATIONS[0], name: 'Station venue de l’API'}, ...INITIAL_STATIONS.slice(1)];
    const fetchMock = mockApi(fromApi, GLOBAL_FUEL_PRICES);
    render(<App />);
    expect((await screen.findAllByText('Station venue de l’API')).length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledWith('/api/stations', expect.anything());
    expect(fetchMock).toHaveBeenCalledWith('/api/prices', expect.anything());
  });

  it('keeps the local data when the API cannot be reached', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    render(<App />);
    await vi.waitFor(() => expect(warn).toHaveBeenCalled());
    expect(screen.getAllByText(INITIAL_STATIONS[0].name).length).toBeGreaterThan(0);
    warn.mockRestore();
  });
});
