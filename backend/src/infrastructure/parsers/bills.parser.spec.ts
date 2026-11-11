import * as XLSX from 'xlsx';
import { parseBills, rowsByColumn } from './bills.parser';

/** A WASTE row in its real column layout: A address, F property code, G password. */
const WASTE_HEADER = ['Address', 'Supplier', 'Account', 'Email', 'Phone', 'Property', 'Password', 'Payment', 'Amount', 'Status'];
const WASTE_ROW = ['1 Somewhere', 'Panda', 'ACC-1', 'bins@example.com', '0123', '15SEG', 'hunter2', 'DD', 120, 'Active'];

/** A workbook in the normal layout, with every sheet's range starting at column A. */
function workbook(): Buffer {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of [
    ['Elec', [['Address'], ['1 Somewhere']]],
    ['WASTE', [WASTE_HEADER, WASTE_ROW]],
    ['Internet', [['Address'], ['1 Somewhere']]],
  ] as [string, any[][]][]) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
  }
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

describe('parseBills', () => {
  it('reads the waste property code from column F', () => {
    const { waste } = parseBills(workbook());
    expect(waste).toHaveLength(1);
    expect(waste[0]).toMatchObject({ propertyCode: '15SEG', wastePassword: 'hunter2', wasteSupplier: 'Panda' });
  });
});

describe('rowsByColumn', () => {
  /** Cells in their real columns, but a declared range that starts one column in — what
   *  Excel leaves behind when the leading column is emptied, and what the WASTE tab was. */
  const shifted: XLSX.WorkSheet = {
    '!ref': 'B1:G1',
    A1: { t: 's', v: 'address' },
    E1: { t: 's', v: 'phone' },
    F1: { t: 's', v: '15SEG' },
    G1: { t: 's', v: 'hunter2' },
  };

  // sheet_to_json indexes from the sheet's own range, so this used to shift every column
  // left by one: index 5 landed on G (the password) and no property ever matched.
  it('indexes from column A even when the range starts further right', () => {
    const [row] = rowsByColumn(shifted);
    expect(row[5]).toBe('15SEG');
    expect(row[6]).toBe('hunter2');
  });

  it('is unchanged on a sheet that already starts at column A', () => {
    const [row] = rowsByColumn(XLSX.utils.aoa_to_sheet([WASTE_ROW]));
    expect(row[5]).toBe('15SEG');
    expect(row[6]).toBe('hunter2');
  });

  it('returns nothing for an empty sheet', () => {
    expect(rowsByColumn({})).toEqual([]);
  });
});
