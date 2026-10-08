import { describe, expect, it } from 'vitest';
import { maskCode, maskPhone, receiptLines } from './receipt';
import type { Reservation } from './types';

const ticket: Reservation = {
  id: '3f2a9c1e-0000-4000-8000-000000000000',
  code: 'RNK-8942-X7',
  stationId: 'st-01',
  stationName: 'Sanol Hedzranawoé',
  stationAddress: 'Bd du 30 Août',
  fuelType: 'SUPER',
  fuelLabel: 'Super Sans Plomb',
  liters: 20,
  pricePerLiter: 725,
  totalAmountXOF: 14_700,
  serviceFeeXOF: 200,
  paymentMethod: 'FLOOZ',
  phonePayment: '+22899123456',
  status: 'VALIDATED',
  createdAt: '2026-10-08T09:00:00Z',
  expiresAt: '2026-10-08T11:00:00Z',
  validatedAt: '2026-10-08T09:30:00Z',
  userName: 'Kossi',
  userPhone: '+22899123456',
};

describe('receipt', () => {
  it('never shows the full ticket code or phone number', () => {
    expect(maskCode('RNK-8942-X7')).toBe('RNK-••••-X7');
    expect(maskPhone('+22899123456')).toBe('+228 99 •• •• 56');
    const text = receiptLines(ticket).flat().join(' ');
    expect(text).not.toContain('8942');
    expect(text).not.toContain('99123456');
  });

  it('lists the amounts and the status', () => {
    const lines = Object.fromEntries(receiptLines(ticket).filter(([label]) => label && label !== 'Carburant'));
    expect(lines['Total payé']).toBe('14 700 FCFA');
    expect(lines['Frais de service']).toBe('200 FCFA');
    expect(lines['Quantité']).toBe('20 L × 725 FCFA');
    expect(lines['Statut']).toMatch(/^Servi le /);
    expect(lines['Paiement']).toContain('Moov Money');
  });
});
