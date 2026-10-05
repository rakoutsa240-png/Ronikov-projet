import {fireEvent, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import App from './App';
import {GLOBAL_FUEL_PRICES, INITIAL_STATIONS} from './data/mockData';

function mockApi(stations: unknown, prices: unknown, routes: Record<string, () => Response> = {}) {
  const fetchMock = vi.fn(async (url: string) => {
    const path = url.replace(/^.*\/api/, '');
    if (routes[path]) return routes[path]();
    if (path === '/me') return Response.json({error: 'Connexion requise'}, {status: 401});
    const body = path === '/stations' ? stations : path === '/prices' ? prices : null;
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

  it('only shows the Pro space once the server says the account is a manager', async () => {
    const manager = {
      id: 'u1',
      name: 'Ama Gérante',
      phone: '+22890000002',
      email: null,
      role: 'STATION_PRO',
      isPremium: false,
      managedStationIds: ['st-01'],
    };
    const fetchMock = mockApi(INITIAL_STATIONS, GLOBAL_FUEL_PRICES, {
      '/auth/login': () => Response.json(manager),
    });
    render(<App />);
    expect(screen.queryByText('Espace Pro')).toBeNull();

    fireEvent.click(screen.getAllByText('Se connecter')[0]);
    fireEvent.change(screen.getByPlaceholderText('90 00 00 00'), {target: {value: '90000002'}});
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {target: {value: 'ronikov-demo'}});
    fireEvent.click(screen.getByRole('button', {name: /Se Connecter/}));

    expect((await screen.findAllByText('Espace Pro')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ama Gérante').length).toBeGreaterThan(0);
    const loginCall = fetchMock.mock.calls.find(([url]) => url === '/api/auth/login') as unknown as [string, RequestInit];
    expect(JSON.parse(String(loginCall[1].body))).toEqual({phone: '90000002', password: 'ronikov-demo'});
  });

  it('shows the server error when sign-in fails', async () => {
    mockApi(INITIAL_STATIONS, GLOBAL_FUEL_PRICES, {
      '/auth/login': () => Response.json({error: 'Numéro ou mot de passe incorrect'}, {status: 401}),
    });
    render(<App />);
    fireEvent.click(screen.getAllByText('Se connecter')[0]);
    fireEvent.change(screen.getByPlaceholderText('90 00 00 00'), {target: {value: '90000002'}});
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {target: {value: 'faux'}});
    fireEvent.click(screen.getByRole('button', {name: /Se Connecter/}));
    expect((await screen.findByRole('alert')).textContent).toBe('Numéro ou mot de passe incorrect');
    expect(screen.queryByText('Espace Pro')).toBeNull();
  });
});
