import * as XLSX from 'xlsx';

export interface BillsElectricityGasRow {
  propertyAddress: string;
  electricityMprn: string | null;
  electricitySupplier: string | null;
  electricityAccountNumber: string | null;
  electricityKeypadCode: string | null;
  gasGprn: string | null;
  gasSupplier: string | null;
  gasAccountNumber: string | null;
  gasPin: string | null;
  crn: string | null;
  propertyEmail: string | null;
  keyCode: string | null;
}

export interface BillsWasteRow {
  propertyCode: string;
  wasteSupplier: string | null;
  wasteAccountNumber: string | null;
  wasteEmail: string | null;
  wastePhone: string | null;
  wastePassword: string | null;
  wastePaymentType: string | null;
  wasteMonthlyAmount: number | null;
  wasteStatus: string | null;
}

export interface BillsInternetRow {
  propertyCode: string;
  internetSupplier: string | null;
  internetAccountNumber: string | null;
  internetEmail: string | null;
  internetOnlineLink: string | null;
  internetBusinessPhone: string | null;
  internetUsername: string | null;
  internetPassword: string | null;
  internetPaymentType: string | null;
  internetStatus: string | null;
  internetContractEndDate: Date | null;
  internetNotes: string | null;
}

export interface ParsedBills {
  electricityGas: BillsElectricityGasRow[];
  waste: BillsWasteRow[];
  internet: BillsInternetRow[];
}

function toStr(v: any): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The "Property Email" cell sometimes ends up holding pasted landlord/agent contact
// notes instead of a single address — only accept values that actually look like one.
function toEmail(v: any): string | null {
  const s = toStr(v);
  return s && EMAIL_RE.test(s) ? s : null;
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

/**
 * Rows as arrays indexed by real column letter: index 0 is always column A.
 *
 * `sheet_to_json` indexes from the sheet's own used range, not from column A, so a sheet
 * whose range starts at B1 (common once a leading column is deleted or hidden) shifts
 * every index left by one — the WASTE tab did exactly this, which is why the property
 * code was being read out of column G instead of F. Forcing the range to start at A1
 * makes the indices below mean what their comments say; it is a no-op on a sheet that
 * already starts at A.
 */
export function rowsByColumn(sheet: XLSX.WorkSheet): any[][] {
  const ref = sheet['!ref'];
  if (!ref) return [];
  // Only the column origin is forced — the first row stays wherever the sheet's own range
  // puts it, so the "skip the header row" offsets below keep meaning what they did.
  const { s: start, e: end } = XLSX.utils.decode_range(ref);
  const range = XLSX.utils.encode_range({ s: { r: start.r, c: 0 }, e: end });
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, range });
}

export function parseBills(buffer: Buffer): ParsedBills {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const result: ParsedBills = { electricityGas: [], waste: [], internet: [] };

  // --- Electricity + Gas sheet (first sheet, "Mach Educational" or similar) ---
  const elecSheet = wb.Sheets[wb.SheetNames[0]];
  if (elecSheet) {
    const rows = rowsByColumn(elecSheet);
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || !r[0] || typeof r[0] !== 'string' || r[0].trim().length < 5) continue;
      result.electricityGas.push({
        propertyAddress: r[0].trim(),
        electricityMprn: toStr(r[1]),
        electricitySupplier: toStr(r[2]),
        electricityAccountNumber: toStr(r[3]),
        electricityKeypadCode: toStr(r[4]),
        gasGprn: toStr(r[5]),
        gasSupplier: toStr(r[6]),
        gasAccountNumber: toStr(r[7]),
        gasPin: toStr(r[8]),
        crn: toStr(r[9]),
        propertyEmail: toEmail(r[10]),
        keyCode: toStr(r[11]),
      });
    }
  }

  // --- Waste sheet (second sheet) ---
  const wasteSheet = wb.Sheets[wb.SheetNames[1]];
  if (wasteSheet) {
    const rows = rowsByColumn(wasteSheet);
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      // Column F — the property code.
      const code = toStr(r[5]);
      if (!code) continue;
      result.waste.push({
        propertyCode: code,
        wasteSupplier: toStr(r[1]),
        wasteAccountNumber: toStr(r[2]),
        wasteEmail: toStr(r[3]),
        wastePhone: toStr(r[4]),
        wastePassword: toStr(r[6]),
        wastePaymentType: toStr(r[7]),
        wasteMonthlyAmount: toNum(r[8]),
        wasteStatus: toStr(r[9]),
      });
    }
  }

  // --- Internet sheet (third sheet) ---
  const netSheet = wb.Sheets[wb.SheetNames[2]];
  if (netSheet) {
    const rows = rowsByColumn(netSheet);
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const code = toStr(r[4]);
      if (!code) continue;
      result.internet.push({
        propertyCode: code,
        internetSupplier: toStr(r[1]),
        internetAccountNumber: toStr(r[2]),
        internetEmail: toStr(r[3]),
        internetOnlineLink: toStr(r[5]),
        internetBusinessPhone: toStr(r[6]),
        internetUsername: toStr(r[7]),
        internetPassword: toStr(r[8]),
        internetPaymentType: toStr(r[9]),
        internetStatus: toStr(r[10]),
        internetContractEndDate: toDate(r[11]),
        internetNotes: toStr(r[12]),
      });
    }
  }

  return result;
}
