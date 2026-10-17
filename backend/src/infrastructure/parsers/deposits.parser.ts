import * as XLSX from 'xlsx';
import { parseBedNumber } from './xlsx.parser';

export interface ParsedDepositRow {
  transactionDate: Date | null;
  transactionType: string;
  company: string | null;
  propertyCode: string;
  bedNumber: number | null;
  /** Bedroom letter from a bed cell like "A1" — needed to disambiguate beds whose number
   *  resets per bedroom (A1 and B1 both have bedNumber 1). */
  bedroomLetter: string | null;
  residentName: string;
  checkoutDate: Date | null;
  depositAmount: number;
  proRataRentAmount: number | null;
  iban: string | null;
  payeeAddress: string | null;
  status: string;
  dateProcessed: Date | null;
  bankReference: string | null;
  comments: string | null;
}

function toStr(v: any): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

function toNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

/** Build a UTC-midnight Date, or null if the parts aren't a real calendar date.
 *  UTC because these land in `date` columns — a local-midnight Date would shift
 *  a day west of Greenwich. Rejects rolled-over values like 32/13/2025. */
function utcDate(year: number, month: number, day: number): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return d;
}

/** Excel only hands us a Date for cells it actually stores as dates; a text-formatted
 *  column (which the Deposit Control sheet uses for the processed date) arrives as a
 *  string, so those are parsed here too. Day-first — this sheet is European. */
export function toDate(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === 'number') return new Date((v - 25569) * 86400 * 1000);
  if (typeof v !== 'string') return null;

  const s = v.trim();
  if (s === '') return null;

  // ISO first — unambiguous, and the only form with the year leading.
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/.exec(s);
  if (iso) return utcDate(+iso[1], +iso[2], +iso[3]);

  // D/M/YYYY and friends, with / . or - as the separator and a 2- or 4-digit year.
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(s);
  if (dmy) {
    const yearPart = +dmy[3];
    // 2-digit years: the sheet holds recent tenancies, so 00-69 -> 2000s, 70-99 -> 1900s.
    const year = dmy[3].length === 2 ? (yearPart < 70 ? 2000 + yearPart : 1900 + yearPart) : yearPart;
    return utcDate(year, +dmy[2], +dmy[1]);
  }

  return null;
}

function mapTransactionType(raw: string | null): string {
  if (!raw) return 'receipt';
  const lower = raw.toLowerCase();
  if (lower.includes('refund')) return 'refund';
  return 'receipt';
}

function mapStatus(raw: string | null): string {
  if (!raw) return 'pending';
  return raw.toLowerCase() === 'done' ? 'done' : 'pending';
}

export function parseDeposits(buffer: Buffer): ParsedDepositRow[] {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = wb.SheetNames.find(s => !s.toLowerCase().includes('data')) ?? wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error('Deposit sheet not found');

  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  const result: ParsedDepositRow[] = [];

  // Row 0 = title ("DEPOSIT CONTROL"), row 1 = headers, data from row 2
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const propertyCode = toStr(r[3]);
    const residentName = toStr(r[5]);
    if (!propertyCode || !residentName) continue;

    const { bedNumber, bedroomLetter } = parseBedNumber(r[4]);

    result.push({
      transactionDate: toDate(r[0]),
      transactionType: mapTransactionType(toStr(r[1])),
      company: toStr(r[2]),
      propertyCode,
      bedNumber,
      bedroomLetter,
      residentName,
      checkoutDate: toDate(r[6]),
      depositAmount: toNum(r[7]) ?? 0,
      proRataRentAmount: toNum(r[8]),
      iban: toStr(r[9]),
      payeeAddress: toStr(r[10]),
      status: mapStatus(toStr(r[11])),
      dateProcessed: toDate(r[12]),
      bankReference: toStr(r[13]),
      comments: toStr(r[14]),
    });
  }

  return result;
}
