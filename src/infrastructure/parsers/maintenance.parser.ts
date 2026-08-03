import * as XLSX from 'xlsx';

export interface ParsedMaintenanceRow {
  priority: number;
  orderNumber: string;
  status: string;
  clientName: string | null;
  clientPhone: string | null;
  propertyCode: string;
  approvedBy: string | null;
  dateOfOrder: Date | null;
  timeframe: string | null;
  responsible: string | null;
  descriptionRequested: string | null;
  workItems: string | null;
  additionalDetails: string | null;
  descriptionDone: string | null;
  houseCompany: string | null;
  paymentApprovedBy: string | null;
  maintenanceCost: number | null;
  materialCost: number | null;
  totalCost: number | null;
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

function formatOrderNumber(raw: any): string {
  const n = parseInt(String(raw), 10);
  if (isNaN(n)) return String(raw).trim();
  return `STA-${String(n).padStart(3, '0')}`;
}

// Cols 12-35: Item 1, St 1, Item 2, St 2, ... Item 12, St 12
function buildWorkItems(r: any[]): string | null {
  const parts: string[] = [];
  for (let i = 0; i < 12; i++) {
    const itemIdx = 12 + i * 2;
    const stIdx = 13 + i * 2;
    const item = toStr(r[itemIdx]);
    const status = toStr(r[stIdx]);
    if (item) parts.push(`${i + 1}. ${item}${status ? ` [${status}]` : ''}`);
  }
  return parts.length > 0 ? parts.join('\n') : null;
}

export function parseMaintenance(buffer: Buffer): ParsedMaintenanceRow[] {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = wb.SheetNames.find(s => s.toLowerCase().includes('order')) ?? wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error(`Sheet "Orders Index" not found`);

  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  const result: ParsedMaintenanceRow[] = [];

  // Row 0 = headers, data from row 1
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r[1] === null || r[1] === undefined) continue;
    const propertyCode = toStr(r[5]);
    if (!propertyCode) continue;

    result.push({
      priority: toNum(r[0]) ?? 0,
      orderNumber: formatOrderNumber(r[1]),
      status: toStr(r[2]) ?? 'open',
      clientName: toStr(r[3]),
      clientPhone: toStr(r[4]),
      propertyCode,
      approvedBy: toStr(r[6]),
      dateOfOrder: toDate(r[7]),
      timeframe: toStr(r[9]),
      responsible: toStr(r[10]),
      descriptionRequested: toStr(r[11]),
      workItems: buildWorkItems(r),
      additionalDetails: toStr(r[36]),
      descriptionDone: toStr(r[37]),
      houseCompany: toStr(r[38]),
      paymentApprovedBy: toStr(r[39]),
      maintenanceCost: toNum(r[40]),
      materialCost: toNum(r[41]),
      totalCost: toNum(r[42]),
    });
  }

  return result;
}
