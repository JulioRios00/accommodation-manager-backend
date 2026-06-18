import * as XLSX from 'xlsx';

export interface ParsedRow {
  // Property
  code: string;
  bu: string;
  area: string | null;
  fullAddress: string | null;
  officeKeys: boolean;
  keysCount: number;
  securityKeysCount: number;
  fobCount: number;
  electricityStatus: string | null;
  gasStatus: string | null;
  // Bed
  bedNumber: number;
  bedroomType: string;
  sex: string;
  bedSize: string;
  // Payment
  depositAmount: number;
  rentAmount: number;
  // Current resident + booking
  residentName: string | null;
  residentEmail: string | null;
  residentTelephone: string | null;
  residentNationality: string | null;
  residentPersonalId: string | null;
  residentIban: string | null;
  residentEmergencyContact: string | null;
  residentSource: string | null;
  residentIsHead: boolean;
  checkInDate: Date | null;
  contractEndDate: Date | null;
  checkOutDate: Date | null;
  comments: string | null;
  // Temporary / upcoming resident
  tempDepositAmount: number | null;
  tempRentAmount: number | null;
  tempResidentName: string | null;
  tempResidentEmail: string | null;
  tempResidentTelephone: string | null;
  tempResidentNationality: string | null;
  tempResidentPersonalId: string | null;
  tempResidentIban: string | null;
  tempResidentEmergencyContact: string | null;
  tempResidentSource: string | null;
  tempResidentIsHead: boolean;
  tempCheckInDate: Date | null;
  tempContractEndDate: Date | null;
}

function toDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    // Excel serial date
    return XLSX.SSF.parse_date_code
      ? new Date((value - 25569) * 86400 * 1000)
      : null;
  }
  return null;
}

function toStr(value: any): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
}

function toNum(value: any): number {
  const n = Number(value);
  return isNaN(n) ? 0 : n;
}

function toBool(value: any): boolean {
  if (!value) return false;
  return String(value).toLowerCase() === 'yes' || value === true || value === 1;
}

export function parseXlsx(buffer: Buffer): ParsedRow[] {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const ws = wb.Sheets['Control'];
  if (!ws) throw new Error('Sheet "Control" not found in workbook');

  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  const result: ParsedRow[] = [];

  // Data starts at row index 2 (row 3 in Excel, 0-indexed)
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[0]) continue; // skip empty rows

    const code = toStr(r[0]);
    if (!code) continue;

    result.push({
      // Property (cols A-J, indices 0-9)
      code,
      bu: toStr(r[1]) ?? '',
      area: toStr(r[2]),
      fullAddress: toStr(r[3]),
      officeKeys: toBool(r[4]),
      keysCount: toNum(r[5]),
      securityKeysCount: toNum(r[6]),
      fobCount: toNum(r[7]),
      electricityStatus: toStr(r[8]),
      gasStatus: toStr(r[9]),
      // Bed (cols K-N, indices 10-13)
      bedNumber: toNum(r[10]),
      bedroomType: toStr(r[11]) ?? '',
      sex: toStr(r[12]) ?? '',
      bedSize: toStr(r[13]) ?? '',
      // Payment (cols O-Q, indices 14-16)
      depositAmount: toNum(r[15]),
      rentAmount: toNum(r[16]),
      // Current resident (cols R-Z, indices 17-25)
      residentName: toStr(r[17]),
      residentEmail: toStr(r[18]),
      residentTelephone: toStr(r[19]),
      residentNationality: toStr(r[20]),
      residentPersonalId: toStr(r[21]),
      residentIban: toStr(r[22]),
      residentEmergencyContact: toStr(r[23]),
      residentSource: toStr(r[24]),
      residentIsHead: toBool(r[25]),
      // Booking (cols AA-AE, indices 26-30)
      checkInDate: toDate(r[26]),
      contractEndDate: toDate(r[27]),
      checkOutDate: toDate(r[28]),
      comments: toStr(r[30]),
      // Temporary resident (cols AH-AT, indices 33-45)
      tempDepositAmount: r[33] !== null ? toNum(r[33]) : null,
      tempRentAmount: r[34] !== null ? toNum(r[34]) : null,
      tempResidentName: toStr(r[35]),
      tempResidentEmail: toStr(r[36]),
      tempResidentTelephone: toStr(r[37]),
      tempResidentNationality: toStr(r[38]),
      tempResidentPersonalId: toStr(r[39]),
      tempResidentIban: toStr(r[40]),
      tempResidentEmergencyContact: toStr(r[41]),
      tempResidentSource: toStr(r[42]),
      tempResidentIsHead: toBool(r[43]),
      tempCheckInDate: toDate(r[44]),
      tempContractEndDate: toDate(r[45]),
    });
  }

  return result;
}
