import * as XLSX from 'xlsx';

export interface ParsedDepositRow {
  transactionDate: Date | null;
  transactionType: string;
  company: string | null;
  propertyCode: string;
  bedNumber: number | null;
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

function toDate(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'number') return new Date((v - 25569) * 86400 * 1000);
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

    result.push({
      transactionDate: toDate(r[0]),
      transactionType: mapTransactionType(toStr(r[1])),
      company: toStr(r[2]),
      propertyCode,
      bedNumber: toNum(r[4]),
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
