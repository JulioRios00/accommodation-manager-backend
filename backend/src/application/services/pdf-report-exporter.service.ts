import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import { ReportFieldMeta } from '../../domain/custom-report/report-metadata.types';

const MARGIN = 40;
const ROW_HEIGHT = 20;
const MIN_COLUMN_WIDTH = 70;
const HEADER_HEIGHT = 90; // logo placeholder + title + generated-on timestamp
const FOOTER_HEIGHT = 30;

@Injectable()
export class PdfReportExporterService {
  generate(entityLabel: string, fields: ReportFieldMeta[], rows: Record<string, unknown>[]): Promise<Buffer> {
    // Switch to landscape once portrait would squeeze columns under a readable minimum width.
    const portraitWidth = 595.28 - MARGIN * 2;
    const landscapeWidth = 841.89 - MARGIN * 2;
    const layout: 'portrait' | 'landscape' = fields.length * MIN_COLUMN_WIDTH > portraitWidth ? 'landscape' : 'portrait';
    const pageWidth = layout === 'landscape' ? landscapeWidth : portraitWidth;
    const pageHeight = (layout === 'landscape' ? 595.28 : 841.89) - MARGIN * 2;
    const columnWidth = pageWidth / fields.length;

    const doc = new PDFDocument({ size: 'A4', layout, margin: MARGIN, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    drawHeader(doc, entityLabel, pageWidth);
    let y = MARGIN + HEADER_HEIGHT;
    y = drawTableHeader(doc, fields, columnWidth, y);

    for (const row of rows) {
      if (y + ROW_HEIGHT > MARGIN + pageHeight - FOOTER_HEIGHT) {
        doc.addPage({ size: 'A4', layout, margin: MARGIN });
        drawHeader(doc, entityLabel, pageWidth);
        y = MARGIN + HEADER_HEIGHT;
        y = drawTableHeader(doc, fields, columnWidth, y);
      }
      y = drawTableRow(doc, fields, row, columnWidth, y);
    }

    stampPageNumbers(doc);
    doc.end();
    return done;
  }
}

function drawHeader(doc: PDFKit.PDFDocument, title: string, pageWidth: number): void {
  const x = doc.page.margins.left;
  const y = doc.page.margins.top;

  // Logo placeholder — a bordered box; swap for an actual image once corporate branding assets exist.
  doc.rect(x, y, 60, 40).stroke();
  doc.fontSize(7).fillColor('#999').text('LOGO', x, y + 16, { width: 60, align: 'center' });
  doc.fillColor('#000');

  doc.fontSize(16).font('Helvetica-Bold').text(title, x + 70, y, { width: pageWidth - 70 });
  doc.fontSize(9).font('Helvetica').fillColor('#555')
    .text(`Generated on ${new Date().toLocaleString('en-IE')}`, x + 70, y + 22);
  doc.fillColor('#000');
  doc.moveTo(x, y + 55).lineTo(x + pageWidth, y + 55).strokeColor('#ccc').stroke().strokeColor('#000');
}

function drawTableHeader(doc: PDFKit.PDFDocument, fields: ReportFieldMeta[], columnWidth: number, y: number): number {
  const x0 = doc.page.margins.left;
  doc.font('Helvetica-Bold').fontSize(8);
  doc.rect(x0, y, columnWidth * fields.length, ROW_HEIGHT).fillAndStroke('#f0f0f0', '#000');
  doc.fillColor('#000');
  fields.forEach((field, i) => {
    doc.text(field.label, x0 + i * columnWidth + 3, y + 6, { width: columnWidth - 6, height: ROW_HEIGHT, ellipsis: true });
  });
  return y + ROW_HEIGHT;
}

function drawTableRow(doc: PDFKit.PDFDocument, fields: ReportFieldMeta[], row: Record<string, unknown>, columnWidth: number, y: number): number {
  const x0 = doc.page.margins.left;
  doc.font('Helvetica').fontSize(8);
  fields.forEach((field, i) => {
    const cellX = x0 + i * columnWidth;
    doc.rect(cellX, y, columnWidth, ROW_HEIGHT).stroke('#ccc');
    doc.fillColor('#000').text(formatCell(field, row[field.key]), cellX + 3, y + 6, {
      width: columnWidth - 6,
      height: ROW_HEIGHT,
      ellipsis: true,
    });
  });
  return y + ROW_HEIGHT;
}

function formatCell(field: ReportFieldMeta, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (field.type === 'boolean') return value ? 'Yes' : 'No';
  if (field.type === 'currency') return `€${Number(value).toFixed(2)}`;
  if (field.type === 'date') return new Date(value as string).toLocaleDateString('en-IE');
  return String(value);
}

function stampPageNumbers(doc: PDFKit.PDFDocument): void {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const { width, height, margins } = doc.page;
    // Writing into the margin area makes pdfkit think the content overflowed the page and
    // silently appends a blank page to "continue" it — zero the bottom margin for this one
    // write so its own overflow check (page.height - margins.bottom) doesn't trip.
    const bottomMargin = margins.bottom;
    doc.page.margins.bottom = 0;
    doc.fontSize(8).fillColor('#555').text(
      `Page ${i - range.start + 1} of ${range.count}`,
      margins.left,
      height - bottomMargin + 10,
      { width: width - margins.left - margins.right, align: 'center', lineBreak: false },
    );
    doc.page.margins.bottom = bottomMargin;
    doc.fillColor('#000');
  }
}
