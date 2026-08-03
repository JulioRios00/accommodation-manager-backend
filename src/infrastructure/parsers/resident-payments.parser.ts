import * as XLSX from 'xlsx';

export interface ParsedResidentPaymentRow {
  month: string;
  propertyCode: string;
  paymentDueDay: number | null;
  residentName: string;
  rentAmount: number;
  amountPaid: number;
  datePaid: Date | null;
  notes: string | null;
  lateStatus: string;
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

function toDate(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'number') return new Date((v - 25569) * 86400 * 1000);
  return null;
}

function mapLateStatus(raw: string | null): string {
  if (!raw) return 'on_time';
  const lower = raw.toLowerCase();
  if (lower.includes('overdue')) return 'overdue';
  if (lower.includes('final')) return 'final_demand_d4';
  if (lower.includes('demand')) return 'demand_d1';
  return 'on_time';
}

export function parseResidentPayments(buffer: Buffer): ParsedResidentPaymentRow[] {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const result: ParsedResidentPaymentRow[] = [];

  for (const sheetName of wb.SheetNames) {
    const month = parseMonthFromSheetName(sheetName);
    if (!month) continue;

    const ws = wb.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

    // Row 0 = headers, data from row 1
    // Col 0: Code, 1: Full Address, 2: TenantPaymentDay, 3: Resident, 4: Rent, 5: Paid, 6: Payment Date, 7: Notes, 8: Late Status
    let lastPropertyCode: string | null = null;

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r) continue;

      // Property code can be blank for rows under the same property
      const codeRaw = toStr(r[0]);
      if (codeRaw) lastPropertyCode = codeRaw;
      if (!lastPropertyCode) continue;

      const residentName = toStr(r[3]);
      if (!residentName) continue;

      result.push({
        month,
        propertyCode: lastPropertyCode,
        paymentDueDay: toNum(r[2]),
        residentName,
        rentAmount: toNum(r[4]) ?? 0,
        amountPaid: toNum(r[5]) ?? 0,
        datePaid: toDate(r[6]),
        notes: toStr(r[7]),
        lateStatus: mapLateStatus(toStr(r[8])),
      });
    }
  }

  return result;
}
