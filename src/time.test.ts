import { describe, expect, it } from 'vitest';
import { isStale, timeAgo } from './time';

describe('timeAgo', () => {
  const now = new Date('2026-10-08T12:00:00Z').getTime();
  it('says how long ago, in French', () => {
    expect(timeAgo('2026-10-08T11:59:40Z', now)).toBe("à l'instant");
    expect(timeAgo('2026-10-08T11:48:00Z', now)).toBe('il y a 12 min');
    expect(timeAgo('2026-10-08T09:00:00Z', now)).toBe('il y a 3 h');
    expect(timeAgo('2026-10-07T09:00:00Z', now)).toBe('hier');
    expect(timeAgo('2026-10-01T09:00:00Z', now)).toBe('le 1 oct.');
  });
  it('flags old updates', () => {
    expect(isStale('2026-10-08T07:00:00Z', now)).toBe(false);
    expect(isStale('2026-10-08T05:00:00Z', now)).toBe(true);
    expect(isStale(undefined, now)).toBe(false);
  });
});
