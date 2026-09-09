import { PdfReportExporterService } from './pdf-report-exporter.service';
import { ReportFieldMeta } from '../../domain/custom-report/report-metadata.types';

// pdfkit's raw output marks each page object as `/Type /Page` (never `/Type /Pages`, the
// parent tree node) — counting those bytes avoids depending on a PDF-parsing library, several
// of which (e.g. pdf-parse) require browser DOM APIs unavailable in a plain Node test run.
function countPdfPages(buffer: Buffer): number {
  const text = buffer.toString('latin1');
  return (text.match(/\/Type\s*\/Page(?!s)/g) || []).length;
}

describe('PdfReportExporterService', () => {
  const service = new PdfReportExporterService();

  const fields: ReportFieldMeta[] = [
    { key: 'code', label: 'Code', type: 'string', filterable: true, sortable: true },
    { key: 'rentAmount', label: 'Rent', type: 'currency', filterable: true, sortable: true },
  ];

  it('produces a single page for a short result set', async () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({ code: `P${i}`, rentAmount: 400 + i }));
    const buffer = await service.generate('Properties', fields, rows);
    expect(buffer.toString('latin1')).toContain('%PDF-');
    expect(countPdfPages(buffer)).toBe(1);
  });

  it('paginates a large result set across multiple pages', async () => {
    const rows = Array.from({ length: 80 }, (_, i) => ({ code: `P${i}`, rentAmount: 400 + i }));
    const buffer = await service.generate('Properties', fields, rows);
    expect(countPdfPages(buffer)).toBeGreaterThan(1);
  });

  it('switches to landscape once the column count would squeeze columns under a readable width', async () => {
    const wideFields: ReportFieldMeta[] = Array.from({ length: 12 }, (_, i) => ({
      key: `f${i}`,
      label: `Field ${i}`,
      type: 'string',
      filterable: true,
      sortable: true,
    }));
    const rows = [Object.fromEntries(wideFields.map((f) => [f.key, 'x']))];
    const buffer = await service.generate('Wide Entity', wideFields, rows);
    // A4 landscape page objects declare a wider /MediaBox than portrait — 841.89 x 595.28pt.
    expect(buffer.toString('latin1')).toMatch(/\/MediaBox\s*\[\s*0\s+0\s+841\.89/);
  });
});
