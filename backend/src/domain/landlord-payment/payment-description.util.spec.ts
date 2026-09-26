import { paymentDescription } from './payment-description.util';

describe('paymentDescription', () => {
  it('formats as RENT-SAMS-<year>-PROP<code>', () => {
    expect(paymentDescription('2026-09', '61RR')).toBe('RENT-SAMS-2026-PROP61RR');
  });

  it('uses the rent period year, not today\'s date', () => {
    expect(paymentDescription('2024-01', '52CV')).toBe('RENT-SAMS-2024-PROP52CV');
  });
});
