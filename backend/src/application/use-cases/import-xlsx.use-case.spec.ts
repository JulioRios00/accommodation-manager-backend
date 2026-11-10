import * as XLSX from 'xlsx';
import { ImportXlsxUseCase } from './import-xlsx.use-case';

/**
 * These cover the row accounting, not the persistence. The reason they exist: a misaligned
 * parser dropped every CheckedOut row at an early `continue` that incremented nothing, and
 * the import reported "Imported 0 ... (0 skipped)" — which reads as success. A summary is
 * only trustworthy if it accounts for rows it is not complaining about, so each sheet's
 * buckets must add up to its row count.
 */

const HEADERS = [
  'Code', 'BU', 'Area', 'Full Address', 'OfficeKeys', 'Keys', 'Sec K', 'Fob', 'Elec', 'Gas',
  'Bed', 'Bedroom', 'Sex', 'Bed', 'Due', 'Deposit', 'Rent',
  'Resident', 'E-mail', 'Telephone', 'Nationality', 'Personal ID', 'IBAN', 'Emergency', 'Source', 'HeadResident',
  'Check-in', 'ContractEnd', 'Check-out', 'Days', 'Comments', 'Status',
];

type RowOpts = { code?: string; bed?: any; resident?: string | null; checkOut?: Date | null };

/** A filler row below the data: the property columns carry forward, nothing else is set. */
const blankRow = () => {
  const r: any[] = new Array(32).fill(null);
  r[0] = 'D07E9XP-61RR'; r[1] = 'SA';
  return r;
};

const row = ({ code = 'D07E9XP-61RR', bed = 'A1', resident = 'Ana Silva', checkOut = new Date(Date.UTC(2026, 0, 31)) }: RowOpts = {}) => {
  const r: any[] = new Array(32).fill(null);
  r[0] = code; r[1] = 'SA'; r[10] = bed; r[11] = 'Twin'; r[12] = 'F'; r[13] = 'Single';
  r[15] = 490; r[16] = 470; r[17] = resident;
  r[26] = new Date(Date.UTC(2025, 0, 1)); r[27] = new Date(Date.UTC(2026, 0, 31)); r[28] = checkOut;
  return r;
};

function buffer(control: any[][], checkedOut?: any[][]) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([HEADERS, HEADERS, ...control]), 'Control');
  if (checkedOut) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([HEADERS, HEADERS, ...checkedOut]), 'CheckedOut');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

function build(opts: { existingCompleted?: boolean; bedStatus?: string; statusSetManually?: boolean } = {}) {
  let n = 0;
  const bookings: any[] = [];
  const beds: any[] = [];
  const bedSaves: any[] = [];
  const useCase = new ImportXlsxUseCase(
    { upsertByCode: jest.fn(async (p: any) => ({ id: `prop-${p.code}`, ...p })) } as any,
    {
      upsertByPropertyAndNumber: jest.fn(async (b: any) => {
        beds.push(b);
        // The repository leaves status alone unless the caller passes one, so the bed comes
        // back with whatever it already had.
        return { id: `bed-${++n}`, status: opts.bedStatus ?? 'vacant', statusSetManually: !!opts.statusSetManually, ...b };
      }),
      findByPropertyAndNumber: jest.fn(async () =>
        opts.bedStatus || opts.statusSetManually
          ? { id: 'bed-existing', status: opts.bedStatus ?? 'vacant', statusSetManually: !!opts.statusSetManually }
          : null,
      ),
      save: jest.fn(async (b: any) => { bedSaves.push(b); return { id: b.id, status: b.status }; }),
    } as any,
    {
      findByEmail: jest.fn(async () => null),
      findByTelephone: jest.fn(async () => null),
      save: jest.fn(async (r: any) => ({ id: `res-${++n}`, ...r })),
    } as any,
    {
      deleteByBedId: jest.fn(async () => undefined),
      findByBedId: jest.fn(async () =>
        opts.existingCompleted
          ? [{ status: 'completed', checkInDate: new Date(Date.UTC(2025, 0, 1)), checkOutDate: new Date(Date.UTC(2026, 0, 31)) }]
          : [],
      ),
      save: jest.fn(async (b: any) => { bookings.push(b); return { id: `bk-${++n}`, ...b }; }),
    } as any,
    { findByPropertyAndName: jest.fn(async () => null), save: jest.fn(async (b: any) => ({ id: `bdr-${++n}`, ...b })) } as any,
    { findAll: jest.fn(async () => []), save: jest.fn(async (l: any) => ({ id: 'll-1', ...l })) } as any,
  );
  return { useCase, bookings, beds, bedSaves };
}

const tallyFor = (res: any, sheet: string) => res.tallies.find((t: any) => t.sheet === sheet);

describe('ImportXlsxUseCase row accounting', () => {
  it('accounts for every Control row it imports', async () => {
    const { useCase } = build();
    const res = await useCase.execute(buffer([row(), row({ bed: 'A2' })]));
    const t = tallyFor(res, 'Control');
    expect(t).toMatchObject({ rows: 2, imported: 2, unaccounted: 0 });
    expect(t.dropped).toEqual({});
  });

  it('separates a blank row from an unreadable bed number', async () => {
    const { useCase } = build();
    const res = await useCase.execute(buffer([row(), row({ bed: 'Single' }), blankRow()]));
    const t = tallyFor(res, 'Control');
    expect(t.imported).toBe(1);
    expect(t.dropped).toEqual({ 'unrecognized bed number': 1, 'blank row (nothing in it)': 1 });
    expect(t.unaccounted).toBe(0);
    // Only the unreadable one is worth a human's attention.
    expect(res.skipped).toBe(1);
  });

  // A row with a resident and a rent but no bed number is data being lost, not filler.
  // It was counted as a blank row until Nov 2026 and so never reached anybody.
  it('treats a row that has content but no bed number as something to fix', async () => {
    const { useCase } = build();
    const res = await useCase.execute(buffer([row(), row({ bed: null })]));
    const t = tallyFor(res, 'Control');
    expect(t.dropped).toEqual({ 'no bed number': 1 });
    expect(res.skipped).toBe(1);
  });

  // The point of the whole report: a count alone cannot be acted on.
  it('lists every dropped row by sheet and Excel row number', async () => {
    const { useCase } = build();
    const res = await useCase.execute(
      buffer([row(), row({ bed: 'Single' }), blankRow()], [row(), row({ checkOut: null })]),
    );
    const droppedTotal = res.tallies.reduce(
      (sum: number, t: any) => sum + Object.values<number>(t.dropped).reduce((a, b) => a + b, 0),
      0,
    );
    // Every bucketed row has a detail entry, informational ones included.
    expect(res.skipReasons).toHaveLength(droppedTotal);
    expect(res.skipReasons).toContainEqual(
      expect.objectContaining({ sheet: 'Control', row: 4, bucket: 'unrecognized bed number', severity: 'error' }),
    );
    expect(res.skipReasons).toContainEqual(
      expect.objectContaining({ sheet: 'Control', row: 5, bucket: 'blank row (nothing in it)', severity: 'info' }),
    );
    expect(res.skipReasons).toContainEqual(
      expect.objectContaining({ sheet: 'CheckedOut', row: 4, bucket: 'no check-out date', severity: 'info' }),
    );
  });

  // Informational rows are listed but must not inflate the headline count, or every
  // re-import would read as hundreds of problems.
  it('counts only the rows needing a fix as skipped', async () => {
    const { useCase } = build({ existingCompleted: true });
    jest.spyOn((useCase as any).logger, 'error').mockImplementation(() => undefined);
    const res = await useCase.execute(buffer([row()], [row()]));
    expect(res.skipped).toBe(0);
    expect(res.skipReasons).toHaveLength(1);
    expect(res.skipReasons[0]).toMatchObject({ sheet: 'CheckedOut', row: 3, severity: 'info' });
  });

  // The regression this whole change exists for.
  it('counts CheckedOut rows dropped for a missing check-out date', async () => {
    const { useCase } = build();
    const res = await useCase.execute(buffer([row()], [row(), row({ checkOut: null }), row({ checkOut: null })]));
    const t = tallyFor(res, 'CheckedOut');
    expect(t).toMatchObject({ rows: 3, imported: 1, unaccounted: 0 });
    expect(t.dropped).toEqual({ 'no check-out date': 2 });
  });

  it('counts CheckedOut rows with no resident name', async () => {
    const { useCase } = build();
    const res = await useCase.execute(buffer([row()], [row({ resident: null }), row({ resident: 'Resident Full Name' })]));
    expect(tallyFor(res, 'CheckedOut').dropped).toEqual({ 'no resident name': 2 });
  });

  it('counts a booking already in the database instead of passing over it', async () => {
    const { useCase } = build({ existingCompleted: true });
    const error = jest.spyOn((useCase as any).logger, 'error').mockImplementation(() => undefined);
    const res = await useCase.execute(buffer([row()], [row()]));
    // A re-import of an unchanged sheet imports nothing and that is correct, so the
    // "nothing imported" alarm must stay quiet or it will be learned and ignored.
    expect(error).not.toHaveBeenCalled();
    const t = tallyFor(res, 'CheckedOut');
    expect(t).toMatchObject({ rows: 1, imported: 0, unaccounted: 0 });
    expect(t.dropped).toEqual({ 'already imported': 1 });
    // Nothing is wrong with the sheet here, so it must not read as an error.
    expect(res.skipped).toBe(0);
  });

  it('keeps the buckets adding up across a mixed sheet', async () => {
    const { useCase } = build();
    const res = await useCase.execute(
      buffer(
        [row(), row({ bed: 'Double' }), blankRow()],
        [row(), row({ checkOut: null }), row({ resident: null }), row({ bed: 'Twin' })],
      ),
    );
    for (const t of res.tallies) {
      const dropped = Object.values(t.dropped).reduce((a: number, b: any) => a + b, 0);
      expect(t.imported + dropped).toBe(t.rows);
      expect(t.unaccounted).toBe(0);
    }
  });

  it('reports a sheet that imported nothing as an error rather than a quiet success', async () => {
    const { useCase } = build();
    const error = jest.spyOn((useCase as any).logger, 'error').mockImplementation(() => undefined);
    jest.spyOn((useCase as any).logger, 'log').mockImplementation(() => undefined);
    jest.spyOn((useCase as any).logger, 'warn').mockImplementation(() => undefined);

    const res = await useCase.execute(buffer([row({ bed: 'Single' }), row({ bed: 'Double' })]));
    expect(tallyFor(res, 'Control')).toMatchObject({ rows: 2, imported: 0 });
    expect(error).toHaveBeenCalledWith(expect.stringContaining('imported NONE'));
  });

  it('imports a Z bedroom as an inactive bed', async () => {
    const { useCase, beds } = build();
    await useCase.execute(buffer([row({ bed: 'Z1' })]));
    expect(beds.at(-1)).toMatchObject({ bedNumber: 1, status: 'inactive' });
  });

  // Inactive is its own state: not allocated, and not vacant either.
  it('does not let a resident in a Z bed mark that bed allocated', async () => {
    const { useCase, bedSaves } = build({ bedStatus: 'inactive' });
    await useCase.execute(buffer([row({ bed: 'Z1', resident: 'Ana Silva' })]));
    expect(bedSaves.some(b => b.status === 'allocated')).toBe(false);
  });

  it('still records the booking for a resident sitting in a Z bed', async () => {
    const { useCase, bookings } = build({ bedStatus: 'inactive' });
    await useCase.execute(buffer([row({ bed: 'Z1', resident: 'Ana Silva' })]));
    expect(bookings).toHaveLength(1);
  });

  it('returns a bed to vacant once it stops being a Z', async () => {
    const { useCase, bedSaves } = build({ bedStatus: 'inactive' });
    await useCase.execute(buffer([row({ bed: 'A1', resident: null })]));
    expect(bedSaves.some(b => b.status === 'vacant')).toBe(true);
  });

  // After the first load the system is the record, not the spreadsheet: a bed taken out
  // of service by hand must not be re-let by a sheet that still lists it as A1.
  it('does not let the sheet overwrite a status someone set by hand', async () => {
    const { useCase, beds, bedSaves } = build({ bedStatus: 'inactive', statusSetManually: true });
    await useCase.execute(buffer([row({ bed: 'A1', resident: null })]));
    expect(beds.at(-1).status).toBeUndefined();
    expect(bedSaves.some(b => b.status === 'vacant')).toBe(false);
  });

  it('still applies a Z bedroom to a bed nobody has touched', async () => {
    const { useCase, beds } = build();
    await useCase.execute(buffer([row({ bed: 'Z1' })]));
    expect(beds.at(-1)).toMatchObject({ status: 'inactive' });
  });

  it('leaves an ordinary bed\u2019s status untouched on re-import', async () => {
    const { useCase, beds, bedSaves } = build({ bedStatus: 'allocated' });
    await useCase.execute(buffer([row({ bed: 'A1', resident: null })]));
    // Nothing in the upsert payload, and no corrective save either.
    expect(beds.at(-1)).not.toHaveProperty('status');
    expect(bedSaves).toEqual([]);
  });

  it('omits a sheet that is not in the workbook', async () => {
    const { useCase } = build();
    const res = await useCase.execute(buffer([row()]));
    expect(tallyFor(res, 'CheckedOut')).toMatchObject({ rows: 0, imported: 0 });
    expect(res.historicalImported).toBe(0);
  });
});
