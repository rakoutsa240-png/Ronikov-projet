// Each page has its own address (#/carte, #/station/st-01…), so the phone's back button,
// a refresh or a shared link land on the same page.
export type Tab = 'home' | 'map' | 'station-detail' | 'history' | 'premium' | 'profile' | 'pro' | 'admin';

export interface Route {
  tab: Tab;
  stationId?: string;
}

const PATHS: Record<Exclude<Tab, 'station-detail'>, string> = {
  home: '',
  map: 'carte',
  history: 'reservations',
  premium: 'premium',
  profile: 'profil',
  pro: 'pro',
  admin: 'admin',
};

export function routeToHash({ tab, stationId }: Route): string {
  if (tab === 'station-detail') return stationId ? `#/station/${encodeURIComponent(stationId)}` : '#/carte';
  return `#/${PATHS[tab]}`;
}

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').replace(/\/$/, '');
  const station = path.match(/^station\/(.+)$/);
  if (station) return { tab: 'station-detail', stationId: decodeURIComponent(station[1]) };
  const tab = (Object.keys(PATHS) as (keyof typeof PATHS)[]).find((t) => PATHS[t] === path);
  return { tab: tab ?? 'home' };
}
