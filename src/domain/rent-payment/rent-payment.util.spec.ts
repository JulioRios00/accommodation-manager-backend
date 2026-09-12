import { deriveDueDate, daysOverdue } from './rent-payment.util';

describe('deriveDueDate', () => {
  it('combines month + paymentDueDay into a date', () => {
    expect(deriveDueDate('2026-09', 15)).toEqual(new Date(2026, 8, 15));
  });

  it('falls back to the 1st when paymentDueDay is null', () => {
    expect(deriveDueDate('2026-09', null)).toEqual(new Date(2026, 8, 1));
  });
});

describe('daysOverdue', () => {
  it('is 0 on the due date itself', () => {
    const due = new Date(2026, 8, 5);
    expect(daysOverdue(due, new Date(2026, 8, 5))).toBe(0);
  });

  it('is 0 before the due date (never negative)', () => {
    const due = new Date(2026, 8, 5);
    expect(daysOverdue(due, new Date(2026, 8, 1))).toBe(0);
  });

  it('counts whole days past the due date', () => {
    const due = new Date(2026, 8, 5);
    expect(daysOverdue(due, new Date(2026, 8, 9))).toBe(4);
  });
});
