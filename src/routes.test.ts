import {describe, expect, it} from 'vitest';
import {parseHash, routeToHash} from './routes';

describe('routes', () => {
  it('gives each page its own address and reads it back', () => {
    for (const tab of ['home', 'map', 'history', 'premium', 'profile', 'pro', 'admin'] as const) {
      expect(parseHash(routeToHash({tab}))).toEqual({tab});
    }
    expect(routeToHash({tab: 'station-detail', stationId: 'st-01'})).toBe('#/station/st-01');
    expect(parseHash('#/station/st-01')).toEqual({tab: 'station-detail', stationId: 'st-01'});
  });

  it('opens the home page for an empty or unknown address', () => {
    expect(parseHash('')).toEqual({tab: 'home'});
    expect(parseHash('#')).toEqual({tab: 'home'});
    expect(parseHash('#/nimporte-quoi')).toEqual({tab: 'home'});
  });
});
