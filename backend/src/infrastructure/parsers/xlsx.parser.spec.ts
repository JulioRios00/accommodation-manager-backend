import * as XLSX from 'xlsx';
import { parseXlsx, parsePropertyPaymentDetails } from './xlsx.parser';

/**
 * These tests exist because of a real incident: between 2026-09-26 and the fix, the parser
 * read Pay Day / Receive Day / Beneficiary Name from Control K-M. Those columns are the
 * start of BED Details, so every column from K onwards was off by three and a full import
 * of ~2,500 rows produced zero records. Nothing failed loudly — the rows were skipped.
 *
 * So the point of the fixtures below is the column POSITIONS. They mirror the real
 * workbook's two header rows, and each value is distinctive enough that a one-column slip
 * shows up as a wrong field rather than a plausible-looking one.
 */

const CONTROL_GROUPS = ['PROPERTY Details', '', '', '', '', '', '', '', '', '', 'BED Details', '', '', '', 'PAYMENT Details', '', '', 'RESIDENT Details'];
const CONTROL_HEADERS = [
  'Code', 'BU', 'Area', 'Full Address', 'OfficeKeys', 'Keys', 'Sec K', 'Fob', 'Elec', 'Gas',
  'Bed', 'Bedroom', 'Sex', 'Bed', 'Due', 'Deposit', 'Rent',
  'Resident', 'E-mail', 'Telephone', 'Nationality', 'Personal ID', 'IBAN', 'Emergency Contact Name & Mobile', 'Source', 'HeadResident',
  'Check-in', 'ContractEnd', 'Check-out', 'Days', 'Comments', 'Status', '',
  'Deposit', 'Rent', 'Resident', 'E-mail', 'Telephone', 'Nationality', 'Personal ID', 'IBAN', 'Emergency Contact Name & Mobile', 'Source', 'HeadResident', 'Check-in', 'ContractEnd',
];

const controlRow = () => {
  const r: any[] = new Array(46).fill(null);
  r[0] = 'D07E9XP-61RR'; r[1] = 'SA'; r[2] = 'Central'; r[3] = '61 RATHDOWN ROAD'; r[4] = 'No';
  r[5] = 2; r[6] = 0; r[7] = 1; r[8] = 'Pre'; r[9] = 'Pre';
  r[10] = 'A1'; r[11] = 'Twin'; r[12] = 'F'; r[13] = 'Single';
  r[14] = 9; r[15] = 490; r[16] = 470;
  r[17] = 'Ingridy Rocha'; r[18] = 'ingridy@example.com'; r[19] = '353 83 885 7387';
  r[20] = 'Brazilian'; r[21] = 'PID-1'; r[22] = 'IE00AAAA'; r[23] = 'Mum 123'; r[24] = 'SWAstudent'; r[25] = 'Yes';
  r[26] = new Date(Date.UTC(2026, 9, 31)); r[27] = new Date(Date.UTC(2027, 3, 30)); r[28] = new Date(Date.UTC(2027, 3, 30));
  r[29] = 185; r[30] = 'Renewed once'; r[31] = 'Extension E-mail Sent';
  r[33] = 500; r[34] = 480; r[35] = 'Next Resident'; r[36] = 'next@example.com'; r[37] = '353 1 111';
  r[38] = 'Spanish'; r[39] = 'PID-2'; r[40] = 'IE00BBBB'; r[41] = 'Dad 456'; r[42] = 'Direct'; r[43] = 'No';
  r[44] = new Date(Date.UTC(2027, 4, 1)); r[45] = new Date(Date.UTC(2027, 10, 1));
  return r;
};

const MACH_HEADERS = ['Code', 'Address', 'Area', 'Company', 'PropertyStatus', 'Units', 'Gross', 'Net', 'Profit', 'Net Per Units', 'Pay Day', 'Receive Day', 'Beneficiary Name'];

function workbook(opts: { control?: any[][]; mach?: any[][]; checkedOut?: any[][] } = {}) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(opts.control ?? [CONTROL_GROUPS, CONTROL_HEADERS, controlRow()]), 'Control');
  if (opts.mach !== undefined) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(opts.mach), 'Properties Mach');
  if (opts.checkedOut) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(opts.checkedOut), 'CheckedOut');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

const withMach = (rows: any[][] = [MACH_HEADERS, ['D07E9XP-61RR', '61 RATHDOWN ROAD', 'Central', 'SA', 'Active', 6, 3840, 2718, 1122, 187, 1, 25, 'Byrne Estate Agents']]) =>
  workbook({ mach: rows });

describe('parseXlsx — Control column mapping', () => {
  it('reads the bed block from K-N, not from the landlord columns that briefly displaced it', () => {
    const [row] = parseXlsx(withMach());
    expect(row.bedNumber).toBe(1);
    expect(row.bedroomLetter).toBe('A');
    expect(row.bedroomType).toBe('Twin');
    expect(row.sex).toBe('F');
    expect(row.bedSize).toBe('Single');
  });

  it('reads deposit and rent from P-Q, skipping the per-bed Due day in O', () => {
    const [row] = parseXlsx(withMach());
    expect(row.depositAmount).toBe(490);
    expect(row.rentAmount).toBe(470);
    // 9 is the "Due" cell; if it ever appears as an amount the columns have slipped again.
    expect(row.depositAmount).not.toBe(9);
  });

  it('reads the resident block from R-Z', () => {
    const [row] = parseXlsx(withMach());
    expect(row.residentName).toBe('Ingridy Rocha');
    expect(row.residentEmail).toBe('ingridy@example.com');
    expect(row.residentTelephone).toBe('353 83 885 7387');
    expect(row.residentNationality).toBe('Brazilian');
    expect(row.residentPersonalId).toBe('PID-1');
    expect(row.residentIban).toBe('IE00AAAA');
    expect(row.residentEmergencyContact).toBe('Mum 123');
    expect(row.residentSource).toBe('SWAstudent');
    expect(row.residentIsHead).toBe(true);
  });

  it('reads the booking block from AA-AC and Comments from AE', () => {
    const [row] = parseXlsx(withMach());
    expect(row.checkInDate?.toISOString().slice(0, 10)).toBe('2026-10-31');
    expect(row.contractEndDate?.toISOString().slice(0, 10)).toBe('2027-04-30');
    expect(row.checkOutDate?.toISOString().slice(0, 10)).toBe('2027-04-30');
    expect(row.comments).toBe('Renewed once');
    // AD is "Days" (185) and AF is "Status" — neither may leak into a date or the comments.
    expect(row.comments).not.toBe('Extension E-mail Sent');
  });

  it('reads the temporary resident block from AH-AT', () => {
    const [row] = parseXlsx(withMach());
    expect(row.tempDepositAmount).toBe(500);
    expect(row.tempRentAmount).toBe(480);
    expect(row.tempResidentName).toBe('Next Resident');
    expect(row.tempCheckInDate?.toISOString().slice(0, 10)).toBe('2027-05-01');
    expect(row.tempContractEndDate?.toISOString().slice(0, 10)).toBe('2027-11-01');
  });

  it('splits the Eircode off the property code', () => {
    const [row] = parseXlsx(withMach());
    expect(row.code).toBe('61RR');
    expect(row.eirCode).toBe('D07E9XP');
  });
});

describe('parseXlsx — landlord payment fields come from Properties Mach', () => {
  it('joins Pay Day, Receive Day and Beneficiary Name on the property code', () => {
    const [row] = parseXlsx(withMach());
    expect(row.landlordPaymentDueDay).toBe(1);
    expect(row.residentPaymentDueDay).toBe(25);
    expect(row.landlordPayeeName).toBe('Byrne Estate Agents');
  });

  // The regression that started it all: Control K-M is BED Details.
  it('never takes them from Control K-M', () => {
    const [row] = parseXlsx(withMach());
    expect(row.landlordPayeeName).not.toBe('F');
    expect(row.landlordPaymentDueDay).not.toBe(0);
    expect(row.residentPaymentDueDay).not.toBe(0);
  });

  it('leaves them null when the sheet is absent, rather than guessing', () => {
    const [row] = parseXlsx(workbook());
    expect(row.landlordPaymentDueDay).toBeNull();
    expect(row.residentPaymentDueDay).toBeNull();
    expect(row.landlordPayeeName).toBeNull();
    expect(row.residentName).toBe('Ingridy Rocha');
  });

  it('leaves them null for a property that sheet does not list', () => {
    const [row] = parseXlsx(withMach([MACH_HEADERS, ['K78W6K5-15SEG', 'Elsewhere', 'Lucan', 'SA', 'Active', 6, 0, 0, 0, 0, 3, 14, 'Someone Else']]));
    expect(row.landlordPayeeName).toBeNull();
    expect(row.landlordPaymentDueDay).toBeNull();
  });

  it('ignores the template placeholder instead of creating a landlord from it', () => {
    const [row] = parseXlsx(withMach([MACH_HEADERS, ['D07E9XP-61RR', '61 RATHDOWN ROAD', 'Central', 'SA', 'Active', 6, 0, 0, 0, 0, 1, 25, 'Beneficiary Name']]));
    expect(row.landlordPayeeName).toBeNull();
    expect(row.landlordPaymentDueDay).toBe(1);
  });

  it('matches the code with or without an Eircode prefix', () => {
    const [row] = parseXlsx(withMach([MACH_HEADERS, ['61RR', '61 RATHDOWN ROAD', 'Central', 'SA', 'Active', 6, 0, 0, 0, 0, 7, 21, 'Byrne Estate Agents']]));
    expect(row.landlordPaymentDueDay).toBe(7);
    expect(row.residentPaymentDueDay).toBe(21);
  });
});

describe('parsePropertyPaymentDetails', () => {
  it('keys the map by property code with the Eircode stripped', () => {
    const details = parsePropertyPaymentDetails(withMach());
    expect(details.get('61RR')).toEqual({
      landlordPaymentDueDay: 1,
      residentPaymentDueDay: 25,
      landlordPayeeName: 'Byrne Estate Agents',
    });
  });

  it('returns an empty map when the sheet is missing', () => {
    expect(parsePropertyPaymentDetails(workbook()).size).toBe(0);
  });
});

describe('parseXlsx — CheckedOut shares the layout', () => {
  it('reads a checked-out row with the same indices', () => {
    const [row] = parseXlsx(withMach(), 'CheckedOut', false);
    expect(row).toBeUndefined();

    const buf = workbook({ mach: [MACH_HEADERS], checkedOut: [CONTROL_GROUPS, CONTROL_HEADERS, controlRow()] });
    const [out] = parseXlsx(buf, 'CheckedOut', false);
    expect(out.residentName).toBe('Ingridy Rocha');
    // The guard in ImportXlsxUseCase drops any row without this, so it must land correctly.
    expect(out.checkOutDate?.toISOString().slice(0, 10)).toBe('2027-04-30');
    expect(out.bedNumber).toBe(1);
  });

  it('returns nothing when the sheet is absent and is not required', () => {
    expect(parseXlsx(withMach(), 'CheckedOut', false)).toEqual([]);
  });
});
