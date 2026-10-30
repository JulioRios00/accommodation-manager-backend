import * as XLSX from 'xlsx';
import { parseResidentPayments } from './resident-payments.parser';

/**
 * Column I (Overdue Payment Status) only exists in the tracking sheet from Jan 2026.
 * An empty cell used to import as 'on_time', so every earlier month arrived asserting the
 * rent was paid on time — something the spreadsheet never said.
 */

const HEADERS = ['Code', 'Full Address', 'TenantPaymentDay', 'Resident', 'Rent', 'Paid', 'Payment Date', 'Notes', 'Late Status'];

const sheet = (rows: any[][]) => [HEADERS, ...rows];
const line = (lateStatus: any, over: any[] = []) =>
  ['61RR', '61 Rathdown Road', 9, 'Ana Silva', 500, 500, null, null, lateStatus, ...over];

function workbook(sheets: Record<string, any[][]>) {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
  }
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

const parseOne = (lateStatus: any, tab = 'Jan 26') =>
  parseResidentPayments(workbook({ [tab]: sheet([line(lateStatus)]) }))[0];

describe('parseResidentPayments late status', () => {
  it('records an empty cell as unknown rather than on time', () => {
    expect(parseOne(null).lateStatus).toBeNull();
    expect(parseOne('').lateStatus).toBeNull();
    expect(parseOne('   ').lateStatus).toBeNull();
  });

  // A whole month with no column I at all — every tab before Jan 2026.
  it('leaves a month that predates the column entirely unknown', () => {
    const rows = parseResidentPayments(workbook({
      'Jan 25': sheet([['61RR', '61 Rathdown Road', 9, 'Ana Silva', 500, 500, null, null]]),
    }));
    expect(rows).toHaveLength(1);
    expect(rows[0].month).toBe('2025-01');
    expect(rows[0].lateStatus).toBeNull();
  });

  it('still maps the statuses the sheet does use', () => {
    expect(parseOne('Overdue').lateStatus).toBe('overdue');
    expect(parseOne('Final Demand').lateStatus).toBe('final_demand_d4');
    expect(parseOne('Demand D+1').lateStatus).toBe('demand_d1');
    expect(parseOne('On time').lateStatus).toBe('on_time');
  });

  // 'final' is checked before 'demand', or "Final Demand" lands on D+1.
  it('reads Final Demand as D+4, not D+1', () => {
    expect(parseOne('FINAL DEMAND SENT').lateStatus).toBe('final_demand_d4');
  });

  it('keeps text it does not recognise as on_time rather than discarding the cell', () => {
    expect(parseOne('Paid in full').lateStatus).toBe('on_time');
  });

  it('still reads the rest of the row', () => {
    const r = parseOne(null);
    expect(r).toMatchObject({ month: '2026-01', propertyCode: '61RR', residentName: 'Ana Silva', rentAmount: 500, amountPaid: 500 });
  });
});
