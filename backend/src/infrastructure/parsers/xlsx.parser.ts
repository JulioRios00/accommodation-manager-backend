import * as XLSX from 'xlsx';

export interface ParsedRow {
  // Property
  code: string;
  eirCode: string | null;
  bu: string;
  area: string | null;
  fullAddress: string | null;
  officeKeys: boolean;
  keysCount: number;
  securityKeysCount: number;
  fobCount: number;
  electricityStatus: string | null;
  gasStatus: string | null;
  // Landlord Payment Details
  landlordPaymentDueDay: number | null;
  residentPaymentDueDay: number | null;
  landlordPayeeName: string | null;
  // Bed
  bedNumber: number | null;
  /** Trailing letter from a bed number like "12B" — identifies which physical bedroom the bed is in. */
  bedroomLetter: string | null;
  /** Raw bed number cell as read from the sheet, trimmed — kept even when it fails to parse, so callers can log/report the exact unrecognized value. */
  bedNumberRaw: string | null;
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

// The Code column now carries "EIRCODE-PROPERTYCODE" (e.g. "D07E9XP-61RR") instead of just
// the property code — split off the leading Eircode so it lands in its own field instead of
// polluting the property code. Falls back to treating the whole value as the code (no Eircode)
// for older sheets/rows that don't follow the new convention.
function splitCodeAndEirCode(raw: string): { code: string; eirCode: string | null } {
  const cleaned = raw.replace(/ /g, ' ').trim();  // normalize non-breaking spaces
  const dashIndex = cleaned.indexOf('-');
  if (dashIndex === -1) return { code: cleaned, eirCode: null };

  const eirCode = cleaned.slice(0, dashIndex).replace(/\s+/g, '').toUpperCase();
  const code = cleaned.slice(dashIndex + 1).trim();
  if (!eirCode || !code) return { code: cleaned, eirCode: null };

  return { code, eirCode };
}

// Bed number column accepts two conventions:
//  - Letter-first ("A1", "B1"): the letter is the bedroom, the number is that bed's position
//    within the bedroom — NOT unique across the whole property (A1 and B1 are different beds).
//  - Digit-first ("12" or "12B", the older convention): the number is unique across the whole
//    property; an optional trailing letter groups beds sharing a physical bedroom.
// Letter-first is tried first since it's the current format.
const BED_NUMBER_LETTER_FIRST_RE = /^([A-Za-z])\s*(\d+)$/;
const BED_NUMBER_DIGIT_FIRST_RE = /^(\d+)\s*([A-Za-z])?$/;

export function parseBedNumber(value: any): { bedNumber: number | null; bedroomLetter: string | null; bedNumberRaw: string | null } {
  const raw = value === null || value === undefined ? '' : String(value).trim();
  if (!raw) return { bedNumber: null, bedroomLetter: null, bedNumberRaw: null };

  const letterFirst = raw.match(BED_NUMBER_LETTER_FIRST_RE);
  if (letterFirst) {
    return { bedNumber: Number(letterFirst[2]), bedroomLetter: letterFirst[1].toUpperCase(), bedNumberRaw: raw };
  }

  const digitFirst = raw.match(BED_NUMBER_DIGIT_FIRST_RE);
  if (digitFirst) {
    return { bedNumber: Number(digitFirst[1]), bedroomLetter: digitFirst[2] ? digitFirst[2].toUpperCase() : null, bedNumberRaw: raw };
  }

  return { bedNumber: null, bedroomLetter: null, bedNumberRaw: raw };
}

/** Pay Day, Receive Day and Beneficiary Name, which live on the Properties Mach sheet at
 *  columns K, L and M — one row per property, keyed by the same Code as Control. */
export interface PropertyPaymentDetails {
  landlordPaymentDueDay: number | null;
  residentPaymentDueDay: number | null;
  landlordPayeeName: string | null;
}

const NO_PAYMENT_DETAILS: PropertyPaymentDetails = {
  landlordPaymentDueDay: null,
  residentPaymentDueDay: null,
  landlordPayeeName: null,
};

/**
 * These three fields were read from Control K-M between 2026-09-26 and this change, on the
 * assumption that the sheet carried them there. It does not, and the workbooks in use never
 * have: Control K-M is the start of BED Details, so reading them there shifted every column
 * from K onwards by three and made the whole import fail. They are on Properties Mach, at
 * the same three column letters — which is the likeliest source of the original mix-up.
 *
 * A property absent from Properties Mach, or with those cells blank, yields nulls rather
 * than an entry, so the import leaves those fields alone instead of zeroing them.
 */
function readPaymentDetails(wb: XLSX.WorkBook, sheetName: string): Map<string, PropertyPaymentDetails> {
  const details = new Map<string, PropertyPaymentDetails>();
  const ws = wb.Sheets[sheetName];
  if (!ws) return details;

  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  // Single header row on this sheet, so data starts at index 1.
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const rawCode = toStr(r[0]);
    if (!rawCode) continue;
    const { code } = splitCodeAndEirCode(rawCode);
    const payeeName = toStr(r[12]);
    details.set(code, {
      landlordPaymentDueDay: r[10] !== null ? toNum(r[10]) : null,
      residentPaymentDueDay: r[11] !== null ? toNum(r[11]) : null,
      // The template ships this placeholder in unfilled rows; it must not become a landlord.
      landlordPayeeName: payeeName && payeeName.toLowerCase() !== 'beneficiary name' ? payeeName : null,
    });
  }
  return details;
}

export function parsePropertyPaymentDetails(
  buffer: Buffer,
  sheetName: string = 'Properties Mach',
): Map<string, PropertyPaymentDetails> {
  return readPaymentDetails(XLSX.read(buffer, { type: 'buffer', cellDates: true }), sheetName);
}

export function parseXlsx(buffer: Buffer, sheetName: string = 'Control', required: boolean = true): ParsedRow[] {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    if (required) throw new Error(`Sheet "${sheetName}" not found in workbook`);
    return [];
  }

  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  // Same workbook, so this costs a sheet walk rather than a second parse of the file.
  const paymentDetails = readPaymentDetails(wb, 'Properties Mach');

  const result: ParsedRow[] = [];

  // The property columns (A-J) are only filled in on a property's first bed row —
  // merged/blank on the rest of its bed rows — so carry the last-seen values forward.
  let lastProperty: {
    code: string;
    eirCode: string | null;
    bu: string;
    area: string | null;
    fullAddress: string | null;
    officeKeys: boolean;
    keysCount: number;
    securityKeysCount: number;
    fobCount: number;
    electricityStatus: string | null;
    gasStatus: string | null;
    landlordPaymentDueDay: number | null;
    residentPaymentDueDay: number | null;
    landlordPayeeName: string | null;
  } | null = null;

  // Data starts at row index 2 (row 3 in Excel, 0-indexed)
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue; // skip empty rows

    const rowCode = toStr(r[0]);
    if (rowCode) {
      const { code, eirCode } = splitCodeAndEirCode(rowCode);
      lastProperty = {
        code,
        eirCode,
        bu: toStr(r[1]) ?? '',
        area: toStr(r[2]),
        fullAddress: toStr(r[3]),
        officeKeys: toBool(r[4]),
        keysCount: toNum(r[5]),
        securityKeysCount: toNum(r[6]),
        fobCount: toNum(r[7]),
        electricityStatus: toStr(r[8]),
        gasStatus: toStr(r[9]),
        // Pay Day / Receive Day / Beneficiary Name are NOT on this sheet — see
        // parsePropertyPaymentDetails. Merged in by property code.
        ...(paymentDetails.get(code) ?? NO_PAYMENT_DETAILS),
      };
    }
    if (!lastProperty) continue; // no property established yet — malformed leading row

    result.push({
      // Property (cols A-J, indices 0-9) — carried forward across merged bed rows
      ...lastProperty,
      // Bed (cols K-N, indices 10-13)
      ...parseBedNumber(r[10]),
      bedroomType: toStr(r[11]) ?? '',
      sex: toStr(r[12]) ?? '',
      bedSize: toStr(r[13]) ?? '',
      // Payment (cols O-Q, indices 14-16). Index 14 is the sheet's per-bed "Due" day,
      // which this system has never imported — the due day it uses is the per-property
      // Receive Day from Properties Mach.
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
      // Booking (cols AA-AE, indices 26-30). Index 29 is "Days" and 31 is "Status";
      // neither is imported.
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

// The "Properties Mach" sheet carries one row per property (Code, Address, Area, Company,
// PropertyStatus) — PropertyStatus is "Active"/"Inactive" and is the source of truth for
// whether a property should show as active. Returns a code -> active map; missing/absent
// sheet or blank status means "don't touch the flag" for that property (map has no entry).
export function parsePropertyStatuses(buffer: Buffer, sheetName: string = 'Properties Mach'): Map<string, boolean> {
  const statuses = new Map<string, boolean>();
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[sheetName];
  if (!ws) return statuses;

  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  // Data starts at row index 1 (row 2 in Excel, 0-indexed) — single header row on this sheet.
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;

    const rawCode = toStr(r[0]);
    const status = toStr(r[4]);
    if (!rawCode || !status) continue;

    const { code } = splitCodeAndEirCode(rawCode);
    statuses.set(code, status.toLowerCase() === 'active');
  }

  return statuses;
}
