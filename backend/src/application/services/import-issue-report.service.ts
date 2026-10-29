import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { ImportSkipReason } from '../use-cases/import-deposits.use-case';
import { ImportSheetTally } from '../use-cases/import-xlsx.use-case';

export interface ImportIssueReportInput {
  /** The message shown on the Import page, repeated in the file so the two can be matched. */
  summary?: string;
  skipReasons: ImportSkipReason[];
  tallies?: ImportSheetTally[];
  generatedAt?: Date;
}

const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } };

/**
 * Builds the "what didn't import" workbook offered after an import.
 *
 * A spreadsheet rather than a PDF on purpose: the point of this file is to fix the source
 * data, so people need to sort by reason, filter to one sheet, and paste row numbers back
 * into the workbook they are correcting. A PDF looks tidier and can do none of that.
 */
@Injectable()
export class ImportIssueReportService {
  async generate(input: ImportIssueReportInput): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Accommodation Manager';
    workbook.created = input.generatedAt ?? new Date();

    this.addIssuesSheet(workbook, input.skipReasons);
    this.addSummarySheet(workbook, input);

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private addIssuesSheet(workbook: ExcelJS.Workbook, skipReasons: ImportSkipReason[]) {
    const sheet = workbook.addWorksheet('Rows not imported');
    sheet.columns = [
      { header: 'Sheet', key: 'sheet', width: 14 },
      { header: 'Row', key: 'row', width: 8 },
      { header: 'Property', key: 'identifier', width: 14 },
      { header: 'Value', key: 'value', width: 18 },
      { header: 'Row contents', key: 'context', width: 46 },
      { header: 'Why it was not imported', key: 'reason', width: 70 },
    ];
    this.styleHeader(sheet);

    // Grouped by sheet then row, so the list reads in the same order as the workbook
    // being corrected rather than in the order the importer happened to hit problems.
    const ordered = [...skipReasons].sort(
      (a, b) => (a.sheet ?? '').localeCompare(b.sheet ?? '') || (a.row ?? 0) - (b.row ?? 0),
    );

    for (const issue of ordered) {
      sheet.addRow({
        sheet: issue.sheet ?? '—',
        row: issue.row ?? null,
        identifier: issue.identifier,
        value: issue.value ?? '',
        context: issue.context ?? '',
        reason: issue.reason,
      });
    }

    if (ordered.length === 0) {
      const row = sheet.addRow({ sheet: 'Every row imported — nothing to correct.' });
      row.font = { italic: true };
      sheet.mergeCells(row.number, 1, row.number, 6);
    } else {
      // The whole point is to slice this list, so turn filtering on rather than making
      // each person discover it.
      sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 6 } };
    }
  }

  private addSummarySheet(workbook: ExcelJS.Workbook, input: ImportIssueReportInput) {
    const sheet = workbook.addWorksheet('Summary');
    sheet.columns = [
      { header: 'Sheet', key: 'sheet', width: 16 },
      { header: 'Rows in file', key: 'rows', width: 14 },
      { header: 'Imported', key: 'imported', width: 12 },
      { header: 'Not imported', key: 'dropped', width: 14 },
      { header: 'Reason', key: 'reason', width: 34 },
      { header: 'Count', key: 'count', width: 10 },
    ];
    this.styleHeader(sheet);

    for (const t of input.tallies ?? []) {
      const entries = Object.entries(t.dropped);
      const droppedTotal = entries.reduce((sum, [, n]) => sum + n, 0);
      // One row per reason, with the sheet totals only on the first, so the numbers are
      // not repeated down the column as if each reason accounted for all of them.
      if (entries.length === 0) {
        sheet.addRow({ sheet: t.sheet, rows: t.rows, imported: t.imported, dropped: 0, reason: '—', count: 0 });
        continue;
      }
      entries
        .sort((a, b) => b[1] - a[1])
        .forEach(([reason, count], i) => {
          sheet.addRow(
            i === 0
              ? { sheet: t.sheet, rows: t.rows, imported: t.imported, dropped: droppedTotal, reason, count }
              : { reason, count },
          );
        });
      if (t.unaccounted !== 0) {
        const warn = sheet.addRow({ reason: `${t.unaccounted} rows unaccounted for`, count: t.unaccounted });
        warn.font = { bold: true, color: { argb: 'FFC00000' } };
      }
    }

    if (input.summary) {
      sheet.addRow({});
      const row = sheet.addRow({ sheet: input.summary });
      row.font = { italic: true };
      sheet.mergeCells(row.number, 1, row.number, 6);
      row.alignment = { wrapText: true, vertical: 'top' };
    }
  }

  private styleHeader(sheet: ExcelJS.Worksheet) {
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    const header = sheet.getRow(1);
    header.font = { bold: true };
    header.fill = HEADER_FILL;
  }
}
