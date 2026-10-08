import { describe, expect, it } from 'vitest';
import { describeEntry } from './AuditLogPanel';
import type { AuditEntry } from '../types';

const entry = (action: string, target: string, details: Record<string, unknown>): AuditEntry => ({
  id: 1,
  action,
  target,
  details,
  actorName: 'Admin',
  actorPhone: '+22890000003',
  createdAt: '2026-10-08T10:00:00.000Z',
});
const station = (id: string) => (id === 'st-01' ? 'Total Bè' : id);
const user = (id: string) => (id === 'u1' ? 'Ama (+22890000002)' : 'un compte');

describe('describeEntry', () => {
  it('turns logged actions into plain sentences', () => {
    expect(
      describeEntry(
        entry('stock.update', 'station:st-01:SUPER', {
          before: { availableLiters: 100, maxCapacityLiters: 1000, pricePerLiterXof: 680 },
          after: { availableLiters: 500, maxCapacityLiters: 1000, pricePerLiterXof: 680 },
        }),
        station,
        user,
      ),
    ).toBe('Stock mis à jour : Super Sans Plomb à Total Bè, stock 100 → 500 L');
    expect(describeEntry(entry('user.update', 'user:u1', { isSuspended: true }), station, user)).toBe(
      'Ama (+22890000002) : compte suspendu',
    );
    expect(describeEntry(entry('manager.accept', 'user:u1', { stationId: 'st-01' }), station, user)).toBe(
      'Ama (+22890000002) accepté comme gérant de Total Bè',
    );
    expect(describeEntry(entry('something.new', 'x:1', {}), station, user)).toBe('something.new (x:1)');
  });
});
