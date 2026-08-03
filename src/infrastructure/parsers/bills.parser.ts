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

export function parseBills(buffer: Buffer): ParsedBills {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const result: ParsedBills = { electricityGas: [], waste: [], internet: [] };

  // --- Electricity + Gas sheet (first sheet, "Mach Educational" or similar) ---
  const elecSheet = wb.Sheets[wb.SheetNames[0]];
  if (elecSheet) {
    const rows: any[][] = XLSX.utils.sheet_to_json(elecSheet, { header: 1, defval: null });
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
        propertyEmail: toStr(r[10]),
        keyCode: toStr(r[11]),
      });
    }
  }

  // --- Waste sheet (second sheet) ---
  const wasteSheet = wb.Sheets[wb.SheetNames[1]];
  if (wasteSheet) {
    const rows: any[][] = XLSX.utils.sheet_to_json(wasteSheet, { header: 1, defval: null });
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
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
    const rows: any[][] = XLSX.utils.sheet_to_json(netSheet, { header: 1, defval: null });
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
