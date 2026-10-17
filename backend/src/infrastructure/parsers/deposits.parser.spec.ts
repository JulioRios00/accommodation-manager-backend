import { toDate } from './deposits.parser';

/** The Deposit Control sheet's processed-date column is often text-formatted, so these
 *  cells reach the parser as strings rather than as Excel dates. */
describe('deposits.parser toDate', () => {
  const ymd = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

  it('passes a real Date through', () => {
    const d = new Date(Date.UTC(2025, 11, 3));
    expect(toDate(d)).toBe(d);
  });

  it('rejects an invalid Date', () => {
    expect(toDate(new Date('nope'))).toBeNull();
  });

  it('converts an Excel date serial', () => {
    // 45994 = 2025-12-03 in Excel's 1900 epoch.
    expect(ymd(toDate(45994))).toBe('2025-12-03');
  });

  it('parses ISO strings', () => {
    expect(ymd(toDate('2025-12-03'))).toBe('2025-12-03');
    expect(ymd(toDate('2025-3-7'))).toBe('2025-03-07');
    expect(ymd(toDate('2025-12-03T00:00:00.000Z'))).toBe('2025-12-03');
  });

  it('reads ambiguous slash dates day-first', () => {
    expect(ymd(toDate('03/12/2025'))).toBe('2025-12-03');
    expect(ymd(toDate('3/12/2025'))).toBe('2025-12-03');
    expect(ymd(toDate('31/12/2025'))).toBe('2025-12-31');
  });

  it('accepts . and - separators', () => {
    expect(ymd(toDate('03.12.2025'))).toBe('2025-12-03');
    expect(ymd(toDate('03-12-2025'))).toBe('2025-12-03');
  });

  it('expands 2-digit years', () => {
    expect(ymd(toDate('03/12/25'))).toBe('2025-12-03');
    expect(ymd(toDate('03/12/99'))).toBe('1999-12-03');
  });

  it('trims surrounding whitespace', () => {
    expect(ymd(toDate('  03/12/2025 '))).toBe('2025-12-03');
  });

  it('does not land a day early or late', () => {
    const d = toDate('01/01/2025')!;
    expect(d.getUTCDate()).toBe(1);
    expect(d.getUTCMonth()).toBe(0);
    expect(d.getUTCFullYear()).toBe(2025);
  });

  it('rejects impossible dates instead of rolling them over', () => {
    expect(toDate('32/12/2025')).toBeNull();
    expect(toDate('03/13/2025')).toBeNull();
    expect(toDate('29/02/2025')).toBeNull();
    expect(ymd(toDate('29/02/2024'))).toBe('2024-02-29');
  });

  it('returns null for unparseable text and blanks', () => {
    expect(toDate('n/a')).toBeNull();
    expect(toDate('December 2025')).toBeNull();
    expect(toDate('')).toBeNull();
    expect(toDate('   ')).toBeNull();
    expect(toDate(null)).toBeNull();
    expect(toDate(undefined)).toBeNull();
  });
});
