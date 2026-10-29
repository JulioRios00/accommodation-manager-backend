import * as ExcelJS from 'exceljs';
import { ImportIssueReportService } from './import-issue-report.service';
import { ImportSkipReason } from '../use-cases/import-deposits.use-case';
import { ImportSheetTally } from '../use-cases/import-xlsx.use-case';

const service = new ImportIssueReportService();

const issue = (over: Partial<ImportSkipReason> = {}): ImportSkipReason => ({
  identifier: '61RR',
  reason: 'Unrecognized bed number (expected digits with an optional trailing letter, e.g. "12B")',
  sheet: 'Control',
  row: 58,
  value: 'Single',
  context: '61RR · Single · Ana Silva',
  ...over,
});

const tally = (over: Partial<ImportSheetTally> = {}): ImportSheetTally => ({
  sheet: 'Control', rows: 343, imported: 342, dropped: { 'blank row (no bed number)': 1 }, unaccounted: 0, ...over,
});

async function read(buffer: Buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as any);
  const cells = (name: string) => {
    const sheet = wb.getWorksheet(name)!;
    const out: unknown[][] = [];
    sheet.eachRow(r => out.push((r.values as unknown[]).slice(1)));
    return out;
  };
  return { wb, cells };
}

describe('ImportIssueReportService', () => {
  it('produces a workbook a spreadsheet program can open', async () => {
    const { wb } = await read(await service.generate({ skipReasons: [issue()], tallies: [tally()] }));
    expect(wb.worksheets.map(w => w.name)).toEqual(['Rows not imported', 'Summary']);
  });

  it('gives each rejected row its sheet, row number and the offending value', async () => {
    const { cells } = await read(await service.generate({ skipReasons: [issue()] }));
    const [header, first] = cells('Rows not imported');
    expect(header).toEqual(['Sheet', 'Row', 'Property', 'Value', 'Row contents', 'Why it was not imported']);
    expect(first[0]).toBe('Control');
    expect(first[1]).toBe(58);
    expect(first[2]).toBe('61RR');
    expect(first[3]).toBe('Single');
    expect(first[4]).toBe('61RR · Single · Ana Silva');
    expect(String(first[5])).toContain('Unrecognized bed number');
  });

  it('orders the rows the way the source workbook reads, not the order problems were hit', async () => {
    const buffer = await service.generate({
      skipReasons: [
        issue({ sheet: 'CheckedOut', row: 9 }),
        issue({ sheet: 'Control', row: 120 }),
        issue({ sheet: 'Control', row: 58 }),
      ],
    });
    const rows = (await read(buffer)).cells('Rows not imported').slice(1);
    expect(rows.map(r => [r[0], r[1]])).toEqual([['CheckedOut', 9], ['Control', 58], ['Control', 120]]);
  });

  it('still produces a usable file when a skip has no row context', async () => {
    // The deposits importer reports an identifier and a reason, nothing more.
    const { cells } = await read(await service.generate({
      skipReasons: [{ identifier: 'Ana Silva', reason: 'Property not found' }],
    }));
    const [, first] = cells('Rows not imported');
    expect(first[0]).toBe('—');
    expect(first[2]).toBe('Ana Silva');
    expect(first[5]).toBe('Property not found');
  });

  it('says so plainly when nothing was rejected', async () => {
    const { cells, wb } = await read(await service.generate({ skipReasons: [] }));
    expect(String(cells('Rows not imported')[1][0])).toContain('Every row imported');
    // No filter on an empty list — it would just be furniture.
    expect(wb.getWorksheet('Rows not imported')!.autoFilter).toBeFalsy();
  });

  it('turns on the filter when there is something to filter', async () => {
    const { wb } = await read(await service.generate({ skipReasons: [issue()] }));
    expect(wb.getWorksheet('Rows not imported')!.autoFilter).toBeTruthy();
  });

  it('breaks the summary down per sheet and reason, without repeating the totals', async () => {
    const buffer = await service.generate({
      skipReasons: [],
      tallies: [tally({
        sheet: 'CheckedOut', rows: 2153, imported: 2023,
        dropped: { 'no check-out date': 97, 'already imported': 24, 'no resident name': 6, 'unrecognized bed number': 3 },
      })],
    });
    const rows = (await read(buffer)).cells('Summary').slice(1);
    expect(rows[0]).toEqual(['CheckedOut', 2153, 2023, 130, 'no check-out date', 97]);
    // Later reasons carry only their own count, so the sheet totals are not double-read.
    expect(rows[1][0]).toBeUndefined();
    expect(rows[1][4]).toBe('already imported');
    expect(rows.map(r => r[5])).toEqual([97, 24, 6, 3]);
  });

  it('flags a tally whose buckets do not add up', async () => {
    const buffer = await service.generate({ skipReasons: [], tallies: [tally({ unaccounted: 7 })] });
    const rows = (await read(buffer)).cells('Summary').slice(1);
    expect(rows.some(r => String(r[4]).includes('7 rows unaccounted for'))).toBe(true);
  });

  it('carries the on-screen summary into the file so the two can be matched', async () => {
    const summary = 'Imported 342 beds, 2023 historical (checked-out) bookings';
    const buffer = await service.generate({ skipReasons: [], tallies: [tally()], summary });
    const rows = (await read(buffer)).cells('Summary');
    expect(rows.some(r => r[0] === summary)).toBe(true);
  });
});
