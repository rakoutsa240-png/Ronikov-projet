import type { FuelType, ReportKind, StationReport } from './types';

export const REPORT_KINDS: ReportKind[] = ['NO_FUEL', 'LONG_QUEUE', 'WRONG_PRICE', 'CLOSED'];

// A report stays visible this long, unless the station's staff update the station first.
export const REPORT_WINDOW_HOURS = 3;

const SHORT_FUEL: Record<FuelType, string> = { SUPER: 'Super', GAZOLE: 'Gazole', MELANGE: 'Mélange', KEROSENE: 'Kérosène' };

export const REPORT_CHOICES: Record<ReportKind, string> = {
  NO_FUEL: "Plus d'essence",
  LONG_QUEUE: 'Longue file',
  WRONG_PRICE: 'Prix faux',
  CLOSED: 'Station fermée',
};

export function reportLabel(report: Pick<StationReport, 'kind' | 'fuelType'>): string {
  if (report.kind === 'NO_FUEL') return report.fuelType ? `Plus de ${SHORT_FUEL[report.fuelType]}` : "Plus d'essence";
  if (report.kind === 'WRONG_PRICE' && report.fuelType) return `Prix du ${SHORT_FUEL[report.fuelType]} faux`;
  return REPORT_CHOICES[report.kind];
}
