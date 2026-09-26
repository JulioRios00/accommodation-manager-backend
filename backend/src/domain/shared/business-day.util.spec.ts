import { addBusinessDays, businessDaysRemaining } from './business-day.util';

describe('addBusinessDays', () => {
  it('skips the weekend from a Friday check-out (D+5 lands on the following Friday)', () => {
    const friday = new Date(2026, 8, 11); // Fri Sep 11 2026
    const deadline = addBusinessDays(friday, 5);
    expect(deadline).toEqual(new Date(2026, 8, 18)); // Fri Sep 18
    expect(deadline.getDay()).toBe(5);
  });

  it('skips the weekend from a Monday (D+5 lands on the following Monday)', () => {
    const monday = new Date(2026, 8, 14);
    expect(addBusinessDays(monday, 5)).toEqual(new Date(2026, 8, 21));
  });

  it('adds simple weekday-only days with no weekend in range', () => {
    const tuesday = new Date(2026, 8, 15); // Tue
    expect(addBusinessDays(tuesday, 2)).toEqual(new Date(2026, 8, 17)); // Thu
  });
});

describe('businessDaysRemaining', () => {
  it('is 0 when now is the deadline', () => {
    const d = new Date(2026, 8, 18);
    expect(businessDaysRemaining(d, d)).toBe(0);
  });

  it('counts forward across a weekend as 1 business day (Fri -> Mon)', () => {
    const friday = new Date(2026, 8, 11);
    const monday = new Date(2026, 8, 14);
    expect(businessDaysRemaining(monday, friday)).toBe(1);
  });

  it('is negative once the deadline has passed', () => {
    const wednesday = new Date(2026, 8, 16);
    const monday = new Date(2026, 8, 14);
    expect(businessDaysRemaining(monday, wednesday)).toBe(-2);
  });
});
