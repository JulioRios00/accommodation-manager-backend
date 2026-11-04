import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { ImportSkipReason } from '../use-cases/import-deposits.use-case';
import { ImportSheetTally } from '../use-cases/import-xlsx.use-case';

export interface ImportIssueReportInput {
  /** The message shown on the Import page, repeated in the file so the two can be matched. */
  summary?: string;
  skipReasons: ImportSkipReason[];
  tallies?: ImportSheetTally[];
  /** Rows counted on the summary but missing from the detail list, if the cap was hit. */
  detailTruncated?: number;
  generatedAt?: Date;
}

const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } };
const ERROR_FONT: Partial<ExcelJS.Font> = { color: { argb: 'FFC00000' } };
const MUTED_FONT: Partial<ExcelJS.Font> = { color: { argb: 'FF808080' } };

/** The bucket a detail row was counted under on the summary. */
const bucketOf = (issue: ImportSkipReason): string => issue.bucket ?? issue.reason;

/**
 * Excel row numbers as a reader would write them: "4-7, 12, 40-98" rather than ninety-odd
 * comma-separated numbers. Runs are what people check against the sheet, and a run that
 * covers a whole block is itself the finding (a contiguous range usually means one cause).
 */
function formatRowRanges(rows: number[], limit = 40): string {
  const sorted = [...new Set(rows)].sort((a, b) => a - b);
  if (sorted.length === 0) return '';
  const parts: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (const n of sorted.slice(1)) {
    if (n === prev + 1) { prev = n; continue; }
    parts.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = prev = n;
  }
  parts.push(start === prev ? `${start}` : `${start}-${prev}`);
  if (parts.length > limit) {
    return `${parts.slice(0, limit).join(', ')} … +${parts.length - limit} more (see "Rows not imported")`;
  }
  return parts.join(', ');
}

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
    const columns = [
      { header: 'Sheet', key: 'sheet', width: 14 },
      { header: 'Excel row', key: 'row', width: 11 },
      { header: 'Cell', key: 'cell', width: 9 },
      { header: 'Action', key: 'action', width: 14 },
      { header: 'Problem', key: 'bucket', width: 28 },
      { header: 'Property', key: 'identifier', width: 16 },
      { header: 'Value', key: 'value', width: 18 },
      { header: 'Row contents', key: 'context', width: 46 },
      { header: 'What to do', key: 'reason', width: 80 },
    ];
    sheet.columns = columns;
    this.styleHeader(sheet);

    // Errors first — they are the rows someone has to go and fix — then by sheet and row
    // so each block reads in the same order as the workbook being corrected.
    const ordered = [...skipReasons].sort(
      (a, b) =>
        Number(a.severity === 'info') - Number(b.severity === 'info') ||
        (a.sheet ?? '').localeCompare(b.sheet ?? '') ||
        (a.row ?? 0) - (b.row ?? 0),
    );

    for (const issue of ordered) {
      const info = issue.severity === 'info';
      const row = sheet.addRow({
        sheet: issue.sheet ?? '—',
        row: issue.row ?? null,
        // A1-style address of the row itself, so the cell reference can be pasted straight
        // into Excel's Name Box to jump there.
        cell: issue.row ? `A${issue.row}` : '',
        action: info ? 'For information' : 'Needs fixing',
        bucket: bucketOf(issue),
        identifier: issue.identifier,
        value: issue.value ?? '',
        context: issue.context ?? '',
        reason: issue.reason,
      });
      row.getCell('action').font = info ? MUTED_FONT : { ...ERROR_FONT, bold: true };
      if (info) row.getCell('bucket').font = MUTED_FONT;
      row.getCell('reason').alignment = { wrapText: true, vertical: 'top' };
    }

    if (ordered.length === 0) {
      const row = sheet.addRow({ sheet: 'Every row imported — nothing to correct.' });
      row.font = { italic: true };
      sheet.mergeCells(row.number, 1, row.number, columns.length);
    } else {
      // The whole point is to slice this list, so turn filtering on rather than making
      // each person discover it.
      sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
    }
  }

  private addSummarySheet(workbook: ExcelJS.Workbook, input: ImportIssueReportInput) {
    const sheet = workbook.addWorksheet('Summary');
    const columns = [
      { header: 'Sheet', key: 'sheet', width: 16 },
      { header: 'Rows in file', key: 'rows', width: 12 },
      { header: 'Imported', key: 'imported', width: 11 },
      { header: 'Not imported', key: 'dropped', width: 13 },
      { header: 'Reason', key: 'reason', width: 30 },
      { header: 'Count', key: 'count', width: 8 },
      { header: 'Action', key: 'action', width: 15 },
      { header: 'Excel rows', key: 'rowList', width: 64 },
    ];
    sheet.columns = columns;
    this.styleHeader(sheet);

    // The row numbers behind each count, so a reason on this sheet can be followed to the
    // lines in the workbook without first filtering the detail sheet.
    const rowsByKey = new Map<string, number[]>();
    const severityByKey = new Map<string, 'error' | 'info'>();
    for (const issue of input.skipReasons) {
      const key = `${issue.sheet ?? ''}\u0000${bucketOf(issue)}`;
      if (issue.row) rowsByKey.set(key, [...(rowsByKey.get(key) ?? []), issue.row]);
      // 'error' wins: if any row under a reason needs fixing, the reason does.
      if (issue.severity !== 'info' || !severityByKey.has(key)) {
        severityByKey.set(key, issue.severity === 'info' ? 'info' : 'error');
      }
    }

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
          const key = `${t.sheet}\u0000${reason}`;
          const listed = rowsByKey.get(key) ?? [];
          const info = (severityByKey.get(key) ?? 'error') === 'info';
          const detail = {
            reason,
            count,
            action: info ? 'For information' : 'Needs fixing',
            rowList: formatRowRanges(listed),
          };
          const row = sheet.addRow(
            i === 0
              ? { sheet: t.sheet, rows: t.rows, imported: t.imported, dropped: droppedTotal, ...detail }
              : detail,
          );
          row.getCell('action').font = info ? MUTED_FONT : { ...ERROR_FONT, bold: true };
          row.getCell('rowList').alignment = { wrapText: true, vertical: 'top' };
          // A count with no row numbers behind it means the detail list was capped, not
          // that the rows are unknown — say so rather than leaving the cell blank.
          if (listed.length === 0 && count > 0) row.getCell('rowList').value = 'see "Rows not imported"';
          else if (listed.length < count) {
            row.getCell('rowList').value = `${detail.rowList} (${listed.length} of ${count} listed)`;
          }
        });
      if (t.unaccounted !== 0) {
        const warn = sheet.addRow({ reason: `${t.unaccounted} rows unaccounted for`, count: t.unaccounted });
        warn.font = { bold: true, ...ERROR_FONT };
      }
    }

    if (input.detailTruncated) {
      const warn = sheet.addRow({
        reason: `${input.detailTruncated} further rows are counted above but not listed individually`,
        count: input.detailTruncated,
      });
      warn.font = { bold: true, ...ERROR_FONT };
    }

    if (input.summary) {
      sheet.addRow({});
      const row = sheet.addRow({ sheet: input.summary });
      row.font = { italic: true };
      sheet.mergeCells(row.number, 1, row.number, columns.length);
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
