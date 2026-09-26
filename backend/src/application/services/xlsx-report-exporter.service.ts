import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { ReportFieldMeta } from '../../domain/custom-report/report-metadata.types';

const NUMBER_FORMAT: Partial<Record<ReportFieldMeta['type'], string>> = {
  currency: '€#,##0.00',
  number: '#,##0',
  date: 'dd/mm/yyyy',
};

const SUMMABLE_TYPES: ReportFieldMeta['type'][] = ['number', 'currency'];

@Injectable()
export class XlsxReportExporterService {
  async generate(entityLabel: string, fields: ReportFieldMeta[], rows: Record<string, unknown>[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SAMS Custom Report Builder';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(entityLabel.slice(0, 31) || 'Report');
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    sheet.columns = fields.map((field) => ({
      header: field.label,
      key: field.key,
      width: Math.max(field.label.length + 4, 14),
      style: NUMBER_FORMAT[field.type] ? { numFmt: NUMBER_FORMAT[field.type] } : undefined,
    }));

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle' };

    for (const row of rows) {
      sheet.addRow(fields.map((field) => formatCell(field, row[field.key])));
    }

    const summableIndexes = fields
      .map((field, index) => (SUMMABLE_TYPES.includes(field.type) ? index : -1))
      .filter((i) => i >= 0);

    if (summableIndexes.length) {
      const totalsRow = sheet.addRow(fields.map((_, index) => (index === 0 ? 'Total' : '')));
      totalsRow.font = { bold: true };
      const firstDataRow = 2;
      const lastDataRow = 1 + rows.length;
      for (const index of summableIndexes) {
        const column = sheet.getColumn(index + 1).letter;
        const cell = totalsRow.getCell(index + 1);
        cell.value = { formula: `SUM(${column}${firstDataRow}:${column}${lastDataRow})` } as ExcelJS.CellFormulaValue;
        if (NUMBER_FORMAT[fields[index].type]) cell.numFmt = NUMBER_FORMAT[fields[index].type]!;
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

function formatCell(field: ReportFieldMeta, value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (field.type === 'date') return new Date(value as string);
  if (field.type === 'boolean') return value ? 'Yes' : 'No';
  if ((field.type === 'number' || field.type === 'currency') && typeof value !== 'number') return Number(value);
  return value;
}
