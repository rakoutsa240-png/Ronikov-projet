import { describe, expect, it } from 'vitest';
import { INITIAL_STATIONS } from './data/mockData';
import { buildDailySeries } from './priceHistory';

const station = INITIAL_STATIONS[0];
const now = new Date('2026-10-05T12:00:00');

describe('buildDailySeries', () => {
  it('keeps each price until the next change', () => {
    const series = buildDailySeries(
      [
        { fuelType: 'SUPER', pricePerLiter: 700, effectiveFrom: new Date('2026-09-01T08:00:00').toISOString() },
        { fuelType: 'SUPER', pricePerLiter: 725, effectiveFrom: new Date('2026-10-03T08:00:00').toISOString() },
      ],
      station,
      7,
      now,
    );
    expect(series).toHaveLength(7);
    expect(series.map((p) => p.SUPER)).toEqual([700, 700, 700, 700, 725, 725, 725]);
    expect(series.at(-1)?.date).toBe("Aujourd'hui");
  });

  it("uses the station's current price for a fuel with no history", () => {
    const series = buildDailySeries([], station, 7, now);
    expect(series.every((p) => p.GAZOLE === station.stock.GAZOLE.pricePerLiter)).toBe(true);
  });
});
