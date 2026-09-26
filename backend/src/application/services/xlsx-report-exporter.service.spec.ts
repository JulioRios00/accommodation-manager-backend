import * as ExcelJS from 'exceljs';
import { XlsxReportExporterService } from './xlsx-report-exporter.service';
import { ReportFieldMeta } from '../../domain/custom-report/report-metadata.types';

describe('XlsxReportExporterService', () => {
  const service = new XlsxReportExporterService();

  const fields: ReportFieldMeta[] = [
    { key: 'code', label: 'Code', type: 'string', filterable: true, sortable: true },
    { key: 'rentAmount', label: 'Rent', type: 'currency', filterable: true, sortable: true },
  ];

  const rows = [
    { code: '61RR', rentAmount: 470 },
    { code: '52CV', rentAmount: 500 },
  ];

  it('produces a workbook with a bold, frozen header row and the expected column labels', async () => {
    const buffer = await service.generate('Properties', fields, rows);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    const sheet = workbook.worksheets[0];

    expect(sheet.getRow(1).getCell(1).value).toBe('Code');
    expect(sheet.getRow(1).getCell(2).value).toBe('Rent');
    expect(sheet.getRow(1).font?.bold).toBe(true);
    expect(sheet.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 });
  });

  it('formats a currency cell with the currency number format', async () => {
    const buffer = await service.generate('Properties', fields, rows);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    const sheet = workbook.worksheets[0];

    const currencyCell = sheet.getRow(2).getCell(2);
    expect(currencyCell.value).toBe(470);
    expect(currencyCell.numFmt).toBe('€#,##0.00');
  });

  it('appends a totals row summing the numeric/currency columns', async () => {
    const buffer = await service.generate('Properties', fields, rows);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    const sheet = workbook.worksheets[0];

    // Row 1 = header, rows 2-3 = data, row 4 = totals.
    const totalsRow = sheet.getRow(4);
    expect(totalsRow.getCell(1).value).toBe('Total');
    expect(totalsRow.getCell(2).value).toMatchObject({ formula: 'SUM(B2:B3)' });
    expect(totalsRow.font?.bold).toBe(true);
  });
});
