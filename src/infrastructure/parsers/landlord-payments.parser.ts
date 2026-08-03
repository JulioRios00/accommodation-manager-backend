import * as XLSX from 'xlsx';

export interface ParsedLandlordPaymentRow {
  month: string;
  propertyCode: string;
  amountDue: number;
  iban: string | null;
  status: string;
  beneficiaryName: string | null;
  paymentReference: string | null;
  notes: string | null;
  supplier: string | null;
}

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

function parseMonthFromSheetName(name: string): string {
  const m = name.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[-\s]?(\d{2,4})/i);
  if (!m) return '';
  const month = MONTH_MAP[m[1].toLowerCase().substring(0, 3)];
  const year = m[2].length === 2 ? `20${m[2]}` : m[2];
  return `${year}-${month}`;
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

function mapStatus(raw: string | null): string {
  if (!raw) return 'pending';
  const lower = raw.toLowerCase();
  if (lower === 'paid') return 'paid';
  if (lower === 'partial') return 'partial';
  return 'pending';
}

export function parseLandlordPayments(buffer: Buffer): ParsedLandlordPaymentRow[] {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const result: ParsedLandlordPaymentRow[] = [];

  for (const sheetName of wb.SheetNames) {
    const month = parseMonthFromSheetName(sheetName);
    if (!month) continue;

    const ws = wb.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

    // Find the header row (look for "Property Code" column)
    let headerRow = -1;
    let codeCol = -1;
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      const idx = (rows[i] ?? []).findIndex((v: any) =>
        typeof v === 'string' && v.toLowerCase().includes('property') && v.toLowerCase().includes('code'),
      );
      if (idx >= 0) { headerRow = i; codeCol = idx; break; }
    }
    if (headerRow < 0) continue;

    const headers = rows[headerRow] as any[];
    const col = (name: string) =>
      headers.findIndex((h: any) => typeof h === 'string' && h.toLowerCase().includes(name.toLowerCase()));

    const amountCol = col('amount');
    const ibanCol = col('iban');
    const statusCol = col('status');
    const payeeCol = col('payee');
    const refCol = col('payment ref');
    const notesCol = col('notes');
    const supplierCol = col('supplier');

    for (let i = headerRow + 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r) continue;
      const propertyCode = toStr(r[codeCol]);
      if (!propertyCode) continue;

      result.push({
        month,
        propertyCode,
        amountDue: toNum(amountCol >= 0 ? r[amountCol] : null) ?? 0,
        iban: ibanCol >= 0 ? toStr(r[ibanCol]) : null,
        status: mapStatus(statusCol >= 0 ? toStr(r[statusCol]) : null),
        beneficiaryName: payeeCol >= 0 ? toStr(r[payeeCol]) : null,
        paymentReference: refCol >= 0 ? toStr(r[refCol]) : null,
        notes: notesCol >= 0 ? toStr(r[notesCol]) : null,
        supplier: supplierCol >= 0 ? toStr(r[supplierCol]) : null,
      });
    }
  }

  return result;
}
